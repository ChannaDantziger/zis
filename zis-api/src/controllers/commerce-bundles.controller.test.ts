import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import type { CommerceService } from '../commerce/commerce.types.js';
import { createCommerceController } from './commerce.controller.js';

const bundleId='00000000-0000-4000-8000-000000000001', productId='00000000-0000-4000-8000-000000000002';
const body={deliveryDate:'2026-12-01',shippingZoneId:'zone',items:[],bundles:[{bundleId,quantity:2,components:[{productId,quantity:3}]}]};
test('bundle availability is rejected by default and reaches service only when explicitly enabled', async () => {
 let received: unknown;
 const service = { async getAvailability(input:unknown) { received=input; return {deliveryDate:body.deliveryDate,available:true,items:[]}; } } as unknown as CommerceService;
 const response = { status() { return this; }, json(value:unknown) { return value; } } as unknown as Response;
 const request = { body } as Request;
 await assert.rejects(createCommerceController(service).getAvailability(request,response),{code:'BUNDLE_ORDER_NOT_AVAILABLE'});
 assert.equal(received,undefined);
 await createCommerceController(service,{bundlesEnabled:true}).getAvailability(request,response);
 assert.deepEqual(received,{deliveryDate:body.deliveryDate,items:[],bundles:body.bundles});
});
