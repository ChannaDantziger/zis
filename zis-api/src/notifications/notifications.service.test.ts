import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../http/api-error.js';
import { createNotificationsService } from './notifications.service.js';
import type { NotificationsRepository } from './notifications.types.js';

function fixture() {
  const calls: unknown[] = [];
  const repository = { list: async (...input: unknown[]) => { calls.push(input); return {}; }, markRead: async (...input: unknown[]) => { calls.push(input); return {}; }, updatePreferences: async (...input: unknown[]) => { calls.push(input); return {}; }, getPreferences: async () => ({ pushNewOrderEnabled: true, pushActionRequiredEnabled: true }) } as unknown as NotificationsRepository;
  return { calls, service: createNotificationsService(repository) };
}
test('invalid filter and unbounded pagination stop before repository access', () => {
  const { calls, service } = fixture();
  const base = { filter: 'all', page: 1, pageSize: 24 } as const;
  for (const patch of [{ filter: 'invalid' as never }, { page: 0 }, { page: 1.5 }, { pageSize: 51 }, { page: Number.MAX_SAFE_INTEGER }]) {
    assert.throws(() => service.list({ ...base, ...patch }, 'owner'), (error: unknown) => error instanceof ApiError && error.statusCode === 400);
  }
  assert.deepEqual(calls, []);
});
test('preferences allow nonempty boolean patches only, excluding identity and tokens', async () => {
  const { calls, service } = fixture();
  for (const input of [null, [], {}, { pushNewOrderEnabled: 'false' }, { adminUserId: 'other' }, { pushToken: 'fixture' }, { pushActionRequiredEnabled: true, unknown: false }]) {
    assert.throws(() => service.updatePreferences(input as never, 'owner'), (error: unknown) => error instanceof ApiError && error.statusCode === 400);
  }
  assert.deepEqual(calls, []);
  await service.updatePreferences({ pushNewOrderEnabled: false }, 'owner');
  assert.deepEqual(calls, [[{ pushNewOrderEnabled: false }, 'owner']]);
});
test('notification ID must be UUID before access', () => {
  const { calls, service } = fixture();
  assert.throws(() => service.markRead("id' OR true", 'owner'), (error: unknown) => error instanceof ApiError && error.statusCode === 400);
  assert.deepEqual(calls, []);
});