import type { CartItemInput, OrderBundleSnapshot, QuotePreview, ShippingQuoteInput } from '../contracts/commerce.contracts.js';
import { ApiError } from '../http/api-error.js';
import { assertDeliveryDateAllowed, type DeliveryPolicy } from './delivery-policy.js';
import { calculateBundleOrder, type BundleForSale, type BundleProductForSale } from './bundle-calculation.js';

export interface QuoteVariantContext {
  productId: string;
  productVariantId: string | null;
  pricePerSet: string;
  availableSets: number;
  active: boolean;
  setSize?: number;
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
  shippingRules: ShippingRuleContext[];
  variants: QuoteVariantContext[];
  bundles?: BundleForSale[];
  bundleProducts?: BundleProductForSale[];
  bundleSnapshots?: OrderBundleSnapshot[];
}

export interface QuoteRepository {
  getContext(input: ShippingQuoteInput): Promise<QuoteContext>;
}

export interface QuoteService {
  calculate(input: ShippingQuoteInput, now?: Date): Promise<QuotePreview>;
}

export function createQuoteService(repository: QuoteRepository, options: { shippingByPackages?: boolean } = {}): QuoteService {
  return {
    async calculate(input, now = new Date()) {
      const context = await repository.getContext(input);
      assertDeliveryDateAllowed(input.deliveryDate, now, context.deliveryPolicy);
      const bundleInputs = input.bundles ?? [];
      const lines = validateItems(input.items, context.variants, bundleInputs.length > 0);
      const bundleResult = bundleInputs.length ? calculateBundleOrder(bundleInputs, context.bundles ?? [], context.bundleProducts ?? [],
        lines.filter(line => !line.variant.productVariantId).map(line => ({ productId: line.item.productId,
          quantitySets: line.quantitySets, setSize: line.variant.setSize ?? 0 })), context.bundleSnapshots) : null;
      const bundleCount = bundleInputs.reduce((sum, bundle) => sum + bundle.quantity, 0);
      // The new interpretation is limited to the explicitly enabled development flow.
      const shippingSize = options.shippingByPackages ? (lines.length ? 1 : 0) + bundleCount
        : lines.reduce((sum, line) => sum + line.quantitySets, 0) + bundleCount;
      const subtotalCents = lines.reduce((sum, line) => sum + moneyToCents(line.variant.pricePerSet) * line.quantitySets, 0) + (bundleResult?.subtotalAgorot ?? 0);
      const shippingTotalCents = calculateShipping(input, context.shippingRules, shippingSize);
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
        taxTotal: '0.00',
        total: centsToMoney(totalCents),
        currency: context.currency,
        availability: 'available',
        reservationCreated: false,
        warnings: [],
      };
    },
  };
}

function validateItems(items: CartItemInput[], variants: QuoteVariantContext[], hasBundles = false) {
  if (!Array.isArray(items) || (items.length === 0 && !hasBundles)) {
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
      throw new ApiError(422, 'STOCK_UNAVAILABLE', 'Product variant is unavailable');
    }
    if (item.quantitySets > variant.availableSets) {
      throw new ApiError(422, 'STOCK_UNAVAILABLE', 'Requested quantity is not available');
    }
    return { item, quantitySets: item.quantitySets, variant };
  });
}

function calculateShipping(input: ShippingQuoteInput, rules: ShippingRuleContext[], totalPackages: number): number {
  const matchingRules = rules.filter((rule) => rule.active && totalPackages >= rule.sizeFromSets && (rule.sizeToSets === null || totalPackages <= rule.sizeToSets));
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

