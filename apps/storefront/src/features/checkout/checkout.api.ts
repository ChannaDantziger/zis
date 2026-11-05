import { apiRequest } from '../../shared/api/http-client';
import type { CheckoutApi } from './checkout.types';
const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body), cache: 'no-store' });
export const checkoutApi: CheckoutApi = {
  updatePending: (token, input, key) => apiRequest('/orders/pending', { method: 'PATCH', cache: 'no-store', body: JSON.stringify(input),
    headers: { Authorization: 'Bearer ' + token, 'Idempotency-Key': key } }),
  dates: (zoneId) => apiRequest('/delivery-dates?shippingZoneId=' + encodeURIComponent(zoneId), { cache: 'no-store' }),
  status: () => apiRequest('/store-status', { cache: 'no-store' }),
  zones: () => apiRequest('/shipping/zones'),
  availability: (input) => apiRequest('/availability', json(input)),
  quote: (input) => apiRequest('/quote', json(input)),
  create: (input, key) => apiRequest('/orders', { ...json(input), headers: { 'Idempotency-Key': key } }),
  confirmation: (token) => apiRequest('/orders/confirmation',
    { cache: 'no-store', headers: { Authorization: 'Bearer ' + token } }),
};
