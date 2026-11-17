export type OrderStatus = 'ordered' | 'in_preparation' | 'packed' | 'in_transit' | 'delivered' | 'approved' | 'cancelled';
export interface Task { taskId: string; title: string; priority: string; orderId: string | null; }
export type TaskStatus = 'open' | 'done' | 'dismissed';
export interface AdminTask extends Task {
  source: 'manual' | 'system'; priority: 'normal' | 'high' | 'critical'; status: TaskStatus;
  description: string | null; createdAt: string; resolvedAt: string | null; version: string;
}
export interface TaskListResponse { data: AdminTask[]; page: { page: number; pageSize: number; totalItems: number; totalPages: number }; }
export interface ProductionItem { productName: string; imagePath: string | null; requiredSets: number; orderCount: number; hasOpenTask: boolean; }
export interface OrderPreview { isTest?: boolean; orderId: string; orderNumber: string; status: OrderStatus; paymentStatus?: string; total: string; location: string; itemSummary: string; hasOpenTask: boolean; }
export interface Dashboard { date: string; todayOrderCount: number; cancelledOrderCount: number; unreadNotificationCount: number; openTaskCount?: number; statusCounts: Array<{ status: OrderStatus; count: number }>; openTasks: Task[]; nextOrders: OrderPreview[]; production: ProductionItem[]; }
export interface OrderRow extends OrderPreview { deliveryDate: string; city: string; allowedNextStatuses: OrderStatus[]; version: string; }
export interface OrderDetails {
  orderId: string; orderNumber: string; status: OrderStatus; paymentStatus: string; deliveryDate: string; total: string; version: string;
  isTest?: boolean; deliveryPhone?: string; customerName: string; customerPhone: string; customerEmail: string;
  deliveryAddress: { city: string; neighborhood?: string | null; street: string; houseNumber: string; apartment?: string | null; postalCode?: string | null };
  venueName: string | null; dedicationText: string | null; customerNotes: string | null;
  subtotal?: string; shippingTotal?: string; discountTotal?: string; taxTotal?: string; taxRate?: string;
  shippingZoneName?: string | null; shippingMethod?: string | null; deliveryTimeWindow?: unknown;
  packageCount?: number | null; courierNotes?: string | null; internalNotes?: string | null;
  isUrgent?: boolean; paymentConfirmedAt?: string | null; createdAt?: string; updatedAt?: string;
  payments?: Array<{ provider: string; providerTransactionId: string | null; amount: string; currency: string; status: string; isSimulated: boolean; createdAt: string }>;
  items: Array<{ orderItemId: string; productName: string; quantitySets: number; unitSetPrice: string; lineTotal: string; productCode?: string | null; setSize?: number | null }>;
  history: Array<{ historyId: string; fromStatus: OrderStatus | null; toStatus: OrderStatus; createdAt: string; note: string | null }>;
  tasks: Array<{ taskId: string; title: string; description: string | null; priority: string }>;
  allowedNextStatuses: OrderStatus[];
}
export interface BulkStatusResponse { requested: number; succeeded: number; failed: number; results: Array<{ orderId: string; ok: boolean; reason?: string }>; }
export interface AdminBusinessSettings { storeOpen: boolean; lockMode: 'open' | 'closed' | 'scheduled'; lockMessage: string | null; minimumProductSubtotal: string; maxAdvanceDays: number; dispatchTime: string | null; sameDayCutoffTime: string; workingDays: string[]; businessTimezone: string; blockHolidayEves: boolean; deliveryCalendarCountry: string; orderPreparationStatus: string; }
export interface AdminShippingZone { shippingZoneId: string; name: string; city: string; neighborhood: string | null; dispatchTime: string | null; isActive: boolean; }
export interface AdminShippingRule { shippingRuleId: string; shippingZoneId: string; basePrice: string; sizeFromSets: number; sizeToSets: number | null; sizeSurcharge: string; timeSurcharge: string; urgencySurcharge: string; isActive: boolean; }
export interface AdminStoreClosure { storeClosureId: string; startsAt: string; endsAt: string; reason: string | null; isActive: boolean; }
export interface AdminCommerceSettings { business: AdminBusinessSettings; shippingZones: AdminShippingZone[]; shippingRules: AdminShippingRule[]; closures: AdminStoreClosure[]; }

export interface OrderPageResponse { data: OrderRow[]; page: TaskListResponse['page'] }
