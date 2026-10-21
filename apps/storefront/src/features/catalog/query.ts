import type { CatalogQuery } from '../../entities/product/types';

export const CATALOG_PAGE_SIZE = 24;
const SEARCH_LIMIT = 100;

export function readCatalogQuery(parameters: URLSearchParams): CatalogQuery {
  const sort = parameters.get('sort');
  const page = Number(parameters.get('page') ?? 1);
  return {
    categorySlug: parameters.get('categorySlug')?.trim() || undefined,
    search: parameters.get('search')?.trim().slice(0, SEARCH_LIMIT) || undefined,
    sort: sort === 'name' || sort === 'price' ? sort : 'display',
    direction: parameters.get('direction') === 'desc' ? 'desc' : 'asc',
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    pageSize: CATALOG_PAGE_SIZE,
  };
}

export function updateCatalogQuery(current: URLSearchParams, changes: Record<string, string | undefined>): URLSearchParams {
  const parameters = new URLSearchParams(current);
  for (const [key, value] of Object.entries(changes)) {
    if (value) parameters.set(key, value);
    else parameters.delete(key);
  }
  if (!('page' in changes)) parameters.delete('page');
  return parameters;
}
