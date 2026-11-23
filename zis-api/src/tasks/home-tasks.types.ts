export type HomeTaskStatus = 'open' | 'in_progress' | 'closed';
export interface HomeTaskEvent { status: HomeTaskStatus; note: string | null; createdAt: string; }
export interface HomeTask {
  taskId: string; source: 'manual' | 'system'; title: string; description: string | null;
  status: HomeTaskStatus; orderId: string | null; version: string; createdAt: string;
  history: HomeTaskEvent[];
}
export interface HomeTasksRepository {
  list(): Promise<HomeTask[]>;
  create(title: string, description: string | null, status: HomeTaskStatus, adminUserId: string): Promise<HomeTask>;
  change(taskId: string, status: HomeTaskStatus, note: string | null, version: string, adminUserId: string): Promise<HomeTask>;
}
