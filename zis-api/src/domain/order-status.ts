export const ORDER_STATUSES = [
  'ordered',
  'in_preparation',
  'packed',
  'in_transit',
  'delivered',
  'approved',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentStatus = 'pending' | 'authorized' | 'paid' | 'failed';

export interface PreparationStatusDefaults {
  preparationStatus: OrderStatus;
}

export interface PreparationEligibilityInput {
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  defaults: PreparationStatusDefaults;
}

export function canStartPreparation(input: PreparationEligibilityInput): boolean {
  return input.paymentStatus === 'paid'
    && input.orderStatus === input.defaults.preparationStatus;
}

export function assertKnownOrderStatus(value: string): asserts value is OrderStatus {
  if (!(ORDER_STATUSES as readonly string[]).includes(value)) {
    throw new Error(`Unknown order status: ${value}`);
  }
}

export function assertAdminCanCancel(status: OrderStatus): void {
  if (status === 'packed' || status === 'in_transit' || status === 'delivered') {
    throw new Error(`Order cannot be cancelled after packing: ${status}`);
  }
}
