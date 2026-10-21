export interface InventoryVariant {
  productVariantId: string; productName: string; variantName: string; productCode: string;
  availableSets: number; lowStockThresholdSets: number; defaultProductionQuantitySets: number;
  status: string; version: string;
  weeklyCapacity: { weekStartDate: string; capacitySets: number; isActive: boolean } | null;
  allocatedSets: number;
}
export interface InventoryMovement {
  movementId: string; movementType: string; stockBefore: number | null; stockAfter: number;
  reason: string | null; createdBy: string | null; orderId: string | null; createdAt: string;
}
export interface InventoryPageInfo { page: number; pageSize: number; totalItems: number; totalPages: number; }
export interface InventoryVariantList { data: InventoryVariant[]; page: InventoryPageInfo; weekStartDate: string; }
export interface InventoryVariantDetails { variant: InventoryVariant; movements: InventoryMovement[]; page: InventoryPageInfo; weekStartDate: string; }