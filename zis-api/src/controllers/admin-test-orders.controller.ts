import type { Request,Response } from 'express';
import type { AdminUserResolver } from './admin-inventory.controller.js';
import type { OrderService } from '../commerce/order.types.js';
import type { TestPaymentService } from '../commerce/test-payment.service.js';
import { ApiError } from '../http/api-error.js';
export function createAdminTestOrdersController(orders:OrderService,payments:TestPaymentService,resolve:AdminUserResolver) {
  return {
    create:async(request:Request,response:Response)=>{
      response.setHeader('Cache-Control','no-store');
      const actor=await manager(request,resolve);
      response.status(201).json(await orders.createTest!(request.body,request.header('Idempotency-Key'),actor));
    },
    approve:async(request:Request,response:Response)=>{
      response.setHeader('Cache-Control','no-store');
      const actor=await manager(request,resolve);
      const id=request.params.orderId;
      const {reason,expectedVersion}=request.body ?? {};
      if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||typeof reason!=='string'||!reason.trim()||reason.length>1000||typeof expectedVersion!=='string'||!/^\d+(\.\d+)?$/.test(expectedVersion)) throw new ApiError(400,'VALIDATION_ERROR','Order ID, version and reason are required');
      response.json(await payments.approve(id,expectedVersion,reason.trim(),actor));
    },
  };
}
async function manager(request:Request,resolve:AdminUserResolver) {
  const identity=await resolve(request);
  if(identity.status==='unauthenticated') throw new ApiError(401,'AUTHENTICATION_REQUIRED','Authentication required');
  if(identity.status!=='authenticated'||identity.role!=='operations_manager') throw new ApiError(403,'OPERATIONS_MANAGER_REQUIRED','Operations manager access required');
  return identity.adminUserId;
}
