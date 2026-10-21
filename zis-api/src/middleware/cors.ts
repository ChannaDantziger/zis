import type { RequestHandler } from 'express';
import { ApiError } from '../http/api-error.js';

const ORIGIN_HEADER = 'Origin';
const ALLOW_HEADERS = 'Content-Type, Authorization, Idempotency-Key, X-Request-Id, X-File-Name';
const ALLOW_METHODS = 'GET, POST, PATCH, DELETE, OPTIONS';

export function createCorsMiddleware(allowedOrigins: readonly string[]): RequestHandler {
  return (request, response, next) => {
    const origin = request.header(ORIGIN_HEADER);
    if (!origin) {
      next();
      return;
    }

    if (!allowedOrigins.includes(origin)) {
      next(new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'Request origin is not allowed'));
      return;
    }

    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', ORIGIN_HEADER);
    response.setHeader('Access-Control-Allow-Headers', ALLOW_HEADERS);
    response.setHeader('Access-Control-Allow-Methods', ALLOW_METHODS);

    if (request.method === 'OPTIONS') {
      response.status(204).end();
      return;
    }

    next();
  };
}
