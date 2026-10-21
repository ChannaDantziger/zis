import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { createApp } from '../app.js';
import { createTasksService } from '../tasks/tasks.service.js';
import type { AdminUserResolution } from '../controllers/admin-inventory.controller.js';
import type { AdminTask, TasksRepository } from '../tasks/tasks.types.js';

const taskId = '00000000-0000-4000-8000-000000000001';
const manager: AdminUserResolution = { status: 'authenticated', adminUserId: 'test-admin', role: 'operations_manager' };
const task: AdminTask = { taskId, source: 'manual', title: 'Test task', description: null, priority: 'normal', status: 'open', orderId: null, createdAt: '2026-10-08T08:00:00Z', resolvedAt: null, version: '1.000000' };

function createTestApp(identity: AdminUserResolution) {
  const calls: unknown[] = [];
  const repository: TasksRepository = {
    list: async (query) => { calls.push(query); return { data: [task], page: { ...query, totalItems: 1, totalPages: 1 } }; },
    createManual: async (title, actor) => { calls.push({ title, actor }); return { ...task, title }; },
    resolveManual: async (id, status, version, actor) => { calls.push({ id, status, version, actor }); return { ...task, status }; },
  };
  return { calls, app: createApp({ tasksService: createTasksService(repository), resolveAdminUserId: async () => identity }) };
}

const denied: Array<{ label: string; identity: AdminUserResolution; status: number }> = [
  { label: 'unauthenticated', identity: { status: 'unauthenticated' }, status: 401 },
  { label: 'inactive', identity: { status: 'forbidden' }, status: 403 },
  { label: 'delivery driver', identity: { status: 'authenticated', adminUserId: 'driver', role: 'delivery_driver' }, status: 403 },
  { label: 'missing role', identity: { status: 'authenticated', adminUserId: 'unknown' }, status: 403 },
];
for (const entry of denied) {
  test(`tasks reject ${entry.label} before calling the repository`, async () => {
    const { app, calls } = createTestApp(entry.identity);
    assert.equal((await request(app).get('/admin/tasks')).status, entry.status);
    assert.equal((await request(app).post('/admin/tasks').send({ title: 'Test' })).status, entry.status);
    assert.equal((await request(app).patch(`/admin/tasks/${taskId}`).send({ status: 'done', version: task.version })).status, entry.status);
    assert.deepEqual(calls, []);
  });
}

test('manager creates a trimmed title-only manual task', async () => {
  const { app, calls } = createTestApp(manager);
  const response = await request(app).post('/admin/tasks').send({ title: '  Test task  ' });
  assert.equal(response.status, 201);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.deepEqual(calls, [{ title: 'Test task', actor: 'test-admin' }]);
});

test('task creation rejects missing, blank, oversized titles and privileged fields', async () => {
  const { app, calls } = createTestApp(manager);
  for (const body of [undefined, [], {}, { title: ' ' }, { title: 'x'.repeat(201) }, { title: 'Test', source: 'system' }, { title: 'Test', createdBy: 'spoofed' }]) {
    assert.equal((await request(app).post('/admin/tasks').send(body)).status, 400);
  }
  assert.deepEqual(calls, []);
});

test('task listing validates pagination and status', async () => {
  const { app, calls } = createTestApp(manager);
  const valid = await request(app).get('/admin/tasks?status=done&page=2&pageSize=10');
  assert.equal(valid.status, 200);
  assert.deepEqual(calls, [{ status: 'done', page: 2, pageSize: 10 }]);
  calls.length = 0;
  for (const query of ['page=0', 'page=1.5', 'pageSize=51', 'status=unknown', 'page=9007199254740992', 'status=open&status=done']) {
    assert.equal((await request(app).get(`/admin/tasks?${query}`)).status, 400);
  }
  assert.deepEqual(calls, []);
});

test('manager resolves a task with the current version and trusted actor', async () => {
  const { app, calls } = createTestApp(manager);
  const response = await request(app).patch(`/admin/tasks/${taskId}`).send({ status: 'done', version: task.version });
  assert.equal(response.status, 200);
  assert.deepEqual(calls, [{ id: taskId, status: 'done', version: task.version, actor: 'test-admin' }]);
});

test('task resolution rejects reopening, missing version and invalid identifiers', async () => {
  const { app, calls } = createTestApp(manager);
  for (const body of [{ status: 'open', version: task.version }, { status: 'done' }, { status: 'done', version: 'not-a-version' }, { status: 'done', version: task.version, resolvedBy: 'spoofed' }]) {
    assert.equal((await request(app).patch(`/admin/tasks/${taskId}`).send(body)).status, 400);
  }
  assert.equal((await request(app).patch('/admin/tasks/not-a-uuid').send({ status: 'done', version: task.version })).status, 400);
  assert.deepEqual(calls, []);
});
