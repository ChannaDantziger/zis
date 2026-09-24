import assert from 'node:assert/strict';
import test from 'node:test';
import { checkReadiness } from './readiness.js';

test('readiness reports failed dependencies without leaking the error', async () => {
  const result = await checkReadiness({
    postgres: async () => undefined,
    storage: async () => { throw new Error('secret connection detail'); },
  });

  assert.deepEqual(result, {
    ready: false,
    checks: { postgres: 'ok', storage: 'failed' },
  });
});
