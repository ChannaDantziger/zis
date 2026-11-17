import { ApiError } from '../http/api-error.js';
import type { HomeOrderRepository, HomeService } from './home.types.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 7;

export function createHomeService(repository: HomeOrderRepository, resolveImage: (path: string) => Promise<string>): HomeService {
  return { listOrders: async (from, to) => {
    validateRange(from, to);
    const orders = await repository.list(from, to);
    const paths = [...new Set(orders.flatMap(order => order.items.map(item => item.imagePath).filter((path): path is string => Boolean(path))))];
    const urls = new Map<string, string>();
    await Promise.all(paths.map(async path => {
      try { urls.set(path, await resolveImage(path)); } catch { /* image unavailable: preserve product name */ }
    }));
    for (const order of orders) for (const item of order.items) item.imageUrl = item.imagePath ? urls.get(item.imagePath) ?? null : null;
    return { from, to, orders };
  } };
}

function validateRange(from: string, to: string): void {
  const start = dateValue(from), end = dateValue(to);
  if (end < start || (end - start) / 86_400_000 > MAX_RANGE_DAYS) throw new ApiError(400, 'VALIDATION_ERROR', 'Date range must be 1–8 days');
}

function dateValue(value: string): number {
  const time = Date.parse(`${value}T00:00:00Z`);
  if (!DATE_PATTERN.test(value) || !Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value)
    throw new ApiError(400, 'VALIDATION_ERROR', 'date must be YYYY-MM-DD');
  return time;
}
