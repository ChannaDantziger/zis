import { ApiError } from '../http/api-error.js';
import type { SqlClient, SqlClientFactory } from '../inventory/postgres-inventory.repository.js';
import type { AdminNotification, NotificationListQuery, NotificationPage, NotificationPreferences, NotificationsRepository, UpdateNotificationPreferences } from './notifications.types.js';

const NOTIFICATION_COLUMNS = `admin_notification_id as "notificationId", notification_type as "notificationType",
  title, body, order_id as "orderId", product_variant_id as "productVariantId", delivery_status as "deliveryStatus",
  read_at::text as "readAt", created_at::text as "createdAt"`;
const PREFERENCE_COLUMNS = `push_new_order_enabled as "pushNewOrderEnabled", push_action_required_enabled as "pushActionRequiredEnabled"`;
const DEFAULT_PREFERENCES: NotificationPreferences = { pushNewOrderEnabled: true, pushActionRequiredEnabled: true };

export function createPostgresNotificationsRepository(factory: SqlClientFactory): NotificationsRepository {
  return {
    list: (query, adminUserId) => list(factory, query, adminUserId),
    markRead: (notificationId, adminUserId) => markRead(factory, notificationId, adminUserId),
    getPreferences: async (adminUserId) => {
      const client = await factory();
      try { return (await readPreferences(client, adminUserId)) ?? { ...DEFAULT_PREFERENCES }; }
      finally { client.release?.(); }
    },
    updatePreferences: (input, adminUserId) => updatePreferences(factory, input, adminUserId),
  };
}

async function list(factory: SqlClientFactory, query: NotificationListQuery, adminUserId: string): Promise<NotificationPage> {
  return withTransaction(factory, async (client) => {
    const read = query.filter === 'all' ? null : query.filter === 'read';
    const counts = await client.query<{ count: number; unread: number }>(`select
      count(*) filter (where $2::boolean is null or (read_at is not null) = $2)::int as count,
      count(*) filter (where read_at is null)::int as unread
      from public.admin_notifications where admin_user_id = $1`, [adminUserId, read]);
    const rows = await client.query<AdminNotification & Record<string, unknown>>(`select ${NOTIFICATION_COLUMNS}
      from public.admin_notifications where admin_user_id = $1 and ($2::boolean is null or (read_at is not null) = $2)
      order by created_at desc, admin_notification_id desc limit $3 offset $4`, [adminUserId, read, query.pageSize, (query.page - 1) * query.pageSize]);
    const totalItems = Number(counts.rows[0]?.count ?? 0);
    return { data: rows.rows, unreadCount: Number(counts.rows[0]?.unread ?? 0), page: { page: query.page, pageSize: query.pageSize, totalItems, totalPages: Math.ceil(totalItems / query.pageSize) } };
  }, true);
}

async function markRead(factory: SqlClientFactory, notificationId: string, adminUserId: string): Promise<AdminNotification> {
  return withTransaction(factory, async (client) => {
    const before = await client.query<AdminNotification & Record<string, unknown>>(`select ${NOTIFICATION_COLUMNS}
      from public.admin_notifications where admin_notification_id = $1 and admin_user_id = $2 for update`, [notificationId, adminUserId]);
    const row = before.rows[0];
    if (!row) throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
    if (row.readAt) return row;
    const after = await client.query<AdminNotification & Record<string, unknown>>(`update public.admin_notifications set read_at = coalesce(read_at, now())
      where admin_notification_id = $1 and admin_user_id = $2 returning ${NOTIFICATION_COLUMNS}`, [notificationId, adminUserId]);
    if (!after.rows[0]) throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
    await audit(client, adminUserId, 'mark_read', 'admin_notification', notificationId, { readAt: row.readAt }, { readAt: after.rows[0].readAt });
    return after.rows[0];
  });
}

async function updatePreferences(factory: SqlClientFactory, input: UpdateNotificationPreferences, adminUserId: string): Promise<NotificationPreferences> {
  return withTransaction(factory, async (client) => {
    // Lock the existing user even when preferences do not yet exist: concurrent partial patches serialize.
    const user = await client.query(`select admin_user_id from public.admin_users where admin_user_id = $1 and status = 'active' for update`, [adminUserId]);
    if (!user.rows.length) throw new ApiError(403, 'ADMIN_ACCESS_REQUIRED', 'Active admin access required');
    const before = await readPreferences(client, adminUserId);
    const desired = { ...(before ?? DEFAULT_PREFERENCES), ...input };
    if (before && before.pushNewOrderEnabled === desired.pushNewOrderEnabled && before.pushActionRequiredEnabled === desired.pushActionRequiredEnabled) return before;
    const result = await client.query<NotificationPreferences & Record<string, unknown>>(`insert into public.admin_notification_preferences
      (admin_user_id, push_new_order_enabled, push_action_required_enabled) values ($1, $2, $3)
      on conflict (admin_user_id) do update set push_new_order_enabled = excluded.push_new_order_enabled,
        push_action_required_enabled = excluded.push_action_required_enabled, updated_at = now()
      returning ${PREFERENCE_COLUMNS}`, [adminUserId, desired.pushNewOrderEnabled, desired.pushActionRequiredEnabled]);
    const after = result.rows[0];
    if (!after) throw new Error('Notification preferences were not updated');
    await audit(client, adminUserId, before ? 'update' : 'create', 'admin_notification_preferences', adminUserId, before, after);
    return after;
  });
}

async function readPreferences(client: SqlClient, adminUserId: string): Promise<NotificationPreferences | null> {
  const result = await client.query<NotificationPreferences & Record<string, unknown>>(`select ${PREFERENCE_COLUMNS}
    from public.admin_notification_preferences where admin_user_id = $1`, [adminUserId]);
  return result.rows[0] ?? null;
}
async function withTransaction<T>(factory: SqlClientFactory, operation: (client: SqlClient) => Promise<T>, readOnly = false): Promise<T> {
  const client = await factory();
  try { await client.query(readOnly ? 'begin isolation level repeatable read read only' : 'begin'); const result = await operation(client); await client.query('commit'); return result; }
  catch (error) { await client.query('rollback'); throw error; }
  finally { client.release?.(); }
}
async function audit(client: SqlClient, adminUserId: string, action: string, entityType: string, entityId: string, before: unknown, after: unknown): Promise<void> {
  await client.query(`insert into public.admin_audit_log (admin_user_id, action, entity_type, entity_id, before_data, after_data)
    values ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`, [adminUserId, action, entityType, entityId, JSON.stringify(before), JSON.stringify(after)]);
}