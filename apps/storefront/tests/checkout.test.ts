import assert from 'node:assert/strict';
import test from 'node:test';
import { CheckoutStore } from '../src/features/checkout/checkout.store';
import type { CheckoutApi, Quote, OrderInput } from '../src/features/checkout/checkout.types';
import { ApiError } from '../src/shared/api/http-client';
import { cartStore } from '../src/stores/cart.store';

const items = [{ productId: 'product-a', quantitySets: 2 }];
const quote: Quote = { subtotal: '40.00', shippingTotal: '12.00', taxTotal: '0.00', total: '52.00',
  currency: 'ILS', availability: 'available', reservationCreated: false, warnings: [] };
const created = { orderId: 'order-a', orderNumber: 'QA-100', status: 'ordered' as const,
  paymentStatus: 'pending' as const, total: '52.00', currency: 'ILS' as const, confirmationToken: 'private-token' };
function setup(overrides: Partial<CheckoutApi> = {}) {
  const api: CheckoutApi = {
    status: async () => ({ storeOpen: true, lockMessage: null, timezone: 'Asia/Jerusalem', dispatchTime: '14:00', sameDayCutoffTime: '10:00' }),
    zones: async () => ({ data: [{ shippingZoneId: 'zone-a', name: 'אזור', city: 'ירושלים', neighborhood: 'מרכז' }] }),
    availability: async () => ({ available: true, items: [] }), quote: async () => quote,
    create: async () => created,
    confirmation: async () => ({ ...created, isTest: false, deliveryDate: '2026-10-12' }), ...overrides,
  };
  return new CheckoutStore(api, () => 'stable-key');
}
async function ready(store: CheckoutStore) {
  await store.load();
  store.setDelivery('shippingZoneId', 'zone-a');
  store.setDelivery('deliveryDate', '2026-10-12');
  for (const [field, value] of Object.entries({ customerName: 'לקוח QA', customerPhone: '0500000000', deliveryPhone: '02-1234567',
    customerEmail: 'qa@example.invalid', street: 'רחוב QA', houseNumber: '1' })) store.setCustomer(field as keyof typeof store.customer, value);
  await store.preview(items);
}
test('creation clears the matching cart once and later confirmation preserves additions', async () => {
  cartStore.items = items.map(item => ({ ...item }));
  const store = setup();
  try {
    await ready(store); await store.submit(items);
    assert.deepEqual(cartStore.items, []);
    cartStore.items = [{ productId: 'new-product', quantitySets: 1 }];
    await store.refreshConfirmation();
    assert.deepEqual(cartStore.items, [{ productId: 'new-product', quantitySets: 1 }]);
  } finally { cartStore.clear(); store.dispose(); }
});
test('closed store never quotes or creates', async () => {
  let calls = 0;
  const store = setup({ status: async () => ({ storeOpen: false, lockMessage: 'closed', timezone: 'Asia/Jerusalem', dispatchTime: null, sameDayCutoffTime: '10:00' }),
    quote: async () => { calls++; return quote; }, create: async () => { calls++; return created; } });
  await ready(store); await store.submit(items);
  assert.equal(calls, 0); assert.equal(store.created, null);
});
test('failed configuration read blocks checkout', async () => {
  const store = setup({ zones: async () => { throw new Error('offline'); } });
  await ready(store); assert.equal(store.status, null); assert.equal(store.canCreate, false);
});
test('server unavailable response blocks quote', async () => {
  let calls = 0;
  const store = setup({ availability: async () => ({ available: false, items: [] }), quote: async () => { calls++; return quote; } });
  await ready(store); assert.equal(calls, 0); assert.equal(store.quote, null); assert.ok(store.error);
});
test('origin rejection explains the configuration problem and exposes its request reference', async () => {
  const store = setup({ availability: async () => {
    throw new ApiError('forbidden', 403, 'ORIGIN_NOT_ALLOWED', 'request-reference');
  } });
  await ready(store);
  assert.equal(store.quote, null);
  assert.match(store.error, /CORS/);
  assert.match(store.error, /request-reference/);
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
  assert.deepEqual(items, [{ productId: 'product-a', quantitySets: 2 }]);
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
  await store.load(); store.setDelivery('shippingZoneId', 'zone-a'); store.setDelivery('deliveryDate', '2026-10-12');
  const pending = store.preview(items); await Promise.resolve(); store.dispose(); resolve(quote); await pending;
  assert.equal(store.quote, null); assert.equal(store.created, null); assert.equal(store.busy, false);
});

test('cart invalidation during delayed quote clears busy and ignores stale result', async () => {
  let resolve!: (value: Quote) => void;
  const store = setup({ quote: () => new Promise((done) => { resolve = done; }) });
  await store.load(); store.setDelivery('shippingZoneId', 'zone-a'); store.setDelivery('deliveryDate', '2026-10-12');
  const pending = store.preview(items); await Promise.resolve(); store.invalidateQuote();
  assert.equal(store.busy, false); resolve(quote); await pending; assert.equal(store.quote, null);
});
test('cart invalidation does not strand initial configuration loading', async () => {
  let resolve!: (value: Awaited<ReturnType<CheckoutApi['zones']>>) => void;
  const store = setup({ zones: () => new Promise((done) => { resolve = done; }) });
  const pending = store.load(); store.invalidateQuote();
  resolve({ data: [{ shippingZoneId: 'zone-a', name: 'אזור', city: 'ירושלים', neighborhood: 'מרכז' }] });
  await pending; assert.equal(store.loading, false); assert.equal(store.status?.storeOpen, true);
});
test('leaving pending attempt preserves retry and a created pending order keeps its private continuation token', async () => {
  let count = 0; const tokens: string[] = [];
  const store = setup({ create: async () => { count++; if (count === 1) throw new Error('offline'); return created; },
    confirmation: async (token) => { tokens.push(token); return { ...created, deliveryDate: '2026-10-12' }; } });
  await ready(store); await store.submit(items); store.leave(); assert.equal(store.retryPending, true);
  await store.submit(items); store.leave(); await store.refreshConfirmation();
  assert.equal(tokens.length, 2); assert.equal(store.hasPrivateConfirmation, true);
  assert.equal(store.created?.orderNumber, 'QA-100'); assert.equal(store.customer.customerEmail, '');
});
test('separator-only phone and oversized name do not enable submission', async () => {
  const store = setup(); await ready(store); store.setCustomer('customerPhone', '-------'); assert.equal(store.canCreate, false);
  store.setCustomer('customerPhone', '0500000000'); store.setCustomer('customerName', 'a'.repeat(151)); assert.equal(store.canCreate, false);
});

test('contact validation accepts requested separators and rejects malformed numbers and email', async () => {
  const store = setup(); await ready(store);
  for (const phone of ['02-1234567', '050 1234567', '050.1234567']) {
    store.setCustomer('customerPhone', phone); store.setCustomer('deliveryPhone', phone);
    assert.equal(store.validCustomer, true);
  }
  for (const phone of ['12345678', '12345678901', '+972501234567', '050abc1234']) {
    store.setCustomer('deliveryPhone', phone); assert.equal(store.validCustomer, false);
  }
  store.setCustomer('deliveryPhone', '0501234567');
  store.setCustomer('customerEmail', 'dgfd@dsf.sd'); assert.equal(store.validCustomer, true);
  store.setCustomer('customerEmail', 'bad@email'); assert.equal(store.validCustomer, false);
});


test('admin test mode never uses public creation and retries simulated approval without creating again', async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ path: string; body: Record<string, unknown>; authorization: string | null }> = [];
  let approveCalls = 0;
  globalThis.fetch = async (input, init) => {
    const path = String(input);
    const body = JSON.parse(String(init?.body ?? '{}'));
    requests.push({ path, body, authorization: new Headers(init?.headers).get('Authorization') });
    if (path.endsWith('/auth/login')) return Response.json({ accessToken: 'admin-memory-token', user: { role: 'operations_manager' } });
    if (path.endsWith('/orders/confirmation')) return Response.json({
      isTest: true, orderNumber: created.orderNumber, status: 'ordered', paymentStatus: approveCalls > 1 ? 'paid' : 'pending',
      deliveryDate: '2026-10-12', total: created.total, currency: 'ILS', version: approveCalls > 1 ? '2' : '1', items,
    });
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer admin-memory-token');
    if (path.endsWith('/admin/test-orders')) {
      assert.equal(new Headers(init?.headers).get('Idempotency-Key'), 'stable-key');
      assert.equal('cardNumber' in body, false); assert.equal('cvv' in body, false);
      assert.equal(body.deliveryPhone, '02-1234567');
      return Response.json({ ...created, isTest: true, version: '1' });
    }
    if (path.endsWith('/approve-payment')) {
      approveCalls++; if (approveCalls === 1) throw new Error('unknown result');
      return Response.json({ orderId: created.orderId, paymentStatus: 'paid', isTest: true, simulated: true, charged: false, version: '2' });
    }
    throw new Error('unexpected request');
  };
  let store: CheckoutStore | undefined;
  try {
    store = setup({
      create: async () => { throw new Error('public creation must not be used'); },
      confirmation: async () => ({ isTest: true, orderNumber: created.orderNumber, status: 'ordered', paymentStatus: 'pending',
        deliveryDate: '2026-10-12', total: created.total, currency: 'ILS', version: '1', items }),
    });
    await ready(store); await store.authorizeTest('admin@example.invalid', 'synthetic-password');
    await store.submit(items); assert.equal(store.confirmation?.isTest, true);
    await store.approveTestPayment(); assert.equal(store.simulatedPaid, false);
    await store.approveTestPayment(); assert.equal(store.simulatedPaid, true);
    assert.equal(requests.filter((request) => request.path.endsWith('/admin/test-orders')).length, 1);
    const approvalRequests = requests.filter((request) => request.path.endsWith('/approve-payment'));
    assert.equal(approvalRequests.length, 2);
    assert.deepEqual(approvalRequests[0].body, approvalRequests[1].body);
    store.leave(); assert.equal(store.testAuthorized, false);
  } finally { store?.dispose(); globalThis.fetch = originalFetch; }
});
