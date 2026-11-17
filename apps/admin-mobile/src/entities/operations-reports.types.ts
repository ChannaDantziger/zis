import type { OrderStatus } from './admin.types.js';

export type OperationReportKind = 'packing' | 'delivery';
export interface OperationReportOrder {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  version: string;
  deliveryDate: string;
  customerName: string;
  customerPhone: string;
  deliveryPhone?: string;
  packageCount?: number | null;
  isTest?: boolean;
  address: { city: string | null; neighborhood: string | null; street: string | null; houseNumber: string | null; apartment: string | null; postalCode: string | null };
  venueName: string | null;
  dedicationText: string | null;
  customerNotes: string | null;
  transitionedAt: string;
  items: Array<{ categoryName: string; productName: string; quantitySets: number; setSize: number }>;
}
export interface OperationReport {
  kind: OperationReportKind;
  date: string;
  generatedAt: string;
  orders: OperationReportOrder[];
}
