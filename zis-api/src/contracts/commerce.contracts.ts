export interface DeliveryAddress {
  city: string;
  neighborhood?: string | null;
  street: string;
  houseNumber: string;
  apartment?: string | null;
  postalCode?: string | null;
  venueName?: string | null;
}

export interface CartItemInput {
  productVariantId: string;
  quantitySets: number;
}

export interface ShippingQuoteInput {
  deliveryDate: string;
  shippingZoneId: string;
  shippingMethodId: string;
  items: CartItemInput[];
  isUrgent?: boolean;
}

export interface QuotePreview {
  calculatedAt: string;
  deliveryDate: string;
  subtotal: string;
  shippingTotal: string;
  taxTotal: string;
  total: string;
  currency: 'ILS';
  availability: 'available' | 'unavailable';
  reservationCreated: false;
  warnings: string[];
}

export interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryAddress: DeliveryAddress;
  shippingZoneId: string;
  shippingMethodId: string;
  deliveryDate: string;
  items: CartItemInput[];
  dedicationText?: string | null;
  customerNotes?: string | null;
}

export interface CreateOrderHeaders {
  idempotencyKey: string;
}

export interface OrderCreatedResponse {
  orderId: string;
  orderNumber: string;
  status: 'ordered';
  paymentStatus: 'pending';
  total: string;
  currency: 'ILS';
  confirmationToken: string;
}

export interface OrderConfirmationResponse {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  deliveryDate: string;
  total: string;
  currency: 'ILS';
}

export interface AvailabilityRequest {
  deliveryDate: string;
  items: CartItemInput[];
}

export interface AvailabilityResponse {
  deliveryDate: string;
  available: boolean;
  items: Array<CartItemInput & {
    availableSets: number;
    requestedSets: number;
    shortageSets: number;
  }>;
}

export interface StoreStatusResponse {
  storeOpen: boolean;
  lockMode: 'open' | 'closed' | 'scheduled';
  lockMessage: string | null;
  timezone: string;
  sameDayCutoffTime: string;
}

export interface ShippingZoneResponse {
  shippingZoneId: string;
  name: string;
  city: string;
  neighborhood: string | null;
}
