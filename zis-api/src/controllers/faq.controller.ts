import type {Request,Response} from 'express';
import type {FaqService} from '../faq/faq.service.js';
import type {AdminUserResolver} from './admin-inventory.controller.js';
import {ApiError} from '../http/api-error.js';
export function createFaqController(service:FaqService,resolve:AdminUserResolver) {
  return {
    list:async(_request:Request,response:Response)=>response.json({items:await service.list()}),
    adminList:async(request:Request,response:Response)=>{await manager(request,resolve);response.setHeader('Cache-Control','no-store');response.json({items:await service.list(true)});},
    save:async(request:Request,response:Response)=>{
      const actor=await manager(request,resolve);const id=request.params.faqEntryId;
      if(id!==undefined&&(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)))throw new ApiError(400,'VALIDATION_ERROR','Invalid FAQ ID');
      response.status(id?200:201).json(await service.save(id as string|undefined,request.body,actor));
    },
  };
}
async function manager(request:Request,resolve:AdminUserResolver){
  const identity=await resolve(request);
  if(identity.status==='unauthenticated')throw new ApiError(401,'AUTHENTICATION_REQUIRED','Authentication required');
  if(identity.status!=='authenticated'||identity.role!=='operations_manager')throw new ApiError(403,'OPERATIONS_MANAGER_REQUIRED','Operations manager access required');
  return identity.adminUserId;
}
