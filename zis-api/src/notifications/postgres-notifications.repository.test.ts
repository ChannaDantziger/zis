import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../http/api-error.js';
import type { SqlClient } from '../inventory/postgres-inventory.repository.js';
import { createPostgresNotificationsRepository } from './postgres-notifications.repository.js';
import type { AdminNotification, NotificationPreferences } from './notifications.types.js';

const owner = 'owner-fixture';
const notification: AdminNotification = { notificationId: 'f997a78b-305a-49c6-8ad4-fb91dd39c4fe', notificationType: 'system', title: 'Test', body: 'Test body', orderId: null, productVariantId: null, deliveryStatus: 'pending', readAt: null, createdAt: '2026-10-09T09:00:00Z' };
function mock(handler: (sql: string, values: readonly unknown[]) => unknown[]) {
  const calls: Array<{ sql: string; values: readonly unknown[] }> = []; let released = false;
  const client = { query: async (sql: string, values: readonly unknown[] = []) => { calls.push({ sql, values }); return { rows: handler(sql, values), rowCount: 0 }; }, release: () => { released = true; } } as unknown as SqlClient;
  return { calls, repository: createPostgresNotificationsRepository(async () => client), released: () => released };
}
test('inbox uses an owner-scoped snapshot for filtered count, unread count and stable page', async () => {
  const f = mock((sql) => sql.includes('count(*)') ? [{ count: 25, unread: 8 }] : sql.startsWith('select') ? [notification] : []);
  const result = await f.repository.list({ filter: 'read', page: 2, pageSize: 24 }, owner);
  assert.equal(result.page.totalPages, 2); assert.equal(result.unreadCount, 8);
  assert.equal(f.calls[0].sql, 'begin isolation level repeatable read read only');
  const selects = f.calls.filter((call) => call.sql.startsWith('select'));
  assert.ok(selects.every((call) => call.sql.includes('admin_user_id = $1') && !call.sql.includes(owner) && !call.sql.includes('push_token')));
  assert.deepEqual(selects.map((call) => call.values), [[owner, true], [owner, true, 24, 24]]);
  assert.match(selects[1].sql, /order by created_at desc, admin_notification_id desc/);
  assert.equal(f.calls.at(-1)?.sql, 'commit'); assert.equal(f.released(), true);
});
test('mark read is idempotent and audits only the first read', async () => {
  let row = { ...notification };
  const f = mock((sql, values) => {
    if (sql.startsWith('select')) { assert.deepEqual(values, [notification.notificationId, owner]); assert.match(sql, /admin_user_id = \$2 for update/); return [{ ...row }]; }
    if (sql.startsWith('update')) { assert.deepEqual(values, [notification.notificationId, owner]); assert.match(sql, /admin_user_id = \$2/); row = { ...row, readAt: '2026-10-09T10:00:00Z' }; return [{ ...row }]; }
    return [];
  });
  const first = await f.repository.markRead(notification.notificationId, owner); const second = await f.repository.markRead(notification.notificationId, owner);
  assert.equal(first.readAt, second.readAt);
  assert.equal(f.calls.filter((call) => call.sql.startsWith('update')).length, 1);
  assert.equal(f.calls.filter((call) => call.sql.includes('insert into public.admin_audit_log')).length, 1);
});
test('missing or other-user notification returns the same 404 with no update/audit', async () => {
  const f = mock((sql, values) => {
    if (sql.startsWith('select')) { assert.match(sql, /admin_user_id = \$2/); assert.equal(values[1], owner); }
    return [];
  });
  await assert.rejects(f.repository.markRead(notification.notificationId, owner), (error: unknown) => error instanceof ApiError && error.statusCode === 404);
  assert.ok(!f.calls.some((call) => call.sql.startsWith('update') || call.sql.includes('admin_audit_log')));
  assert.equal(f.calls.at(-1)?.sql, 'rollback'); assert.equal(f.released(), true);
});
test('reading absent preferences returns schema defaults without creating data', async () => {
  const f = mock(() => []);
  assert.deepEqual(await f.repository.getPreferences(owner), { pushNewOrderEnabled: true, pushActionRequiredEnabled: true });
  assert.equal(f.calls.length, 1); assert.deepEqual(f.calls[0].values, [owner]);
  assert.match(f.calls[0].sql, /admin_user_id = \$1/); assert.equal(f.released(), true);
});
test('partial preference patches serialize even when the row is initially absent', async () => {
  let prefs: NotificationPreferences | null = null;
  let lock = Promise.resolve(); const audit: unknown[][] = []; const selects: string[] = [];
  const factory = async (): Promise<SqlClient> => {
    let unlock: (() => void) | undefined;
    return { query: async (sql: string, values: readonly unknown[] = []) => {
      let rows: unknown[] = [];
      if (sql.includes('from public.admin_users')) {
        assert.match(sql, /for update/); assert.deepEqual(values, [owner]);
        const previous = lock; lock = new Promise((resolve) => { unlock = resolve; }); await previous;
        rows = [{ admin_user_id: owner }];
      } else if (sql.includes('from public.admin_notification_preferences')) { selects.push(sql); rows = prefs ? [{ ...prefs }] : []; }
      else if (sql.startsWith('insert into public.admin_notification_preferences')) {
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(values[0], owner); prefs = { pushNewOrderEnabled: values[1] as boolean, pushActionRequiredEnabled: values[2] as boolean }; rows = [{ ...prefs }];
      } else if (sql.includes('admin_audit_log')) audit.push([...values]);
      else if (sql === 'commit' || sql === 'rollback') unlock?.();
      return { rows, rowCount: rows.length };
    } } as unknown as SqlClient;
  };
  const repository = createPostgresNotificationsRepository(factory);
  await Promise.all([repository.updatePreferences({ pushNewOrderEnabled: false }, owner), repository.updatePreferences({ pushActionRequiredEnabled: false }, owner)]);
  assert.deepEqual(prefs, { pushNewOrderEnabled: false, pushActionRequiredEnabled: false });
  assert.equal(audit.length, 2); assert.ok(audit.every((row) => row[0] === owner && row[3] === owner));
  assert.equal(JSON.parse(audit[0][4] as string), null);
  assert.deepEqual(JSON.parse(audit[1][4] as string), { pushNewOrderEnabled: false, pushActionRequiredEnabled: true });
  assert.ok(selects.every((sql) => sql.includes('admin_user_id = $1')));
});
test('preference audit failure rolls back and releases the client', async () => {
  const f = mock((sql) => {
    if (sql.includes('from public.admin_users')) return [{ admin_user_id: owner }];
    if (sql.startsWith('insert into public.admin_notification_preferences')) return [{ pushNewOrderEnabled: false, pushActionRequiredEnabled: true }];
    if (sql.includes('admin_audit_log')) throw new Error('audit fixture failure');
    return [];
  });
  await assert.rejects(f.repository.updatePreferences({ pushNewOrderEnabled: false }, owner), /audit fixture failure/);
  assert.equal(f.calls.at(-1)?.sql, 'rollback'); assert.equal(f.released(), true);
});