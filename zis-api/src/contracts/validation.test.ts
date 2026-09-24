import assert from 'node:assert/strict';
import test from 'node:test';
import { ContractValidationError, parsePagination } from './validation.js';

test('pagination applies the public default and accepts a bounded page size', () => {
  assert.deepEqual(parsePagination({}), { page: 1, pageSize: 24 });
  assert.deepEqual(parsePagination({ page: 2, pageSize: 50 }), { page: 2, pageSize: 50 });
});

test('pagination rejects values above the public maximum', () => {
  assert.throws(
    () => parsePagination({ page: 1, pageSize: 51 }),
    (error: unknown) => error instanceof ContractValidationError && error.fields.pageSize !== undefined,
  );
});
