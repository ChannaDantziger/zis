export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 50;

export interface PaginationQuery {
  page: number;
  pageSize: number;
}

export interface PageInfo extends PaginationQuery {
  totalItems: number;
  totalPages: number;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
    requestId?: string;
  };
}

export interface ApiListResponse<T> {
  data: T[];
  page: PageInfo;
}

export type SortDirection = 'asc' | 'desc';
