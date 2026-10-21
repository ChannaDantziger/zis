import type { ApiListResponse } from '../contracts/common.contracts.js';

export const TASK_STATUSES = ['open', 'done', 'dismissed'] as const;
export type TaskStatus = typeof TASK_STATUSES[number];
export type ResolvedTaskStatus = Exclude<TaskStatus, 'open'>;
export interface AdminTask {
  taskId: string; source: 'manual' | 'system'; title: string; description: string | null;
  priority: 'normal' | 'high' | 'critical'; status: TaskStatus; orderId: string | null;
  createdAt: string; resolvedAt: string | null; version: string;
}
export interface TaskListQuery { status: TaskStatus; page: number; pageSize: number; }
export interface TasksRepository {
  list(query: TaskListQuery): Promise<ApiListResponse<AdminTask>>;
  createManual(title: string, adminUserId: string): Promise<AdminTask>;
  resolveManual(taskId: string, status: ResolvedTaskStatus, version: string, adminUserId: string): Promise<AdminTask>;
}
export type TasksService = TasksRepository;
