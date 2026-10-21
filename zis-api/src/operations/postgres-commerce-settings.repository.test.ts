import assert from 'node:assert/strict';
import test from 'node:test';
import { createPostgresCommerceSettingsRepository } from './postgres-commerce-settings.repository.js';
import type { SqlClient } from '../inventory/postgres-inventory.repository.js';
import { ApiError } from '../http/api-error.js';

function fixture(configured: boolean) {
  let released = false;
  const statements: string[] = [];
  const client = { query: async (sql: string) => {
    statements.push(sql);
    if (sql.includes('from public.store_settings')) return { rows: configured ? [{ store_open: true, lock_mode: 'open', lock_message: null, minimum_product_subtotal: '0.00', max_advance_days: 7 }] : [] };
    if (sql.includes('from public.system_defaults')) return { rows: [
      { default_key: 'same_day_cutoff_time', default_value: '09:00' },
      { default_key: 'working_days', default_value: ['sunday', 'monday'] },
      { default_key: 'business_timezone', default_value: 'Asia/Jerusalem' },
      { default_key: 'dispatch_time', default_value: null },
    ] };
    return { rows: [] };
  }, release: () => { released = true; } } as unknown as SqlClient;
  return { repository: createPostgresCommerceSettingsRepository(async () => client), statements, released: () => released };
}

test('missing shop settings return an actionable configuration error without inventing or inserting values', async () => {
  const { repository, statements, released } = fixture(false);
  await assert.rejects(repository.getSettings(), (error: unknown) => error instanceof ApiError && error.statusCode === 503 && error.code === 'STORE_SETTINGS_NOT_CONFIGURED');
  assert.equal(statements.every((sql) => sql.startsWith('select ')), true);
  assert.equal(released(), true);
});

test('configured settings accept decoded PostgreSQL JSON values and empty shipping lists', async () => {
  const { repository, released } = fixture(true);
  const settings = await repository.getSettings();
  assert.equal(settings.business.sameDayCutoffTime, '09:00');
  assert.deepEqual(settings.business.workingDays, ['sunday', 'monday']);
  assert.equal(settings.business.businessTimezone, 'Asia/Jerusalem');
  assert.equal(settings.business.dispatchTime, null);
  assert.deepEqual(settings.shippingRules, []);
  assert.equal(released(), true);
});
