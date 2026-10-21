import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import { createAdminDashboardController } from './admin-dashboard.controller.js';
import { createDashboardService } from '../dashboard/dashboard.service.js';
import type { AdminUserResolution } from './admin-inventory.controller.js';
import type { DashboardRepository } from '../dashboard/dashboard.types.js';
import { ApiError } from '../http/api-error.js';

function setup(identity: AdminUserResolution) {
  const calls: unknown[] = [];
  const repository = { listOrderPage: async (query: unknown) => { calls.push(query); return { data: [], variants: [], page: { page: 1, pageSize: 24, totalItems: 0, totalPages: 0 } }; } } as unknown as DashboardRepository;
  const headers: Record<string, string> = {};
  const response = { setHeader: (key: string, value: string) => { headers[key] = value; }, json: () => {} } as unknown as Response;
  const controller = createAdminDashboardController(createDashboardService(repository), async () => identity);
  return { calls, headers, response, controller };
}

for (const identity of [{ status: 'unauthenticated' }, { status: 'forbidden' }, { status: 'authenticated', adminUserId: 'driver', role: 'delivery_driver' }, { status: 'authenticated', adminUserId: 'unknown' }] as AdminUserResolution[]) {
  test(`order page rejects ${identity.status} ${'role' in identity ? identity.role : ''} before data access`, async () => {
    const { calls, response, controller } = setup(identity);
    await assert.rejects(controller.orderPage({ query: { deliveryDate: '2026-10-09' } } as unknown as Request, response), (error: unknown) => error instanceof ApiError && error.statusCode === (identity.status === 'unauthenticated' ? 401 : 403));
    assert.deepEqual(calls, []);
  });
}

test('order page applies bounded defaults and no-store for an operations manager', async () => {
  const { calls, headers, response, controller } = setup({ status: 'authenticated', adminUserId: 'manager', role: 'operations_manager' });
  await controller.orderPage({ query: { deliveryDate: '2026-10-09' } } as unknown as Request, response);
  assert.equal(headers['Cache-Control'], 'no-store');
  assert.equal((calls[0] as { pageSize: number }).pageSize, 24);
  assert.equal((calls[0] as { page: number }).page, 1);
  for (const page of ['1e2', '0', ['1', '2']]) {
    await assert.rejects(controller.orderPage({ query: { deliveryDate: '2026-10-09', page } } as unknown as Request, response), (error: unknown) => error instanceof ApiError && error.statusCode === 400);
  }
  assert.equal(calls.length, 1);
});
