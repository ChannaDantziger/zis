import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import { createAdminDashboardController } from './admin-dashboard.controller.js';
import type { DashboardService } from '../dashboard/dashboard.types.js';
import type { AdminUserResolution } from './admin-inventory.controller.js';
import { ApiError } from '../http/api-error.js';

function setup(identity: AdminUserResolution) {
  const calls: unknown[][] = [];
  const service = { getDashboard: async (...args: unknown[]) => { calls.push(args); return {}; }, listOrders: async (...args: unknown[]) => { calls.push(args); return []; }, getProduction: async (...args: unknown[]) => { calls.push(args); return []; } } as unknown as DashboardService;
  const headers: Record<string, string> = {};
  const response = { setHeader: (key: string, value: string) => { headers[key] = value; }, json: () => {} } as unknown as Response;
  return { controller: createAdminDashboardController(service, async () => identity), response, calls, headers };
}
for (const identity of [{ status: 'unauthenticated' }, { status: 'forbidden' }, { status: 'authenticated', adminUserId: 'driver', role: 'delivery_driver' }, { status: 'authenticated', adminUserId: 'unknown' }] as AdminUserResolution[]) {
  test(`legacy dashboard/orders/production deny ${JSON.stringify(identity)} before reads`, async () => {
    const fixture = setup(identity);
    for (const method of ['dashboard', 'orders', 'production'] as const) {
      await assert.rejects(fixture.controller[method]({ query: { date: '2026-10-09', deliveryDate: '2026-10-09' } } as unknown as Request, fixture.response),
        (error: unknown) => error instanceof ApiError && error.statusCode === (identity.status === 'unauthenticated' ? 401 : 403));
    }
    assert.deepEqual(fixture.calls, []);
  });
}
test('dashboard scopes personal notification count to resolved identity and responses use no-store', async () => {
  const fixture = setup({ status: 'authenticated', adminUserId: 'manager', role: 'operations_manager' });
  const request = { query: { date: '2026-10-09', deliveryDate: '2026-10-09', adminUserId: 'forged' } } as unknown as Request;
  await fixture.controller.dashboard(request, fixture.response);
  assert.deepEqual(fixture.calls[0], ['2026-10-09', 'manager']);
  for (const method of ['orders', 'production'] as const) await fixture.controller[method](request, fixture.response);
  assert.equal(fixture.headers['Cache-Control'], 'no-store');
});