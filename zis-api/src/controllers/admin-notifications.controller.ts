import type { Request, Response } from 'express';
import { ApiError } from '../http/api-error.js';
import { DEFAULT_PAGE_SIZE } from '../contracts/common.contracts.js';
import type { AdminUserResolver } from './admin-inventory.controller.js';
import type { NotificationFilter, NotificationsService } from '../notifications/notifications.types.js';

export function createAdminNotificationsController(service: NotificationsService, resolve: AdminUserResolver) {
  return {
    list: withManager(resolve, async (request, response, adminUserId) => {
      if (request.query.filter !== undefined && typeof request.query.filter !== 'string') throw invalid('Notification filter must be a string');
      response.json(await service.list({ filter: (request.query.filter ?? 'all') as NotificationFilter,
        page: readInteger(request.query.page, 1), pageSize: readInteger(request.query.pageSize, DEFAULT_PAGE_SIZE) }, adminUserId));
    }),
    markRead: withManager(resolve, async (request, response, adminUserId) => {
      const body = request.body;
      if (body !== undefined && (body === null || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length)) throw invalid('Mark read accepts no fields');
      response.json(await service.markRead(String(request.params.notificationId), adminUserId));
    }),
    getPreferences: withManager(resolve, async (_request, response, adminUserId) => {
      response.json(await service.getPreferences(adminUserId));
    }),
    updatePreferences: withManager(resolve, async (request, response, adminUserId) => {
      response.json(await service.updatePreferences(request.body, adminUserId));
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
function readInteger(value: unknown, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) throw invalid('Pagination must contain positive integers');
  return Number(value);
}