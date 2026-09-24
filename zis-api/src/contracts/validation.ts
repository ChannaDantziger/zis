import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, type PaginationQuery } from './common.contracts.js';
import type { CatalogQuery } from './catalog.contracts.js';

export class ContractValidationError extends Error {
  public constructor(public readonly fields: Record<string, string>) {
    super('Request validation failed');
    this.name = 'ContractValidationError';
  }
}

export function parsePagination(input: Record<string, unknown>): PaginationQuery {
  const page = parsePositiveInteger(input.page, 1);
  const pageSize = parsePositiveInteger(input.pageSize, DEFAULT_PAGE_SIZE);

  if (pageSize > MAX_PAGE_SIZE) {
    throw new ContractValidationError({ pageSize: `must be at most ${MAX_PAGE_SIZE}` });
  }

  return { page, pageSize };
}

export function parseCatalogQuery(input: Record<string, unknown>): CatalogQuery {
  const pagination = parsePagination({
    page: parseOptionalInteger(input.page),
    pageSize: parseOptionalInteger(input.pageSize),
  });
  const categorySlug = parseOptionalText(input.categorySlug, 'categorySlug');
  const search = parseOptionalText(input.search, 'search');
  const sort = parseEnum(input.sort, ['display', 'name', 'price'] as const, 'sort');
  const direction = parseEnum(input.direction, ['asc', 'desc'] as const, 'direction');

  if (search && search.length > 100) {
    throw new ContractValidationError({ search: 'must be at most 100 characters' });
  }

  return { page: pagination.page, pageSize: pagination.pageSize, categorySlug, search, sort, direction };
}

function parsePositiveInteger(value: unknown, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new ContractValidationError({ pagination: 'page and pageSize must be positive integers' });
  }

  return value;
}

function parseOptionalInteger(value: unknown): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new ContractValidationError({ pagination: 'page and pageSize must be positive integers' });
  }
  return Number(value);
}

function parseOptionalText(value: unknown, field: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string' || !value.trim()) {
    throw new ContractValidationError({ [field]: 'must be a non-empty string' });
  }
  return value.trim();
}

function parseEnum<T extends readonly string[]>(value: unknown, allowed: T, field: string): T[number] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw new ContractValidationError({ [field]: `must be one of ${allowed.join(', ')}` });
  }
  return value as T[number];
}
