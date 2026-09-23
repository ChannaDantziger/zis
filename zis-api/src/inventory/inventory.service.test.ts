import assert from 'node:assert/strict';
import test from 'node:test';
import { createInventoryService } from './inventory.service.js';
import type { InventoryRepository, InventoryTransaction, InventoryVariant, InventoryMovement, InventoryNotification } from './inventory.types.js';

function repository(initial: number): { repository: InventoryRepository; state: InventoryVariant; movements: InventoryMovement[]; notifications: InventoryNotification[] } {
  const state: InventoryVariant = { productVariantId: 'variant-1', availableSets: initial, lowStockThresholdSets: 1, defaultProductionQuantitySets: 5 };
  const movements: InventoryMovement[] = [];
  const notifications: InventoryNotification[] = [];
  const transaction: InventoryTransaction = {
    async getVariantForUpdate() { return { ...state }; },
    async updateAvailableSets(_id, availableSets) { state.availableSets = availableSets; },
    async insertMovement(movement) { movements.push(movement); },
    async createNotifications(items) { notifications.push(...items); },
  };
  return { repository: { async withTransaction(work) { return work(transaction); } }, state, movements, notifications };
}

test('admin update records before, delta and after in one transaction', async () => {
  const fixture = repository(2);
  const service = createInventoryService(fixture.repository);
  assert.equal(await service.getDefaultRestockQuantity('variant-1'), 5);
  const result = await service.updateByAdmin({ productVariantId: 'variant-1', deltaSets: 5, reason: 'Production completed', adminUserId: 'admin-1' });
  assert.deepEqual(result, { stockBefore: 2, stockAfter: 7 });
  assert.deepEqual(fixture.movements[0], { productVariantId: 'variant-1', orderId: undefined, movementType: 'restock', stockBefore: 2, stockAfter: 7, reason: 'Production completed', createdBy: 'admin-1' });
});

test('paid sale never makes inventory negative and records accepted shortage', async () => {
  const fixture = repository(2);
  const result = await createInventoryService(fixture.repository).applyPaidSale({ productVariantId: 'variant-1', orderId: 'order-1', quantitySets: 5, customerName: 'Dana', customerPhone: '050-1', customerEmail: 'dana@example.com', customerAcceptedShortage: true });
  assert.deepEqual(result, { quantitySets: 5, consumedSets: 2, shortageSets: 3, availabilityStatus: 'shortage_accepted', inventoryPriority: 'deferred' });
  assert.equal(fixture.state.availableSets, 0);
  assert.equal(fixture.movements[0].stockAfter, 0);
  assert.equal(fixture.notifications.some((notification) => notification.notificationType === 'inventory_risk'), true);
});
