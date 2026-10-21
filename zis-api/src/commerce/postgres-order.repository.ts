import type { CreateOrderInput, OrderCreatedResponse, OrderConfirmationResponse, QuotePreview } from '../contracts/commerce.contracts.js';
import { ApiError } from '../http/api-error.js';
import type { SqlClient, SqlClientFactory } from '../inventory/postgres-inventory.repository.js';
import { readQuoteContext } from './postgres-commerce.repository.js';
import type { OrderRepository, OrderSnapshot, OrderTransaction } from './order.types.js';
interface RequestRow extends Record<string,unknown> { request_hash: string; order_id: string | null; }
interface CreatedRow extends Record<string,unknown> { order_id: string; order_number: string; total: string; }
interface SnapshotRow extends Record<string,unknown> { product_variant_id:string | null;product_id:string;product_name:string;variant_name:string;product_code:string | null;set_size:number | null;price_per_set:string; }
interface ConfirmationRow extends CreatedRow { status:string;payment_status:string;delivery_date:string; }
export function createPostgresOrderRepository(factory: SqlClientFactory): OrderRepository {
  return {
    async withTransaction(work) {
      const client=await factory();
      try { await client.query('begin'); const result=await work(transaction(client)); await client.query('commit'); return result; }
      catch(error) { await client.query('rollback'); throw error; } finally { client.release?.(); }
    },
    async findConfirmation(hash,now) {
      const client=await factory();
      try {
        const result=await client.query<ConfirmationRow>(`select o.order_id,o.order_number,o.status,o.payment_status,to_char(o.delivery_date,'YYYY-MM-DD') as delivery_date,o.total
          from public.order_confirmation_tokens t join public.orders o on o.order_id=t.order_id
          where t.token_hash=$1 and t.revoked_at is null and t.expires_at>$2`,[hash,now]);
        const row=result.rows[0]; return row ? {orderNumber:row.order_number,status:row.status,paymentStatus:row.payment_status,deliveryDate:row.delivery_date,total:row.total,currency:'ILS'} : null;
      } finally { client.release?.(); }
    },
  };
}
function transaction(client: SqlClient): OrderTransaction {
  return {
    getContext: (input) => readQuoteContext(client,input),
    async claimRequest(key,hash) {
      const inserted=await client.query(`insert into public.order_creation_requests(idempotency_key,request_hash) values($1,$2) on conflict(idempotency_key) do nothing`,[key,hash]);
      const request=await client.query<RequestRow>('select request_hash,order_id from public.order_creation_requests where idempotency_key=$1 for update',[key]);
      const row=request.rows[0];
      if (!row || row.request_hash !== hash) throw new ApiError(409,'CONFLICT','Idempotency-Key was used for a different order');
      if (inserted.rowCount === 1) return null;
      if (!row.order_id) throw new ApiError(409,'CONFLICT','Order creation is in progress');
      const orders=await client.query<CreatedRow>('select order_id,order_number,total from public.orders where order_id=$1',[row.order_id]);
      const prior=orders.rows[0]; if(!prior) throw new ApiError(500,'INTERNAL_ERROR','Stored order is unavailable');
      return {orderId:prior.order_id,orderNumber:prior.order_number,total:prior.total,status:'ordered',paymentStatus:'pending',currency:'ILS',confirmationToken:''};
    },
    async readSnapshots(input) {
      await assertAddress(client,input);
      const result=await client.query<SnapshotRow>(`select p.product_id,null::uuid as product_variant_id,p.name as product_name,p.name as variant_name,
          p.product_code,null::integer as set_size,p.price_per_item::text as price_per_set
        from public.products p join public.categories c on c.category_id=p.category_id
        where p.product_id=any($1::uuid[]) and p.status='active' and not p.is_deleted and c.status='active' and not c.is_deleted
          and not exists(select 1 from public.product_variants v where v.product_id=p.product_id and not v.is_deleted)
          and p.price_per_item is not null and exists(select 1 from public.product_images i where i.product_id=p.product_id and i.product_variant_id is null and i.image_type='primary' and not i.is_deleted)
        union all
        select p.product_id,v.product_variant_id,p.name,v.name,v.product_code,p.set_size,v.price_per_set::text
        from public.product_variants v join public.products p on p.product_id=v.product_id join public.categories c on c.category_id=p.category_id
        where v.product_variant_id=any($2::uuid[]) and v.status='active' and not v.is_deleted
          and p.status='active' and not p.is_deleted and c.status='active' and not c.is_deleted
          and exists(select 1 from public.product_images i where i.product_id=p.product_id and i.product_variant_id is null and i.image_type='primary' and not i.is_deleted)
          and exists(select 1 from public.product_images i where i.product_variant_id=v.product_variant_id and i.image_type='primary' and not i.is_deleted)`,
        [input.items.map(item=>item.productId),input.items.flatMap(item=>item.productVariantId?[item.productVariantId]:[])]);
      const wanted=new Set(input.items.map(item=>`${item.productId}:${item.productVariantId ?? 'simple'}`));
      const matched=result.rows.filter(row=>wanted.has(`${row.product_id}:${row.product_variant_id ?? 'simple'}`));
      if(matched.length !== input.items.length) throw new ApiError(422,'BUSINESS_RULE_VIOLATION','Product is unavailable');
      return matched.map(row=>({productVariantId:row.product_variant_id,productId:row.product_id,productName:row.product_name,variantName:row.variant_name,productCode:row.product_code ?? row.product_id,setSize:row.set_size ?? 1,pricePerSet:row.price_per_set}));
    },
    save: (input,quote,snapshots,response,hash,expiresAt) => save(client,input,quote,snapshots,response,hash,expiresAt),
    async completeRequest(key,orderId) {
      const result=await client.query('update public.order_creation_requests set order_id=$2 where idempotency_key=$1 and order_id is null',[key,orderId]);
      if(result.rowCount !== 1) throw new Error('Order request completion failed');
    },
  };
}
async function assertAddress(client:SqlClient,input:CreateOrderInput) {
  const result=await client.query<{city:string;neighborhood:string|null}>(`select city,neighborhood from public.shipping_zones where shipping_zone_id=$1 and is_active=true for share`,[input.shippingZoneId]);
  const zone=result.rows[0];
  if(!zone || zone.city.trim()!==input.deliveryAddress.city || (zone.neighborhood !== null && zone.neighborhood.trim()!==input.deliveryAddress.neighborhood)) throw new ApiError(422,'BUSINESS_RULE_VIOLATION','Address does not match the shipping zone');
}
async function save(client:SqlClient,input:CreateOrderInput,quote:QuotePreview,snapshots:OrderSnapshot[],response:OrderCreatedResponse,hash:string,expiresAt:Date) {
  await client.query(`insert into public.orders(order_id,order_number,status,payment_status,customer_name,customer_phone,customer_email,delivery_address,shipping_zone_id,shipping_method_id,delivery_date,subtotal,shipping_total,discount_total,total,tax_total,tax_rate,dedication_text,customer_notes,delivery_venue_name)
    values($1,$2,'ordered','pending',$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,0,$12,$13,$17,$14,$15,$16)`,
    [response.orderId,response.orderNumber,input.customerName,input.customerPhone,input.customerEmail,JSON.stringify(input.deliveryAddress),input.shippingZoneId,input.shippingMethodId,input.deliveryDate,quote.subtotal,quote.shippingTotal,quote.total,quote.taxTotal,input.dedicationText,input.customerNotes,input.deliveryAddress.venueName,quote.taxRate]);
  for (const item of input.items) {
    const snapshot=snapshots.find(row=>row.productId===item.productId && row.productVariantId===(item.productVariantId ?? null));
    if(!snapshot) throw new Error('Order snapshot is missing');
    await client.query(`insert into public.order_items(order_id,product_id,product_variant_id,product_name_snapshot,variant_name_snapshot,product_code_snapshot,set_size_snapshot,unit_set_price_snapshot,quantity_sets,line_total)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,($8::numeric*$9::integer))`,[response.orderId,snapshot.productId,snapshot.productVariantId,snapshot.productName,snapshot.variantName,snapshot.productCode,snapshot.setSize,snapshot.pricePerSet,item.quantitySets]);
  }
  await client.query("insert into public.order_status_history(order_id,from_status,to_status,note) values($1,null,'ordered','Guest order created; payment pending')",[response.orderId]);
  await client.query('insert into public.order_confirmation_tokens(order_id,token_hash,expires_at) values($1,$2,$3)',[response.orderId,hash,expiresAt]);
}
