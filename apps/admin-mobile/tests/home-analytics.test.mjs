import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSource } from './load-source.mjs';

const sourceUrl = await loadSource('../src/features/home/home-analytics.ts');
const { summarizeProduction, summarizeCities } = await import(sourceUrl);

function order(orderId, status, paymentStatus, city, quantitySets) {
  return { orderId, orderNumber: orderId, status, paymentStatus, city, deliveryDate: '2026-11-10',
    address: 'רחוב 1', zoneName: city, version: '1', packageCount: null,
    items: [{ orderItemId: `${orderId}-item`, productName: 'עוגה', variantName: '', quantitySets,
      categoryName: 'עוגות', productId: 'product-1', productVariantId: null, imageUrl: '/photo' }] };
}

const orders = [
  order('paid-open', 'ordered', 'paid', 'ירושלים', 2),
  order('paid-packed', 'packed', 'paid', 'ירושלים', 3),
  order('unpaid-open', 'ordered', 'pending', 'ירושלים', 5),
  order('cancelled', 'cancelled', 'paid', 'ירושלים', 4),
  order('paid-preparing', 'in_preparation', 'paid', 'בית שמש', 1),
];

test('production shows ordered paid sets and separately counts sets still needing preparation', () => {
  const groups = summarizeProduction(orders);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].orderedSets, 6);
  assert.equal(groups[0].remainingSets, 3);
  assert.deepEqual(groups[0].lines.map(line => line.order.orderId), ['paid-open', 'paid-packed', 'paid-preparing']);
});

test('city drilldown count equals its order list and excludes cancelled orders', () => {
  const cities = summarizeCities(orders);
  assert.equal(cities[0].city, 'ירושלים');
  assert.equal(cities[0].count, 3);
  assert.deepEqual(cities[0].orders.map(order => order.orderId), ['paid-open', 'paid-packed', 'unpaid-open']);
  assert.equal(cities.reduce((sum, city) => sum + city.count, 0), 4);
  assert.deepEqual(summarizeCities([]), []);
});
