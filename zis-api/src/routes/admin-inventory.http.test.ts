import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createApp } from '../app.js';
import { createSupabaseAuthResolver } from '../auth/supabase-auth.resolver.js';
import type { InventoryService } from '../inventory/inventory.service.js';

function createSupabaseStub(): SupabaseClient {
  const supabase = {
    auth: {
      async getUser(accessToken: string) {
        if (accessToken !== 'valid-admin-token' && accessToken !== 'valid-inactive-token') {
          return { data: { user: null }, error: new Error('Invalid token') };
        }

        return { data: { user: { id: accessToken === 'valid-admin-token' ? 'admin-1' : 'user-1' } }, error: null };
      },
    },
    from() {
      return {
        select() {
          return {
            eq(_column: string, adminUserId: string) {
              return {
                async maybeSingle() {
                  if (adminUserId === 'admin-1') {
                    return { data: { admin_user_id: 'admin-1', status: 'active', role: 'operations_manager' }, error: null };
                  }

                  return { data: { admin_user_id: adminUserId, status: 'inactive' }, error: null };
                },
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;

  return supabase;
}

function createInventoryServiceStub(calls: unknown[]): InventoryService {
  return {
    async getDefaultRestockQuantity() {
      return 5;
    },
    async updateByAdmin(input) {
      calls.push(input);
      return { stockBefore: 2, stockAfter: 7 };
    },
    async applyPaidSale() {
      throw new Error('Not used by this route');
    },
    async reversePaidSale() {
      throw new Error('Not used by this route');
    },
  };
}

function createTestApp(calls: unknown[]) {
  return createApp({
    inventoryService: createInventoryServiceStub(calls),
    resolveAdminUserId: createSupabaseAuthResolver(createSupabaseStub()),
  });
}

test('admin inventory route returns 401 without a token', async () => {
  const response = await request(createTestApp([]))
    .post('/admin/inventory/variant-1/adjust')
    .send({ deltaSets: 5, reason: 'Production completed' });

  assert.equal(response.status, 401);
});

test('admin inventory route returns 401 for an invalid token', async () => {
  const response = await request(createTestApp([]))
    .post('/admin/inventory/variant-1/adjust')
    .set('Authorization', 'Bearer invalid-token')
    .send({ deltaSets: 5, reason: 'Production completed' });

  assert.equal(response.status, 401);
});

test('admin inventory route returns 403 for an inactive admin user', async () => {
  const response = await request(createTestApp([]))
    .post('/admin/inventory/variant-1/adjust')
    .set('Authorization', 'Bearer valid-inactive-token')
    .send({ deltaSets: 5, reason: 'Production completed' });

  assert.equal(response.status, 403);
});

test('admin inventory route updates inventory for an active admin', async () => {
  const calls: unknown[] = [];
  const response = await request(createTestApp(calls))
    .post('/admin/inventory/variant-1/adjust')
    .set('Authorization', 'Bearer valid-admin-token')
    .send({ deltaSets: 5, reason: 'Production completed' });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { stockBefore: 2, stockAfter: 7 });
  assert.deepEqual(calls, [{
    productVariantId: 'variant-1',
    deltaSets: 5,
    reason: 'Production completed',
    adminUserId: 'admin-1',
  }]);
});
