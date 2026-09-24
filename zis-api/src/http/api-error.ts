import type { Request } from 'express';

export class ApiError extends Error {
  public constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function requestIdFrom(request: Request): string | undefined {
  return request.res?.locals.requestId;
}
