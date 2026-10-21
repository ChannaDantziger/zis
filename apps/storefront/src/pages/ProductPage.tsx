import { Alert, Anchor, Badge, Button, Group, Modal, NumberInput, Select, Skeleton, Stack, Text, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useProductQuery } from '../entities/product/api';
import { formatPrice } from '../entities/product/format';
import { ImageGallery } from '../features/product-gallery/ImageGallery';
import { ProductSelection } from '../features/product-gallery/ProductSelection';
import { ApiError } from '../shared/api/http-client';
import { cartStore } from '../stores/cart.store';
import { useStoreStatus } from '../shared/store-status';
import { getProductImages } from '../features/product-gallery/images';
import { CatalogPage } from './CatalogPage';

export const ProductPage = observer(function ProductPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const mobile = useMediaQuery('(max-width: 48em)', false);
  const result = useProductQuery(productId);
  const storeStatus = useStoreStatus();
  const [notice, setNotice] = useState('');
  const [selection] = useState(() => new ProductSelection());
  const product = result.data;
  useEffect(() => { if (product) selection.initialize(product); }, [product, selection]);
  const variant = product?.variants.find((item) => item.productVariantId === selection.variantId);
  const images = useMemo(() => product ? getProductImages(product, variant) : [], [product, variant]);
  const close = () => navigate('/catalog');

  let content: ReactNode;
  if (result.isPending) content = <Stack p="xl"><Skeleton h={440} aria-label="טעינת מוצר" /></Stack>;
  else if (result.isError || !product) content = <Stack p="xl">
    <Alert color="red" title={result.error instanceof ApiError && result.error.status === 404 ? 'המוצר אינו זמין' : 'לא ניתן לטעון את המוצר'} role="alert">
      <Text>אפשר לחזור לקטלוג או לנסות שוב.</Text><Button mt="sm" onClick={() => void result.refetch()}>ניסיון נוסף</Button>
    </Alert><Anchor component={Link} to="/catalog" onClick={close}>חזרה לקטלוג</Anchor></Stack>;
  else {
    const simpleProduct = product.variants.length === 0;
    const currentPrice = variant?.pricePerSet ?? product.pricePerSet;
    const currentAvailable = variant?.availableSets ?? product.availableSets;
    const validQuantity = (simpleProduct || Boolean(variant)) && Number.isInteger(selection.quantitySets)
      && selection.quantitySets >= 1 && selection.quantitySets <= currentAvailable;
    const productCopy = <Stack gap="sm" className="product-detail-copy">
      <Text c="var(--zis-accent)" size="sm">{product.category.name}</Text>
      <Title order={1}>{product.name}</Title>
      {product.description && <Text className="product-description">{product.description}</Text>}
      <Text size="sm" fw={600} className="product-set-size">בכל יחידת קנייה יש {product.setSize} יחידות</Text>
      {product.variants.length > 1 && <Select label="בחירת אפשרות" value={selection.variantId || null} allowDeselect={false}
        data={product.variants.map((item) => ({ value: item.productVariantId,
          label: `${item.name}${item.availableSets < 1 ? ' (לא זמין)' : ''}`, disabled: item.availableSets < 1 }))}
        onChange={(value) => { if (value) { selection.selectVariant(value); selection.setQuantity(1); } }} />}
    </Stack>;
    const purchase = <Stack gap="sm" className="product-purchase">
      {(variant || simpleProduct) && <>
        <Group justify="space-between" align="end" className="product-price-row">
          <Text size="sm" c="dimmed">מחיר ליחידת קנייה</Text>
          <Text size="xl" fw={700}>{formatPrice(currentPrice)}</Text>
        </Group>
        {currentAvailable < 1 ? <Badge color="gray">לא זמין כרגע</Badge> : <>
          <NumberInput label="מספר יחידות קנייה" min={1} max={currentAvailable} allowDecimal={false}
            allowNegative={false} value={selection.quantitySets} onChange={(value) => selection.setQuantity(typeof value === 'number' ? value : 0)} />
        </>}
      </>}
      <Button size="lg" disabled={!validQuantity || storeStatus.data?.storeOpen !== true} onClick={() => {
        if (validQuantity && storeStatus.data?.storeOpen === true) {
          if (cartStore.addItem(product, variant ?? null, selection.quantitySets)) { setNotice(''); close(); cartStore.open(); }
          else setNotice('לא ניתן להוסיף את הכמות המבוקשת. בדקו את הכמות שכבר נמצאת בעגלה.');
        }
      }}>הוספה לסל</Button>
      {storeStatus.data?.storeOpen !== true && <Text size="sm" c="dimmed" role="status">הוספה לסל תתאפשר כשהחנות פתוחה וזמינותה מאומתת.</Text>}
      {notice && <Alert color="orange" role="alert">{notice}</Alert>}
      <Text size="xs" c="dimmed">המחיר והזמינות ייבדקו מחדש לפני ההזמנה.</Text>
    </Stack>;
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
    {!mobile && <div className="product-catalog-backdrop" aria-hidden="true"><CatalogPage /></div>}
    <Modal opened onClose={close} fullScreen={mobile} centered size="70rem" className="product-detail-modal"
      overlayProps={{ backgroundOpacity: 0.58, blur: 2 }}
      closeButtonProps={{ 'aria-label': 'סגירת פרטי המוצר' }}>
      <div className="product-modal-content">{content}</div>
    </Modal>
  </>;
});

export default ProductPage;
