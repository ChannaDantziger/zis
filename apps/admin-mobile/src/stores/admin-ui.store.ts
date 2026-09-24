import { makeAutoObservable } from 'mobx';

class AdminUiStore {
  statusFilter: string | null = null;
  selectedOrderIds: string[] = [];

  constructor() { makeAutoObservable(this); }
  setStatusFilter(value: string | null) { this.statusFilter = value; }
  toggleOrder(orderId: string, checked: boolean) { this.selectedOrderIds = checked ? [...this.selectedOrderIds, orderId] : this.selectedOrderIds.filter((id) => id !== orderId); }
  clearSelection() { this.selectedOrderIds = []; }
}

export const adminUiStore = new AdminUiStore();
