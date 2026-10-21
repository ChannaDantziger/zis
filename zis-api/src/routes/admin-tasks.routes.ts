import { Router } from 'express';
import type { AdminUserResolver } from '../controllers/admin-inventory.controller.js';
import { createAdminTasksController } from '../controllers/admin-tasks.controller.js';
import type { TasksService } from '../tasks/tasks.types.js';

export function createAdminTasksRouter(service: TasksService, resolve: AdminUserResolver): Router {
  const router = Router();
  const controller = createAdminTasksController(service, resolve);
  router.get('/admin/tasks', controller.list);
  router.post('/admin/tasks', controller.create);
  router.patch('/admin/tasks/:taskId', controller.resolve);
  return router;
}
