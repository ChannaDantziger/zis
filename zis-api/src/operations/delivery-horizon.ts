import { ApiError } from '../http/api-error.js';

export const MAX_DELIVERY_ADVANCE_DAYS = 366;

export function readDeliveryHorizon(values: Map<string, unknown>): number {
  const value = configuredDeliveryHorizon(values);
  if (value === null) {
    throw new ApiError(503, 'INVALID_DELIVERY_CONFIG', 'Delivery advance days must be configured in admin settings');
  }
  return value;
}

export function configuredDeliveryHorizon(values: Map<string, unknown>): number | null {
  const value = values.get('max_advance_days');
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_DELIVERY_ADVANCE_DAYS ? value : null;
}
