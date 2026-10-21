import type { PageInfo } from '../contracts/common.contracts.js';
export interface InventoryAdminVariant {
  productVariantId: string; productName: string; variantName: string; productCode: string;
  availableSets: number; lowStockThresholdSets: number; defaultProductionQuantitySets: number;
  status: string; version: string;
  weeklyCapacity: { weekStartDate: string; capacitySets: number; isActive: boolean } | null;
  allocatedSets: number;
}
export interface InventoryAdminMovement {
  movementId: string; movementType: string; stockBefore: number | null; stockAfter: number;
  reason: string | null; createdBy: string | null; orderId: string | null; createdAt: string;
}
export interface InventoryAdminList { data: InventoryAdminVariant[]; page: PageInfo; weekStartDate: string; }
export interface InventoryAdminDetails {
  variant: InventoryAdminVariant;
  movements: InventoryAdminMovement[];
  page: PageInfo;
  weekStartDate: string;
}
export interface InventoryAdminRepository {
  list(page: number, weekStartDate: string): Promise<InventoryAdminList>;
  details(productVariantId: string, page: number, weekStartDate: string): Promise<InventoryAdminDetails | null>;
}
export interface InventoryAdminService {
  list(page: number, weekStartDate: string): Promise<InventoryAdminList>;
  details(productVariantId: string, page: number, weekStartDate: string): Promise<InventoryAdminDetails>;
}