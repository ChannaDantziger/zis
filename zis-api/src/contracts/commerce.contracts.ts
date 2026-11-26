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
  productId: string;
  productVariantId?: string | null;
  quantitySets: number;
}

export interface BundleOrderInput {
  orderBundleId?: string;
  bundleId: string;
  quantity: number;
  components: Array<{ productId: string; quantity: number }>;
}

export interface OrderBundleSnapshot {
  orderBundleId: string;
  bundleId: string;
  categoryId: string;
  bundleName: string;
  categoryName: string;
  imagePath?: string | null;
  unitCount: number;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  components: Array<{ productId: string; productName: string; imagePath?: string | null; quantity: number; unitPrice: string }>;
}

export interface ShippingQuoteInput {
  deliveryDate: string;
  shippingZoneId: string;
  items: CartItemInput[];
  bundles?: BundleOrderInput[];
  isUrgent?: boolean;
}

export interface QuotePreview {
  calculatedAt: string;
  deliveryDate: string;
  subtotal: string;
  shippingTotal: string;
  taxTotal: string;
  taxRate?: string;
  total: string;
  currency: 'ILS';
  availability: 'available' | 'unavailable';
  reservationCreated: false;
  warnings: string[];
}

export interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  deliveryPhone?: string;
  customerEmail: string;
  deliveryAddress: DeliveryAddress;
  shippingZoneId: string;
  deliveryDate: string;
  items: CartItemInput[];
  bundles?: BundleOrderInput[];
  dedicationText?: string | null;
  customerNotes?: string | null;
}

export interface CreateOrderHeaders {
  idempotencyKey: string;
}

export interface OrderCreatedResponse {
  version?: string;
  isTest?: boolean;
  orderId: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: string;
  currency: 'ILS';
  confirmationToken: string;
}

export interface OrderConfirmationResponse {
  items?: Array<CartItemInput & { productName: string; lineTotal: string }>;
  bundles?: OrderBundleSnapshot[];
  version?: string;
  isTest?: boolean;
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
  bundles?: BundleOrderInput[];
}

export interface AvailabilityResponse {
  deliveryDate: string;
  available: boolean;
  shortages?: string[];
  items: Array<CartItemInput & {
    availableSets: number;
    requestedSets: number;
    shortageSets: number;
  }>;
}

export interface StoreStatusResponse {
  storeOpen: boolean;
  minimumProductSubtotal?: string;
  lockMode: 'open' | 'closed' | 'scheduled';
  lockMessage: string | null;
  timezone: string;
  sameDayCutoffTime: string;
  dispatchTime: string | null;
}

export interface ShippingZoneResponse {
  shippingZoneId: string;
  name: string;
  city: string;
  neighborhood: string | null;
}

