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
