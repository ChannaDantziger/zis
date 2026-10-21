import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { createOrderRouter } from '../routes/order.routes.js';
import { ApiError } from '../http/api-error.js';
import type { OrderService } from '../commerce/order.types.js';
function fixture() {
 const calls:unknown[]=[];
 const service:OrderService={async create(body,key){calls.push({body,key});return {orderId:'order',orderNumber:'NUMBER',status:'ordered',paymentStatus:'pending',total:'25.50',currency:'ILS',confirmationToken:'a'.repeat(43)};},async confirmation(token){calls.push(token);if(token!=='a'.repeat(43))throw new ApiError(404,'NOT_FOUND','Order confirmation is unavailable');return {orderNumber:'NUMBER',status:'ordered',paymentStatus:'pending',deliveryDate:'2026-10-11',total:'25.50',currency:'ILS'};}};
 const app=express();app.use(express.json());app.use(createOrderRouter(service));
 app.use((error:ApiError,_req:express.Request,res:express.Response,_next:express.NextFunction)=>res.status(error.statusCode??500).json({error:{code:error.code}}));
 return {app,calls,service};
}
test('create forwards body and Idempotency-Key and sends no-store201',async()=>{
 const f=fixture();const response=await request(f.app).post('/orders').set('Idempotency-Key','abcdefghijklmnop').send({items:[]}).expect(201);
 assert.equal(response.headers['cache-control'],'no-store');assert.deepEqual(f.calls,[{body:{items:[]},key:'abcdefghijklmnop'}]);assert.equal(response.body.paymentStatus,'pending');
});
test('confirmation accepts a private Bearer credential and sends no-store',async()=>{
 const f=fixture();const response=await request(f.app).get('/orders/confirmation').set('Authorization','Bearer '+ 'a'.repeat(43)).expect(200);
 assert.equal(response.headers['cache-control'],'no-store');assert.deepEqual(f.calls,['a'.repeat(43)]);assert.ok(!('orderId' in response.body));
});
test('confirmation ignores query token and order number',async()=>{
 const f=fixture();const response=await request(f.app).get('/orders/confirmation').query({token:'a'.repeat(43),orderNumber:'NUMBER'}).expect(404);
 assert.equal(response.headers['cache-control'],'no-store');assert.deepEqual(f.calls,[undefined]);
});
test('create configuration failures preserve no-store503',async()=>{
 const f=fixture();f.service.create=async()=>{throw new ApiError(503,'ORDER_CREATION_NOT_CONFIGURED','Not configured');};
 const response=await request(f.app).post('/orders').set('Idempotency-Key','abcdefghijklmnop').send({}).expect(503);
 assert.equal(response.headers['cache-control'],'no-store');assert.equal(response.body.error.code,'ORDER_CREATION_NOT_CONFIGURED');
});