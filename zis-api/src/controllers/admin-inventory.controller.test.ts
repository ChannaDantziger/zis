import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import type { InventoryService } from '../inventory/inventory.service.js';
import { createAdminInventoryController, type AdminUserResolution } from './admin-inventory.controller.js';
import { errorHandler } from '../middleware/error-handler.js';

function setup(identity: AdminUserResolution, failure?: Error) {
  const calls: unknown[] = [];
  const service = { updateByAdmin: async (input: unknown) => { calls.push(input); if (failure) throw failure; return { stockBefore: 1, stockAfter: 2 }; } } as unknown as InventoryService;
  let statusCode = 200; let payload: unknown;
  const headers: Record<string, string> = {};
  const response = { locals: {}, status: (status: number) => { statusCode = status; return response; }, json: (body: unknown) => { payload = body; }, setHeader: (key: string, value: string) => { headers[key] = value; } } as unknown as Response;
  const request = { params: { productVariantId: 'variant' }, body: { deltaSets: 1, reason: 'Manual restock' } } as unknown as Request;
  return { calls, response, request, headers, controller: createAdminInventoryController(service, async () => identity), result: () => ({ statusCode, payload }) };
}
const manager: AdminUserResolution = { status: 'authenticated', adminUserId: 'manager', role: 'operations_manager' };
for (const identity of [{ status: 'unauthenticated' }, { status: 'forbidden' }, { status: 'authenticated', adminUserId: 'driver', role: 'delivery_driver' }, { status: 'authenticated', adminUserId: 'unknown' }] as AdminUserResolution[]) {
  test(`inventory write rejects ${JSON.stringify(identity)} before service access`, async () => {
    const fixture = setup(identity); await fixture.controller(fixture.request, fixture.response);
    assert.equal(fixture.result().statusCode, identity.status === 'unauthenticated' ? 401 : 403);
    assert.deepEqual(fixture.calls, []);
  });
}
test('manager adjustment rejects invalid body without a write and successful response is not cached', async () => {
  for (const body of [undefined, {}, { deltaSets: 0, reason: 'x' }, { deltaSets: 1.5, reason: 'x' }, { deltaSets: 1, reason: '  ' }]) {
    const fixture = setup(manager); fixture.request.body = body;
    await fixture.controller(fixture.request, fixture.response);
    assert.equal(fixture.result().statusCode, 400); assert.deepEqual(fixture.calls, []);
  }
  const fixture = setup(manager); await fixture.controller(fixture.request, fixture.response);
  assert.equal(fixture.calls.length, 1); assert.equal(fixture.headers['Cache-Control'], 'no-store');
});
test('unexpected inventory errors reach central sanitizer instead of exposing SQL details', async () => {
  const privateError = new Error('private SQL credentials fixture'); const fixture = setup(manager, privateError);
  const oldConsoleError = console.error; console.error = () => {};
  try {
    await assert.rejects(fixture.controller(fixture.request, fixture.response), (error: unknown) => {
      assert.equal(error, privateError); errorHandler(error, fixture.request, fixture.response, () => {}); return true;
    });
    assert.equal(fixture.result().statusCode, 500);
    assert.ok(!JSON.stringify(fixture.result().payload).includes(privateError.message));
  } finally { console.error = oldConsoleError; }
});