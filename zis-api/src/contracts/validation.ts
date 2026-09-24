import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, type PaginationQuery } from './common.contracts.js';

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

function parsePositiveInteger(value: unknown, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new ContractValidationError({ pagination: 'page and pageSize must be positive integers' });
  }

  return value;
}
