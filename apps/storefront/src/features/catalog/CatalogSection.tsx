import { Alert, Button, Group, Pagination, Select, SimpleGrid, Skeleton, Stack, Text, TextInput, Title } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCategoriesQuery, useProductsQuery } from '../../entities/product/api';
import { ProductCard } from './ProductCard';
import { readCatalogQuery, updateCatalogQuery } from './query';

export function CatalogSection() {
  const [parameters, setParameters] = useSearchParams();
  const query = readCatalogQuery(parameters);
  const [search, setSearch] = useState(query.search ?? '');
  const products = useProductsQuery(query);
  const categories = useCategoriesQuery();
  useEffect(() => { setSearch(query.search ?? ''); }, [query.search]);
  const update = (changes: Record<string, string | undefined>) => setParameters(updateCatalogQuery(parameters, changes), { preventScrollReset: true });
  return (
    <Stack id="catalog" gap="xl" py="xl" component="section" aria-labelledby="catalog-title">
      <div><Text size="sm" c="dimmed">לבחור, לשלב, לשמח</Text><Title id="catalog-title" order={2}>הקטלוג שלנו</Title></div>
      <form onSubmit={(event) => { event.preventDefault(); update({ search: search.trim() || undefined }); }}>
        <Group align="end" grow>
          <TextInput label="חיפוש מוצרים" placeholder="מה תרצו למצוא?" value={search} maxLength={100}
            onChange={(event) => setSearch(event.currentTarget.value)} />
          <Select label="קטגוריה" placeholder="כל הקטגוריות" clearable value={query.categorySlug ?? null}
            data={(categories.data?.data ?? []).map((category) => ({ value: category.slug, label: category.name }))}
            onChange={(value) => update({ categorySlug: value ?? undefined })} />
          <Select label="מיון" value={`${query.sort}:${query.direction}`} allowDeselect={false}
            data={[{ value: 'display:asc', label: 'סדר הקטלוג' }, { value: 'name:asc', label: 'שם א–ת' },
              { value: 'name:desc', label: 'שם ת–א' }, { value: 'price:asc', label: 'מחיר מהנמוך לגבוה' },
              { value: 'price:desc', label: 'מחיר מהגבוה לנמוך' }]}
            onChange={(value) => { if (value) { const [sort, direction] = value.split(':'); update({ sort, direction }); } }} />
          <Button type="submit">חיפוש</Button>
        </Group>
      </form>
      {categories.isError && <Alert color="orange" title="הקטגוריות לא נטענו">אפשר לחפש מוצרים או <Button variant="subtle" onClick={() => void categories.refetch()}>לנסות שוב</Button></Alert>}
      {products.isPending && <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} aria-label="טעינת מוצרים">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} h={320} />)}
      </SimpleGrid>}
      {products.isError && <Alert color="red" title="לא ניתן לטעון את הקטלוג" role="alert">
        <Text>בדקו את החיבור ונסו שוב.</Text><Button mt="sm" onClick={() => void products.refetch()}>ניסיון נוסף</Button>
      </Alert>}
      {products.data && <>
        <Text size="sm" c="dimmed" aria-live="polite">{products.data.page.totalItems} מוצרים</Text>
        {products.data.data.length === 0 ? <Stack align="center" py="xl"><Title order={3}>לא נמצאו מוצרים</Title>
          <Text c="dimmed">אפשר לשנות את החיפוש או לחזור לכל הקטלוג.</Text>
          <Button variant="outline" onClick={() => setParameters({})}>ניקוי סינון</Button></Stack>
          : <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} spacing="lg">{products.data.data.map((product) => <ProductCard key={product.productId} product={product} />)}</SimpleGrid>}
        {products.data.page.totalPages > 1 && <Pagination total={products.data.page.totalPages} value={query.page}
          onChange={(page) => update({ page: String(page) })} aria-label="עמודי קטלוג" />}
      </>}
    </Stack>
  );
}
