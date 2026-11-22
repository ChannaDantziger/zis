import { Router, type Request } from 'express';
import { ApiError } from '../http/api-error.js';
import type { AdminUserResolver } from '../controllers/admin-inventory.controller.js';
import type { HomeTaskStatus, HomeTasksRepository } from '../tasks/home-tasks.types.js';

export function createAdminHomeTasksRouter(service: HomeTasksRepository, resolve: AdminUserResolver): Router {
  const router = Router();
  const manager = async (request: Request) => {
    const identity = await resolve(request);
    if (identity.status === 'unauthenticated') throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
    if (identity.status === 'forbidden' || identity.role !== 'operations_manager') throw new ApiError(403, 'OPERATIONS_MANAGER_REQUIRED', 'Operations manager access required');
    return identity.adminUserId;
  };
  router.get('/admin/home/tasks', async (request, response) => {
    await manager(request); response.setHeader('Cache-Control', 'no-store'); response.json(await service.list());
  });
  router.post('/admin/home/tasks', async (request, response) => {
    const userId = await manager(request), body = readBody(request.body);
    response.setHeader('Cache-Control', 'no-store');
    response.status(201).json(await service.create(body.title as string, body.description as string | null,
      body.status as HomeTaskStatus, userId));
  });
  router.patch('/admin/home/tasks/:taskId', async (request, response) => {
    const userId = await manager(request), body = readBody(request.body);
    response.setHeader('Cache-Control', 'no-store');
    response.json(await service.change(String(request.params.taskId), body.status as HomeTaskStatus,
      body.note as string | null, body.version as string, userId));
  });
  return router;
}

function readBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'VALIDATION_ERROR', 'JSON object required');
  return value as Record<string, unknown>;
}
