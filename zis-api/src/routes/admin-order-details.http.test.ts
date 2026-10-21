import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { createApp } from '../app.js';
import { createDashboardService } from '../dashboard/dashboard.service.js';
import type { AdminUserResolution } from '../controllers/admin-inventory.controller.js';
import type { AdminOrderDetails, DashboardRepository } from '../dashboard/dashboard.types.js';

const orderId = '00000000-0000-4000-8000-000000000001';
const manager: AdminUserResolution = { status: 'authenticated', adminUserId: 'test-admin', role: 'operations_manager' };
const details: AdminOrderDetails = {
  orderId, orderNumber: 'TEST-1', status: 'ordered', paymentStatus: 'paid', deliveryDate: '2026-10-08', total: '10.00', version: 'v1',
  customerName: 'Test customer', customerPhone: 'test phone', customerEmail: 'test@example.invalid',
  deliveryAddress: { city: 'Test city', street: 'Test street', houseNumber: '1' }, venueName: null,
  dedicationText: null, customerNotes: null, items: [], history: [], tasks: [], allowedNextStatuses: ['in_preparation'],
};

function createTestApp(identity: AdminUserResolution, found = true) {
  const calls: string[] = [];
  const repository: DashboardRepository = {
    listOrderPage: async (query) => ({ data: [], variants: [], page: { page: query.page, pageSize: query.pageSize, totalItems: 0, totalPages: 0 } }),
    getOrder: async (id) => { calls.push(id); return found ? details : null; },
    listOrders: async () => [], getProduction: async () => [],
    getDashboard: async (date) => ({ date, todayOrderCount: 0, cancelledOrderCount: 0, unreadNotificationCount: 0, statusCounts: [], openTasks: [], nextOrders: [], production: [] }),
  };
  return { calls, app: createApp({ dashboardService: createDashboardService(repository), resolveAdminUserId: async () => identity }) };
}

const denied: Array<{ label: string; identity: AdminUserResolution; status: number }> = [
  { label: 'unauthenticated', identity: { status: 'unauthenticated' }, status: 401 },
  { label: 'inactive', identity: { status: 'forbidden' }, status: 403 },
  { label: 'delivery driver', identity: { status: 'authenticated', adminUserId: 'test-driver', role: 'delivery_driver' }, status: 403 },
  { label: 'missing role', identity: { status: 'authenticated', adminUserId: 'test-unknown' }, status: 403 },
];
for (const entry of denied) {
  test(`order details reject ${entry.label} before reading customer data`, async () => {
    const { app, calls } = createTestApp(entry.identity);
    const response = await request(app).get(`/admin/orders/${orderId}`);
    assert.equal(response.status, entry.status);
    assert.deepEqual(calls, []);
    assert.equal(JSON.stringify(response.body).includes(details.customerPhone), false);
  });
}

test('operations manager can read order details with no-store caching', async () => {
  const { app, calls } = createTestApp(manager);
  const response = await request(app).get(`/admin/orders/${orderId}`);
  assert.equal(response.status, 200);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(response.body.customerName, details.customerName);
  assert.deepEqual(calls, [orderId]);
});

test('invalid order identifiers do not reach the repository', async () => {
  const { app, calls } = createTestApp(manager);
  const response = await request(app).get('/admin/orders/not-a-uuid');
  assert.equal(response.status, 400);
  assert.deepEqual(calls, []);
});

test('missing order returns 404', async () => {
  const { app } = createTestApp(manager, false);
  const response = await request(app).get(`/admin/orders/${orderId}`);
  assert.equal(response.status, 404);
});
