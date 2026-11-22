import { request } from '../../shared/api/http-client.js';
import type { HomeOrdersResponse, HomeTask, TaskStage } from './home.types.js';

export function addDays(date: string, count: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + count);
  return value.toISOString().slice(0, 10);
}

export function range(date: string, mode: 'day' | 'week'): [string, string] {
  if (mode === 'day') return [date, date];
  return [date, addDays(date, 7)];
}

export function getHomeOrders(from: string, to: string, signal?: AbortSignal) {
  return request<HomeOrdersResponse>(`/admin/home/orders?${new URLSearchParams({ from, to })}`, { signal });
}
export function getHomeTasks(signal?: AbortSignal) { return request<HomeTask[]>('/admin/home/tasks', { signal }); }
export function createHomeTask(title: string, description: string, status: TaskStage) {
  return request<HomeTask>('/admin/home/tasks', { method: 'POST', body: JSON.stringify({ title, description: description || null, status }) });
}
export function changeHomeTask(task: HomeTask, status: TaskStage, note: string) {
  return request<HomeTask>(`/admin/home/tasks/${encodeURIComponent(task.taskId)}`,
    { method: 'PATCH', body: JSON.stringify({ status, note: note || null, version: task.version }) });
}
