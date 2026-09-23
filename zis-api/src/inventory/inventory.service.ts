import type {
  InventoryMovementType,
  InventoryNotification,
  InventoryRepository,
  InventoryTransaction,
  SaleAllocation,
} from './inventory.types.js';

export interface AdminInventoryUpdate {
  productVariantId: string;
  deltaSets: number;
  reason: string;
  adminUserId: string;
}

export interface PaidSaleInput {
  productVariantId: string;
  orderId: string;
  quantitySets: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAcceptedShortage: boolean;
}

export interface InventoryService {
  getDefaultRestockQuantity(productVariantId: string): Promise<number>;
  updateByAdmin(input: AdminInventoryUpdate): Promise<{ stockBefore: number; stockAfter: number }>;
  applyPaidSale(input: PaidSaleInput): Promise<SaleAllocation>;
  reversePaidSale(input: { productVariantId: string; orderId: string; quantitySets: number; reason: string }): Promise<void>;
}

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive integer`);
  }
}

function assertNonZeroInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value === 0) {
    throw new Error(`${field} must be a non-zero integer`);
  }
}

function lowStockNotification(
  productVariantId: string,
  availableSets: number,
  threshold: number,
): InventoryNotification | undefined {
  if (availableSets > threshold) return undefined;
  return {
    notificationType: 'low_stock',
    title: 'מלאי נמוך',
    body: `Variant ${productVariantId} has ${availableSets} Sets available (threshold: ${threshold}).`,
    productVariantId,
  };
}

export function createInventoryService(repository: InventoryRepository): InventoryService {
  async function recordMovement(
    transaction: InventoryTransaction,
    productVariantId: string,
    before: number,
    delta: number,
    after: number,
    movementType: InventoryMovementType,
    reason: string,
    extra: { orderId?: string; createdBy?: string } = {},
  ): Promise<void> {
    await transaction.updateAvailableSets(productVariantId, after);
    await transaction.insertMovement({
      productVariantId,
      orderId: extra.orderId,
      movementType,
      stockBefore: before,
      stockAfter: after,
      reason,
      createdBy: extra.createdBy,
    });
  }

  return {
    async getDefaultRestockQuantity(productVariantId) {
      return repository.withTransaction(async (transaction) => {
        const variant = await transaction.getVariantForUpdate(productVariantId);
        return variant.defaultProductionQuantitySets;
      });
    },

    async updateByAdmin(input) {
      assertNonZeroInteger(input.deltaSets, 'deltaSets');
      if (!input.reason.trim()) throw new Error('reason is required');

      return repository.withTransaction(async (transaction) => {
        const variant = await transaction.getVariantForUpdate(input.productVariantId);
        const stockAfter = variant.availableSets + input.deltaSets;
        if (stockAfter < 0) throw new Error('Inventory cannot become negative');
        const movementType: InventoryMovementType = input.deltaSets > 0 ? 'restock' : 'adjustment';
        await recordMovement(transaction, input.productVariantId, variant.availableSets, input.deltaSets, stockAfter, movementType, input.reason, { createdBy: input.adminUserId });
        const notification = lowStockNotification(input.productVariantId, stockAfter, variant.lowStockThresholdSets);
        if (notification) await transaction.createNotifications([notification]);
        return { stockBefore: variant.availableSets, stockAfter };
      });
    },

    async applyPaidSale(input) {
      assertPositiveInteger(input.quantitySets, 'quantitySets');
      return repository.withTransaction(async (transaction) => {
        const variant = await transaction.getVariantForUpdate(input.productVariantId);
        const consumedSets = Math.min(variant.availableSets, input.quantitySets);
        const shortageSets = input.quantitySets - consumedSets;

        if (shortageSets > 0 && !input.customerAcceptedShortage) {
          throw new Error('Insufficient inventory requires explicit customer acceptance');
        }

        const allocation: SaleAllocation = shortageSets > 0
          ? { quantitySets: input.quantitySets, consumedSets, shortageSets, availabilityStatus: 'shortage_accepted', inventoryPriority: 'deferred' }
          : { quantitySets: input.quantitySets, consumedSets, shortageSets: 0, availabilityStatus: 'available', inventoryPriority: 'normal' };

        if (consumedSets > 0) {
          await recordMovement(transaction, input.productVariantId, variant.availableSets, -consumedSets, variant.availableSets - consumedSets, 'sale', `Paid order ${input.orderId}`, { orderId: input.orderId });
        }

        const notifications: InventoryNotification[] = [];
        const lowStock = lowStockNotification(input.productVariantId, variant.availableSets - consumedSets, variant.lowStockThresholdSets);
        if (lowStock) notifications.push(lowStock);
        if (shortageSets > 0) {
          notifications.push({
            notificationType: 'inventory_risk',
            title: 'סיכון מלאי בהזמנה',
            body: `Customer ${input.customerName}, ${input.customerPhone}, ${input.customerEmail}; shortage: ${shortageSets} Sets.`,
            productVariantId: input.productVariantId,
            orderId: input.orderId,
          });
        }
        if (notifications.length > 0) await transaction.createNotifications(notifications);
        return allocation;
      });
    },

    async reversePaidSale(input) {
      assertPositiveInteger(input.quantitySets, 'quantitySets');
      return repository.withTransaction(async (transaction) => {
        const variant = await transaction.getVariantForUpdate(input.productVariantId);
        const stockAfter = variant.availableSets + input.quantitySets;
        await recordMovement(transaction, input.productVariantId, variant.availableSets, input.quantitySets, stockAfter, 'sale_reversal', input.reason, { orderId: input.orderId });
        const notification = lowStockNotification(input.productVariantId, stockAfter, variant.lowStockThresholdSets);
        if (notification) await transaction.createNotifications([notification]);
      });
    },
  };
}
