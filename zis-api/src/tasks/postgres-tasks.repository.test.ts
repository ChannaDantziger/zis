import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../http/api-error.js';
import { createPostgresTasksRepository } from './postgres-tasks.repository.js';
import type { AdminTask } from './tasks.types.js';
import type { SqlClient } from '../inventory/postgres-inventory.repository.js';

const original: AdminTask = { taskId: '00000000-0000-4000-8000-000000000001', source: 'manual', title: 'Test task', description: null, priority: 'normal', status: 'open', orderId: null, createdAt: '2026-10-08T08:00:00Z', resolvedAt: null, version: '1.000000' };

function setup(before = original, failAudit = false) {
  const calls: Array<{ sql: string; values?: readonly unknown[] }> = [];
  let released = false;
  const client = { query: async (sql: string, values?: readonly unknown[]) => {
    calls.push({ sql, values });
    if (sql.includes('insert into public.admin_audit_log')) {
      if (failAudit) throw new Error('Audit test failure');
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith('select count')) return { rows: [{ count: 125 }], rowCount: 1 };
    if (sql.startsWith('update public.admin_tasks')) return { rows: [{ ...before, status: values?.[1], resolvedAt: '2026-10-08T09:00:00Z', version: '2.000000' }], rowCount: 1 };
    if (sql.startsWith('select') || sql.startsWith('insert into public.admin_tasks')) return { rows: [before], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  }, release: () => { released = true; } } as unknown as SqlClient;
  return { calls, repository: createPostgresTasksRepository(async () => client), isReleased: () => released };
}

test('manual task creation commits its audit in the same transaction', async () => {
  const { repository, calls, isReleased } = setup();
  await repository.createManual(original.title, 'test-admin');
  const audit = calls.find((call) => call.sql.includes('insert into public.admin_audit_log'));
  assert.equal(audit?.values?.[0], 'test-admin');
  assert.equal(audit?.values?.[1], 'create_manual_task');
  assert.equal(audit?.values?.[4], 'null');
  assert.equal(calls[0]?.sql, 'begin');
  assert.equal(calls.at(-1)?.sql, 'commit');
  assert.equal(isReleased(), true);
});

test('an audit failure rolls back task creation and releases the client', async () => {
  const { repository, calls, isReleased } = setup(original, true);
  await assert.rejects(repository.createManual(original.title, 'test-admin'), /Audit test failure/);
  assert.equal(calls.at(-1)?.sql, 'rollback');
  assert.equal(calls.some((call) => call.sql === 'commit'), false);
  assert.equal(isReleased(), true);
});

test('resolving a manual task locks it and records before and after once', async () => {
  const { repository, calls } = setup();
  const result = await repository.resolveManual(original.taskId, 'done', original.version, 'test-admin');
  assert.equal(result.status, 'done');
  assert.equal(calls.some((call) => call.sql.includes('for update')), true);
  const audit = calls.find((call) => call.sql.includes('insert into public.admin_audit_log'));
  assert.equal(JSON.parse(String(audit?.values?.[4])).status, 'open');
  assert.equal(JSON.parse(String(audit?.values?.[5])).status, 'done');
  assert.equal(calls.at(-1)?.sql, 'commit');
});

test('retrying the same resolution does not write or audit again', async () => {
  const { repository, calls } = setup({ ...original, status: 'done', version: '2.000000' });
  const result = await repository.resolveManual(original.taskId, 'done', original.version, 'another-admin');
  assert.equal(result.version, '2.000000');
  assert.equal(calls.some((call) => call.sql.startsWith('update') || call.sql.startsWith('insert')), false);
});

for (const scenario of [
  { label: 'system tasks', task: { ...original, source: 'system' as const }, version: original.version, code: 'SYSTEM_TASK_REQUIRES_WORKFLOW' },
  { label: 'stale versions', task: original, version: '0.000000', code: 'TASK_CHANGED' },
  { label: 'a different resolution of a closed task', task: { ...original, status: 'dismissed' as const }, version: original.version, code: 'TASK_ALREADY_RESOLVED' },
]) {
  test(`resolution rejects ${scenario.label} without writes`, async () => {
    const { repository, calls } = setup(scenario.task);
    await assert.rejects(repository.resolveManual(original.taskId, 'done', scenario.version, 'test-admin'), (error: unknown) => error instanceof ApiError && error.statusCode === 409 && error.code === scenario.code);
    assert.equal(calls.some((call) => call.sql.startsWith('update') || call.sql.startsWith('insert')), false);
    assert.equal(calls.at(-1)?.sql, 'rollback');
  });
}

test('list count is independent of page size and uses a read-only snapshot', async () => {
  const { repository, calls } = setup();
  const result = await repository.list({ status: 'open', page: 2, pageSize: 24 });
  assert.equal(result.data.length, 1);
  assert.equal(result.page.totalItems, 125);
  assert.equal(result.page.totalPages, 6);
  assert.equal(calls[0]?.sql, 'begin isolation level repeatable read read only');
  assert.deepEqual(calls.find((call) => call.sql.includes('limit $2'))?.values, ['open', 24, 24]);
});
