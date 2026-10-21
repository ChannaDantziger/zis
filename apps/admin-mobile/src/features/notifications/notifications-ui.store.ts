import { makeAutoObservable, reaction } from 'mobx';
import { adminSessionStore } from '../../stores/admin-session.store.js';
import type { NotificationFilter, NotificationPreferences } from './notifications.types.js';

class NotificationsUiStore {
  filter: NotificationFilter = 'all';
  page = 1;
  draft: Partial<NotificationPreferences> = {};
  constructor() { makeAutoObservable(this); }
  setFilter(filter: NotificationFilter) { this.filter = filter; this.page = 1; }
  setPage(page: number) { this.page = page; }
  setNewOrder(value: boolean) { this.draft = { ...this.draft, pushNewOrderEnabled: value }; }
  setActionRequired(value: boolean) { this.draft = { ...this.draft, pushActionRequiredEnabled: value }; }
  clearDraft() { this.draft = {}; }
  reset() { this.filter = 'all'; this.page = 1; this.clearDraft(); }
}
export const notificationsUiStore = new NotificationsUiStore();
reaction(() => adminSessionStore.accessToken, () => notificationsUiStore.reset());