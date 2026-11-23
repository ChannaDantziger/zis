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
  // Expire inactive clients even when their IP never makes another request.
  const cleanupInterval = setInterval(() => {
    const cutoff = Date.now() - options.windowMilliseconds;
    for (const [key, counter] of counters) {
      if (counter.startedAt <= cutoff) counters.delete(key);
    }
  }, Math.max(1_000, Math.min(options.windowMilliseconds, 60_000)));
  cleanupInterval.unref();

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
