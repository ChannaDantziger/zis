import type { CreateOrderInput, OrderCreatedResponse, OrderConfirmationResponse, QuotePreview } from '../contracts/commerce.contracts.js';
import type { QuoteRepository } from './quote.service.js';
export interface OrderSnapshot { productVariantId: string | null; productId: string; productName: string; variantName: string; productCode: string; setSize: number; pricePerSet: string; }
export interface OrderTransaction extends QuoteRepository {
  claimPendingEdit?(key: string, hash: string, orderId: string): Promise<OrderCreatedResponse | null>;
  completePendingEdit?(key: string, orderId: string, response: OrderCreatedResponse): Promise<void>;
  readPending?(tokenHash: string, now: Date): Promise<PendingOrder>;
  updatePending?(order: PendingOrder, input: CreateOrderInput, quote: QuotePreview, snapshots: OrderSnapshot[]): Promise<string>;
  readVersion?(orderId: string): Promise<string>;
  markTest?(orderId: string, actor: string): Promise<string>;
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
  updatePending?(token: unknown, input: unknown, idempotencyKey: unknown, now?: Date): Promise<OrderCreatedResponse>;
  createTest?(input: unknown, idempotencyKey: unknown, actor: string, now?: Date): Promise<OrderCreatedResponse>;
  create(input: unknown, idempotencyKey: unknown, now?: Date): Promise<OrderCreatedResponse>;
  confirmation(token: unknown, now?: Date): Promise<OrderConfirmationResponse>;
}
export interface OrderConfig { confirmationTokenTtlSeconds: number; confirmationTokenSecret: string; }
export interface PendingOrder { input: CreateOrderInput; snapshots: OrderSnapshot[]; response: OrderCreatedResponse; version: string; }
