import type { QueryClient } from '@tanstack/react-query';
import type { AdminTask, TaskListResponse, TaskStatus } from '../../entities/admin.types.js';
import { request } from './http-client.js';

export async function refreshTaskQueries(client: QueryClient) {
  await Promise.all(['tasks', 'dashboard', 'order-details', 'orders', 'production'].map((key) => client.invalidateQueries({ queryKey: [key] })));
}

export function listTasks(status: TaskStatus, page: number, signal?: AbortSignal) {
  const params = new URLSearchParams({ status, page: String(page) });
  return request<TaskListResponse>(`/admin/tasks?${params}`, { signal });
}

export function createManualTask(title: string) {
  return request<AdminTask>('/admin/tasks', { method: 'POST', body: JSON.stringify({ title }) });
}

export function resolveManualTask(task: AdminTask, status: Exclude<TaskStatus, 'open'>) {
  return request<AdminTask>(`/admin/tasks/${encodeURIComponent(task.taskId)}`, { method: 'PATCH', body: JSON.stringify({ status, version: task.version }) });
}
