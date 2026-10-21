import assert from 'node:assert/strict';
import test from 'node:test';
import { createInventoryAdminService } from './inventory-admin.service.js';
import type { InventoryAdminRepository } from './inventory-admin.types.js';
const ID = '11111111-1111-4111-8111-111111111111';
const DATE = '2026-10-09';

test('read validation rejects invalid date, unsafe offset and UUID before accessing repository', async () => {
  let calls = 0;
  const repository: InventoryAdminRepository = {
    list: async () => { calls++; throw new Error('not called'); },
    details: async () => { calls++; return null; },
  };
  const service = createInventoryAdminService(repository);
  await assert.rejects(service.list(1, '2026-02-30'), { code: 'VALIDATION_ERROR' });
  await assert.rejects(service.list(Number.MAX_SAFE_INTEGER, DATE), { code: 'VALIDATION_ERROR' });
  await assert.rejects(service.details("' OR true --", 1, DATE), { code: 'VALIDATION_ERROR' });
  assert.equal(calls, 0);
});

test('missing or deleted variants fail explicitly, any configured week date is accepted', async () => {
  const service = createInventoryAdminService({
    list: async (page, week) => {
      assert.equal(week, DATE);
      return { data: [], page: { page, pageSize: 24, totalItems: 0, totalPages: 0 }, weekStartDate: week };
    },
    details: async () => null,
  });
  await service.list(1, DATE);
  await assert.rejects(service.details(ID, 1, DATE), { code: 'VARIANT_NOT_FOUND' });
});