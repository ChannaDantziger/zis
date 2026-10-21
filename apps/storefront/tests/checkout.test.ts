import assert from 'node:assert/strict';
import test from 'node:test';
import { CheckoutStore } from '../src/features/checkout/checkout.store';
import type { CheckoutApi, Quote, OrderInput } from '../src/features/checkout/checkout.types';
import { ApiError } from '../src/shared/api/http-client';

const items = [{ productVariantId: 'variant-a', quantitySets: 2 }];
const quote: Quote = { subtotal: '40.00', shippingTotal: '12.00', taxTotal: '0.00', total: '52.00',
  currency: 'ILS', availability: 'available', reservationCreated: false, warnings: [] };
const created = { orderId: 'order-a', orderNumber: 'QA-100', status: 'ordered' as const,
  paymentStatus: 'pending' as const, total: '52.00', currency: 'ILS' as const, confirmationToken: 'private-token' };
function setup(overrides: Partial<CheckoutApi> = {}) {
  const api: CheckoutApi = {
    status: async () => ({ storeOpen: true, lockMessage: null, timezone: 'Asia/Jerusalem', dispatchTime: '14:00', sameDayCutoffTime: '10:00' }),
    zones: async () => ({ data: [{ shippingZoneId: 'zone-a', name: 'אזור', city: 'ירושלים', neighborhood: 'מרכז' }] }),
    methods: async () => ({ data: [{ shippingMethodId: 'method-a', name: 'משלוח', code: 'delivery' }] }),
    availability: async () => ({ available: true, items: [] }), quote: async () => quote,
    create: async () => created,
    confirmation: async () => ({ ...created, deliveryDate: '2026-10-12' }), ...overrides,
  };
  return new CheckoutStore(api, () => 'stable-key');
}
async function ready(store: CheckoutStore) {
  await store.load();
  store.setDelivery('shippingZoneId', 'zone-a'); store.setDelivery('shippingMethodId', 'method-a');
  store.setDelivery('deliveryDate', '2026-10-12');
  for (const [field, value] of Object.entries({ customerName: 'לקוח QA', customerPhone: '0500000000',
    customerEmail: 'qa@example.invalid', street: 'רחוב QA', houseNumber: '1' })) store.setCustomer(field as keyof typeof store.customer, value);
  await store.preview(items);
}
test('closed store never quotes or creates', async () => {
  let calls = 0;
  const store = setup({ status: async () => ({ storeOpen: false, lockMessage: 'closed', timezone: 'Asia/Jerusalem', dispatchTime: null, sameDayCutoffTime: '10:00' }),
    quote: async () => { calls++; return quote; }, create: async () => { calls++; return created; } });
  await ready(store); await store.submit(items);
  assert.equal(calls, 0); assert.equal(store.created, null);
});
test('failed configuration read blocks checkout', async () => {
  const store = setup({ methods: async () => { throw new Error('offline'); } });
  await ready(store); assert.equal(store.status, null); assert.equal(store.canCreate, false);
});
test('server unavailable response blocks quote', async () => {
  let calls = 0;
  const store = setup({ availability: async () => ({ available: false, items: [] }), quote: async () => { calls++; return quote; } });
  await ready(store); assert.equal(calls, 0); assert.equal(store.quote, null); assert.ok(store.error);
});
test('cart change rejects previously calculated quote before creating', async () => {
  let calls = 0;
  const store = setup({ create: async () => { calls++; return created; } });
  await ready(store); await store.submit([{ ...items[0], quantitySets: 3 }]);
  assert.equal(calls, 0); assert.equal(store.quote, null);
});
test('unknown create result retries exact payload and key, not changed form or cart', async () => {
  const requests: Array<{ input: OrderInput; key: string }> = [];
  const store = setup({ create: async (input, key) => {
    requests.push({ input: JSON.parse(JSON.stringify(input)), key });
    if (requests.length === 1) throw new ApiError('offline', 0, 'NETWORK_ERROR');
    return created;
  } });
  await ready(store); await store.submit(items);
  assert.equal(store.retryPending, true);
  store.setCustomer('customerName', 'different');
  await store.submit([{ ...items[0], quantitySets: 4 }]);
  assert.deepEqual(requests[0], requests[1]);
  assert.equal(requests[0].input.deliveryAddress.city, 'ירושלים');
  assert.equal(requests[0].input.deliveryAddress.neighborhood, 'מרכז');
  assert.equal(store.created?.paymentStatus, 'pending'); assert.equal(store.customer.customerName, '');
  assert.deepEqual(items, [{ productVariantId: 'variant-a', quantitySets: 2 }]);
});
test('confirmation failure never re-POSTs committed order; retry uses private token', async () => {
  let creates = 0; let confirms = 0;
  const store = setup({ create: async () => { creates++; return created; }, confirmation: async (token) => {
    assert.equal(token, 'private-token'); confirms++;
    if (confirms === 1) throw new Error('offline');
    return { ...created, deliveryDate: '2026-10-12' };
  } });
  await ready(store); await store.submit(items); await store.submit(items); await store.refreshConfirmation();
  assert.equal(creates, 1); assert.equal(confirms, 2); assert.equal(store.created && 'confirmationToken' in store.created, false);
  assert.equal(store.confirmation?.orderNumber, 'QA-100');
});
test('definitive validation failure unlocks form and requires new quote', async () => {
  const store = setup({ create: async () => { throw new ApiError('rules', 422, 'BUSINESS_RULE_VIOLATION'); } });
  await ready(store); await store.submit(items);
  assert.equal(store.retryPending, false); assert.equal(store.quote, null); assert.equal(store.locked, false);
});
test('disposed page cannot restore stale quote or private confirmation', async () => {
  let resolve!: (value: Quote) => void;
  const store = setup({ quote: () => new Promise((done) => { resolve = done; }) });
  await store.load(); store.setDelivery('shippingZoneId', 'zone-a'); store.setDelivery('shippingMethodId', 'method-a'); store.setDelivery('deliveryDate', '2026-10-12');
  const pending = store.preview(items); await Promise.resolve(); store.dispose(); resolve(quote); await pending;
  assert.equal(store.quote, null); assert.equal(store.created, null); assert.equal(store.busy, false);
});

test('cart invalidation during delayed quote clears busy and ignores stale result', async () => {
  let resolve!: (value: Quote) => void;
  const store = setup({ quote: () => new Promise((done) => { resolve = done; }) });
  await store.load(); store.setDelivery('shippingZoneId', 'zone-a'); store.setDelivery('shippingMethodId', 'method-a'); store.setDelivery('deliveryDate', '2026-10-12');
  const pending = store.preview(items); await Promise.resolve(); store.invalidateQuote();
  assert.equal(store.busy, false); resolve(quote); await pending; assert.equal(store.quote, null);
});
test('cart invalidation does not strand initial configuration loading', async () => {
  let resolve!: (value: Awaited<ReturnType<CheckoutApi['methods']>>) => void;
  const store = setup({ methods: () => new Promise((done) => { resolve = done; }) });
  const pending = store.load(); store.invalidateQuote();
  resolve({ data: [{ shippingMethodId: 'method-a', name: 'משלוח', code: 'delivery' }] });
  await pending; assert.equal(store.loading, false); assert.equal(store.status?.storeOpen, true);
});
test('leaving pending attempt preserves retry while leaving created order clears PII and token', async () => {
  let count = 0; const tokens: string[] = [];
  const store = setup({ create: async () => { count++; if (count === 1) throw new Error('offline'); return created; },
    confirmation: async (token) => { tokens.push(token); return { ...created, deliveryDate: '2026-10-12' }; } });
  await ready(store); await store.submit(items); store.leave(); assert.equal(store.retryPending, true);
  await store.submit(items); store.leave(); await store.refreshConfirmation();
  assert.equal(tokens.length, 1); assert.equal(store.created?.orderNumber, 'QA-100'); assert.equal(store.customer.customerEmail, '');
});
test('separator-only phone and oversized name do not enable submission', async () => {
  const store = setup(); await ready(store); store.setCustomer('customerPhone', '-------'); assert.equal(store.canCreate, false);
  store.setCustomer('customerPhone', '0500000000'); store.setCustomer('customerName', 'a'.repeat(151)); assert.equal(store.canCreate, false);
});
test('known missing configuration 503 unlocks while generic 503 retains exact attempt', async () => {
  for (const code of ['ORDER_CREATION_NOT_CONFIGURED', 'COMMERCE_TAX_NOT_CONFIGURED', 'UNKNOWN_SERVICE_FAILURE']) {
    const store = setup({ create: async () => { throw new ApiError('unavailable', 503, code); } });
    await ready(store); await store.submit(items);
    assert.equal(store.retryPending, code === 'UNKNOWN_SERVICE_FAILURE');
    assert.match(store.error, /אינה זמינה/);
  }
});