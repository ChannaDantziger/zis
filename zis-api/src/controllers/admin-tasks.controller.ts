import type { Request, Response } from 'express';
import { ApiError } from '../http/api-error.js';
import { DEFAULT_PAGE_SIZE } from '../contracts/common.contracts.js';
import type { AdminUserResolver } from './admin-inventory.controller.js';
import type { TasksService, TaskStatus, ResolvedTaskStatus } from '../tasks/tasks.types.js';

export function createAdminTasksController(service: TasksService, resolve: AdminUserResolver) {
  return {
    list: withManager(resolve, async (request, response) => {
      response.json(await service.list({ status: (request.query.status ?? 'open') as TaskStatus,
        page: readInteger(request.query.page, 1), pageSize: readInteger(request.query.pageSize, DEFAULT_PAGE_SIZE) }));
    }),
    create: withManager(resolve, async (request, response, adminUserId) => {
      const body = readBody(request.body);
      if (typeof body.title !== 'string' || Object.keys(body).some((key) => key !== 'title')) throw invalid('Only title is accepted');
      response.status(201).json(await service.createManual(body.title, adminUserId));
    }),
    resolve: withManager(resolve, async (request, response, adminUserId) => {
      const body = readBody(request.body);
      if (typeof body.status !== 'string' || typeof body.version !== 'string' || Object.keys(body).some((key) => key !== 'status' && key !== 'version')) throw invalid('status and version are required');
      response.json(await service.resolveManual(String(request.params.taskId), body.status as ResolvedTaskStatus, body.version, adminUserId));
    }),
  };
}

function withManager(resolve: AdminUserResolver, handler: (request: Request, response: Response, adminUserId: string) => Promise<void>) {
  return async (request: Request, response: Response): Promise<void> => {
    const identity = await resolve(request);
    if (identity.status === 'unauthenticated') throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
    if (identity.status === 'forbidden' || identity.role !== 'operations_manager') throw new ApiError(403, 'OPERATIONS_MANAGER_REQUIRED', 'Operations manager access required');
    response.setHeader('Cache-Control', 'no-store');
    await handler(request, response, identity.adminUserId);
  };
}

function invalid(message: string): ApiError { return new ApiError(400, 'VALIDATION_ERROR', message); }
function readBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid('JSON object body is required');
  return value as Record<string, unknown>;
}
function readInteger(value: unknown, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) throw invalid('Pagination must contain positive integers');
  return Number(value);
}
