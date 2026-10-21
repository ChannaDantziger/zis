import { ApiError } from '../http/api-error.js';
import type { OperationReportQuery, OperationsReportsRepository, OperationsReportsService } from './operations-reports.types.js';

export const MAX_REPORT_SELECTION = 100;
export const MAX_REPORT_ORDERS = 500;
const MAX_CITY_LENGTH = 120;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createOperationsReportsService(repository: OperationsReportsRepository): OperationsReportsService {
  return {
    async read(kind, query) {
      const normalized = validateQuery(query);
      const report = await repository.read(kind, normalized);
      if (report.orders.length > MAX_REPORT_ORDERS) {
        throw new ApiError(413, 'REPORT_TOO_LARGE', 'הרשימה גדולה מדי. סנני לפי עיר או בחרי הזמנות מסוימות.');
      }
      if (normalized.orderIds && normalized.orderIds.some((id) => !report.orders.some((order) => order.orderId === id))) {
        throw new ApiError(409, 'REPORT_SELECTION_CHANGED', 'חלק מההזמנות שנבחרו אינן מתאימות לדוח. רענני את הרשימה ובחרי שוב.');
      }
      return report;
    },
  };
}

function validateQuery(query: OperationReportQuery): OperationReportQuery {
  const timestamp = Date.parse(`${query.date}T00:00:00Z`);
  if (!DATE_PATTERN.test(query.date) || Number.isNaN(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== query.date) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'date must be YYYY-MM-DD');
  }
  const city = query.city?.trim();
  if (city && city.length > MAX_CITY_LENGTH) throw new ApiError(400, 'VALIDATION_ERROR', 'city is too long');
  if (query.orderIds && (!query.orderIds.length || query.orderIds.length > MAX_REPORT_SELECTION || query.orderIds.some((id) => !UUID_PATTERN.test(id)))) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'orderIds must contain 1-100 UUIDs');
  }
  return { date: query.date, city: city || undefined, orderIds: query.orderIds ? [...new Set(query.orderIds.map((id) => id.toLowerCase()))] : undefined };
}