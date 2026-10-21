import { useQuery } from '@tanstack/react-query';
import { apiRequest, ApiError } from '../../shared/api/http-client';
import type { CatalogCategory, CatalogProduct, CatalogQuery, CatalogResponse } from './types';

export function getProduct(productId: string, signal?: AbortSignal): Promise<CatalogProduct> {
  return apiRequest(`/catalog/${encodeURIComponent(productId)}`, { signal });
}

export function getProducts(query: CatalogQuery, signal?: AbortSignal): Promise<CatalogResponse> {
  const parameters = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') parameters.set(key, String(value));
  }
  return apiRequest(`/catalog?${parameters}`, { signal });
}

export function getCategories(signal?: AbortSignal): Promise<{ data: CatalogCategory[] }> {
  return apiRequest('/categories', { signal });
}

export function useProductQuery(productId: string | undefined) {
  return useQuery({ queryKey: ['product', productId],
    queryFn: ({ signal }) => getProduct(productId!, signal), enabled: Boolean(productId),
    retry: (attempt, error) => !(error instanceof ApiError && error.status === 404) && attempt < 1 });
}

export function useProductsQuery(query: CatalogQuery) {
  return useQuery({ queryKey: ['catalog', query], queryFn: ({ signal }) => getProducts(query, signal) });
}

export function useCategoriesQuery() {
  return useQuery({ queryKey: ['categories'], queryFn: ({ signal }) => getCategories(signal) });
}
