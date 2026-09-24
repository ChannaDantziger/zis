export type OrderStatus = 'ordered' | 'in_preparation' | 'packed' | 'in_transit' | 'delivered' | 'approved' | 'cancelled';
export interface Task { taskId: string; title: string; priority: string; orderId: string | null; }
export interface ProductionItem { productVariantId: string; productName: string; variantName: string; imagePath: string | null; requiredSets: number; orderCount: number; hasOpenTask: boolean; }
export interface OrderPreview { orderId: string; orderNumber: string; status: OrderStatus; total: string; location: string; itemSummary: string; hasOpenTask: boolean; }
export interface Dashboard { date: string; todayOrderCount: number; cancelledOrderCount: number; unreadNotificationCount: number; statusCounts: Array<{ status: OrderStatus; count: number }>; openTasks: Task[]; nextOrders: OrderPreview[]; production: ProductionItem[]; }
export interface OrderRow extends OrderPreview { deliveryDate: string; city: string; productVariantId: string | null; allowedNextStatuses: OrderStatus[]; version: string; }
export interface BulkStatusResponse { requested: number; succeeded: number; failed: number; results: Array<{ orderId: string; ok: boolean; reason?: string }>; }
