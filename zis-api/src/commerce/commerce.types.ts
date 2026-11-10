import type {
  AvailabilityRequest,
  AvailabilityResponse,
  QuotePreview,
  ShippingQuoteInput,
  ShippingZoneResponse,
  StoreStatusResponse,
} from '../contracts/commerce.contracts.js';
import type { QuoteContext, QuoteRepository } from './quote.service.js';

export interface CommerceRepository extends QuoteRepository {
  getDeliveryDates?(now?: Date): Promise<{timezone:string;today:string;maxDate:string;availableDates:string[]}>;
  getStoreStatus(): Promise<StoreStatusResponse>;
  listShippingZones(): Promise<ShippingZoneResponse[]>;
  getAvailability(input: AvailabilityRequest): Promise<AvailabilityResponse>;
}

export interface CommerceService {
  getDeliveryDates?(now?: Date): Promise<{timezone:string;today:string;maxDate:string;availableDates:string[]}>;
  getStoreStatus(): Promise<StoreStatusResponse>;
  listShippingZones(): Promise<ShippingZoneResponse[]>;
  getAvailability(input: AvailabilityRequest): Promise<AvailabilityResponse>;
  calculateQuote(input: ShippingQuoteInput, now?: Date): Promise<QuotePreview>;
}

export type { QuoteContext };
