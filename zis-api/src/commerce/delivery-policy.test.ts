import assert from 'node:assert/strict';
import test from 'node:test';
import { assertDeliveryDateAllowed } from './delivery-policy.js';

const policy = {
  timezone: 'Asia/Jerusalem',
  sameDayCutoffTime: '09:00',
  maxAdvanceDays: 7,
  workingDays: [0, 1, 2, 3, 4],
  holidayDates: new Set<string>(),
  storeOpen: true,
};

test('delivery policy allows a working day before same-day cutoff', () => {
  assert.doesNotThrow(() => assertDeliveryDateAllowed('2026-09-24', new Date('2026-09-24T05:30:00.000Z'), policy));
});

test('delivery policy blocks same-day after cutoff and holidays', () => {
  assert.throws(() => assertDeliveryDateAllowed('2026-09-24', new Date('2026-09-24T07:00:00.000Z'), policy), /cutoff/);
  assert.throws(() => assertDeliveryDateAllowed('2026-09-27', new Date('2026-09-24T05:30:00.000Z'), { ...policy, holidayDates: new Set(['2026-09-27']) }), /holiday/);
});

test('Friday and Saturday remain blocked even if configured as working days', () => {
  const misconfigured = { ...policy, workingDays: [0, 1, 2, 3, 4, 5, 6] };
  const now = new Date('2026-09-24T05:30:00.000Z');
  assert.throws(() => assertDeliveryDateAllowed('2026-09-25', now, misconfigured), /Friday or Saturday/);
  assert.throws(() => assertDeliveryDateAllowed('2026-09-26', now, misconfigured), /Friday or Saturday/);
});
