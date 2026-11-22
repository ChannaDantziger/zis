import type { OrderCreated } from './checkout.types';

const CHECKOUT_RECOVERY_KEY = 'zis.checkout.recovery.v1';
export type CheckoutRecovery = { token: string; order: Omit<OrderCreated, 'confirmationToken'> };

export function readCheckoutRecovery(): CheckoutRecovery | null {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(CHECKOUT_RECOVERY_KEY) ?? 'null');
    if (!value || typeof value !== 'object') return null;
    const { token, order } = value as Partial<CheckoutRecovery>;
    if (typeof token !== 'string' || !token || !order || typeof order.orderId !== 'string'
      || typeof order.orderNumber !== 'string' || typeof order.total !== 'string'
      || typeof order.currency !== 'string' || typeof order.status !== 'string'
      || typeof order.paymentStatus !== 'string') return null;
    return { token, order };
  } catch { return null; }
}

export function writeCheckoutRecovery(token: string, order: Omit<OrderCreated, 'confirmationToken'>) {
  try { sessionStorage.setItem(CHECKOUT_RECOVERY_KEY, JSON.stringify({ token, order })); } catch { /* Recovery is best effort. */ }
}

export function clearCheckoutRecovery() {
  try { sessionStorage.removeItem(CHECKOUT_RECOVERY_KEY); } catch { /* Storage may be unavailable. */ }
}
