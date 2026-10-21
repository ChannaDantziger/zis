import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import { ApiError } from '../http/api-error.js';
import { createAdminNotificationsController } from './admin-notifications.controller.js';
import { createNotificationsService } from '../notifications/notifications.service.js';
import type { NotificationsRepository } from '../notifications/notifications.types.js';
import type { AdminUserResolution } from './admin-inventory.controller.js';

function fixture(identity: AdminUserResolution) {
  const calls: unknown[] = []; const headers: Record<string, string> = {};
  const repository = Object.fromEntries(['list', 'markRead', 'getPreferences', 'updatePreferences'].map((method) => [method, async (...args: unknown[]) => { calls.push({ method, args }); return {}; }])) as unknown as NotificationsRepository;
  const response = { setHeader: (key: string, value: string) => { headers[key] = value; }, json: () => {} } as unknown as Response;
  return { calls, headers, response, controller: createAdminNotificationsController(createNotificationsService(repository), async () => identity) };
}
for (const identity of [{ status: 'unauthenticated' }, { status: 'forbidden' }, { status: 'authenticated', adminUserId: 'driver', role: 'delivery_driver' }, { status: 'authenticated', adminUserId: 'unknown' }] as AdminUserResolution[]) {
  test(`notification endpoints reject ${JSON.stringify(identity)} before access`, async () => {
    const f = fixture(identity);
    for (const method of ['list', 'markRead', 'getPreferences', 'updatePreferences'] as const) {
      await assert.rejects(f.controller[method]({ query: {}, body: {} } as unknown as Request, f.response), (error: unknown) => error instanceof ApiError && error.statusCode === (identity.status === 'unauthenticated' ? 401 : 403));
    }
    assert.deepEqual(f.calls, []);
  });
}
test('all notification operations bind to authenticated identity and use no-store', async () => {
  const f = fixture({ status: 'authenticated', adminUserId: 'owner', role: 'operations_manager' });
  const id = 'f997a78b-305a-49c6-8ad4-fb91dd39c4fe';
  const request = { query: { adminUserId: 'forged' }, params: { notificationId: id }, body: {} } as unknown as Request;
  await f.controller.list(request, f.response); await f.controller.getPreferences(request, f.response); await f.controller.markRead(request, f.response);
  request.body = { pushActionRequiredEnabled: false }; await f.controller.updatePreferences(request, f.response);
  assert.deepEqual(f.calls, [
    { method: 'list', args: [{ filter: 'all', page: 1, pageSize: 24 }, 'owner'] },
    { method: 'getPreferences', args: ['owner'] }, { method: 'markRead', args: [id, 'owner'] },
    { method: 'updatePreferences', args: [{ pushActionRequiredEnabled: false }, 'owner'] },
  ]);
  assert.equal(f.headers['Cache-Control'], 'no-store');
  request.body = { adminUserId: 'forged' };
  await assert.rejects(f.controller.markRead(request, f.response), (error: unknown) => error instanceof ApiError && error.statusCode === 400);
  await assert.rejects(f.controller.updatePreferences(request, f.response), (error: unknown) => error instanceof ApiError && error.statusCode === 400);
  assert.equal(f.calls.length, 4);
});