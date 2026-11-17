import { ApiError } from '../http/api-error.js';
import type { SqlClient, SqlClientFactory } from '../inventory/postgres-inventory.repository.js';
import type { AdminTask, TasksRepository } from './tasks.types.js';

type TaskRow = AdminTask & Record<string, unknown>;
const TASK_FIELDS = `admin_task_id as "taskId", source, title, description, priority, status, order_id as "orderId",
  created_at as "createdAt", resolved_at as "resolvedAt", extract(epoch from updated_at)::text as version`;
const ENTITY_TYPE = 'admin_task';

export function createPostgresTasksRepository(factory: SqlClientFactory): TasksRepository {
  return {
    list: (query) => withTransaction(factory, async (client) => {
      const count = await client.query<{ count: number }>(`select count(*)::int as count from public.admin_tasks where status = $1`, [query.status]);
      const tasks = await client.query<TaskRow>(`select ${TASK_FIELDS} from public.admin_tasks where status = $1
        order by case priority when 'critical' then 0 when 'high' then 1 else 2 end, created_at, admin_task_id
        limit $2 offset $3`, [query.status, query.pageSize, (query.page - 1) * query.pageSize]);
      const totalItems = Number(count.rows[0]?.count ?? 0);
      return { data: tasks.rows, page: { page: query.page, pageSize: query.pageSize, totalItems, totalPages: Math.ceil(totalItems / query.pageSize) } };
    }, true),
    createManual: (title, adminUserId) => withTransaction(factory, async (client) => {
      const result = await client.query<TaskRow>(`insert into public.admin_tasks (source, title, priority, status, created_by)
        values ('manual', $1, 'normal', 'open', $2) returning ${TASK_FIELDS}`, [title, adminUserId]);
      const task = result.rows[0];
      if (!task) throw new Error('Task creation failed');
      await client.query(`insert into public.admin_task_history(admin_task_id, from_status, to_status, changed_by)
        values($1, null, 'open', $2)`, [task.taskId, adminUserId]);
      await auditTask(client, adminUserId, 'create_manual_task', null, task);
      return task;
    }),
    resolveManual: (taskId, status, version, adminUserId) => withTransaction(factory, async (client) => {
      const result = await client.query<TaskRow>(`select ${TASK_FIELDS} from public.admin_tasks where admin_task_id = $1 for update`, [taskId]);
      const before = result.rows[0];
      if (!before) throw new ApiError(404, 'TASK_NOT_FOUND', 'Task not found');
      if (before.source !== 'manual') throw new ApiError(409, 'SYSTEM_TASK_REQUIRES_WORKFLOW', 'System tasks require their linked workflow');
      if (before.status === status) return before;
      if (before.status !== 'open') throw new ApiError(409, 'TASK_ALREADY_RESOLVED', 'Task is already resolved');
      if (before.version !== version) throw new ApiError(409, 'TASK_CHANGED', 'Task has changed; refresh before continuing');
      const updated = await client.query<TaskRow>(`update public.admin_tasks set status = $2, workflow_status = 'closed', resolved_by = $3,
        resolved_at = now(), updated_at = now() where admin_task_id = $1 returning ${TASK_FIELDS}`, [taskId, status, adminUserId]);
      const after = updated.rows[0];
      if (!after) throw new Error('Task resolution failed');
      await client.query(`insert into public.admin_task_history(admin_task_id, from_status, to_status, changed_by)
        values($1, 'open', 'closed', $2)`, [taskId, adminUserId]);
      await auditTask(client, adminUserId, 'resolve_manual_task', before, after);
      return after;
    }),
  };
}

async function withTransaction<T>(factory: SqlClientFactory, work: (client: SqlClient) => Promise<T>, readOnly = false): Promise<T> {
  const client = await factory();
  try {
    await client.query(readOnly ? 'begin isolation level repeatable read read only' : 'begin');
    const result = await work(client);
    await client.query('commit');
    return result;
  } catch (error) { await client.query('rollback'); throw error; }
  finally { client.release?.(); }
}

async function auditTask(client: SqlClient, adminUserId: string, action: string, before: AdminTask | null, after: AdminTask): Promise<void> {
  await client.query(`insert into public.admin_audit_log (admin_user_id, action, entity_type, entity_id, before_data, after_data)
    values ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`, [adminUserId, action, ENTITY_TYPE, after.taskId, JSON.stringify(before), JSON.stringify(after)]);
}
