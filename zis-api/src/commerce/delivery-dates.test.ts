import test from 'node:test';
import assert from 'node:assert/strict';
import {readDeliveryDates} from './delivery-dates.js';
import type {SqlClient} from '../inventory/postgres-inventory.repository.js';
function factory(closed=false){return async()=>({async query(sql:string){let rows:Record<string,unknown>[]=[];
 if(sql.includes('from public.store_settings'))rows=[{store_open:!closed,lock_mode:'open'}];
 else if(sql.includes('from public.system_defaults'))rows=[{default_key:'max_advance_days',default_value:3}];
 else if(sql.includes('generate_series'))rows=[{date:'2026-10-28'}];
 return {rows,rowCount:rows.length};},release(){}} as SqlClient);}
test('calendar uses Israel cutoff, closures and configured advance days',async()=>{
 const before=await readDeliveryDates(factory(),new Date('2026-10-26T06:59:00Z'));
 assert.deepEqual(before,{timezone:'Asia/Jerusalem',today:'2026-10-26',maxDate:'2026-10-29',availableDates:['2026-10-26','2026-10-27','2026-10-29']});
 const after=await readDeliveryDates(factory(),new Date('2026-10-26T07:00:00Z'));assert.deepEqual(after.availableDates,['2026-10-27','2026-10-29']);
});
test('closed store exposes no selectable dates',async()=>{
 assert.deepEqual((await readDeliveryDates(factory(true),new Date('2026-10-26T06:00:00Z'))).availableDates,[]);
});
