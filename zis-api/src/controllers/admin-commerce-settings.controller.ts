import type { Request, Response } from 'express';
import { ApiError } from '../http/api-error.js';
import type { AdminUserResolver } from './admin-inventory.controller.js';
import type { CommerceSettingsService } from '../operations/commerce-settings.types.js';
import { MAX_DELIVERY_ADVANCE_DAYS } from '../operations/delivery-horizon.js';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const LOCK_MODES = ['open', 'closed', 'scheduled'] as const;

export function createAdminCommerceSettingsController(service: CommerceSettingsService, resolveAdminUserId: AdminUserResolver) {
  return {
    get: withAdmin(resolveAdminUserId, async (_request, response) => { response.status(200).json(await service.getSettings()); }),
    updateBusiness: withManager(resolveAdminUserId, async (request, response, adminUserId) => {
      const body = asRecord(request.body);
      response.status(200).json(await service.updateBusinessSettings({
        storeOpen: optionalBoolean(body.storeOpen, 'storeOpen'),
        lockMode: optionalEnum(body.lockMode, LOCK_MODES, 'lockMode'),
        lockMessage: optionalNullableText(body.lockMessage, 'lockMessage'),
        minimumProductSubtotal: optionalMoney(body.minimumProductSubtotal, 'minimumProductSubtotal'),
        maxAdvanceDays: optionalDeliveryHorizon(body.maxAdvanceDays),
        dispatchTime: optionalTime(body.dispatchTime, 'dispatchTime'),
        sameDayCutoffTime: body.sameDayCutoffTime === undefined ? undefined : time(body.sameDayCutoffTime, 'sameDayCutoffTime'),
        workingDays: optionalDays(body.workingDays),
        businessTimezone: optionalText(body.businessTimezone, 'businessTimezone'),
        blockHolidayEves: optionalBoolean(body.blockHolidayEves, 'blockHolidayEves'),
        deliveryCalendarCountry: optionalText(body.deliveryCalendarCountry, 'deliveryCalendarCountry'),
        orderPreparationStatus: optionalText(body.orderPreparationStatus, 'orderPreparationStatus'),
      }, adminUserId));
    }),
    createZone: withManager(resolveAdminUserId, async (request, response, adminUserId) => {
      const body = asRecord(request.body);
      response.status(201).json(await service.createShippingZone({ name: requiredText(body.name, 'name'), city: requiredText(body.city, 'city'), basePrice: money(body.basePrice, 'basePrice'), neighborhood: nullableText(body.neighborhood, 'neighborhood'), dispatchTime: nullableTime(body.dispatchTime, 'dispatchTime'), isActive: requiredBoolean(body.isActive, 'isActive') }, adminUserId));
    }),
    updateZone: withManager(resolveAdminUserId, async (request, response, adminUserId) => {
      const body = asRecord(request.body);
      response.status(200).json(await service.updateShippingZone({ shippingZoneId: uuid(request.params.shippingZoneId, 'shippingZoneId'), name: optionalText(body.name, 'name'), city: optionalText(body.city, 'city'), neighborhood: optionalNullableText(body.neighborhood, 'neighborhood'), dispatchTime: optionalTime(body.dispatchTime, 'dispatchTime'), isActive: optionalBoolean(body.isActive, 'isActive') }, adminUserId));
    }),
    createRule: withManager(resolveAdminUserId, async (request, response, adminUserId) => {
      const body = asRecord(request.body);
      response.status(201).json(await service.createShippingRule(readRule(body), adminUserId));
    }),
    updateRule: withManager(resolveAdminUserId, async (request, response, adminUserId) => {
      const body = asRecord(request.body);
      const sizeFromSets = optionalPositiveInteger(body.sizeFromSets, 'sizeFromSets');
      const sizeToSets = body.sizeToSets === undefined || body.sizeToSets === null ? body.sizeToSets as null | undefined : nonNegativeInteger(body.sizeToSets, 'sizeToSets');
      if (sizeFromSets !== undefined && sizeToSets !== undefined && sizeToSets !== null && sizeToSets < sizeFromSets) throw invalid('sizeToSets must be greater than or equal to sizeFromSets');
      response.status(200).json(await service.updateShippingRule({ shippingRuleId: uuid(request.params.shippingRuleId, 'shippingRuleId'), shippingZoneId: body.shippingZoneId === undefined ? undefined : uuid(body.shippingZoneId, 'shippingZoneId'), basePrice: optionalMoney(body.basePrice, 'basePrice'), sizeFromSets, sizeToSets, sizeSurcharge: optionalMoney(body.sizeSurcharge, 'sizeSurcharge'), timeSurcharge: optionalMoney(body.timeSurcharge, 'timeSurcharge'), urgencySurcharge: optionalMoney(body.urgencySurcharge, 'urgencySurcharge'), isActive: optionalBoolean(body.isActive, 'isActive') }, adminUserId));
    }),
    createClosure: withManager(resolveAdminUserId, async (request, response, adminUserId) => {
      const body = asRecord(request.body);
      const startsAt = requiredDate(body.startsAt, 'startsAt');
      const endsAt = requiredDate(body.endsAt, 'endsAt');
      ensureDateOrder(startsAt, endsAt);
      response.status(201).json(await service.createClosure({ startsAt, endsAt, reason: nullableText(body.reason, 'reason'), isActive: requiredBoolean(body.isActive, 'isActive') }, adminUserId));
    }),
    updateClosure: withManager(resolveAdminUserId, async (request, response, adminUserId) => {
      const body = asRecord(request.body);
      const startsAt = optionalDate(body.startsAt, 'startsAt');
      const endsAt = optionalDate(body.endsAt, 'endsAt');
      if (startsAt && endsAt) ensureDateOrder(startsAt, endsAt);
      response.status(200).json(await service.updateClosure({ storeClosureId: uuid(request.params.storeClosureId, 'storeClosureId'), startsAt, endsAt, reason: optionalNullableText(body.reason, 'reason'), isActive: optionalBoolean(body.isActive, 'isActive') }, adminUserId));
    }),
  };
}

function readRule(body: Record<string, unknown>) {
  const sizeToSets = body.sizeToSets === undefined || body.sizeToSets === null ? null : nonNegativeInteger(body.sizeToSets, 'sizeToSets');
  const sizeFromSets = positiveInteger(body.sizeFromSets, 'sizeFromSets');
  if (sizeToSets !== null && sizeToSets < sizeFromSets) throw invalid('sizeToSets must be greater than or equal to sizeFromSets');
  return { shippingZoneId: uuid(body.shippingZoneId, 'shippingZoneId'), basePrice: money(body.basePrice, 'basePrice'), sizeFromSets, sizeToSets, sizeSurcharge: money(body.sizeSurcharge || '0', 'sizeSurcharge'), timeSurcharge: money(body.timeSurcharge || '0', 'timeSurcharge'), urgencySurcharge: money(body.urgencySurcharge || '0', 'urgencySurcharge'), isActive: requiredBoolean(body.isActive, 'isActive') };
}

function withAdmin(resolve: AdminUserResolver, handler: (request: Request, response: Response, adminUserId: string) => Promise<Response | void>) {
  return async (request: Request, response: Response): Promise<void> => {
    const identity = await resolve(request);
    if (identity.status === 'unauthenticated') throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
    if (identity.status === 'forbidden') throw new ApiError(403, 'ADMIN_ACCESS_REQUIRED', 'Active admin access required');
    await handler(request, response, identity.adminUserId);
  };
}

function withManager(resolve: AdminUserResolver, handler: (request: Request, response: Response, adminUserId: string) => Promise<Response | void>) {
  return async (request: Request, response: Response): Promise<void> => {
    const identity = await resolve(request);
    if (identity.status === 'unauthenticated') throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
    if (identity.status === 'forbidden') throw new ApiError(403, 'ADMIN_ACCESS_REQUIRED', 'Active admin access required');
    if (identity.role !== 'operations_manager') throw new ApiError(403, 'OPERATIONS_MANAGER_REQUIRED', 'Operations manager access required');
    await handler(request, response, identity.adminUserId);
  };
}

function asRecord(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid('JSON object body is required'); return value as Record<string, unknown>; }
function invalid(message: string): ApiError { return new ApiError(400, 'VALIDATION_ERROR', message); }
function requiredText(value: unknown, field: string): string { const result = optionalText(value, field); if (!result) throw invalid(`${field} is required`); return result; }
function optionalText(value: unknown, field: string): string | undefined { if (value === undefined) return undefined; if (typeof value !== 'string' || !value.trim()) throw invalid(`${field} must be a non-empty string`); return value.trim(); }
function nullableText(value: unknown, field: string): string | null { if (value === null || value === undefined) return null; return requiredText(value, field); }
function optionalNullableText(value: unknown, field: string): string | null | undefined { if (value === undefined) return undefined; return nullableText(value, field); }
function requiredBoolean(value: unknown, field: string): boolean { if (typeof value !== 'boolean') throw invalid(`${field} must be boolean`); return value; }
function optionalBoolean(value: unknown, field: string): boolean | undefined { if (value === undefined) return undefined; return requiredBoolean(value, field); }
function number(value: unknown, field: string): number { if (typeof value !== 'number' || !Number.isFinite(value)) throw invalid(`${field} must be a number`); return value; }
function positiveInteger(value: unknown, field: string): number { const result = number(value, field); if (!Number.isInteger(result) || result < 1) throw invalid(`${field} must be a positive integer`); return result; }
function optionalPositiveInteger(value: unknown, field: string): number | undefined { return value === undefined ? undefined : positiveInteger(value, field); }
function nonNegativeInteger(value: unknown, field: string): number { const result = number(value, field); if (!Number.isInteger(result) || result < 0) throw invalid(`${field} must be a non-negative integer`); return result; }
function optionalNonNegativeInteger(value: unknown, field: string): number | undefined { return value === undefined ? undefined : nonNegativeInteger(value, field); }
function optionalDeliveryHorizon(value: unknown): number | undefined { const result = optionalNonNegativeInteger(value, 'maxAdvanceDays'); if (result !== undefined && result > MAX_DELIVERY_ADVANCE_DAYS) throw invalid('maxAdvanceDays exceeds the supported limit'); return result; }
function money(value: unknown, field: string): string { if ((typeof value !== 'string' && typeof value !== 'number') || !/^\d+(\.\d{1,2})?$/.test(String(value))) throw invalid(`${field} must be a non-negative amount with up to two decimals`); return Number(value).toFixed(2); }
function optionalMoney(value: unknown, field: string): string | undefined { return value === undefined ? undefined : money(value, field); }
function time(value: unknown, field: string): string { if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw invalid(`${field} must use HH:mm format`); return value; }
function nullableTime(value: unknown, field: string): string | null { return value === null || value === undefined ? null : time(value, field); }
function optionalTime(value: unknown, field: string): string | null | undefined { return value === undefined ? undefined : nullableTime(value, field); }
function requiredDate(value: unknown, field: string): string { if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw invalid(`${field} must be a valid ISO date-time`); return value; }
function optionalDate(value: unknown, field: string): string | undefined { return value === undefined ? undefined : requiredDate(value, field); }
function ensureDateOrder(startsAt: string, endsAt: string): void { if (Date.parse(endsAt) <= Date.parse(startsAt)) throw invalid('endsAt must be after startsAt'); }
function uuid(value: unknown, field: string): string { const result = requiredText(value, field); if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)) throw invalid(`${field} must be a UUID`); return result; }
function optionalEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T | undefined { if (value === undefined) return undefined; if (typeof value !== 'string' || !allowed.includes(value as T)) throw invalid(`${field} is invalid`); return value as T; }
function optionalDays(value: unknown): string[] | undefined { if (value === undefined) return undefined; if (!Array.isArray(value) || !value.length || value.some((day) => typeof day !== 'string' || !DAYS.includes(day as typeof DAYS[number]))) throw invalid('workingDays must contain valid delivery days'); return [...new Set(value as string[])]; }
