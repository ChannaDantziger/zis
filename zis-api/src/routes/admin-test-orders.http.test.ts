import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createApp} from '../app.js';
import type {AdminUserResolution} from '../controllers/admin-inventory.controller.js';
test('test routes require an explicitly active operations manager before accessing services',async()=>{
 for(const identity of [{status:'unauthenticated'},{status:'forbidden'},{status:'authenticated',adminUserId:'driver',role:'delivery_driver'},{status:'authenticated',adminUserId:'missing-role'}] as AdminUserResolution[]){
  let calls=0;const fail=async()=>{calls++;throw Error('must not run');};
  const app=createApp({resolveAdminUserId:async()=>identity,orderService:{create:fail,createTest:fail,confirmation:fail},testPaymentService:{approve:fail}});
  for(const route of ['/admin/test-orders','/admin/test-orders/00000000-0000-4000-8000-000000000001/approve-payment']){const response=await request(app).post(route).send({});assert.equal(response.status,identity.status==='unauthenticated'?401:403);assert.equal(response.headers['cache-control'],'no-store');}
  assert.equal(calls,0);
 }
});
