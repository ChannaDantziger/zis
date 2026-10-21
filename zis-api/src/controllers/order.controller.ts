import type { Request, Response } from 'express';
import type { OrderService } from '../commerce/order.types.js';
export function createOrderController(service: OrderService) {
  return {
    create: async(request:Request,response:Response)=> response.status(201).json(await service.create(request.body,request.get('Idempotency-Key'))),
    confirmation: async(request:Request,response:Response)=> {
      const authorization=request.get('Authorization'); const token=authorization?.match(/^Bearer ([A-Za-z0-9_-]+)$/)?.[1];
      return response.status(200).json(await service.confirmation(token));
    },
  };
}