import type { RequestHandler } from 'express';
import { ApiError } from '../http/api-error.js';

export interface RateLimitOptions {
  windowMilliseconds: number;
  maxRequests: number;
}

interface Counter {
  startedAt: number;
  count: number;
}

export function createRateLimitMiddleware(options: RateLimitOptions): RequestHandler {
  const counters = new Map<string, Counter>();

  return (request, _response, next) => {
    const now = Date.now();
    const key = request.ip || 'unknown';
    const current = counters.get(key);
    const counter = current && now - current.startedAt < options.windowMilliseconds
      ? current
      : { startedAt: now, count: 0 };

    counter.count += 1;
    counters.set(key, counter);

    if (counter.count > options.maxRequests) {
      next(new ApiError(429, 'RATE_LIMITED', 'Too many requests'));
      return;
    }

    next();
  };
}
