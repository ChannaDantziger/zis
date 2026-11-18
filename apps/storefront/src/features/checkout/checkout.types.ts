import type { StoreStatus } from '../../shared/store-status';
export interface CheckoutItem { productId: string; quantitySets: number }
export interface ShippingZone { shippingZoneId: string; name: string; city: string; neighborhood: string | null }
export interface QuoteInput { deliveryDate: string; shippingZoneId: string; items: CheckoutItem[] }
export interface Quote { subtotal: string; shippingTotal: string; taxTotal: string; total: string; currency: 'ILS';
  availability: 'available' | 'unavailable'; reservationCreated: false; warnings: string[] }
export interface Availability { available: boolean;
  items: Array<CheckoutItem & { availableSets: number; requestedSets: number; shortageSets: number }> }
export interface CustomerForm { customerName: string; customerPhone: string; deliveryPhone: string; customerEmail: string; street: string;
  houseNumber: string; apartment: string; postalCode: string; venueName: string; dedicationText: string; customerNotes: string }
export interface OrderInput extends QuoteInput {
  customerName: string; customerPhone: string; deliveryPhone: string; customerEmail: string;
  deliveryAddress: { city: string; neighborhood?: string | null; street: string; houseNumber: string;
    apartment?: string; postalCode?: string; venueName?: string };
  dedicationText?: string; customerNotes?: string;
}
export interface OrderCreated { version?: string; orderId: string; orderNumber: string; status: string; paymentStatus: string;
  total: string; currency: 'ILS'; confirmationToken: string }
export interface Confirmation { items?: CheckoutItem[]; version?: string; isTest: boolean; orderNumber: string; status: string; paymentStatus: string; deliveryDate: string; total: string; currency: 'ILS' }
export interface CheckoutApi {
  updatePending?(token: string, input: { items: CheckoutItem[]; expectedVersion: string }, key: string): Promise<OrderCreated>;
  dates?(): Promise<{ timezone: string; today: string; maxDate: string; availableDates: string[] }>;
  status(): Promise<StoreStatus>; zones(): Promise<{ data: ShippingZone[] }>;
  availability(input: Pick<QuoteInput, 'deliveryDate' | 'items'>): Promise<Availability>;
  quote(input: QuoteInput): Promise<Quote>; create(input: OrderInput, key: string): Promise<OrderCreated>;
  confirmation(token: string): Promise<Confirmation>;
}
export function emptyCustomer(): CustomerForm {
  return { customerName: '', customerPhone: '', deliveryPhone: '', customerEmail: '', street: '', houseNumber: '',
    apartment: '', postalCode: '', venueName: '', dedicationText: '', customerNotes: '' };
}
