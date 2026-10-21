import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import type { AdminUserResolution } from './admin-inventory.controller.js';
import { createAdminInventoryReadController } from './admin-inventory-read.controller.js';
import type { InventoryAdminService } from '../inventory-admin/inventory-admin.types.js';
const request = { query: { weekStartDate: '2026-10-09' }, params: { productVariantId: '11111111-1111-4111-8111-111111111111' } } as unknown as Request;

test('inventory read endpoints forbid anonymous, inactive, driver and missing role before service', async () => {
  let calls = 0;
  const service: InventoryAdminService = { list: async () => { calls++; throw new Error(); }, details: async () => { calls++; throw new Error(); } };
  const identities: AdminUserResolution[] = [{ status: 'unauthenticated' }, { status: 'forbidden' }, { status: 'authenticated', adminUserId: 'id', role: 'delivery_driver' }, { status: 'authenticated', adminUserId: 'id' }];
  for (const identity of identities) {
    const controller = createAdminInventoryReadController(service, async () => identity);
    await assert.rejects(controller.list(request, {} as Response), { statusCode: identity.status === 'unauthenticated' ? 401 : 403 });
    await assert.rejects(controller.details(request, {} as Response), { statusCode: identity.status === 'unauthenticated' ? 401 : 403 });
  }
  assert.equal(calls, 0);
});
test('authorized manager read is no-store and malformed page is rejected', async () => {
  const headers: Record<string, unknown> = {};
  let payload: unknown;
  const service: InventoryAdminService = {
    list: async (page, weekStartDate) => ({ data: [], page: { page, pageSize: 24, totalItems: 0, totalPages: 0 }, weekStartDate }),
    details: async () => { throw new Error('unused'); },
  };
  const controller = createAdminInventoryReadController(service, async () => ({ status: 'authenticated', adminUserId: 'id', role: 'operations_manager' }));
  const response = { setHeader(name: string, value: unknown) { headers[name] = value; }, json(value: unknown) { payload = value; } } as unknown as Response;
  await controller.list(request, response);
  assert.equal(headers['Cache-Control'], 'no-store');
  assert.ok(payload);
  await assert.rejects(controller.list({ query: { weekStartDate: '2026-10-09', page: ['1', '2'] } } as unknown as Request, response), { code: 'VALIDATION_ERROR' });
});