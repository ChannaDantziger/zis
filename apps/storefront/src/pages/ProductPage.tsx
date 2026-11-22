import { Alert, Anchor, Button, Group, Modal, NumberInput, Skeleton, Stack, Text, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { observer } from 'mobx-react-lite';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useProductQuery } from '../entities/product/api';
import { formatPurchasePrice } from '../entities/product/format';
import { ImageGallery } from '../features/product-gallery/ImageGallery';
import { ApiError } from '../shared/api/http-client';
import { cartStore } from '../stores/cart.store';
import { useStoreStatus } from '../shared/store-status';
import { getProductImages } from '../features/product-gallery/images';

export const ProductPage = observer(function ProductPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const mobile = useMediaQuery('(max-width: 48em)', false);
  const result = useProductQuery(productId);
  const storeStatus = useStoreStatus();
  const [notice, setNotice] = useState('');
  const [quantitySets, setQuantitySets] = useState(1);
  const product = result.data;
  const images = useMemo(() => product ? getProductImages(product) : [], [product]);
  const close = () => navigate('/#catalog');

  let content: ReactNode;
  if (result.isPending) content = <Stack p="xl"><Skeleton h={440} aria-label="טעינת מוצר" /></Stack>;
  else if (result.isError || !product) content = <Stack p="xl">
    <Alert color="red" title={result.error instanceof ApiError && result.error.status === 404 ? 'המוצר אינו זמין' : 'לא ניתן לטעון את המוצר'} role="alert">
      <Text>אפשר לחזור לקטלוג או לנסות שוב.</Text><Button mt="sm" onClick={() => void result.refetch()}>ניסיון נוסף</Button>
    </Alert><Anchor component={Link} to="/#catalog">חזרה לקטלוג</Anchor></Stack>;
  else {
    const simpleProduct = product.variants.length === 0;
    const purchasePrice = simpleProduct ? formatPurchasePrice(product.pricePerUnit, product.setSize, quantitySets) : null;
    const currentAvailable = product.availableSets;
    const validQuantity = simpleProduct && Number.isInteger(quantitySets)
      && quantitySets >= 1 && quantitySets <= currentAvailable;
    const productCopy = <Stack gap="sm" className="product-detail-copy">
      <Text c="var(--zis-accent)" size="sm">{product.category.name}</Text>
      <Title order={1}>{product.name}</Title>
      {product.description && <Text className="product-description">{product.description}</Text>}
      {simpleProduct && <Text size="sm" c="dimmed" className="product-set-size">מגיע {product.setSize} יחידות בסט</Text>}
    </Stack>;
    const purchase = simpleProduct ? <Stack gap="sm" className="product-purchase">
      <>
        <Group justify="space-between" align="end" className="product-price-row">
          <Text size="sm">{purchasePrice?.setDetail}</Text>
        </Group>
      </>
      <Group align="end" justify="space-between" wrap="nowrap">
      <NumberInput w={120} label="כמות סטים" min={1} max={Math.max(1, currentAvailable)} allowDecimal={false}
        disabled={!simpleProduct || currentAvailable < 1} allowNegative={false} value={quantitySets}
        onChange={(value) => setQuantitySets(typeof value === 'number' ? value : 0)} />
      <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
      <Text fw={700} aria-live="polite">סה״כ: {purchasePrice?.total}</Text><Text size="xs" c="dimmed">{purchasePrice?.detail}</Text>
      <Button size="sm" disabled={!validQuantity || storeStatus.data?.storeOpen !== true} onClick={() => {
        if (validQuantity && storeStatus.data?.storeOpen === true) {
          if (cartStore.addItem(product, quantitySets)) { setNotice(''); close(); cartStore.open(); }
          else setNotice('לא ניתן להוסיף את הכמות המבוקשת. בדקו את הכמות שכבר נמצאת בעגלה.');
        }
      }}>הוסף לסל</Button>
      </Stack>
      </Group>
      {storeStatus.data?.storeOpen !== true && <Text size="sm" c="dimmed" role="status">הוספה לסל תתאפשר כשהחנות פתוחה וזמינותה מאומתת.</Text>}
      {notice && <Alert color="orange" role="alert">{notice}</Alert>}
      <Text size="xs" c="dimmed">סכום ההזמנה כולל המשלוח יוצג לפני התשלום.</Text>
    </Stack> : <Alert color="gray">המוצר אינו זמין כרגע לרכישה.</Alert>;
    const gallery = <div className="product-detail-gallery"><ImageGallery images={images} title={product.name} productLayout /></div>;
    content = <>
      <div className="product-detail-desktop">
        <div className="product-detail-grid">
          {gallery}
          <div className="product-detail-information">{productCopy}{purchase}</div>
        </div>
      </div>
      <div className="product-detail-mobile">
        {productCopy}
        {gallery}
        <div className="product-purchase-mobile">{purchase}</div>
      </div>
    </>;
  }

  return <>
    <Modal opened onClose={close} fullScreen={mobile} centered size="70rem" className="product-detail-modal"
      overlayProps={{ backgroundOpacity: 0.58, blur: 2 }}
      closeButtonProps={{ 'aria-label': 'סגירת פרטי המוצר' }}>
      <div className="product-modal-content">{content}</div>
    </Modal>
  </>;
});

export default ProductPage;
