import type { AvailabilityRequest, ShippingQuoteInput } from '../contracts/commerce.contracts.js';
import { createQuoteService } from './quote.service.js';
import type { CommerceRepository, CommerceService } from './commerce.types.js';

export function createCommerceService(repository: CommerceRepository): CommerceService {
  const quoteService = createQuoteService(repository);
  return {
    getDeliveryDates: (zone,now) => repository.getDeliveryDates!(zone,now),
    getStoreStatus: () => repository.getStoreStatus(),
    listShippingZones: () => repository.listShippingZones(),
    getAvailability: (input: AvailabilityRequest) => repository.getAvailability(input),
    calculateQuote: (input: ShippingQuoteInput, now?: Date) => quoteService.calculate(input, now),
  };
}
