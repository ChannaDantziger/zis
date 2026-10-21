import type { CreateOrderInput, OrderCreatedResponse, OrderConfirmationResponse, QuotePreview } from '../contracts/commerce.contracts.js';
import type { QuoteRepository } from './quote.service.js';
export interface OrderSnapshot { productVariantId: string | null; productId: string; productName: string; variantName: string; productCode: string; setSize: number; pricePerSet: string; }
export interface OrderTransaction extends QuoteRepository {
  claimRequest(key: string, hash: string): Promise<OrderCreatedResponse | null>;
  readSnapshots(input: CreateOrderInput): Promise<OrderSnapshot[]>;
  save(input: CreateOrderInput, quote: QuotePreview, snapshots: OrderSnapshot[], response: OrderCreatedResponse, tokenHash: string, expiresAt: Date): Promise<void>;
  completeRequest(key: string, orderId: string): Promise<void>;
}
export interface OrderRepository {
  withTransaction<T>(work: (transaction: OrderTransaction) => Promise<T>): Promise<T>;
  findConfirmation(tokenHash: string, now: Date): Promise<OrderConfirmationResponse | null>;
}
export interface OrderService {
  create(input: unknown, idempotencyKey: unknown, now?: Date): Promise<OrderCreatedResponse>;
  confirmation(token: unknown, now?: Date): Promise<OrderConfirmationResponse>;
}
export interface OrderConfig { confirmationTokenTtlSeconds: number; confirmationTokenSecret: string; }
