import { ActionIcon, Alert, Button, Collapse, Group, Pagination, Select, SimpleGrid, Skeleton, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useCategoriesQuery, useProductsQuery } from '../../entities/product/api';
import { getProducts } from '../../entities/product/api';
import { apiRequest } from '../../shared/api/http-client';
import { BundleCard } from '../bundles/BundleCard';
import { BundleModal } from '../bundles/BundleModal';
import { initialSelection, priceAgorot } from '../bundles/allocation';
import { productWindow } from '../bundles/pagination';
import type { BundleResponse } from '../bundles/types';
import { ProductCard } from './ProductCard';
import { BUNDLE_PURCHASE_ENABLED } from '../bundles/feature';
import { useStoreStatus } from '../../shared/store-status';
import { cartStore } from '../../stores/cart.store';
import { readCatalogQuery, updateCatalogQuery } from './query';

export function CatalogSection() {
  const [parameters, setParameters] = useSearchParams();
  const query = readCatalogQuery(parameters);
  const [search, setSearch] = useState(query.search ?? '');
  const [filtersOpen, setFiltersOpen] = useState(Boolean(query.search || query.categorySlug));
  const products = useProductsQuery({ ...query, page: 1 });
  const categories = useCategoriesQuery();
  const storeStatus = useStoreStatus();
  const bundles = useQuery({ queryKey: ['bundle-preview'], queryFn: ({ signal }) => apiRequest<BundleResponse>('/bundle-preview', { signal }) });
  const compositions = useMemo(() => (bundles.data?.bundles ?? []).map(bundle => {
    const items = (bundles.data?.products ?? []).filter(item => item.categoryId === bundle.categoryId);
    return { bundle, items, initial: initialSelection(items, bundle.unitCount) };
  }), [bundles.data]);
  const [selected, setSelected] = useState<(typeof compositions)[number] | null>(null);
  const filtered = useMemo(() => {
    const searchTerm = (query.search ?? '').toLocaleLowerCase('he-IL');
    const result = compositions.filter(item => (!query.categorySlug || item.bundle.categorySlug === query.categorySlug)
      && (!searchTerm || `${item.bundle.name} ${item.bundle.description ?? ''}`.toLocaleLowerCase('he-IL').includes(searchTerm)));
    if (query.sort === 'name') result.sort((a, b) => a.bundle.name.localeCompare(b.bundle.name, 'he') * (query.direction === 'asc' ? 1 : -1));
    if (query.sort === 'price') result.sort((a, b) => {
      if (!a.initial) return b.initial ? 1 : 0;
      if (!b.initial) return -1;
      const aPrice = priceAgorot(a.items, a.initial), bPrice = priceAgorot(b.items, b.initial);
      return (aPrice === bPrice ? 0 : aPrice < bPrice ? -1 : 1) * (query.direction === 'asc' ? 1 : -1);
    });
    return result;
  }, [compositions, query.categorySlug, query.search, query.sort, query.direction]);
  const bundleCount = bundles.isError ? 0 : filtered.length;
  const { start, productStart, productEnd, pageNumbers } = productWindow(query.page, query.pageSize, bundleCount);
  const pages = useQuery({
    queryKey: ['catalog-combined', query, bundleCount],
    enabled: Boolean(products.data && !bundles.isPending),
    queryFn: async ({ signal }) => Promise.all(pageNumbers.map(page => page === 1 && products.data ? Promise.resolve(products.data) : getProducts({ ...query, page }, signal))),
  });
  const productItems = pages.data?.flatMap(page => page.data).slice(productStart % query.pageSize, productStart % query.pageSize + productEnd - productStart) ?? [];
  const totalItems = (products.data?.page.totalItems ?? 0) + bundleCount;
  const totalPages = Math.ceil(totalItems / query.pageSize);
  useEffect(() => { setSearch(query.search ?? ''); }, [query.search]);
  const update = (changes: Record<string, string | undefined>) => setParameters(updateCatalogQuery(parameters, changes), { preventScrollReset: true });
  return (
    <Stack id="catalog" gap="xl" py="xl" component="section" aria-labelledby="catalog-title">
      <Group justify="space-between"><div><Text size="sm" c="dimmed">לבחור, לשלב, לשמח</Text><Title id="catalog-title" tabIndex={-1} order={2}>הקטלוג שלנו</Title></div>
        <ActionIcon size="xl" variant="outline" aria-label="חיפוש וסינון מוצרים" aria-expanded={filtersOpen} aria-controls="catalog-filters" onClick={() => setFiltersOpen((open) => !open)}><IconSearch /></ActionIcon></Group>
      <Collapse in={filtersOpen} id="catalog-filters">
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
      <Button mt="sm" variant="subtle" onClick={() => { setSearch(''); setParameters({}); }}>ניקוי סינון</Button>
      </Collapse>
      {categories.isError && <Alert color="orange" title="הקטגוריות לא נטענו">אפשר לחפש מוצרים או <Button variant="subtle" onClick={() => void categories.refetch()}>לנסות שוב</Button></Alert>}
      {(products.isPending || bundles.isPending || pages.fetchStatus === 'fetching') && <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} aria-label="טעינת מוצרים">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} h={320} />)}
      </SimpleGrid>}
      {products.isError && <Alert color="red" title="לא ניתן לטעון את הקטלוג" role="alert">
        <Text>בדקו את החיבור ונסו שוב.</Text><Button mt="sm" onClick={() => void products.refetch()}>ניסיון נוסף</Button>
      </Alert>}
      {bundles.isError && <Alert color="orange" title="לא ניתן לטעון את המארזים"><Button variant="subtle" onClick={() => void bundles.refetch()}>ניסיון נוסף</Button></Alert>}
      {pages.isError && <Alert color="red" title="לא ניתן לטעון את המוצרים"><Button variant="subtle" onClick={() => void pages.refetch()}>ניסיון נוסף</Button></Alert>}
      {products.data && pages.data && !bundles.isPending && <>
        {totalItems === 0 ? <Stack align="center" py="xl"><Title order={3}>לא נמצאו מוצרים או מארזים</Title>
          <Text c="dimmed">אפשר לשנות את החיפוש או לחזור לכל הקטלוג.</Text>
          <Button variant="outline" onClick={() => setParameters({})}>ניקוי סינון</Button></Stack>
          : <Stack gap="xl">
            <Stack component="section" aria-labelledby="catalog-bundles-title" gap="md">
              <Title id="catalog-bundles-title" order={3} size="h4">מארזים</Title>
              {filtered.slice(start, start + query.pageSize).length > 0
                ? <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} spacing="lg">
                  {filtered.slice(start, start + query.pageSize).map(item => <BundleCard key={item.bundle.bundleId} bundle={item.bundle} products={item.items} initial={item.initial} onOpen={() => setSelected(item)} />)}
                </SimpleGrid>
                : <Text c="dimmed">{bundles.isError ? 'המארזים לא נטענו.' : 'אין מארזים להצגה בעמוד זה.'}</Text>}
            </Stack>
            <Stack component="section" aria-labelledby="catalog-products-title" gap="md">
              <Title id="catalog-products-title" order={3} size="h4">מוצרים</Title>
              {productItems.length > 0
                ? <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} spacing="lg">
                  {productItems.map(product => <ProductCard key={product.productId} product={product} />)}
                </SimpleGrid>
                : <Text c="dimmed">אין מוצרים להצגה בעמוד זה.</Text>}
            </Stack>
          </Stack>}
        {totalPages > 1 && <Pagination total={totalPages} value={query.page}
          onChange={(page) => update({ page: String(page) })} aria-label="עמודי קטלוג" />}
      </>}
      {selected && <BundleModal key={selected.bundle.bundleId} bundle={selected.bundle} products={selected.items} initial={selected.initial} onClose={() => setSelected(null)}
        {...(BUNDLE_PURCHASE_ENABLED ? { saveLabel: 'הוספה לסל', onSave: (selection: Record<string, number>, quantity: number) => {
          if (storeStatus.data?.storeOpen !== true || !bundles.data) return 'החנות סגורה להזמנות או שפרטי המארז אינם זמינים.';
          const components = Object.entries(selection).filter(([, amount]) => amount > 0).map(([productId, amount]) => ({ productId, quantity: amount }));
          if (!cartStore.addBundle({ bundleId: selected.bundle.bundleId, quantity, components }, bundles.data)) return cartStore.bundleError || 'לא ניתן להוסיף את המארז לסל.';
          cartStore.open(); return null;
        } } : {})} />}
    </Stack>
  );
}
