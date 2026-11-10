import { ApiError } from '../http/api-error.js';

export interface DeliveryPolicy {
  timezone: string;
  sameDayCutoffTime: string;
  maxAdvanceDays: number;
  workingDays: readonly number[];
  holidayDates: ReadonlySet<string>;
  storeOpen: boolean;
}

export function assertDeliveryDateAllowed(date: string, now: Date, policy: DeliveryPolicy): void {
  const requestedDate = parseDate(date);
  const localNow = getLocalParts(now, policy.timezone);
  const today = toUtcDate(localNow.year, localNow.month, localNow.day);
  const daysFromToday = Math.round((requestedDate.getTime() - today.getTime()) / DAY_MS);
  // Delivery is never offered on Friday or Saturday, even if working_days is misconfigured.
  if (requestedDate.getUTCDay() === 5 || requestedDate.getUTCDay() === 6) {
    throw new ApiError(422, 'BUSINESS_RULE_VIOLATION', 'Delivery is unavailable on Friday or Saturday');
  }

  if (!policy.storeOpen) {
    throw new ApiError(422, 'BUSINESS_RULE_VIOLATION', 'Store is closed');
  }
  if (daysFromToday < 0 || daysFromToday > policy.maxAdvanceDays) {
    throw new ApiError(422, 'BUSINESS_RULE_VIOLATION', 'Delivery date is outside the allowed range');
  }
  if (!policy.workingDays.includes(requestedDate.getUTCDay())) {
    throw new ApiError(422, 'BUSINESS_RULE_VIOLATION', 'Delivery date is not a working day');
  }
  if (policy.holidayDates.has(date)) {
    throw new ApiError(422, 'BUSINESS_RULE_VIOLATION', 'Delivery date is unavailable because of a holiday');
  }
  if (daysFromToday === 0 && formatMinutes(localNow.hour, localNow.minute) >= parseCutoff(policy.sameDayCutoffTime)) {
    throw new ApiError(422, 'BUSINESS_RULE_VIOLATION', 'Same-day delivery cutoff has passed');
  }
}

function parseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'deliveryDate must use YYYY-MM-DD');
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = toUtcDate(year, month, day);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'deliveryDate is invalid');
  }
  return date;
}

function getLocalParts(date: Date, timezone: string): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  return {
    year: Number(readPart(parts, 'year')),
    month: Number(readPart(parts, 'month')),
    day: Number(readPart(parts, 'day')),
    hour: Number(readPart(parts, 'hour')),
    minute: Number(readPart(parts, 'minute')),
  };
}

function readPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? '';
}

function toUtcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function parseCutoff(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'Business cutoff configuration is invalid');
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatMinutes(hour: number, minute: number): number {
  return hour * 60 + minute;
}

const DAY_MS = 24 * 60 * 60 * 1000;
