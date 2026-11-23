import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../http/api-error.js';
import type { SqlClient } from '../inventory/postgres-inventory.repository.js';
import { createPostgresHomeTasksRepository } from './postgres-home-tasks.repository.js';

const taskId = '00000000-0000-4000-8000-000000000001';
const userId = '00000000-0000-4000-8000-000000000002';

describe('home task workflow', () => {
  it('keeps a system task note and status change in one transaction with history and audit', async () => {
    const calls: Array<{ sql: string; values?: readonly unknown[] }> = [];
    const before = { taskId, source: 'system', title: 'בדיקה', description: null, status: 'open',
      orderId: null, version: '1', createdAt: '2026-11-10T08:00:00Z' };
    const client = { query: async (sql: string, values?: readonly unknown[]) => {
      calls.push({ sql, values });
      if (sql.includes('from public.admin_tasks where admin_task_id')) return { rows: [before], rowCount: 1 };
      if (sql.includes('update public.admin_tasks')) return { rows: [{ ...before, status: 'in_progress', version: '2' }], rowCount: 1 };
      if (sql.includes('from public.admin_task_history')) return { rows: [{ taskId, status: 'in_progress', note: 'נבדק', createdAt: '2026-11-10T09:00:00Z' }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    } } as unknown as SqlClient;
    const repository = createPostgresHomeTasksRepository(async () => client);
    await assert.rejects(repository.change(taskId, 'in_progress', 'נבדק', '0', userId),
      error => error instanceof ApiError && error.statusCode === 409);
    assert.equal(calls.some(call => call.sql.includes('update public.admin_tasks')), false);
    calls.length = 0;
    const result = await repository.change(taskId, 'in_progress', 'נבדק', '1', userId);
    assert.equal(result.status, 'in_progress');
    assert.equal(result.history[0].note, 'נבדק');
    assert.deepEqual(calls.find(call => call.sql.includes('update public.admin_tasks'))?.values?.slice(0, 3), [taskId, 'in_progress', 'open']);
    assert.equal(calls.filter(call => call.sql.includes('insert into public.admin_task_history')).length, 1);
    assert.equal(calls.filter(call => call.sql.includes('insert into public.admin_audit_log')).length, 1);
    assert.equal(calls.at(-1)?.sql, 'commit');
  });
});
