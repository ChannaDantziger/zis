import { ApiError } from '../http/api-error.js';
import type { SqlClient, SqlClientFactory } from '../inventory/postgres-inventory.repository.js';
import { insertAudit } from '../catalog/postgres-admin-catalog.repository.js';
import { readQuoteContext } from './postgres-commerce.repository.js';
import { aggregateOrderStock, readBundleStockLines } from './order-stock.js';
import { assertDeliveryDateAllowed } from './delivery-policy.js';
interface OrderRow extends Record<string,unknown> { order_id:string; is_test:boolean; status:string; payment_status:string; version:string; delivery_date:string; shipping_zone_id:string; total:string; }
interface ItemRow extends Record<string,unknown> { product_id:string; product_variant_id:string|null; quantity_sets:number; set_size_snapshot:number|null; }
const MAX_STOCK_UNITS = 2_147_483_647;
export interface TestPaymentResult { orderId:string; paymentStatus:'paid'; isTest:true; simulated:true; charged:false; version:string; }
export interface TestPaymentService { approve(orderId:string, expectedVersion:string, reason:string, actor:string, now?:Date):Promise<TestPaymentResult>; }
export function createTestPaymentService(factory:SqlClientFactory):TestPaymentService {
  return {async approve(orderId,expectedVersion,reason,actor,now=new Date()) {
    const client=await factory();
    try {
      await client.query('begin');
      const identity=await client.query<{allowed:boolean}>(`select exists(select 1 from public.admin_users where admin_user_id=$1 and status='active' and role='operations_manager') as allowed`,[actor]);
      if(!identity.rows[0]?.allowed) throw new ApiError(403,'OPERATIONS_MANAGER_REQUIRED','Operations manager access required');
      const result=await client.query<OrderRow>(`select order_id,is_test,status,payment_status,total::text,to_char(delivery_date,'YYYY-MM-DD') as delivery_date,shipping_zone_id,extract(epoch from updated_at)::text as version from public.orders where order_id=$1 for update`,[orderId]);
      const order=result.rows[0];
      if(!order) throw new ApiError(404,'NOT_FOUND','Order not found');
      if(!order.is_test) throw new ApiError(403,'TEST_ORDER_REQUIRED','Real orders require verified provider payment');
      const prior=await client.query(`select order_id from public.test_payment_approvals where order_id=$1`,[orderId]);
      if(prior.rows.length && order.payment_status==='paid') {await client.query('commit');return response(orderId,order.version);}
      if(order.version!==expectedVersion) throw new ApiError(409,'ORDER_CHANGED','Refresh the order before approving');
      if(order.status!=='ordered'||order.payment_status!=='pending') throw new ApiError(409,'INVALID_PAYMENT_STATE','Order cannot be approved');
      const items=await client.query<ItemRow>(`select product_id,product_variant_id,quantity_sets,set_size_snapshot from public.order_items where order_id=$1 order by product_id,product_variant_id nulls first`,[orderId]);
      const bundleItems = await readBundleStockLines(client, orderId);
      const stock = aggregateOrderStock([...items.rows, ...bundleItems]);
      if (!stock.length) throw new ApiError(409,'ORDER_ITEMS_MISSING','Order has no items');
      // Hold stock locks across policy revalidation, movement history and the paid transition.
      for(const item of stock) {
        const loose = items.rows.find(line => line.product_id === item.product_id && line.product_variant_id === item.product_variant_id);
        if (loose) await lockStock(client,loose);
        else {
          const locked = await client.query(`select product_id from public.products where product_id=$1 for update`, [item.product_id]);
          if (!locked.rows.length) throw new ApiError(422,'STOCK_UNAVAILABLE','Product is unavailable');
        }
      }
      const input={deliveryDate:order.delivery_date,shippingZoneId:order.shipping_zone_id,items:items.rows.map(i=>({productId:i.product_id,productVariantId:i.product_variant_id,quantitySets:i.quantity_sets}))};
      const context = await readQuoteContext(client,input);
      assertDeliveryDateAllowed(input.deliveryDate,now,context.deliveryPolicy);
      for (const item of items.rows) {
        const variant = context.variants.find(candidate => candidate.productId === item.product_id && candidate.productVariantId === item.product_variant_id);
        if (!variant?.active || item.quantity_sets > variant.availableSets) throw new ApiError(422,'STOCK_UNAVAILABLE','Product is unavailable');
      }
      const bundleSubtotal = bundleItems.length ? `+coalesce((select sum(b.line_total) from public.order_bundles b where b.order_id=o.order_id),0)` : '';
      const bundleIntegrity = bundleItems.length ? `and not exists(select 1 from public.order_bundles b where b.order_id=o.order_id and
          (b.line_total<>b.unit_price_snapshot*b.quantity or b.unit_price_snapshot<>(select coalesce(sum(c.quantity_per_bundle*c.unit_price_snapshot),0)
            from public.order_bundle_components c where c.order_bundle_id=b.order_bundle_id)))` : '';
      const integrity = await client.query<{ valid: boolean }>(`select (
            o.subtotal=coalesce((select sum(i.line_total) from public.order_items i where i.order_id=o.order_id),0) ${bundleSubtotal}
            and o.total=o.subtotal+o.shipping_total-o.discount_total+o.tax_total
            and o.subtotal >= $2::numeric
            and not exists(select 1 from public.order_items i where i.order_id=o.order_id and i.line_total<>i.unit_set_price_snapshot*i.quantity_sets)
            ${bundleIntegrity}
          ) as valid from public.orders o where o.order_id=$1`, [orderId, context.minimumProductSubtotal]);
      if (!integrity.rows[0]?.valid) throw new ApiError(409,'ORDER_PRICE_INVALID','Order snapshot requires review');
      for(const item of stock) await consumeStock(client,{ ...item, quantity_sets:item.quantity, set_size_snapshot:1 },orderId,actor);
      await client.query(`insert into public.test_payment_approvals(order_id,admin_user_id,reason) values($1,$2,$3)`,[orderId,actor,reason]);
      await client.query(`insert into public.payments(order_id,provider,provider_transaction_id,amount,status,is_simulated,provider_payload) values($1::uuid,'admin_test',$1::text,0,'paid',true,'{"charged":false,"simulated":true}'::jsonb)`,[orderId]);
      const updated=await client.query<{version:string}>(`update public.orders set payment_status='paid',payment_confirmed_at=$2,updated_at=clock_timestamp() where order_id=$1 returning extract(epoch from updated_at)::text as version`,[orderId,now]);
      await client.query(`insert into public.order_status_history(order_id,from_status,to_status,changed_by,note) values($1,'ordered','ordered',$2,'ניסוי: תשלום מדומה אושר ללא חיוב; ניתן להמשיך להכנה')`,[orderId,actor]);
      await insertAudit(client,actor,'test_order.payment_simulated','orders',orderId,{paymentStatus:'pending'},{paymentStatus:'paid',isTest:true,charged:false,reason});
      await client.query('commit');
      return response(orderId,updated.rows[0].version);
    } catch(error) {await client.query('rollback');throw error;} finally {client.release?.();}
  }};
}
function response(orderId:string,version:string):TestPaymentResult {return {orderId,paymentStatus:'paid',isTest:true,simulated:true,charged:false,version};}
async function lockStock(client:SqlClient,item:ItemRow) {
  if (!item.product_variant_id && (!Number.isSafeInteger(item.set_size_snapshot) || Number(item.set_size_snapshot) < 1)) {
    throw new ApiError(409,'ORDER_ITEM_UNITS_MISSING','Legacy simple-product order has no physical-unit snapshot; review or recreate the pending order');
  }
  const result=item.product_variant_id
    ? await client.query(`select product_variant_id from public.product_variants where product_variant_id=$1 for update`,[item.product_variant_id])
    : await client.query<{set_size:number}>(`select product_id,set_size from public.products where product_id=$1 for update`,[item.product_id]);
  if(!result.rows.length) throw new ApiError(422,'STOCK_UNAVAILABLE','Product is unavailable');
  if (!item.product_variant_id && result.rows[0]?.set_size !== item.set_size_snapshot) {
    throw new ApiError(409,'ORDER_PRODUCT_CHANGED','Product Set size changed; review or recreate the pending order');
  }
}
async function consumeStock(client:SqlClient,item:ItemRow,orderId:string,actor:string) {
  const quantity = item.product_variant_id ? item.quantity_sets : item.quantity_sets * Number(item.set_size_snapshot);
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_STOCK_UNITS) throw new ApiError(422,'STOCK_UNAVAILABLE','Insufficient stock');
  const result=item.product_variant_id
    ? await client.query<{after:number}>(`update public.product_variants set available_sets=available_sets-$2 where product_variant_id=$1 and available_sets >= $2 returning available_sets as after`,[item.product_variant_id,quantity])
    : await client.query<{after:number}>(`update public.products set available_items=available_items-$2 where product_id=$1 and available_items >= $2 returning available_items as after`,[item.product_id,quantity]);
  if(!result.rows[0]) throw new ApiError(422,'STOCK_UNAVAILABLE','Insufficient stock');
  const after=result.rows[0].after;
  await client.query(`insert into public.inventory_movements(product_id,product_variant_id,order_id,movement_type,stock_before,stock_after,reason,created_by) values($1,$2,$3,'sale',$4,$5,'ניסוי: הזמנה ששולמה ללא חיוב',$6)`,[item.product_id,item.product_variant_id,orderId,after+quantity,after,actor]);
  if(item.product_variant_id) await client.query(`insert into public.admin_notifications(admin_user_id,notification_type,title,body,order_id,product_variant_id)
    select a.admin_user_id,'low_stock','ניסוי: מלאי נמוך','המלאי הופחת במסגרת הזמנת ניסוי ללא חיוב',$1,$2
    from public.admin_users a join public.product_variants v on v.product_variant_id=$2
    where a.status='active' and a.role='operations_manager' and v.available_sets<=v.low_stock_threshold_sets`,[orderId,item.product_variant_id]);
}
