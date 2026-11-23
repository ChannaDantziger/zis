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

test('configured weekdays including Friday and Saturday are allowed; unselected weekdays are rejected', () => {
  const everyDay = { ...policy, workingDays: [0, 1, 2, 3, 4, 5, 6] };
  const now = new Date('2026-09-24T05:30:00.000Z');
  for (let day = 24; day <= 30; day++) {
    assert.doesNotThrow(() => assertDeliveryDateAllowed(`2026-09-${day}`, now, everyDay));
  }
  assert.throws(() => assertDeliveryDateAllowed('2026-09-25', now, policy), /not a working day/);
  assert.throws(() => assertDeliveryDateAllowed('2026-09-26', now, policy), /not a working day/);
});

test('delivery horizon includes the final calendar day and rejects past and later dates', () => {
  const now = new Date('2026-09-24T05:30:00.000Z');
  const everyDay = { ...policy, workingDays: [0, 1, 2, 3, 4, 5, 6], maxAdvanceDays: 3 };
  assert.throws(() => assertDeliveryDateAllowed('2026-09-23', now, everyDay), /outside the allowed range/);
  assert.doesNotThrow(() => assertDeliveryDateAllowed('2026-09-27', now, everyDay));
  assert.throws(() => assertDeliveryDateAllowed('2026-09-28', now, everyDay), /outside the allowed range/);
  assert.throws(() => assertDeliveryDateAllowed('2026-09-27', now, { ...everyDay, maxAdvanceDays: 2 }), /outside the allowed range/);
});
