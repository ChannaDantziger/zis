import test from 'node:test';
import assert from 'node:assert/strict';
import { createPostgresOrderRepository } from './postgres-order.repository.js';
import type { SqlClient } from '../inventory/postgres-inventory.repository.js';
import type { CreateOrderInput, OrderCreatedResponse } from '../contracts/commerce.contracts.js';
const input:CreateOrderInput={customerName:'Example',customerPhone:'0501234567',customerEmail:'a@example.invalid',deliveryAddress:{city:'Jerusalem',street:'Street',houseNumber:'1'},deliveryDate:'2026-10-11',shippingZoneId:'00000000-0000-0000-0000-000000000001',items:[{productId:'00000000-0000-4000-8000-000000000004',productVariantId:'00000000-0000-4000-8000-000000000003',quantitySets:2}]};
function fixture(answer:(sql:string,values:readonly unknown[])=>{rows:Record<string,unknown>[];rowCount:number|null}) {
 const calls:Array<{sql:string;values:readonly unknown[]}>=[];let released=false;
 const client:SqlClient={async query(sql,values=[]){calls.push({sql,values});return answer(sql,values) as never;},release(){released=true;}};
 return {repository:createPostgresOrderRepository(async()=>client),calls,get released(){return released;}};
}
const empty={rows:[],rowCount:1};
test('request hash mismatch rolls back and releases without creating an order',async()=>{
 const f=fixture(sql=>sql.startsWith('select request_hash')?{rows:[{request_hash:'original',order_id:null}],rowCount:1}:empty);
 await assert.rejects(f.repository.withTransaction(tx=>tx.claimRequest('abcdefghijklmnop','changed')),{code:'CONFLICT'});
 assert.equal(f.calls.at(-1)?.sql,'rollback');assert.ok(f.released);assert.ok(!f.calls.some(call=>call.sql.includes('insert into public.orders')));
});
test('existing key returns the current order state without creating another order',async()=>{
 const f=fixture(sql=>sql.startsWith('insert into public.order_creation_requests')?{rows:[],rowCount:0}:sql.startsWith('select request_hash')?{rows:[{request_hash:'same',order_id:'order'}],rowCount:1}:sql.startsWith('select order_id')?{rows:[{order_id:'order',order_number:'NUMBER',total:'25.50',status:'approved',payment_status:'paid'}],rowCount:1}:empty);
 const response=await f.repository.withTransaction(tx=>tx.claimRequest('abcdefghijklmnop','same'));
 assert.equal(response?.status,'approved');assert.equal(response?.paymentStatus,'paid');assert.equal(response?.total,'25.50');assert.equal(f.calls.at(-1)?.sql,'commit');
 assert.match(f.calls[2]!.sql,/for update/);
});
test('address-zone mismatch rejects before snapshot reads',async()=>{
 const f=fixture(sql=>sql.includes('select city,neighborhood')?{rows:[{city:'Other city',neighborhood:null}],rowCount:1}:empty);
 await assert.rejects(f.repository.withTransaction(tx=>tx.readSnapshots(input)),{code:'BUSINESS_RULE_VIOLATION'});assert.ok(!f.calls.some(call=>call.sql.includes('product_variants')));
});
test('simple product order snapshots allow a null variant and use product price',async()=>{
 const f=fixture(sql=>sql.includes('select city,neighborhood')?{rows:[{city:'Jerusalem',neighborhood:null}],rowCount:1}:sql.includes('from public.products p join public.categories')?{rows:[{product_id:input.items[0]!.productId,product_variant_id:null,product_name:'Simple',variant_name:'Simple',product_code:null,set_size:null,price_per_set:'12.00'}],rowCount:1}:empty);
 const snapshots=await f.repository.withTransaction(tx=>tx.readSnapshots({...input,items:[{productId:input.items[0]!.productId,productVariantId:null,quantitySets:2}]}));
 assert.equal(snapshots[0]?.productVariantId,null);assert.equal(snapshots[0]?.pricePerSet,'12.00');assert.match(f.calls.find(call=>call.sql.includes('from public.products p join public.categories'))!.sql,/not exists\(select 1 from public.product_variants/);
});
test('save transaction persists only hashed credential and never consumes stock',async()=>{
 const f=fixture(()=>empty);const response:OrderCreatedResponse={orderId:'order',orderNumber:'NUMBER',status:'ordered',paymentStatus:'pending',total:'25.50',currency:'ILS',confirmationToken:'plain-credential-must-not-store'};
 await f.repository.withTransaction(async tx=>{await tx.save(input,{calculatedAt:'now',deliveryDate:input.deliveryDate,subtotal:'20.50',shippingTotal:'5.00',taxTotal:'0.00',total:'25.50',currency:'ILS',availability:'available',reservationCreated:false,warnings:[]},[{productVariantId:input.items[0]!.productVariantId!,productId:input.items[0]!.productId,productName:'Historical',variantName:'Variant',productCode:'CODE',setSize:6,pricePerSet:'10.25'}],response,'only-hash',new Date());await tx.completeRequest('abcdefghijklmnop','order');});
 const text=JSON.stringify(f.calls);assert.ok(!text.includes(response.confirmationToken));assert.ok(text.includes('only-hash'));assert.ok(!/update public.product_variants|insert into public.inventory_movements|insert into public.production_allocations/.test(text));assert.equal(f.calls.at(-1)?.sql,'commit');
 const order=f.calls.find(call=>call.sql.includes('insert into public.orders'))!;assert.match(order.sql,/\$11,0,0,\$12/);assert.equal(order.values[3],input.customerPhone);assert.equal(order.values[14],input.customerPhone);
});
test('failed token insertion rolls the entire transaction back',async()=>{
 const f=fixture(sql=>{if(sql.includes('order_confirmation_tokens'))throw new Error('token insert failed');return empty;});
 await assert.rejects(f.repository.withTransaction(async tx=>tx.save(input,{calculatedAt:'now',deliveryDate:input.deliveryDate,subtotal:'0.00',shippingTotal:'0.00',taxTotal:'0.00',taxRate:'0.00',total:'0.00',currency:'ILS',availability:'available',reservationCreated:false,warnings:[]},[{productVariantId:input.items[0]!.productVariantId!,productId:input.items[0]!.productId,productName:'Historical',variantName:'Variant',productCode:'CODE',setSize:6,pricePerSet:'0.00'}],{orderId:'order',orderNumber:'NUMBER',status:'ordered',paymentStatus:'pending',total:'0.00',currency:'ILS',confirmationToken:''},'hash',new Date())),/token insert failed/);
 assert.equal(f.calls.at(-1)?.sql,'rollback');assert.ok(!f.calls.some(call=>call.sql==='commit'));
});
test('confirmation SQL checks expiry/revocation and returns a minimal response',async()=>{
 const f=fixture(sql=>sql.includes('from public.order_confirmation_tokens')?{rows:[{order_id:'private',order_number:'NUMBER',status:'ordered',payment_status:'paid',delivery_date:'2026-10-11',total:'25.50',customer_phone:'private'}],rowCount:1}:empty);
 const result=await f.repository.findConfirmation('hash',new Date());assert.deepEqual(Object.keys(result!).sort(),['currency','deliveryDate','isTest','orderNumber','paymentStatus','status','total']);assert.match(f.calls.find(call=>call.sql.includes('order_confirmation_tokens'))!.sql,/revoked_at is null and t.expires_at>\$2/);assert.ok(f.released);
});

test('confirmation exposes product snapshots without raw database fields',async()=>{
 const items=[{productId:'product',productVariantId:null,quantitySets:2,productName:'Original name',lineTotal:'20.50'}];
 const f=fixture(()=>({rows:[{order_id:'private',order_number:'NUMBER',status:'ordered',payment_status:'pending',is_test:false,delivery_date:'2026-10-11',total:'25.50',items,customer_phone:'private'}],rowCount:1}));
 const result=await f.repository.findConfirmation('hash',new Date());
 assert.deepEqual(result?.items,items);assert.equal('customer_phone' in result!,false);
 const query=f.calls.find(call=>call.sql.includes('order_confirmation_tokens'))!.sql;
 assert.match(query,/product_name_snapshot/);assert.match(query,/line_total/);
});

test('authenticated confirmation includes saved shipping costs and contact/address details',async()=>{
 const customer={name:'לקוח בדיקה',phone:'0500000000',email:'qa@example.invalid',deliveryPhone:'0500000001'};
 const delivery_address={city:'ירושלים',street:'רחוב בדיקה',houseNumber:'1',apartment:'2',postalCode:'1234567'};
 const f=fixture(sql=>sql.includes('from public.order_confirmation_tokens')?{rows:[{order_id:'private',order_number:'NUMBER',status:'ordered',payment_status:'pending',is_test:false,delivery_date:'2026-10-11',total:'300.00',subtotal:'270.00',shipping_total:'30.00',customer,delivery_address,venue_name:'אולם בדיקה',dedication_text:'מזל טוב',customer_notes:'כניסה ראשית'}],rowCount:1}:empty);
 const result=await f.repository.findConfirmation('hash',new Date());
 assert.equal(result?.subtotal,'270.00');assert.equal(result?.shippingTotal,'30.00');
 assert.deepEqual(result?.customer,customer);assert.deepEqual(result?.deliveryAddress,delivery_address);
 assert.equal(result?.venueName,'אולם בדיקה');assert.equal(result?.dedicationText,'מזל טוב');
 assert.equal('orderId' in result!,false);assert.equal('tokenHash' in result!,false);
});

test('confirmation reads bundle snapshots within the same repeatable-read transaction',async()=>{
 const bundles=[{orderBundleId:'line',bundleId:'bundle',categoryId:'category',bundleName:'מארז',categoryName:'קינוחים',imagePath:'private/bundle',unitCount:2,quantity:3,unitPrice:'20.00',lineTotal:'60.00',components:[{productId:'product',productName:'קינוח',imagePath:'private/product',quantity:2,unitPrice:'10.00'}]}];
 const f=fixture(sql=>sql.startsWith('begin')||sql==='commit'?empty:sql.includes('to_regclass')?{rows:[{present:true}],rowCount:1}:sql.includes('from public.order_bundles')?{rows:bundles.map(bundle=>({bundle})),rowCount:1}:sql.includes('from public.order_confirmation_tokens')?{rows:[{order_id:'private',order_number:'NUMBER',status:'ordered',payment_status:'pending',is_test:false,delivery_date:'2026-10-11',total:'60.00',items:[]}],rowCount:1}:empty);
 const result=await f.repository.findConfirmation('hash',new Date());
 assert.equal(result?.bundles?.[0].bundleName,'מארז');assert.equal(JSON.stringify(result).includes('private/'),false);
 assert.match(f.calls[0]!.sql,/repeatable read read only/);assert.equal(f.calls.at(-1)?.sql,'commit');
});

test('test creation replay returns explicit marker and current paid status/version',async()=>{
 const f=fixture(sql=>sql.startsWith('insert into public.order_creation_requests')?{rows:[],rowCount:0}:sql.includes('select request_hash')?{rows:[{request_hash:'hash',order_id:'order'}],rowCount:1}:sql.includes('select order_id,order_number,total')?{rows:[{order_id:'order',order_number:'NUMBER',total:'25.50',is_test:true,status:'in_preparation',payment_status:'paid',version:'123.45'}],rowCount:1}:empty);
 const result=await f.repository.withTransaction(tx=>tx.claimRequest('abcdefghijklmnop','hash'));
 assert.equal(result!.isTest,true);assert.equal(result!.paymentStatus,'paid');assert.equal(result!.status,'in_preparation');assert.equal(result!.version,'123.45');
});
