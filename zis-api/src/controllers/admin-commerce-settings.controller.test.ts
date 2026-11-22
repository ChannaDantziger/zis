import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import { createAdminCommerceSettingsController } from './admin-commerce-settings.controller.js';
import type { AdminUserResolver } from './admin-inventory.controller.js';
import type { CommerceSettingsService } from '../operations/commerce-settings.types.js';

test('all commerce settings writes require an explicit manager role', async () => {
  const writes = ['updateBusiness', 'createZone', 'updateZone', 'createRule', 'updateRule', 'createClosure', 'updateClosure'] as const;
  for (const role of [undefined, 'delivery_driver', 'unknown']) {
    const resolve = (async () => ({ status: 'authenticated', adminUserId: 'admin', role })) as AdminUserResolver;
    const controller = createAdminCommerceSettingsController({} as CommerceSettingsService, resolve);
    for (const write of writes) {
      await assert.rejects(controller[write]({} as Request, {} as Response), { statusCode: 403, code: 'OPERATIONS_MANAGER_REQUIRED' });
    }
  }
});

test('a manager can update business settings', async () => {
  let called = false;
  const service = { updateBusinessSettings: async () => { called = true; return {}; } } as unknown as CommerceSettingsService;
  const controller = createAdminCommerceSettingsController(service, async () => ({ status: 'authenticated', adminUserId: 'admin', role: 'operations_manager' }));
  const response = { status: () => ({ json: () => undefined }) } as unknown as Response;
  await controller.updateBusiness({ body: {} } as Request, response);
  assert.equal(called, true);
});
