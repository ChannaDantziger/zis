import { makeAutoObservable } from 'mobx';
import { currentBusinessDate, isBusinessDate } from '../shared/api/business-date.js';
import type { TaskStatus } from '../entities/admin.types.js';

export class AdminUiStore {
  statusFilter: string | null = null;
  selectedOrderIds: string[] = [];
  deliveryDate = currentBusinessDate();
  productionDate = currentBusinessDate();
  location = '';
  sortBy = 'status';
  sortDirection = 'asc';
  taskStatus: TaskStatus = 'open';
  taskPage = 1;
  orderPage = 1;

  constructor() { makeAutoObservable(this); }
  setStatusFilter(value: string | null) { this.statusFilter = value; this.resetOrderPage(); }
  setDeliveryDate(value: string) { if (!isBusinessDate(value)) return; this.deliveryDate = value; this.resetOrderPage(); }
  setProductionDate(value: string) { if (!isBusinessDate(value)) return; this.productionDate = value; }
  setLocation(value: string) { this.location = value; this.resetOrderPage(); }
  setSortBy(value: string) { this.sortBy = value; this.resetOrderPage(); }
  setSortDirection(value: string) { this.sortDirection = value; this.resetOrderPage(); }
  clearAdditionalFilters() { this.location = ''; this.sortBy = 'status'; this.sortDirection = 'asc'; this.resetOrderPage(); }
  setTaskStatus(value: TaskStatus) { this.taskStatus = value; this.taskPage = 1; }
  setTaskPage(value: number) { this.taskPage = value; }
  setOrderPage(value: number) { this.orderPage = value; this.clearSelection(); }
  resetOrderPage() { this.orderPage = 1; this.clearSelection(); }
  selectOrders(orderIds: string[]) { this.selectedOrderIds = [...new Set(orderIds)]; }
  toggleOrder(orderId: string, checked: boolean) { this.selectedOrderIds = checked ? [...new Set([...this.selectedOrderIds, orderId])] : this.selectedOrderIds.filter((id) => id !== orderId); }
  reset() {
    this.statusFilter = null;
    this.selectedOrderIds = [];
    this.deliveryDate = currentBusinessDate();
    this.productionDate = this.deliveryDate;
    this.location = '';
    this.sortBy = 'status';
    this.sortDirection = 'asc';
    this.taskStatus = 'open';
    this.taskPage = 1;
    this.orderPage = 1;
  }
  clearSelection() { this.selectedOrderIds = []; }
}

export const adminUiStore = new AdminUiStore();
