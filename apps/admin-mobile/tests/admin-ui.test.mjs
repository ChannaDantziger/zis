import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSource } from './load-source.mjs';

const dateUrl = await loadSource('../src/shared/api/business-date.ts');
const storeUrl = await loadSource('../src/stores/admin-ui.store.ts', {
  mobx: import.meta.resolve('mobx'), '../shared/api/business-date.js': dateUrl,
});
const { AdminUiStore, adminUiStore } = await import(storeUrl);
const { currentBusinessDate, isBusinessDate } = await import(dateUrl);

test('calendar dates reject rollover, empty input and malformed URLs', () => {
  for (const date of ['', '2026-02-29', '2026-04-31', '2026-13-01', '2026-1-09', '2026-10-09&date=x']) assert.equal(isBusinessDate(date), false, date);
  for (const date of ['2024-02-29', '2026-10-09']) assert.equal(isBusinessDate(date), true, date);
});

test('production drilldown removes conflicting filters and stale bulk selection', () => {
  const store = new AdminUiStore();
  store.setStatusFilter('delivered'); store.setLocation('old city'); store.setSortBy('total');
  store.setSortDirection('desc'); store.setOrderPage(3); store.selectOrders(['old-order']);
  store.showProductionOrders('2026-10-09', 'variant');
  assert.equal(store.deliveryDate, '2026-10-09'); assert.equal(store.productVariantFilter, 'variant');
  assert.equal(store.statusFilter, null); assert.equal(store.location, '');
  assert.equal(store.sortBy, 'status'); assert.equal(store.sortDirection, 'asc');
  assert.equal(store.orderPage, 1); assert.deepEqual(store.selectedOrderIds, []);
  store.selectOrders(['current-order']); store.setDeliveryDate('2026-10-10');
  assert.equal(store.productVariantFilter, null); assert.deepEqual(store.selectedOrderIds, []);
});

test('invalid dates leave valid screen state intact', () => {
  const store = new AdminUiStore(); const date = store.deliveryDate;
  store.setDeliveryDate('2026-02-30'); store.setProductionDate('');
  store.showProductionOrders('invalid', 'variant');
  assert.equal(store.deliveryDate, date); assert.equal(store.productionDate, date);
  assert.equal(store.productVariantFilter, null);
});

test('clearing additional order filters preserves the chosen day and status while clearing selection', () => {
  const store = new AdminUiStore();
  store.setDeliveryDate('2026-10-21'); store.setStatusFilter('packed');
  store.setLocation('בני ברק'); store.setProductVariantFilter('variant'); store.setSortBy('total');
  store.setSortDirection('desc'); store.setOrderPage(3); store.selectOrders(['order']);
  store.clearAdditionalFilters();
  assert.equal(store.deliveryDate, '2026-10-21'); assert.equal(store.statusFilter, 'packed');
  assert.equal(store.location, ''); assert.equal(store.productVariantFilter, null);
  assert.equal(store.sortBy, 'status'); assert.equal(store.sortDirection, 'asc');
  assert.equal(store.orderPage, 1); assert.deepEqual(store.selectedOrderIds, []);
});

test('session changes reset dates, filters, tasks, pages and selected orders', async () => {
  const storage = new Map();
  globalThis.window = { localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) } };
  const sessionUrl = await loadSource('../src/stores/admin-session.store.ts', { mobx: import.meta.resolve('mobx'), './admin-ui.store.js': storeUrl });
  const { adminSessionStore } = await import(sessionUrl);
  for (const action of [() => adminSessionStore.setSession('fixture-only-token'), () => adminSessionStore.clearSession()]) {
    adminUiStore.setProductionDate('2020-01-01'); adminUiStore.showProductionOrders('2020-01-01', 'old-variant');
    adminUiStore.setOrderPage(4); adminUiStore.setTaskStatus('done'); adminUiStore.setTaskPage(3); adminUiStore.selectOrders(['old-order']);
    action();
    assert.equal(adminUiStore.productionDate, currentBusinessDate()); assert.equal(adminUiStore.deliveryDate, currentBusinessDate());
    assert.equal(adminUiStore.productVariantFilter, null); assert.equal(adminUiStore.taskStatus, 'open');
    assert.equal(adminUiStore.orderPage, 1); assert.equal(adminUiStore.taskPage, 1); assert.deepEqual(adminUiStore.selectedOrderIds, []);
  }
  assert.equal(adminSessionStore.isAuthenticated, false); assert.equal(storage.size, 0);
});
test('an admin response from a replaced session is discarded before callers can use it', async () => {
  globalThis.__testViteEnv = { VITE_API_BASE_URL: 'http://fixture.invalid' };
  const sessionUrl = await loadSource('../src/stores/admin-session.store.ts', { mobx: import.meta.resolve('mobx'), './admin-ui.store.js': storeUrl });
  const { adminSessionStore } = await import(sessionUrl);
  const clientUrl = await loadSource('../src/shared/api/http-client.ts', {
    './business-date.js': dateUrl, '../../stores/admin-session.store.js': sessionUrl,
  });
  const { request } = await import(clientUrl);
  adminSessionStore.setSession('old-fixture');
  let finish; globalThis.fetch = () => new Promise((resolve) => { finish = resolve; });
  const pending = request('/admin/dashboard');
  adminSessionStore.setSession('new-fixture');
  finish({ ok: true, json: async () => ({ private: 'old account data' }) });
  await assert.rejects(pending, /המשתמש התחלף/);
  assert.equal(adminSessionStore.accessToken, 'new-fixture');

  let finishBody; globalThis.fetch = async () => ({ ok: true, json: () => new Promise((resolve) => { finishBody = resolve; }) });
  const pendingBody = request('/admin/dashboard');
  while (!finishBody) await new Promise((resolve) => setImmediate(resolve));
  adminSessionStore.clearSession(); finishBody({ private: 'old account data' });
  await assert.rejects(pendingBody, /המשתמש התחלף/);

  adminSessionStore.setSession('current-fixture');
  globalThis.fetch = async () => new Response(null, { status: 204 });
  assert.equal(await request('/admin/event-gallery/image-id', { method: 'DELETE' }), undefined);
});
