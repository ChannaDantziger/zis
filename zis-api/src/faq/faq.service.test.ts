import test from 'node:test';
import assert from 'node:assert/strict';
import {createFaqService} from './faq.service.js';
import type {SqlClient} from '../inventory/postgres-inventory.repository.js';
test('FAQ public list filters existing active DB status and maps it to published contract',async()=>{
 let query='';let values:readonly unknown[]|undefined;
 const service=createFaqService(async()=>({async query(sql,parameters){query=sql;values=parameters;return {rows:[],rowCount:0};}} as SqlClient));
 await service.list();assert.match(query,/status='active'/);assert.match(query,/then 'published'/);assert.deepEqual(values,[false]);
 await service.list(true);assert.deepEqual(values,[true]);
});
test('FAQ save maps published and commits audit atomically',async()=>{
 const calls:Array<{sql:string;values?:readonly unknown[]}>=[];
 const service=createFaqService(async()=>({async query(sql,values){calls.push({sql,values});return {rows:sql.startsWith('insert into public.faq_entries')?[{faqEntryId:'id',question:'Q',answer:'A',status:'published',sortOrder:0}]:[],rowCount:1};}} as SqlClient));
 await service.save(undefined,{question:' Q ',answer:' A ',status:'published',sortOrder:0},'actor');
 assert.deepEqual(calls.find(c=>c.sql.startsWith('insert into public.faq_entries'))!.values,['Q','A','active',0]);assert.ok(calls.some(c=>c.sql.includes('admin_audit_log')));assert.equal(calls.at(-1)!.sql,'commit');
 await assert.rejects(service.save(undefined,{question:'',answer:'A',status:'published',sortOrder:0},'actor'),{code:'VALIDATION_ERROR'});
});
