import type { StoreStatus } from '../../shared/store-status';
export interface CheckoutItem { productId: string; productVariantId: string | null; quantitySets: number }
export interface ShippingZone { shippingZoneId: string; name: string; city: string; neighborhood: string | null }
export interface ShippingMethod { shippingMethodId: string; name: string; code: string }
export interface QuoteInput { deliveryDate: string; shippingZoneId: string; shippingMethodId: string; items: CheckoutItem[] }
export interface Quote { subtotal: string; shippingTotal: string; taxTotal: string; total: string; currency: 'ILS';
  availability: 'available' | 'unavailable'; reservationCreated: false; warnings: string[] }
export interface Availability { available: boolean;
  items: Array<CheckoutItem & { availableSets: number; requestedSets: number; shortageSets: number }> }
export interface CustomerForm { customerName: string; customerPhone: string; customerEmail: string; street: string;
  houseNumber: string; apartment: string; postalCode: string; venueName: string; dedicationText: string; customerNotes: string }
export interface OrderInput extends QuoteInput {
  customerName: string; customerPhone: string; customerEmail: string;
  deliveryAddress: { city: string; neighborhood?: string | null; street: string; houseNumber: string;
    apartment?: string; postalCode?: string; venueName?: string };
  dedicationText?: string; customerNotes?: string;
}
export interface OrderCreated { orderId: string; orderNumber: string; status: 'ordered'; paymentStatus: 'pending';
  total: string; currency: 'ILS'; confirmationToken: string }
export interface Confirmation { orderNumber: string; status: string; paymentStatus: string; deliveryDate: string; total: string; currency: 'ILS' }
export interface CheckoutApi {
  status(): Promise<StoreStatus>; zones(): Promise<{ data: ShippingZone[] }>; methods(): Promise<{ data: ShippingMethod[] }>;
  availability(input: Pick<QuoteInput, 'deliveryDate' | 'items'>): Promise<Availability>;
  quote(input: QuoteInput): Promise<Quote>; create(input: OrderInput, key: string): Promise<OrderCreated>;
  confirmation(token: string): Promise<Confirmation>;
}
export function emptyCustomer(): CustomerForm {
  return { customerName: '', customerPhone: '', customerEmail: '', street: '', houseNumber: '',
    apartment: '', postalCode: '', venueName: '', dedicationText: '', customerNotes: '' };
}
