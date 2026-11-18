import test from 'node:test';
import assert from 'node:assert/strict';
import { createPostgresCommerceRepository, readSettings } from './postgres-commerce.repository.js';
import type { SqlClient } from '../inventory/postgres-inventory.repository.js';
function fixture(_taxRate?:unknown) {
 const calls:Array<{sql:string;values:readonly unknown[]}>=[];
 const client:SqlClient={async query(sql,values=[]){calls.push({sql,values});let rows:Record<string,unknown>[]=[];
 if(sql.includes('from public.store_settings')) rows=[{store_open:true,lock_mode:'open',lock_message:null,minimum_product_subtotal:'0.00'}];
 else if(sql.includes('from public.system_defaults')) rows=[{default_key:'max_advance_days',default_value:7}];
 else if(sql.includes('as is_closed')) rows=[{is_closed:false}];
 else if(sql.includes('select is_active')) rows=[{is_active:true}];
 return {rows,rowCount:rows.length} as never;
 }};
 return {repository:createPostgresCommerceRepository(async()=>client),calls};
}
const input={deliveryDate:'2026-10-11',shippingZoneId:'zone',items:[]};
test('delivery advance days use only the admin setting and fail closed when it is missing', async () => {
 for (const defaults of [[], [{ default_key: 'max_advance_days', default_value: 21 }]] as const) {
  const client: SqlClient = { async query(sql) { return { rows: sql.includes('store_settings')
   ? [{ store_open: true, lock_mode: 'open', lock_message: null, minimum_product_subtotal: '0', max_advance_days: 14 }]
   : defaults, rowCount: 1 } as never; } };
  if (defaults.length) assert.equal((await readSettings(client)).maxAdvanceDays, 21);
  else await assert.rejects(readSettings(client), { statusCode: 503, code: 'INVALID_DELIVERY_CONFIG' });
 }
});
test('store status remains readable without a tax configuration',async()=>{
 const f=fixture();const result=await f.repository.getStoreStatus();assert.equal(result.storeOpen,true);assert.equal(result.timezone,'Asia/Jerusalem');
});
test('quote context does not depend on tax configuration and reads shipping policy',async()=>{
 const f=fixture();const result=await f.repository.getContext(input);assert.equal('taxRate' in result,false);
 assert.equal(f.calls.some(call=>call.sql.includes("'tax_rate'")),false);
 const closure=f.calls.find(call=>call.sql.includes('as is_closed'))!;assert.match(closure.sql,/at time zone \$2/);assert.deepEqual(closure.values,['2026-10-11','Asia/Jerusalem']);
 const rules=f.calls.find(call=>call.sql.includes('from public.shipping_rules'))!;assert.match(rules.sql,/r\.is_active = true/);assert.match(rules.sql,/for share of r/);assert.deepEqual(rules.values,['zone']);
 const variants=f.calls.find(call=>call.sql.includes('from public.product_variants'))!;assert.match(variants.sql,/c\.status='active' and not c\.is_deleted/);
});
test('sellable lookup returns product-level price and stock for simple product lines',async()=>{
 const f=fixture(18);await f.repository.getAvailability({deliveryDate:input.deliveryDate,items:[{productId:'product',productVariantId:null,quantitySets:1}]});
 const simple=f.calls.find(call=>call.sql.includes('null::uuid as product_variant_id'))!;
 assert.match(simple.sql,/\(p\.price_per_item \* p\.set_size\)::text as price_per_set/);assert.match(simple.sql,/\(p\.available_items \/ p\.set_size\) as available_sets/);assert.match(simple.sql,/not exists \(select 1 from public\.product_variants/);
});
