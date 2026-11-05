import { createHash, createHmac, randomUUID } from 'node:crypto';
import { ApiError } from '../http/api-error.js';
import type { OrderConfig, OrderRepository, OrderService } from './order.types.js';
import { readIdempotencyKey, readOrderInput, readPendingOrderUpdate } from './order-validation.js';
import { createQuoteService } from './quote.service.js';
export function createOrderService(repository: OrderRepository, config?: OrderConfig): OrderService {
  const configured = config && Number.isSafeInteger(config.confirmationTokenTtlSeconds) && config.confirmationTokenTtlSeconds >= 1 && config.confirmationTokenTtlSeconds <= 2147483647 && typeof config.confirmationTokenSecret === 'string' && config.confirmationTokenSecret.length >= 32;
  const assertConfigured = () => { if (!configured) throw new ApiError(503,'ORDER_CREATION_NOT_CONFIGURED','Order creation is not configured'); };
  const tokenFor = (orderId: string) => createHmac('sha256',config!.confirmationTokenSecret).update('order-confirmation:'+orderId).digest('base64url');
  async function create(value: unknown, keyValue: unknown, now: Date, actor?: string) {
      assertConfigured(); const input=readOrderInput(value); const key=readIdempotencyKey(keyValue);
      if (actor) { input.customerName='ניסוי '+input.customerName; input.deliveryAddress.street='ניסוי '+input.deliveryAddress.street; }
      const hash=sha256(JSON.stringify({input, testActor: actor ?? null}));
      return repository.withTransaction(async (transaction) => {
        const prior=await transaction.claimRequest(key,hash);
        if (prior) return {...prior,confirmationToken:tokenFor(prior.orderId)};
        const snapshots=await transaction.readSnapshots(input);
        const quote=await createQuoteService(transaction).calculate(input,now);
        const orderId=randomUUID(); const confirmationToken=tokenFor(orderId);
        const response={orderId,orderNumber:'ZIS-'+orderId.toUpperCase(),status:'ordered' as const,paymentStatus:'pending' as const,total:quote.total,currency:'ILS' as const,confirmationToken};
        await transaction.save(input,quote,snapshots,response,sha256(confirmationToken),new Date(now.getTime()+config!.confirmationTokenTtlSeconds*1000));
        const version = actor ? await transaction.markTest!(orderId, actor) : await transaction.readVersion?.(orderId);
        await transaction.completeRequest(key,orderId);
        return {...response,...(actor ? {isTest:true} : {}),...(version ? {version} : {})};
      });
  }
  return {
    async updatePending(token, value, keyValue, now = new Date()) {
      assertConfigured();
      if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new ApiError(404,'NOT_FOUND','Pending order is unavailable');
      const update = readPendingOrderUpdate(value); const key = readIdempotencyKey(keyValue);
      return repository.withTransaction(async transaction => {
        if (!transaction.readPending || !transaction.updatePending || !transaction.claimPendingEdit || !transaction.completePendingEdit) throw new ApiError(503,'PENDING_ORDER_EDIT_NOT_CONFIGURED','Pending order editing is unavailable');
        const pending = await transaction.readPending(sha256(token), now);
        const input = readOrderInput({ ...pending.input, items: update.items });
        const prior = await transaction.claimPendingEdit(key, sha256(JSON.stringify({ operation: 'pending-items-update', orderId: pending.response.orderId, ...update })), pending.response.orderId);
        if (prior) return { ...prior, confirmationToken: token };
        if (pending.version !== update.expectedVersion) throw new ApiError(409,'ORDER_CHANGED','Order changed before the update');
        const currentSnapshots = await transaction.readSnapshots(input);
        const snapshots = currentSnapshots.map(current => pending.snapshots.find(snapshot => snapshot.productId === current.productId
          && snapshot.productVariantId === current.productVariantId) ?? current);
        const quote = await createQuoteService({ getContext: async request => {
          const context = await transaction.getContext(request);
          return { ...context, variants: context.variants.map(variant => ({ ...variant,
            pricePerSet: snapshots.find(snapshot => snapshot.productId === variant.productId && snapshot.productVariantId === variant.productVariantId)?.pricePerSet ?? variant.pricePerSet })) };
        } }).calculate(input, now);
        const version = await transaction.updatePending(pending, input, quote, snapshots);
        const response = { ...pending.response, total: quote.total, version, confirmationToken: token };
        await transaction.completePendingEdit(key, pending.response.orderId, response);
        return response;
      });
    },
    create: (value, key, now = new Date()) => create(value,key,now),
    createTest: (value,key,actor,now=new Date()) => create(value,key,now,actor),
    async confirmation(token, now = new Date()) {
      if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new ApiError(404,'NOT_FOUND','Order confirmation is unavailable');
      const result=await repository.findConfirmation(sha256(token),now);
      if (!result) throw new ApiError(404,'NOT_FOUND','Order confirmation is unavailable'); return result;
    },
  };
}
function sha256(value: string): string { return createHash('sha256').update(value).digest('hex'); }
