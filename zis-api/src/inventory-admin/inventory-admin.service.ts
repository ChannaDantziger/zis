import { ApiError } from '../http/api-error.js';
import { DEFAULT_PAGE_SIZE } from '../contracts/common.contracts.js';
import type { InventoryAdminRepository, InventoryAdminService } from './inventory-admin.types.js';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createInventoryAdminService(repository: InventoryAdminRepository): InventoryAdminService {
  return {
    list: async (page, week) => { validate(page, week); return repository.list(page, week); },
    details: async (id, page, week) => {
      validate(page, week);
      if (!UUID_PATTERN.test(id)) throw new ApiError(400, 'VALIDATION_ERROR', 'Variant identifier must be a UUID');
      const result = await repository.details(id, page, week);
      if (!result) throw new ApiError(404, 'VARIANT_NOT_FOUND', 'הווריאציה אינה קיימת או נמחקה');
      return result;
    },
  };
}
function validate(page: number, date: string) {
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger((page - 1) * DEFAULT_PAGE_SIZE)) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid page');
  if (!DATE_PATTERN.test(date) || Number.isNaN(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) throw new ApiError(400, 'VALIDATION_ERROR', 'weekStartDate must be YYYY-MM-DD');
}