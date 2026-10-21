import type {
  AvailabilityRequest,
  AvailabilityResponse,
  QuotePreview,
  ShippingQuoteInput,
  ShippingZoneResponse,
  ShippingMethodResponse,
  StoreStatusResponse,
} from '../contracts/commerce.contracts.js';
import type { QuoteContext, QuoteRepository } from './quote.service.js';

export interface CommerceRepository extends QuoteRepository {
  getStoreStatus(): Promise<StoreStatusResponse>;
  listShippingZones(): Promise<ShippingZoneResponse[]>;
  listShippingMethods(): Promise<ShippingMethodResponse[]>;
  getAvailability(input: AvailabilityRequest): Promise<AvailabilityResponse>;
}

export interface CommerceService {
  getStoreStatus(): Promise<StoreStatusResponse>;
  listShippingZones(): Promise<ShippingZoneResponse[]>;
  listShippingMethods(): Promise<ShippingMethodResponse[]>;
  getAvailability(input: AvailabilityRequest): Promise<AvailabilityResponse>;
  calculateQuote(input: ShippingQuoteInput, now?: Date): Promise<QuotePreview>;
}

export type { QuoteContext };
