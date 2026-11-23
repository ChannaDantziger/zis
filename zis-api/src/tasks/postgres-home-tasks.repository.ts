import { ApiError } from '../http/api-error.js';
import type { SqlClient, SqlClientFactory } from '../inventory/postgres-inventory.repository.js';
import type { HomeTask, HomeTaskEvent, HomeTasksRepository, HomeTaskStatus } from './home-tasks.types.js';

type TaskRow = Omit<HomeTask, 'history'> & Record<string, unknown>;
type EventRow = HomeTaskEvent & { taskId: string; [key: string]: unknown };
const FIELDS = `admin_task_id as "taskId", source, title, description, workflow_status as status,
  order_id as "orderId", extract(epoch from updated_at)::text as version, created_at as "createdAt"`;

export function createPostgresHomeTasksRepository(factory: SqlClientFactory): HomeTasksRepository {
  return {
    list: () => transaction(factory, async client => {
      const result = await client.query<TaskRow>(`select ${FIELDS} from public.admin_tasks
        order by case workflow_status when 'open' then 0 when 'in_progress' then 1 else 2 end, created_at desc`);
      const events = await history(client, result.rows.map(row => row.taskId));
      return result.rows.map(task => ({ ...task, history: events.get(task.taskId) ??
        [{ status: task.status, note: task.description, createdAt: task.createdAt }] }));
    }, true),
    create: (title, description, status, userId) => transaction(factory, async client => {
      const result = await client.query<TaskRow>(`insert into public.admin_tasks
        (source, title, description, priority, status, workflow_status, created_by, resolved_by, resolved_at)
        values ('manual', $1, $2, 'normal', $3, $4, $5, $6, $7) returning ${FIELDS}`,
        [title, description, status === 'closed' ? 'done' : 'open', status, userId,
          status === 'closed' ? userId : null, status === 'closed' ? new Date() : null]);
      const task = result.rows[0];
      if (!task) throw new Error('Task creation failed');
      await event(client, task.taskId, null, status, description, userId);
      await audit(client, userId, task.taskId, 'create_home_task', null, task, description);
      return { ...task, history: [{ status, note: description, createdAt: task.createdAt }] };
    }),
    change: (taskId, status, note, version, userId) => transaction(factory, async client => {
      const current = await client.query<TaskRow>(`select ${FIELDS} from public.admin_tasks where admin_task_id = $1 for update`, [taskId]);
      const before = current.rows[0];
      if (!before) throw new ApiError(404, 'TASK_NOT_FOUND', 'Task not found');
      if (before.version !== version) throw new ApiError(409, 'TASK_CHANGED', 'Task changed; refresh before continuing');
      if (before.status === status && !note) throw new ApiError(400, 'VALIDATION_ERROR', 'Add a note or select another status');
      const result = await client.query<TaskRow>(`update public.admin_tasks set workflow_status = $2,
        status = $3, resolved_by = $4, resolved_at = $5, updated_at = clock_timestamp()
        where admin_task_id = $1 returning ${FIELDS}`,
        [taskId, status, status === 'closed' ? 'done' : 'open', status === 'closed' ? userId : null,
          status === 'closed' ? new Date() : null]);
      const after = result.rows[0];
      if (!after) throw new Error('Task update failed');
      await event(client, taskId, before.status, status, note, userId);
      await audit(client, userId, taskId, 'change_home_task', before, after, note);
      return { ...after, history: (await history(client, [taskId])).get(taskId) ?? [] };
    }),
  };
}

async function history(client: SqlClient, ids: string[]): Promise<Map<string, HomeTaskEvent[]>> {
  const result = ids.length ? await client.query<EventRow>(`select admin_task_id as "taskId", to_status as status,
    note, created_at as "createdAt" from public.admin_task_history where admin_task_id = any($1::uuid[])
    order by created_at, admin_task_history_id`, [ids]) : { rows: [] };
  const map = new Map<string, HomeTaskEvent[]>();
  for (const row of result.rows) { const list = map.get(row.taskId) ?? [];
    list.push({ status: row.status, note: row.note, createdAt: row.createdAt }); map.set(row.taskId, list); }
  return map;
}

async function event(client: SqlClient, taskId: string, from: HomeTaskStatus | null, to: HomeTaskStatus, note: string | null, userId: string) {
  await client.query(`insert into public.admin_task_history(admin_task_id, from_status, to_status, note, changed_by)
    values($1, $2, $3, $4, $5)`, [taskId, from, to, note, userId]);
}

async function audit(client: SqlClient, userId: string, taskId: string, action: string, before: TaskRow | null, after: TaskRow, note: string | null) {
  await client.query(`insert into public.admin_audit_log(admin_user_id, action, entity_type, entity_id, before_data, after_data)
    values($1, $2, 'admin_task', $3, $4::jsonb, $5::jsonb)`, [userId, action, taskId, JSON.stringify(before), JSON.stringify({ ...after, note })]);
}

async function transaction<T>(factory: SqlClientFactory, work: (client: SqlClient) => Promise<T>, readOnly = false): Promise<T> {
  const client = await factory();
  try { await client.query(readOnly ? 'begin isolation level repeatable read read only' : 'begin');
    const result = await work(client); await client.query('commit'); return result;
  } catch (error) { await client.query('rollback'); throw error; }
  finally { client.release?.(); }
}
