import { ApiError } from '../http/api-error.js';
import type { SqlClientFactory } from '../inventory/postgres-inventory.repository.js';
import { insertAudit, withTransaction } from '../catalog/postgres-admin-catalog.repository.js';
export interface FaqEntry {faqEntryId:string;question:string;answer:string;status:'draft'|'published'|'archived';sortOrder:number;}
export interface FaqService {list(admin?:boolean):Promise<FaqEntry[]>;save(id:string|undefined,input:unknown,actor:string):Promise<FaqEntry>;}
const COLUMNS=`faq_entry_id as "faqEntryId",question,answer,case when status='active' then 'published' else status end as status,sort_order as "sortOrder"`;
export function createFaqService(factory:SqlClientFactory):FaqService {
  return {
    async list(admin=false) {const client=await factory();try {const result=await client.query<FaqEntry & Record<string,unknown>>(`select ${COLUMNS} from public.faq_entries where ($1::boolean or status='active') order by sort_order,faq_entry_id`,[admin]);return result.rows;}finally{client.release?.();}},
    async save(id,input,actor) {
      const value=validate(input);
      return withTransaction(factory,async client=>{
        let before:unknown=null;
        if(id) {const result=await client.query(`select * from public.faq_entries where faq_entry_id=$1 for update`,[id]);before=result.rows[0];if(!before)throw new ApiError(404,'NOT_FOUND','FAQ entry not found');}
        const result=id
          ? await client.query<FaqEntry & Record<string,unknown>>(`update public.faq_entries set question=$2,answer=$3,status=$4,sort_order=$5,updated_at=clock_timestamp() where faq_entry_id=$1 returning ${COLUMNS}`,[id,value.question,value.answer,value.status,value.sortOrder])
          : await client.query<FaqEntry & Record<string,unknown>>(`insert into public.faq_entries(question,answer,status,sort_order) values($1,$2,$3,$4) returning ${COLUMNS}`,[value.question,value.answer,value.status,value.sortOrder]);
        const entry=result.rows[0];
        await insertAudit(client,actor,id?'faq.updated':'faq.created','faq_entries',entry.faqEntryId,before,entry);
        return entry;
      });
    },
  };
}
function validate(input:unknown) {
  if(!input||typeof input!=='object'||Array.isArray(input)) throw invalid();
  const value=input as Record<string,unknown>;
  if(typeof value.question!=='string'||!value.question.trim()||value.question.trim().length>500||typeof value.answer!=='string'||!value.answer.trim()||value.answer.trim().length>10000||!['draft','published','archived'].includes(String(value.status))||!Number.isSafeInteger(value.sortOrder)||Number(value.sortOrder)<0||Number(value.sortOrder)>2147483647) throw invalid();
  return {question:value.question.trim(),answer:value.answer.trim(),status:value.status==='published'?'active':String(value.status),sortOrder:Number(value.sortOrder)};
}
function invalid(){return new ApiError(400,'VALIDATION_ERROR','Valid question, answer, status and sortOrder are required');}
