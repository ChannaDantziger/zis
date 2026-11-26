import test from 'node:test';
import assert from 'node:assert/strict';
import {createTestPaymentService} from './test-payment.service.js';
import type {SqlClient} from '../inventory/postgres-inventory.repository.js';
const orderId='00000000-0000-4000-8000-000000000001';
const productId='00000000-0000-4000-8000-000000000002';
function fixture(options:{real?:boolean;prior?:boolean;denied?:boolean;stale?:boolean;stockFailure?:boolean;variant?:boolean;bundle?:boolean;badPrice?:boolean;currentPrice?:string}={}) {
 const calls:Array<{sql:string;values?:readonly unknown[]}>=[];
 const client:SqlClient={async query(sql,values){
  calls.push({sql,values});let rows:Record<string,unknown>[]=[];
  if(sql.includes('as allowed'))rows=[{allowed:!options.denied}];
  else if(sql.includes('select order_id,is_test'))rows=[{order_id:orderId,is_test:!options.real,status:'ordered',payment_status:options.prior?'paid':'pending',total:'15.00',delivery_date:'2026-10-27',shipping_zone_id:orderId,version:options.stale?'2':'1'}];
  else if(sql.includes('select order_id from public.test_payment_approvals'))rows=options.prior?[{order_id:orderId}]:[];
  else if(sql.includes('to_regclass'))rows=[{present:Boolean(options.bundle)}];
  else if(sql.includes('from public.order_bundles b left join'))rows=options.bundle?[{order_bundle_id:'bundle',product_id:productId,quantity:'2',per_bundle:2,unit_count:2}]:[];
  else if(sql.includes(') as valid from public.orders'))rows=[{valid:!options.badPrice}];
  else if(sql.includes('from public.order_items'))rows=[{product_id:productId,product_variant_id:options.variant?productId:null,quantity_sets:1,set_size_snapshot:1}];
  else if(sql.includes('for update'))rows=[{product_id:productId,set_size:1}];
  else if(sql.includes('from public.store_settings'))rows=[{store_open:true,lock_mode:'open',lock_message:null,minimum_product_subtotal:'0.00'}];
  else if(sql.includes('from public.system_defaults'))rows=[{default_key:'tax_rate',default_value:'18.00'},{default_key:'max_advance_days',default_value:7}];
  else if(sql.includes('as is_closed'))rows=[{is_closed:false}];
  else if(sql.includes('select is_active from public.shipping_zones'))rows=[{is_active:true}];
  else if(sql.includes('union all'))rows=[{product_id:productId,product_variant_id:options.variant?productId:null,price_per_set:options.currentPrice ?? '10.00',available_sets:5}];
  else if(sql.includes('from public.shipping_rules'))rows=[{base_price:'5.00',size_from_sets:1,size_to_sets:null,size_surcharge:'0.00',time_surcharge:'0.00',urgency_surcharge:'0.00'}];
  else if(sql.includes('returning available_'))rows=options.stockFailure?[]:[{after:4}];
  else if(sql.includes('update public.orders'))rows=[{version:'3'}];
  return {rows:rows as never[],rowCount:rows.length};
 },release(){}};
 return {calls,service:createTestPaymentService(async()=>client)};
}
const now=new Date('2026-10-26T07:00:00Z');
test('simulated payment atomically consumes stock, records zero charge and unlocks normal paid workflow',async()=>{
 for(const variant of [false,true]){const f=fixture({variant});const result=await f.service.approve(orderId,'1','QA','manager',now);assert.equal(result.charged,false);assert.equal(result.paymentStatus,'paid');assert.equal(result.isTest,true);assert.equal(f.calls.at(-1)!.sql,'commit');assert.ok(f.calls.some(c=>c.sql.includes('inventory_movements')));assert.ok(f.calls.some(c=>c.sql.includes("0,'paid',true")));assert.ok(f.calls.some(c=>c.sql.includes('admin_audit_log')));assert.ok(!f.calls.some(c=>c.sql.includes('invoices')));}
});
test('approval replay never consumes stock or creates another payment',async()=>{
 const f=fixture({prior:true});await f.service.approve(orderId,'old-version','retry','manager',now);assert.equal(f.calls.at(-1)!.sql,'commit');assert.ok(!f.calls.some(c=>/^(update|insert)/.test(c.sql)));
});
test('genuine orders, revoked admin, stale order and stock race all roll back without paid commit',async()=>{
 for(const options of [{real:true},{denied:true},{stale:true},{stockFailure:true}]){const f=fixture(options);await assert.rejects(f.service.approve(orderId,'1','QA','manager',now));assert.equal(f.calls.at(-1)!.sql,'rollback');assert.ok(!f.calls.some(c=>c.sql==='commit'));assert.ok(!f.calls.some(c=>c.sql.includes('insert into public.payments')));}
});
test('simulated bundle payment uses saved totals and consumes aggregated physical stock once',async()=>{
 const f=fixture({bundle:true});const result=await f.service.approve(orderId,'1','QA','manager',now);
 assert.equal(result.charged,false);assert.deepEqual(f.calls.find(call=>call.sql.startsWith('update public.products'))?.values,[productId,3]);
 assert.equal(f.calls.filter(call=>call.sql.includes('insert into public.inventory_movements')).length,1);
 const bad=fixture({bundle:true,badPrice:true});await assert.rejects(bad.service.approve(orderId,'1','QA','manager',now),{code:'ORDER_PRICE_INVALID'});
 assert.equal(bad.calls.at(-1)?.sql,'rollback');
});
test('simulated approval preserves an existing order total when catalog prices change',async()=>{
 const f=fixture({currentPrice:'25.00'});const result=await f.service.approve(orderId,'1','QA','manager',now);
 assert.equal(result.charged,false);assert.equal(f.calls.at(-1)?.sql,'commit');
});
