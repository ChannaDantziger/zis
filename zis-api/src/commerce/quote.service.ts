import type { CartItemInput, QuotePreview, ShippingQuoteInput } from '../contracts/commerce.contracts.js';
import { ApiError } from '../http/api-error.js';
import { assertDeliveryDateAllowed, type DeliveryPolicy } from './delivery-policy.js';

export interface QuoteVariantContext {
  productId: string;
  productVariantId: string | null;
  pricePerSet: string;
  availableSets: number;
  active: boolean;
}

export interface ShippingRuleContext {
  basePrice: string;
  sizeFromSets: number;
  sizeToSets: number | null;
  sizeSurcharge: string;
  timeSurcharge: string;
  urgencySurcharge: string;
  active: boolean;
}

export interface QuoteContext {
  deliveryPolicy: DeliveryPolicy;
  minimumProductSubtotal: string;
  currency: 'ILS';
  taxRate: string;
  shippingRules: ShippingRuleContext[];
  variants: QuoteVariantContext[];
}

export interface QuoteRepository {
  getContext(input: ShippingQuoteInput): Promise<QuoteContext>;
}

export interface QuoteService {
  calculate(input: ShippingQuoteInput, now?: Date): Promise<QuotePreview>;
}

export function createQuoteService(repository: QuoteRepository): QuoteService {
  return {
    async calculate(input, now = new Date()) {
      const context = await repository.getContext(input);
      assertDeliveryDateAllowed(input.deliveryDate, now, context.deliveryPolicy);
      const lines = validateItems(input.items, context.variants);
      const totalSets = lines.reduce((sum, line) => sum + line.quantitySets, 0);
      const subtotalCents = lines.reduce((sum, line) => sum + moneyToCents(line.variant.pricePerSet) * line.quantitySets, 0);
      const shippingTotalCents = calculateShipping(input, context.shippingRules, totalSets);
      const totalCents = subtotalCents + shippingTotalCents;
      if (!Number.isSafeInteger(totalCents) || totalCents > 999999999999) throw new ApiError(422,'BUSINESS_RULE_VIOLATION','Order amount exceeds the supported range');
      const minimumCents = moneyToCents(context.minimumProductSubtotal);
      if (subtotalCents < minimumCents) {
        throw new ApiError(422, 'MINIMUM_ORDER_NOT_MET', 'Product subtotal is below the store minimum');
      }

      return {
        calculatedAt: now.toISOString(),
        deliveryDate: input.deliveryDate,
        subtotal: centsToMoney(subtotalCents),
        shippingTotal: centsToMoney(shippingTotalCents),
        taxTotal: inclusiveTax(totalCents,context.taxRate),
        taxRate: context.taxRate,
        total: centsToMoney(totalCents),
        currency: context.currency,
        availability: 'available',
        reservationCreated: false,
        warnings: [],
      };
    },
  };
}

function validateItems(items: CartItemInput[], variants: QuoteVariantContext[]) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'At least one item is required');
  }
  const seen=new Set<string>();
  return items.map((item) => {
    const key = item.productVariantId ?? item.productId;
    if (seen.has(key)) throw new ApiError(400,'VALIDATION_ERROR','Duplicate product item');
    seen.add(key);
    if (!Number.isSafeInteger(item.quantitySets) || item.quantitySets < 1) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'quantitySets must be a positive integer');
    }
    const variant = variants.find((candidate) => candidate.productId === item.productId && candidate.productVariantId === (item.productVariantId ?? null));
    if (!variant || !variant.active) {
      throw new ApiError(422, 'BUSINESS_RULE_VIOLATION', 'Product variant is unavailable');
    }
    if (item.quantitySets > variant.availableSets) {
      throw new ApiError(422, 'BUSINESS_RULE_VIOLATION', 'Requested quantity is not available');
    }
    return { item, quantitySets: item.quantitySets, variant };
  });
}

function calculateShipping(input: ShippingQuoteInput, rules: ShippingRuleContext[], totalSets: number): number {
  const matchingRules = rules.filter((rule) => rule.active && totalSets >= rule.sizeFromSets && (rule.sizeToSets === null || totalSets <= rule.sizeToSets));
  if (matchingRules.length === 0) {
    throw new ApiError(422, 'BUSINESS_RULE_VIOLATION', 'No shipping rule is available for this order');
  }
  return Math.max(...matchingRules.map((rule) => moneyToCents(rule.basePrice)
    + moneyToCents(rule.sizeSurcharge)
    + moneyToCents(rule.timeSurcharge)
    + (input.isUrgent ? moneyToCents(rule.urgencySurcharge) : 0)));
}

function moneyToCents(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new ApiError(500, 'INTERNAL_ERROR', 'Money configuration is invalid');
  const [units, cents = ''] = value.split('.');
  return Number(units) * 100 + Number(cents.padEnd(2, '0'));
}

function centsToMoney(value: number): string {
  return (value / 100).toFixed(2);
}

function inclusiveTax(totalCents:number,rate:string):string {
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(rate)) throw new ApiError(503,'COMMERCE_TAX_NOT_CONFIGURED','Tax rate is not configured');
  const basisPoints=BigInt(moneyToCents(rate));const denominator=10000n+basisPoints;
  const tax=(BigInt(totalCents)*basisPoints+denominator/2n)/denominator;
  return centsToMoney(Number(tax));
}
