export type InventoryMovementType =
  | 'sale'
  | 'sale_reversal'
  | 'restock'
  | 'adjustment';

export type InventoryPriority = 'normal' | 'deferred';
export type AvailabilityStatus = 'available' | 'shortage_risk' | 'shortage_accepted';

export interface InventoryVariant {
  productVariantId: string;
  availableSets: number;
  lowStockThresholdSets: number;
  defaultProductionQuantitySets: number;
}

export interface InventoryMovement {
  productVariantId: string;
  orderId?: string;
  movementType: InventoryMovementType;
  stockBefore: number;
  stockAfter: number;
  reason: string;
  createdBy?: string;
}

export interface InventoryNotification {
  notificationType: 'low_stock' | 'inventory_risk';
  title: string;
  body: string;
  productVariantId?: string;
  orderId?: string;
}

export interface SaleAllocation {
  quantitySets: number;
  consumedSets: number;
  shortageSets: number;
  availabilityStatus: AvailabilityStatus;
  inventoryPriority: InventoryPriority;
}

export interface InventoryTransaction {
  getVariantForUpdate(productVariantId: string): Promise<InventoryVariant>;
  updateAvailableSets(productVariantId: string, availableSets: number): Promise<void>;
  insertMovement(movement: InventoryMovement): Promise<void>;
  createNotifications(notifications: InventoryNotification[]): Promise<void>;
}

export interface InventoryRepository {
  withTransaction<T>(work: (transaction: InventoryTransaction) => Promise<T>): Promise<T>;
}
