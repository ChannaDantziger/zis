import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Alert, Button, Card, Group, Image, Pagination, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { catalogStore as store } from '../features/catalog/catalog.store.js';
import { CatalogProductEditor } from '../features/catalog/CatalogProductEditor.js';
import { CatalogBreadcrumbs, CatalogCategoryEditor } from '../features/catalog/CatalogCategoryEditor.js';
import { CatalogProductCard } from '../features/catalog/CatalogProductCard.js';
import { LoadingState } from '../shared/components/StateMessage.js';

export const CatalogPage = observer(function CatalogPage() {
  useEffect(() => { void store.load(); return () => { store.close(false); }; }, []);
  const category = store.selectedCategory;
  return <Stack maw={1100} mx="auto" gap="lg">
    <CatalogBreadcrumbs />
    <Group justify="space-between"><div>
      <Title order={1}>{store.product ? (store.product.productId ? store.product.name : 'מוצר חדש') : category?.name ?? 'הקטלוג שלי'}</Title>
      <Text c="dimmed">{store.product ? 'פרטי המוצר והתמונות שלו' : category ? 'המוצרים בקטגוריה זו' : 'בחרי קטגוריה כדי לראות ולהוסיף מוצרים'}</Text>
    </div><Group>
      {!store.product && <Button variant="subtle" disabled={store.loading || store.saving} onClick={() => void store.load()}>רענון</Button>}
      {!store.product && (category ? <>
        <Button variant="default" disabled={store.saving} onClick={() => store.editCategory(category)}>עריכת הקטגוריה</Button>
        <Button disabled={store.loading || store.saving} onClick={() => store.newProduct()}>הוספת מוצר</Button>
      </> : <Button disabled={store.loading || store.saving || !store.catalog} onClick={() => store.editCategory()}>הוספת קטגוריה</Button>)}
    </Group></Group>
    {store.error && <Alert color="red" title="הפעולה נכשלה">{store.error}</Alert>}
    {store.success && <Alert color="green">{store.success}</Alert>}
    <CatalogCategoryEditor />
    {store.product ? <CatalogProductEditor /> : <>
      {store.loading ? <LoadingState /> : !store.selectedCategoryId ? <>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
          {store.catalog?.categories.map((item) => <Card key={item.categoryId} withBorder radius="lg" component="button" type="button" ta="right"
            disabled={store.saving} onClick={() => store.selectCategory(item.categoryId)}>
            <Stack gap="xs"><Text fw={700} size="lg">{item.name}{item.productCount !== undefined && ` (${item.productCount})`}</Text>
              {!!item.previewImages?.length && <SimpleGrid cols={4}>{item.previewImages.map((image) => <Image key={image.productId} src={image.url} alt={image.productName} title={image.productName} h={64} fit="contain" />)}</SimpleGrid>}
              <Text size="sm" c="dimmed">{item.status === 'hidden' ? 'מוסתרת באתר · כניסה למוצרים' : 'לצפייה במוצרים ולהוספת מוצר'}</Text>
            </Stack>
          </Card>)}
        </SimpleGrid>
        {store.catalog?.categories.length === 0 && <Text c="dimmed">מתחילים בהוספת קטגוריה. אחר כך אפשר להוסיף אליה מוצרים.</Text>}
      </> : <>
        {category?.status === 'hidden' && <Alert color="yellow">הקטגוריה מוסתרת ולכן המוצרים שלה אינם מוצגים באתר.</Alert>}
        {store.catalog?.data.map((product) => <CatalogProductCard key={product.productId} product={product} />)}
        {store.catalog?.data.length === 0 && <Card withBorder><Text>עדיין אין מוצרים בקטגוריה. לחצי על הוספת מוצר כדי להתחיל.</Text></Card>}
        {store.catalog && <Group justify="space-between"><Text size="sm">{store.catalog.totalItems} מוצרים בקטגוריה</Text>
          {store.catalog.totalItems > store.catalog.pageSize && <Pagination value={store.page} total={Math.max(1, Math.ceil(store.catalog.totalItems / store.catalog.pageSize))}
            disabled={store.loading || store.saving} onChange={(page) => void store.load(page)} />}
        </Group>}
      </>}
    </>}
  </Stack>;
});
