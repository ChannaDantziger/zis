import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrderService } from './order.service.js';
import { readOrderInput } from './order-validation.js';
import type { OrderRepository, OrderTransaction } from './order.types.js';
import type { CreateOrderInput, OrderCreatedResponse } from '../contracts/commerce.contracts.js';
const input:CreateOrderInput={customerName:'Example',customerPhone:'0501234567',customerEmail:'a@example.invalid',deliveryAddress:{city:'Jerusalem',street:'Street',houseNumber:'1'},deliveryDate:'2026-10-11',shippingZoneId:'00000000-0000-0000-0000-000000000001',shippingMethodId:'00000000-0000-0000-0000-000000000002',items:[{productId:'00000000-0000-4000-8000-000000000004',productVariantId:'00000000-0000-4000-8000-000000000003',quantitySets:2}]};
const config={confirmationTokenTtlSeconds:3600,confirmationTokenSecret:'test-only-secret-32-characters-long'};
const now=new Date('2026-10-09T08:00:00Z');
function fixture() {
 const calls:string[]=[];let saved:OrderCreatedResponse|undefined;let hash='';let expiry:Date|undefined;
 const tx:OrderTransaction={
  async claimRequest(){calls.push('claim');return saved??null;},
  async readSnapshots(){calls.push('snapshots');return [{productVariantId:input.items[0]!.productVariantId!,productId:input.items[0]!.productId,productName:'Original',variantName:'Original variant',productCode:'CODE',setSize:6,pricePerSet:'10.25'}];},
  async getContext(){calls.push('quote');return {deliveryPolicy:{timezone:'Asia/Jerusalem',sameDayCutoffTime:'09:00',maxAdvanceDays:7,workingDays:[0,1,2,3,4],holidayDates:new Set(),storeOpen:true},minimumProductSubtotal:'0.00',currency:'ILS',taxRate:'18.00',variants:[{productId:input.items[0]!.productId,productVariantId:input.items[0]!.productVariantId!,pricePerSet:'10.25',availableSets:10,active:true}],shippingRules:[{basePrice:'5.00',sizeFromSets:1,sizeToSets:null,sizeSurcharge:'0.00',timeSurcharge:'0.00',urgencySurcharge:'0.00',active:true}]};},
  async save(_input,_quote,_snapshots,response,value,expires){calls.push('save');saved=response;hash=value;expiry=expires;},async completeRequest(){calls.push('complete');},
 };
 const repository:OrderRepository={async withTransaction(work){calls.push('begin');const result=await work(tx);calls.push('commit');return result;},async findConfirmation(){return null;}};
 return {calls,tx,repository,get hash(){return hash;},get expiry(){return expiry;}};
}
test('creation computes authoritative totals and locks snapshots before quote',async()=>{
 const f=fixture();const response=await createOrderService(f.repository,config).create(input,'abcdefghijklmnop',now);
 assert.equal(response.total,'25.50');assert.equal(response.paymentStatus,'pending');assert.equal(response.status,'ordered');assert.deepEqual(f.calls,['begin','claim','snapshots','quote','save','complete','commit']);assert.match(f.hash,/^[a-f0-9]{64}$/);assert.notEqual(f.hash,response.confirmationToken);assert.equal(f.expiry?.toISOString(),'2026-10-09T09:00:00.000Z');
});
test('same key replay retains token without recalculating or saving',async()=>{
 const f=fixture();const service=createOrderService(f.repository,config);const first=await service.create(input,'abcdefghijklmnop',now);f.calls.length=0;const second=await service.create(input,'abcdefghijklmnop',new Date('2026-10-20T08:00:00Z'));assert.deepEqual(first,second);assert.deepEqual(f.calls,['begin','claim','commit']);
});
test('missing or invalid config fails closed before transaction',async()=>{
 for(const value of [undefined,{confirmationTokenTtlSeconds:0,confirmationTokenSecret:'short'}]) {const f=fixture();await assert.rejects(createOrderService(f.repository,value).create(input,'abcdefghijklmnop',now),{code:'ORDER_CREATION_NOT_CONFIGURED'});assert.deepEqual(f.calls,[]);}
});
test('bad dates/contact, duplicates and authoritative overrides reject',()=>{
 for(const changes of [{deliveryDate:'2026-99-99'},{deliveryDate:'2026-02-30'},{customerPhone:'-------'},{items:[...input.items,...input.items]},{paymentStatus:'paid'},{total:'0.01'},{isUrgent:true}]) assert.throws(()=>readOrderInput({...input,...changes}),{code:'VALIDATION_ERROR'});
});
test('invalid key rejects before transaction',async()=>{const f=fixture();await assert.rejects(createOrderService(f.repository,config).create(input,'short',now),{code:'VALIDATION_ERROR'});assert.deepEqual(f.calls,[]);});
test('confirmation rejects invalid or expired credentials with same404',async()=>{const f=fixture();const service=createOrderService(f.repository,config);await assert.rejects(service.confirmation('invalid'),{code:'NOT_FOUND'});await assert.rejects(service.confirmation('a'.repeat(43)),{code:'NOT_FOUND'});});
test('closed store creates no order',async()=>{const f=fixture();const context=await f.tx.getContext(input);context.deliveryPolicy.storeOpen=false;f.tx.getContext=async()=>context;f.calls.length=0;await assert.rejects(createOrderService(f.repository,config).create(input,'abcdefghijklmnop',now),{code:'BUSINESS_RULE_VIOLATION'});assert.ok(!f.calls.includes('save'));assert.ok(!f.calls.includes('commit'));});
