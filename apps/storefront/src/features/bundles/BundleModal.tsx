import { useMemo, useState } from 'react';
import { ActionIcon, Alert, Badge, Checkbox, Group, Image, Modal, NumberInput, ScrollArea, Stack, Text, Title, Tooltip } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { useMediaQuery } from '@mantine/hooks';
import { formatPrice } from '../../entities/product/format';
import { ImageGallery } from '../product-gallery/ImageGallery';
import { adjustSelection, capacity, formatBundlePrice, priceAgorot, selectionTotal } from './allocation';
import type { Bundle, BundleProduct, Selection } from './types';

const ADJUST_HELP = 'מתאים אוטומטית את כמויות המוצרים למספר היחידות במארז';
export function BundleModal({ bundle, products, initial, onClose }: { bundle: Bundle; products: BundleProduct[]; initial: Selection | null; onClose: () => void }) {
  const mobile = useMediaQuery('(max-width: 48em)', false);
  const [selection, setSelection] = useState<Selection>(initial ?? {});
  const [count, setCount] = useState(1);
  const [single, setSingle] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const images = useMemo(() => bundle.images.map(image => ({ imageId: image.imageId, url: image.url, altText: image.altText })), [bundle.images]);
  const total = selectionTotal(selection), delta = bundle.unitCount - total;
  const validStock = products.every(item => (selection[item.productId] ?? 0) <= capacity(item, count));
  const canAdjust = count >= 1 && Number.isSafeInteger(count);
  function chooseSingle(item: BundleProduct, checked: boolean) {
    setNotice('');
    if (checked) { setSingle(item.productId); setSelection({ [item.productId]: bundle.unitCount }); }
    else { setSingle(null); setSelection({}); }
  }
  function adjust() {
    if (!canAdjust) return;
    const result = adjustSelection(products, selection, bundle.unitCount, count);
    if (result) { setSelection(result); setNotice(''); }
    else setNotice('אין מספיק מלאי במוצרים שנבחרו. בחרו מוצרים נוספים.');
  }
  return <Modal opened onClose={onClose} closeOnClickOutside={false} fullScreen={mobile} centered size="70rem" className="product-detail-modal" closeButtonProps={{ 'aria-label': 'סגירת פרטי המארז' }}>
    <Stack className="product-modal-content" p="md" gap="lg">
      <Alert color="blue">הרכבת המארז זמינה לצפייה. האפשרות להוסיף אותו לסל תתווסף בהמשך.</Alert>
      <div className="product-detail-grid bundle-detail-grid">
        <div className="product-detail-gallery"><ImageGallery images={images} title={bundle.name} productLayout /></div>
        <Stack className="product-detail-information" gap="sm"><Text c="var(--zis-accent)" size="sm">{bundle.categoryName}</Text><Title order={1}>{bundle.name}</Title>
          {bundle.description && <Text>{bundle.description}</Text>}
          <Text size="sm">{bundle.unitCount} יחידות בכל מארז</Text>
      {!initial && <Alert color="orange">אין כרגע מספיק יחידות זמינות להרכבת מארז שלם.</Alert>}
      {!canAdjust && <Alert color="orange">יש לבחור מספר מארזים תקין.</Alert>}
      {!validStock && <Alert color="orange">הכמות המבוקשת עולה על המלאי הזמין. שנו את ההרכב או את מספר המארזים.</Alert>}
      {notice && <Alert color="orange" role="alert">{notice}</Alert>}
      <div className="bundle-products-header">
        <Tooltip label="ממלאים את כל המארז במוצר אחד" withArrow events={{ hover: true, focus: true, touch: true }}>
          <Text component="span" size="xs" ta="center" tabIndex={0}>מארז ממוצר אחד</Text>
        </Tooltip>
        <Text size="xs">מוצר</Text><Text size="xs" ta="center">כמות</Text>
      </div>
      <ScrollArea h={200} type="always" offsetScrollbars viewportProps={{ tabIndex: 0, role: 'region', 'aria-label': 'רשימת מוצרי המארז, ניתנת לגלילה' }}>
        <Stack gap="xs">
        {products.map(item => <div key={item.productId} className="bundle-product-row" data-muted={Boolean(single && single !== item.productId) || item.availableItems === 0}>
          <Checkbox aria-label={`מארז שלם ממוצר זה: ${item.name}`} checked={single === item.productId}
            disabled={!canAdjust || Boolean(single && single !== item.productId) || (single !== item.productId && capacity(item, count) < bundle.unitCount)}
            onChange={event => chooseSingle(item, event.currentTarget.checked)} />
          <Group wrap="nowrap">{item.image && <Image src={item.image.url} alt={item.image.altText || item.name} w={64} h={64} fit="contain" />}
            <Stack gap={2}><Text fw={600}>{item.name}</Text><Text size="sm">{formatPrice(item.pricePerUnit)} ליחידה</Text>{item.availableItems === 0 && <Badge color="gray">לא זמין כרגע</Badge>}</Stack></Group>
          <NumberInput aria-label={`כמות ${item.name} במארז`} min={0} max={canAdjust ? capacity(item, count) : 0} allowDecimal={false}
            value={selection[item.productId] ?? 0} disabled={Boolean(single && single !== item.productId) || !canAdjust || item.availableItems === 0}
            onChange={value => { if (single) setSingle(null); setSelection({ ...selection, [item.productId]: typeof value === 'number' ? value : 0 }); setNotice(''); }} />
        </div>)}
      </Stack></ScrollArea>
      <Group className="bundle-summary-row" wrap="nowrap" align="end">
        <Stack gap={2} className="bundle-summary-price"><Text size="xs">סה״כ</Text>
          <Text fw={700} size="lg" aria-live="polite">{formatBundlePrice(priceAgorot(products, selection) * BigInt(canAdjust ? count : 0))}</Text>
          <Text size="xs" role="status" aria-live="polite">{delta === 0 ? `${total} מתוך ${bundle.unitCount} יחידות` : delta > 0 ? `חסרות ${delta} יחידות למארז` : `יש ${-delta} יחידות עודפות במארז`}</Text></Stack>
        <NumberInput className="bundle-summary-count" label="מספר מארזים זהים" min={1} max={2147483647} allowDecimal={false} allowNegative={false} value={count}
          onChange={value => { setCount(typeof value === 'number' ? value : 0); setNotice(''); }} />
        <Tooltip label={ADJUST_HELP} multiline w={230} withArrow events={{ hover: true, focus: true, touch: true }}>
          <ActionIcon variant="light" size="lg" onClick={adjust} disabled={!canAdjust} aria-label={ADJUST_HELP}><IconRefresh size={20} /></ActionIcon>
        </Tooltip>
      </Group>
      <Text size="sm" c="dimmed">הוספה לסל תתאפשר בהמשך הפיתוח.</Text>
        </Stack>
      </div>
    </Stack>
  </Modal>;
}
