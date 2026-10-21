import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSource } from './load-source.mjs';

const storage = new Map();
globalThis.window = { localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) } };
const mobx = import.meta.resolve('mobx');
const dateUrl = await loadSource('../src/shared/api/business-date.ts');
const uiUrl = await loadSource('../src/stores/admin-ui.store.ts', { mobx, '../shared/api/business-date.js': dateUrl });
const sessionUrl = await loadSource('../src/stores/admin-session.store.ts', { mobx, './admin-ui.store.js': uiUrl });
const notificationUrl = await loadSource('../src/features/notifications/notifications-ui.store.ts', { mobx, '../../stores/admin-session.store.js': sessionUrl });
const { notificationsUiStore: ui } = await import(notificationUrl);
const { adminSessionStore: session } = await import(sessionUrl);

test('changing notification filter resets its page and preserves unsaved preferences', () => {
  ui.setPage(3); ui.setNewOrder(false); ui.setActionRequired(true);
  ui.setFilter('unread');
  assert.equal(ui.page, 1); assert.equal(ui.filter, 'unread');
  assert.deepEqual(ui.draft, { pushNewOrderEnabled: false, pushActionRequiredEnabled: true });
  ui.clearDraft(); assert.deepEqual(ui.draft, {});
});
test('switching accounts or logging out removes personal notification state and drafts', () => {
  for (const action of [() => session.setSession('fixture-owner'), () => session.clearSession()]) {
    ui.setFilter('read'); ui.setPage(4); ui.setActionRequired(false);
    action();
    assert.equal(ui.filter, 'all'); assert.equal(ui.page, 1); assert.deepEqual(ui.draft, {});
  }
});