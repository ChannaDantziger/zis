import test from 'node:test';
import assert from 'node:assert/strict';
import { createPostgresCommerceRepository } from './postgres-commerce.repository.js';
import type { SqlClient } from '../inventory/postgres-inventory.repository.js';
function fixture(taxRate?:unknown) {
 const calls:Array<{sql:string;values:readonly unknown[]}>=[];
 const client:SqlClient={async query(sql,values=[]){calls.push({sql,values});let rows:Record<string,unknown>[]=[];
 if(sql.includes('from public.store_settings')) rows=[{store_open:true,lock_mode:'open',lock_message:null,minimum_product_subtotal:'0.00'}];
 else if(sql.includes('from public.system_defaults')) rows=taxRate===undefined?[]:[{default_key:'tax_rate',default_value:taxRate}];
 else if(sql.includes('as is_closed')) rows=[{is_closed:false}];
 else if(sql.includes('select is_active')) rows=[{is_active:true}];
 return {rows,rowCount:rows.length} as never;
 }};
 return {repository:createPostgresCommerceRepository(async()=>client),calls};
}
const input={deliveryDate:'2026-10-11',shippingZoneId:'zone',shippingMethodId:'method',items:[]};
test('store status remains readable without a tax configuration',async()=>{
 const f=fixture();const result=await f.repository.getStoreStatus();assert.equal(result.storeOpen,true);assert.equal(result.timezone,'Asia/Jerusalem');
});
test('quote fails closed for missing or invalid tax configuration',async()=>{
 for(const tax of [undefined,-1,'not-a-rate']) {const f=fixture(tax);await assert.rejects(f.repository.getContext(input),{code:'COMMERCE_TAX_NOT_CONFIGURED'});}
});
test('context reads explicit tax rate, Israel closure bounds and active method/category',async()=>{
 const f=fixture(18);const result=await f.repository.getContext(input);assert.equal(result.taxRate,'18.00');
 const closure=f.calls.find(call=>call.sql.includes('as is_closed'))!;assert.match(closure.sql,/at time zone \$2/);assert.deepEqual(closure.values,['2026-10-11','Asia/Jerusalem']);
 const rules=f.calls.find(call=>call.sql.includes('from public.shipping_rules'))!;assert.match(rules.sql,/m.is_active = true/);assert.match(rules.sql,/for share of r,m/);
 const variants=f.calls.find(call=>call.sql.includes('from public.product_variants'))!;assert.match(variants.sql,/c\.status='active' and not c\.is_deleted/);
});
test('sellable lookup returns product-level price and stock for simple product lines',async()=>{
 const f=fixture(18);await f.repository.getAvailability({deliveryDate:input.deliveryDate,items:[{productId:'product',productVariantId:null,quantitySets:1}]});
 const simple=f.calls.find(call=>call.sql.includes('null::uuid as product_variant_id'))!;
 assert.match(simple.sql,/p\.price_per_item::text as price_per_set/);assert.match(simple.sql,/p\.available_items as available_sets/);assert.match(simple.sql,/not exists \(select 1 from public\.product_variants/);
});
