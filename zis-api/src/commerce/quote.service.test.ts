import assert from 'node:assert/strict';
import test from 'node:test';
import { createQuoteService, type QuoteRepository } from './quote.service.js';

const repository: QuoteRepository = {
  async getContext() {
    return {
      deliveryPolicy: {
        timezone: 'Asia/Jerusalem', sameDayCutoffTime: '23:59', maxAdvanceDays: 7,
        workingDays: [0, 1, 2, 3, 4], holidayDates: new Set<string>(), storeOpen: true,
      },
      minimumProductSubtotal: '50.00',
      currency: 'ILS',
      variants: [{ productId: 'product-1', productVariantId: 'variant-1', pricePerSet: '100.00', availableSets: 3, active: true }],
      shippingRules: [
        { basePrice: '20.00', sizeFromSets: 1, sizeToSets: 3, sizeSurcharge: '0.00', timeSurcharge: '0.00', urgencySurcharge: '0.00', active: true },
        { basePrice: '35.00', sizeFromSets: 1, sizeToSets: 3, sizeSurcharge: '0.00', timeSurcharge: '0.00', urgencySurcharge: '0.00', active: true },
      ],
    };
  },
};

test('quote uses the highest matching shipping rule and never creates a reservation', async () => {
  const result = await createQuoteService(repository).calculate({
    deliveryDate: '2026-09-24', shippingZoneId: 'zone-1',
    items: [{ productId: 'product-1', productVariantId: 'variant-1', quantitySets: 1 }],
  }, new Date('2026-09-24T05:00:00.000Z'));

  assert.equal(result.subtotal, '100.00');
  assert.equal(result.shippingTotal, '35.00');
  assert.equal(result.total, '135.00');
  assert.equal(result.taxTotal, '0.00');
  assert.equal(result.reservationCreated, false);
});

test('quote rejects duplicate variants and totals outside numeric(12,2)',async()=>{
 const context=await repository.getContext({deliveryDate:'2026-09-24',shippingZoneId:'zone',items:[]});
 const service=createQuoteService({async getContext(){return context;}});
 const line={productId:'product-1',productVariantId:'variant-1',quantitySets:1};
 await assert.rejects(service.calculate({deliveryDate:'2026-09-24',shippingZoneId:'zone',items:[line,line]},new Date('2026-09-24T05:00:00Z')),{code:'VALIDATION_ERROR'});
 context.variants[0]!.pricePerSet='9999999999.99';
 await assert.rejects(service.calculate({deliveryDate:'2026-09-24',shippingZoneId:'zone',items:[{...line,quantitySets:2}]},new Date('2026-09-24T05:00:00Z')),{code:'BUSINESS_RULE_VIOLATION'});
});

test('quote prices bundle components once and checks stock shared with ordinary sets', async () => {
  const context = await repository.getContext({ deliveryDate: '2026-09-24', shippingZoneId: 'zone', items: [] });
  const service = createQuoteService({ async getContext() { return { ...context, minimumProductSubtotal: '0',
    variants: [{ productId: 'a', productVariantId: null, pricePerSet: '20.00', availableSets: 5, setSize: 2, active: true }],
    bundles: [{ bundleId: 'b', categoryId: 'c', name: 'מארז', unitCount: 2, active: true }],
    bundleProducts: [{ productId: 'a', categoryId: 'c', name: 'קינוח', pricePerUnit: '10.00', availableItems: 10, active: true }],
  }; } }, { shippingByPackages: true });
  const input = { deliveryDate: '2026-09-24', shippingZoneId: 'zone',
    items: [{ productId: 'a', quantitySets: 2 }],
    bundles: [{ bundleId: 'b', quantity: 2, components: [{ productId: 'a', quantity: 2 }] }] };
  const now = new Date('2026-09-24T05:00:00Z');
  // This test's shipping rules cap orders at 3, so permit the combined four lines.
  context.shippingRules.forEach(rule => { rule.sizeToSets = 10; });
  const quote = await service.calculate(input, now);
  assert.equal(quote.subtotal, '80.00');
  await assert.rejects(service.calculate({ ...input, items: [{ productId: 'a', quantitySets: 4 }] }, now), { code: 'STOCK_UNAVAILABLE' });
});

test('shipping tiers count identical bundles and one package for all loose products', async () => {
  const context = await repository.getContext({ deliveryDate: '2026-09-24', shippingZoneId: 'zone', items: [] });
  const service = createQuoteService({ async getContext() { return { ...context, minimumProductSubtotal: '0',
    variants: [{ productId: 'a', productVariantId: null, pricePerSet: '20.00', availableSets: 20, setSize: 2, active: true }],
    bundles: [{ bundleId: 'b', categoryId: 'c', name: 'מארז', unitCount: 2, active: true }],
    bundleProducts: [{ productId: 'a', categoryId: 'c', name: 'קינוח', pricePerUnit: '10.00', availableItems: 100, active: true }],
    shippingRules: [1,2,3].map(count => ({ basePrice: `${count * 10}.00`, sizeFromSets: count, sizeToSets: count,
      sizeSurcharge:'0',timeSurcharge:'0',urgencySurcharge:'0',active:true }))
  }; } }, { shippingByPackages: true });
  const input = { deliveryDate:'2026-09-24', shippingZoneId:'zone', items:[{productId:'a',quantitySets:4}] };
  const now = new Date('2026-09-24T05:00:00Z');
  assert.equal((await service.calculate(input,now)).shippingTotal,'10.00');
  assert.equal((await service.calculate({ ...input, bundles:[{bundleId:'b',quantity:2,components:[{productId:'a',quantity:2}]}] },now)).shippingTotal,'30.00');
  assert.equal((await service.calculate({ ...input, items:[], bundles:[{bundleId:'b',quantity:2,components:[{productId:'a',quantity:2}]}] },now)).shippingTotal,'20.00');
});

test('disabled bundle test mode preserves the existing shipping calculation', async () => {
  const context = await repository.getContext({ deliveryDate:'2026-09-24',shippingZoneId:'zone',items:[] });
  context.variants[0].availableSets = 10;
  context.shippingRules = [1,4].map(count => ({ basePrice:`${count * 10}.00`,sizeFromSets:count,sizeToSets:count,
    sizeSurcharge:'0',timeSurcharge:'0',urgencySurcharge:'0',active:true }));
  const service = createQuoteService({ async getContext() { return context; } });
  const result = await service.calculate({ deliveryDate:'2026-09-24',shippingZoneId:'zone',items:[{productId:'product-1',productVariantId:'variant-1',quantitySets:4}] },new Date('2026-09-24T05:00:00Z'));
  assert.equal(result.shippingTotal,'40.00');
});
