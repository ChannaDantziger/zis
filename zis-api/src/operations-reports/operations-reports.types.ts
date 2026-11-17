export type OperationReportKind = 'packing' | 'delivery';
export interface OperationReportQuery {
  date: string;
  city?: string;
  orderIds?: string[];
}
export interface OperationReportItem {
  categoryName: string;
  productName: string;
  variantName: string;
  quantitySets: number;
  setSize: number;
}
export interface OperationReportOrder {
  orderId: string;
  orderNumber: string;
  status: string;
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
  items: OperationReportItem[];
}
export interface OperationReport {
  kind: OperationReportKind;
  date: string;
  generatedAt: string;
  orders: OperationReportOrder[];
}
export interface OperationsReportsRepository {
  read(kind: OperationReportKind, query: OperationReportQuery): Promise<OperationReport>;
}
export interface OperationsReportsService {
  read(kind: OperationReportKind, query: OperationReportQuery): Promise<OperationReport>;
}
