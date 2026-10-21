import { createHash, createHmac, randomUUID } from 'node:crypto';
import { ApiError } from '../http/api-error.js';
import type { OrderConfig, OrderRepository, OrderService } from './order.types.js';
import { readIdempotencyKey, readOrderInput } from './order-validation.js';
import { createQuoteService } from './quote.service.js';
export function createOrderService(repository: OrderRepository, config?: OrderConfig): OrderService {
  const configured = config && Number.isSafeInteger(config.confirmationTokenTtlSeconds) && config.confirmationTokenTtlSeconds >= 1 && config.confirmationTokenTtlSeconds <= 2147483647 && typeof config.confirmationTokenSecret === 'string' && config.confirmationTokenSecret.length >= 32;
  const assertConfigured = () => { if (!configured) throw new ApiError(503,'ORDER_CREATION_NOT_CONFIGURED','Order creation is not configured'); };
  const tokenFor = (orderId: string) => createHmac('sha256',config!.confirmationTokenSecret).update('order-confirmation:'+orderId).digest('base64url');
  return {
    async create(value, keyValue, now = new Date()) {
      assertConfigured(); const input=readOrderInput(value); const key=readIdempotencyKey(keyValue);
      const hash=sha256(JSON.stringify(input));
      return repository.withTransaction(async (transaction) => {
        const prior=await transaction.claimRequest(key,hash);
        if (prior) return {...prior,confirmationToken:tokenFor(prior.orderId)};
        const snapshots=await transaction.readSnapshots(input);
        const quote=await createQuoteService(transaction).calculate(input,now);
        const orderId=randomUUID(); const confirmationToken=tokenFor(orderId);
        const response={orderId,orderNumber:'ZIS-'+orderId.toUpperCase(),status:'ordered' as const,paymentStatus:'pending' as const,total:quote.total,currency:'ILS' as const,confirmationToken};
        await transaction.save(input,quote,snapshots,response,sha256(confirmationToken),new Date(now.getTime()+config!.confirmationTokenTtlSeconds*1000));
        await transaction.completeRequest(key,orderId);
        return response;
      });
    },
    async confirmation(token, now = new Date()) {
      if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new ApiError(404,'NOT_FOUND','Order confirmation is unavailable');
      const result=await repository.findConfirmation(sha256(token),now);
      if (!result) throw new ApiError(404,'NOT_FOUND','Order confirmation is unavailable'); return result;
    },
  };
}
function sha256(value: string): string { return createHash('sha256').update(value).digest('hex'); }