import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import { createAdminOperationsReportsController } from './admin-operations-reports.controller.js';
import type { AdminUserResolution } from './admin-inventory.controller.js';

const request = { query: { date: '2026-10-09' } } as unknown as Request;

test('both private reports reject anonymous, forbidden, drivers and missing roles before data read', async () => {
  let reads = 0;
  const service = { read: async () => { reads += 1; throw new Error('must not read'); } };
  const identities: AdminUserResolution[] = [
    { status: 'unauthenticated' }, { status: 'forbidden' },
    { status: 'authenticated', adminUserId: 'test', role: 'delivery_driver' },
    { status: 'authenticated', adminUserId: 'test' },
  ];
  for (const identity of identities) {
    const controller = createAdminOperationsReportsController(service, async () => identity);
    for (const handler of [controller.packing, controller.delivery]) {
      await assert.rejects(handler(request, {} as Response), { statusCode: identity.status === 'unauthenticated' ? 401 : 403 });
    }
  }
  assert.equal(reads, 0);
});

test('manager report sets no-store and rejects ambiguous repeated query values', async () => {
  let reads = 0;
  const headers: Record<string, unknown> = {};
  let payload: unknown;
  const controller = createAdminOperationsReportsController({ read: async (kind, query) => {
    reads += 1;
    return { kind, date: query.date, generatedAt: '2026-10-09T10:00:00Z', orders: [] };
  } }, async () => ({ status: 'authenticated', adminUserId: 'test', role: 'operations_manager' }));
  const response = { setHeader(name: string, value: unknown) { headers[name] = value; }, json(value: unknown) { payload = value; } } as unknown as Response;
  await controller.delivery(request, response);
  assert.equal(headers['Cache-Control'], 'no-store');
  assert.deepEqual(payload, { kind: 'delivery', date: '2026-10-09', generatedAt: '2026-10-09T10:00:00Z', orders: [] });
  await assert.rejects(controller.packing({ query: { date: ['2026-10-09', '2026-10-10'] } } as unknown as Request, response), { code: 'VALIDATION_ERROR' });
  assert.equal(reads, 1);
});