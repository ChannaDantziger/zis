import {Router} from 'express';
import type {FaqService} from '../faq/faq.service.js';
import type {AdminUserResolver} from '../controllers/admin-inventory.controller.js';
import {createFaqController} from '../controllers/faq.controller.js';
export function createFaqRouter(service:FaqService,resolve:AdminUserResolver){
  const router=Router();const controller=createFaqController(service,resolve);
  router.get('/faq',controller.list);router.get('/admin/faq',controller.adminList);
  router.post('/admin/faq',controller.save);router.patch('/admin/faq/:faqEntryId',controller.save);
  return router;
}
