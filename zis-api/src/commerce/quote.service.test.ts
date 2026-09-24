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
      minimumOrderTotal: '50.00',
      currency: 'ILS',
      variants: [{ productVariantId: 'variant-1', productMinimumSets: 1, pricePerSet: '100.00', availableSets: 3, active: true }],
      shippingRules: [
        { basePrice: '20.00', sizeFromSets: 1, sizeToSets: 3, sizeSurcharge: '0.00', timeSurcharge: '0.00', urgencySurcharge: '0.00', active: true },
        { basePrice: '35.00', sizeFromSets: 1, sizeToSets: 3, sizeSurcharge: '0.00', timeSurcharge: '0.00', urgencySurcharge: '0.00', active: true },
      ],
    };
  },
};

test('quote uses the highest matching shipping rule and never creates a reservation', async () => {
  const result = await createQuoteService(repository).calculate({
    deliveryDate: '2026-09-24', shippingZoneId: 'zone-1', shippingMethodId: 'method-1',
    items: [{ productVariantId: 'variant-1', quantitySets: 1 }],
  }, new Date('2026-09-24T05:00:00.000Z'));

  assert.equal(result.subtotal, '100.00');
  assert.equal(result.shippingTotal, '35.00');
  assert.equal(result.total, '135.00');
  assert.equal(result.reservationCreated, false);
});
