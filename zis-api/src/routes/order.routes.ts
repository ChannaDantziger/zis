import { Router } from 'express';
import type { OrderService } from '../commerce/order.types.js';
import { createOrderController } from '../controllers/order.controller.js';
export function createOrderRouter(service: OrderService): Router {
  const router=Router(); const controller=createOrderController(service);
  router.use(['/orders','/orders/confirmation'],(_request,response,next)=>{ response.setHeader('Cache-Control','no-store'); next(); });
  router.post('/orders',controller.create);
  router.get('/orders/confirmation',controller.confirmation);
  return router;
}