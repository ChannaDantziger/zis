import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Alert, Button, Card, Group, Image, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { catalogStore as store } from '../features/catalog/catalog.store.js';
import { CatalogProductEditor } from '../features/catalog/CatalogProductEditor.js';
import { CatalogBreadcrumbs, CatalogCategoryEditor } from '../features/catalog/CatalogCategoryEditor.js';
import { CatalogProductCard } from '../features/catalog/CatalogProductCard.js';
import { LoadingState } from '../shared/components/StateMessage.js';
import { BundleEditor, BundleSection } from '../features/catalog/CatalogBundles.js';
import { bundlesStore } from '../features/catalog/bundles.store.js';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { request } from '../shared/api/http-client.js';
import type { ManagedCatalog, ManagedProduct } from '../features/catalog/catalog.types.js';

export const CatalogPage = observer(function CatalogPage() {
  const [expanded, setExpanded] = useState(false);
  const [remainingProducts, setRemainingProducts] = useState<ManagedProduct[]>([]);
  const [moreError, setMoreError] = useState('');
  const wasEditingBundle = useRef(false);
  useEffect(() => { void store.load(); return () => { store.close(false); }; }, []);
  const category = store.selectedCategory;
  const editingBundle = !!bundlesStore.form;
  useEffect(() => {
    if (wasEditingBundle.current && !editingBundle && store.selectedCategoryId) void store.load();
    wasEditingBundle.current = editingBundle;
  }, [editingBundle]);
  useEffect(() => { setExpanded(false); }, [store.selectedCategoryId]);
  useEffect(() => {
    let active = true;
    setRemainingProducts([]); setMoreError('');
    const catalog = store.catalog;
    if (!expanded || !catalog || !store.selectedCategoryId) return () => { active = false; };
    const pages = Math.ceil(catalog.totalItems / catalog.pageSize);
    const categoryId = store.selectedCategoryId;
    void Promise.all(Array.from({ length: pages }, (_, i) => i + 1).filter(page => page !== catalog.page)
      .map(page => request<ManagedCatalog>(`/admin/products?page=${page}&categoryId=${encodeURIComponent(categoryId)}`)))
      .then(results => { if (active) setRemainingProducts(results.flatMap(result => result.data)); })
      .catch(() => { if (active) setMoreError('טעינת יתר המוצרים נכשלה. צמצמי והרחיבי לניסיון נוסף.'); });
    return () => { active = false; };
  }, [expanded, store.selectedCategoryId, store.catalog]);
  if (bundlesStore.form) return <Stack maw={1100} mx="auto" gap="lg"><CatalogBreadcrumbs /><BundleEditor /></Stack>;
  return <Stack maw={1100} mx="auto" gap="lg">
    <CatalogBreadcrumbs />
    <Group justify="space-between"><div>
      <Title order={1}>{store.product ? (store.product.productId ? store.product.name : 'מוצר חדש') : category?.name ?? 'הקטלוג שלי'}</Title>
      <Text c="dimmed">{store.product ? 'פרטי המוצר והתמונות שלו' : category ? 'המוצרים בקטגוריה זו' : 'בחרי קטגוריה כדי לראות ולהוסיף מוצרים'}</Text>
    </div><Group>
      {!store.product && <Button variant="subtle" disabled={store.loading || store.saving} onClick={() => void store.load()}>רענון</Button>}
      {!store.product && (category ? <>
        <Button variant="default" disabled={store.saving} onClick={() => store.editCategory(category)}>עריכת הקטגוריה</Button>
      </> : <Button disabled={store.loading || store.saving || !store.catalog} onClick={() => store.editCategory()}>הוספת קטגוריה</Button>)}
    </Group></Group>
    {store.error && <Alert color="red" title="הפעולה נכשלה">{store.error}</Alert>}
    {store.success && <Alert color="green">{store.success}</Alert>}
    <CatalogCategoryEditor />
    {store.product ? <CatalogProductEditor /> : <>
      {store.loading ? <LoadingState /> : !store.selectedCategoryId ? <>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
          {store.catalog?.categories.map((item) => <Card key={item.categoryId} withBorder radius="lg" component="button" type="button" ta="right"
            disabled={store.saving} style={{ cursor: store.saving ? 'not-allowed' : 'pointer' }} onClick={() => store.selectCategory(item.categoryId)}>
            <Stack gap="xs"><Text fw={700} size="lg">{item.name}{item.productCount !== undefined && ` (${item.productCount})`}</Text>
              {!!item.previewImages?.length && <SimpleGrid cols={4}>{item.previewImages.map((image) => <Image key={image.productId} src={image.url} alt={image.productName} title={image.productName} h={64} fit="contain" onError={() => store.refreshFailedImages()} />)}</SimpleGrid>}
              <Text size="sm" c="dimmed">{item.status === 'hidden' ? 'מוסתרת באתר · כניסה למוצרים' : 'לצפייה במוצרים ולהוספת מוצר'}</Text>
            </Stack>
          </Card>)}
        </SimpleGrid>
        {store.catalog?.categories.length === 0 && <Text c="dimmed">מתחילים בהוספת קטגוריה. אחר כך אפשר להוסיף אליה מוצרים.</Text>}
      </> : <>
        {category?.status === 'hidden' && <Alert color="yellow">הקטגוריה מוסתרת ולכן המוצרים שלה אינם מוצגים באתר.</Alert>}
        <BundleSection categoryId={store.selectedCategoryId} />
        <Group justify="space-between"><Group><Title order={2} size="h3">מוצרים</Title>
          {(store.catalog?.totalItems ?? 0) > 3 && <Button variant="subtle" onClick={() => setExpanded(!expanded)} rightSection={expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}>{expanded ? 'הצג פחות' : 'הצג הכול'}</Button>}
        </Group><Button disabled={store.loading || store.saving} onClick={() => store.newProduct()}>הוספת מוצר</Button></Group>
        {(expanded ? [...(store.catalog?.data ?? []), ...remainingProducts] : store.catalog?.data.slice(0, 3))?.map((product) => <CatalogProductCard key={product.productId} product={product} />)}
        {moreError && <Alert color="red">{moreError}</Alert>}
        {store.catalog?.data.length === 0 && <Card withBorder><Text>עדיין אין מוצרים בקטגוריה. לחצי על הוספת מוצר כדי להתחיל.</Text></Card>}
        {store.catalog && <Group justify="space-between"><Text size="sm">{store.catalog.totalItems} מוצרים בקטגוריה</Text>
        </Group>}
      </>}
    </>}
  </Stack>;
});
