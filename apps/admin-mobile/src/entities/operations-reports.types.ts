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
  isTest?: boolean;
  address: { city: string | null; neighborhood: string | null; street: string | null; houseNumber: string | null; apartment: string | null; postalCode: string | null };
  venueName: string | null;
  dedicationText: string | null;
  customerNotes: string | null;
  transitionedAt: string;
  items: Array<{ productName: string; variantName: string; quantitySets: number; setSize: number }>;
}
export interface OperationReport {
  kind: OperationReportKind;
  date: string;
  generatedAt: string;
  orders: OperationReportOrder[];
}