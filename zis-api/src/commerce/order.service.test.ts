import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrderService } from './order.service.js';
import { readOrderInput } from './order-validation.js';
import type { OrderRepository, OrderTransaction } from './order.types.js';
import type { CreateOrderInput, OrderCreatedResponse } from '../contracts/commerce.contracts.js';
const input:CreateOrderInput={customerName:'Example',customerPhone:'0501234567',customerEmail:'a@example.invalid',deliveryAddress:{city:'Jerusalem',street:'Street',houseNumber:'1'},deliveryDate:'2026-10-11',shippingZoneId:'00000000-0000-0000-0000-000000000001',items:[{productId:'00000000-0000-4000-8000-000000000004',productVariantId:'00000000-0000-4000-8000-000000000003',quantitySets:2}]};
const config={confirmationTokenTtlSeconds:3600,confirmationTokenSecret:'test-only-secret-32-characters-long'};
const now=new Date('2026-10-09T08:00:00Z');
function fixture() {
 const calls:string[]=[];let saved:OrderCreatedResponse|undefined;let hash='';let expiry:Date|undefined;
 const tx:OrderTransaction={
  async claimRequest(){calls.push('claim');return saved??null;},
  async nextOrderNumber(){calls.push('number');return '1000';},
  async readSnapshots(){calls.push('snapshots');return [{productVariantId:input.items[0]!.productVariantId!,productId:input.items[0]!.productId,productName:'Original',variantName:'Original variant',productCode:'CODE',setSize:6,pricePerSet:'10.25'}];},
  async getContext(){calls.push('quote');return {deliveryPolicy:{timezone:'Asia/Jerusalem',sameDayCutoffTime:'09:00',maxAdvanceDays:7,workingDays:[0,1,2,3,4],holidayDates:new Set(),storeOpen:true},minimumProductSubtotal:'0.00',currency:'ILS',taxRate:'18.00',variants:[{productId:input.items[0]!.productId,productVariantId:input.items[0]!.productVariantId!,pricePerSet:'10.25',availableSets:10,active:true}],shippingRules:[{basePrice:'5.00',sizeFromSets:1,sizeToSets:null,sizeSurcharge:'0.00',timeSurcharge:'0.00',urgencySurcharge:'0.00',active:true}]};},
  async save(_input,_quote,_snapshots,response,value,expires){calls.push('save');saved=response;hash=value;expiry=expires;},async completeRequest(){calls.push('complete');},
 };
 const repository:OrderRepository={async withTransaction(work){calls.push('begin');const result=await work(tx);calls.push('commit');return result;},async findConfirmation(){return null;}};
 return {calls,tx,repository,get hash(){return hash;},get expiry(){return expiry;}};
}
test('creation computes authoritative totals and locks snapshots before quote',async()=>{
 const f=fixture();const response=await createOrderService(f.repository,config).create(input,'abcdefghijklmnop',now);
 assert.equal(response.total,'25.50');assert.equal(response.orderNumber,'1000');assert.equal(response.paymentStatus,'pending');assert.equal(response.status,'ordered');assert.deepEqual(f.calls,['begin','claim','snapshots','quote','number','save','complete','commit']);assert.match(f.hash,/^[a-f0-9]{64}$/);assert.notEqual(f.hash,response.confirmationToken);assert.equal(f.expiry?.toISOString(),'2026-10-09T09:00:00.000Z');
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

test('telephone formats normalize both contacts and malformed email/privileged test flags reject',()=>{
 for(const phone of ['050-1234567','050.1234567','050 1234567','021234567']) assert.equal(readOrderInput({...input,deliveryPhone:phone}).deliveryPhone,phone.replace(/[ .-]/g,''));
 for(const changes of [{customerPhone:'12345678'},{deliveryPhone:'12345678901'},{deliveryPhone:'+972501234567'},{customerEmail:'a@b'},{customerEmail:'a@-bad.test'},{isTest:true},{is_test:true}]) assert.throws(()=>readOrderInput({...input,...changes}),{code:'VALIDATION_ERROR'});
});
test('test creation prefixes stored identity and binds request hash to manager before commit',async()=>{
 const f=fixture();let savedInput:CreateOrderInput|undefined;let claimedHash='';
 f.tx.claimRequest=async(_key,hash)=>{claimedHash=hash;return null;};
 const save=f.tx.save;f.tx.save=async(value,...rest)=>{savedInput=value;await save(value,...rest);};
 f.tx.markTest=async(id,actor)=>{assert.equal(actor,'manager');assert.ok(id);f.calls.push('test');return '123.45';};
 const result=await createOrderService(f.repository,config).createTest!(input,'abcdefghijklmnop','manager',now);
 assert.equal(result.isTest,true);assert.equal(result.version,'123.45');assert.match(savedInput!.customerName,/^ניסוי /);assert.match(savedInput!.deliveryAddress.street,/^ניסוי /);assert.ok(f.calls.indexOf('test')<f.calls.indexOf('commit'));
 let publicHash='';f.tx.claimRequest=async(_key,hash)=>{publicHash=hash;return null;};await createOrderService(f.repository,config).create(input,'abcdefghijklmnop',now);assert.notEqual(publicHash,claimedHash);
});

test('feature-gated pending bundle edit retains saved component prices and rejects stale versions', async () => {
 const f = fixture();
 const bundleId='00000000-0000-4000-8000-000000000011', productId='00000000-0000-4000-8000-000000000012', lineId='00000000-0000-4000-8000-000000000013';
 const snapshot={orderBundleId:lineId,bundleId,categoryId:'category',bundleName:'מארז',categoryName:'קינוחים',unitCount:2,quantity:1,unitPrice:'16.00',lineTotal:'16.00',components:[{productId,productName:'קינוח',quantity:2,unitPrice:'8.00'}]};
 const pendingInput={...input,items:[],bundles:[{orderBundleId:lineId,bundleId,quantity:1,components:[{productId,quantity:2}]}]};
 f.tx.readPending=async()=>({input:pendingInput,snapshots:[],bundleSnapshots:[snapshot],version:'1',response:{orderId:'order',orderNumber:'1000',status:'ordered',paymentStatus:'pending',total:'21.00',currency:'ILS',confirmationToken:''}});
 f.tx.claimPendingEdit=async()=>null;f.tx.completePendingEdit=async()=>{};f.tx.readSnapshots=async()=>[];
 const base=await f.tx.getContext(input);
 f.tx.getContext=async()=>({...base,variants:[],bundles:[{bundleId,categoryId:'category',name:'מארז שונה',unitCount:2,active:true}],bundleProducts:[{productId,categoryId:'category',name:'קינוח',pricePerUnit:'12.00',availableItems:20,active:true}]});
 let subtotal='';f.tx.updatePending=async(_order,_value,quote)=>{subtotal=quote.subtotal;return '2';};
 const update={expectedVersion:'1',items:[],bundles:[{orderBundleId:lineId,bundleId,quantity:2,components:[{productId,quantity:2}]}]};
 await assert.rejects(createOrderService(f.repository,config).updatePending!('a'.repeat(43),update,'abcdefghijklmnop',now),{code:'BUNDLE_ORDER_NOT_AVAILABLE'});
 const service=createOrderService(f.repository,config,{bundlesEnabled:true});
 await service.updatePending!('a'.repeat(43),update,'abcdefghijklmnop',now);
 assert.equal(subtotal,'32.00');
 await assert.rejects(service.updatePending!('a'.repeat(43),{...update,expectedVersion:'2'},'abcdefghijklmnop',now),{code:'ORDER_CHANGED'});
});

test('bundle-only creation and pending edits both use shipping based on package count', async () => {
 const f=fixture();const bundleId='00000000-0000-4000-8000-000000000011', productId='00000000-0000-4000-8000-000000000012', lineId='00000000-0000-4000-8000-000000000013';
 const base=await f.tx.getContext(input);
 f.tx.readSnapshots=async()=>[];
 f.tx.getContext=async()=>({...base,variants:[],bundles:[{bundleId,categoryId:'category',name:'מארז',unitCount:2,active:true}],
  bundleProducts:[{productId,categoryId:'category',name:'קינוח',pricePerUnit:'10.00',availableItems:30,active:true}],
  shippingRules:[1,2].map(count=>({basePrice:`${count*5}.00`,sizeFromSets:count,sizeToSets:count,sizeSurcharge:'0',timeSurcharge:'0',urgencySurcharge:'0',active:true}))});
 const service=createOrderService(f.repository,config,{bundlesEnabled:true});
 const line={bundleId,quantity:1,components:[{productId,quantity:2}]};
 const created=await service.create({...input,items:[],bundles:[line]},'abcdefghijklmnop',now);
 assert.equal(created.total,'25.00');
 const snapshot={orderBundleId:lineId,bundleId,categoryId:'category',bundleName:'מארז',categoryName:'קינוחים',unitCount:2,quantity:1,unitPrice:'20.00',lineTotal:'20.00',components:[{productId,productName:'קינוח',quantity:2,unitPrice:'10.00'}]};
 f.tx.readPending=async()=>({input:{...input,items:[],bundles:[{...line,orderBundleId:lineId}]},snapshots:[],bundleSnapshots:[snapshot],version:'1',response:{...created,confirmationToken:''}});
 f.tx.claimPendingEdit=async()=>null;f.tx.completePendingEdit=async()=>{};
 let shipping='';f.tx.updatePending=async(_order,_input,quote)=>{shipping=quote.shippingTotal;return '2';};
 const updated=await service.updatePending!('a'.repeat(43),{expectedVersion:'1',items:[],bundles:[{...line,orderBundleId:lineId,quantity:2}]},'abcdefghijklmnop',now);
 assert.equal(shipping,'10.00');assert.equal(updated.total,'50.00');
});
