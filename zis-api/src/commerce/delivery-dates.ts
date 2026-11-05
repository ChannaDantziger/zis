import type { SqlClientFactory } from '../inventory/postgres-inventory.repository.js';
import { readSettings } from './postgres-commerce.repository.js';
import { assertDeliveryDateAllowed } from './delivery-policy.js';
import { ApiError } from '../http/api-error.js';
const DAY_MS=86_400_000;
export async function readDeliveryDates(factory:SqlClientFactory,zone:string,now=new Date()) {
  const client=await factory();
  try {
    const settings=await readSettings(client);
    if (!Number.isInteger(settings.maxAdvanceDays) || settings.maxAdvanceDays<0 || settings.maxAdvanceDays>366) throw new ApiError(503,'INVALID_DELIVERY_CONFIG','Invalid booking horizon');
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:settings.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
    const value=(type:string)=>parts.find(p=>p.type===type)!.value;
    const today=`${value('year')}-${value('month')}-${value('day')}`;
    const first=Date.parse(today+'T00:00:00Z');
    const maxDate=new Date(first+settings.maxAdvanceDays*DAY_MS).toISOString().slice(0,10);
    const zoneResult=await client.query<{available:boolean}>(`select exists(select 1 from public.shipping_zones z where z.shipping_zone_id=$1 and z.is_active and exists(select 1 from public.shipping_rules r where r.shipping_zone_id=z.shipping_zone_id and r.is_active)) as available`,[zone]);
    const closures=await client.query<{date:string}>(`select to_char(d,'YYYY-MM-DD') as date from generate_series($1::date,$2::date,'1 day') d where exists(select 1 from public.store_closures c where c.is_active and c.starts_at<((d::date+1)::timestamp at time zone $3) and c.ends_at>(d::date::timestamp at time zone $3))`,[today,maxDate,settings.timezone]);
    const blocked=new Set(closures.rows.map(row=>row.date));
    const availableDates:string[]=[];
    for(let day=0;day<=settings.maxAdvanceDays;day++) {
      const date=new Date(first+day*DAY_MS).toISOString().slice(0,10);
      try {
        assertDeliveryDateAllowed(date,now,{timezone:settings.timezone,sameDayCutoffTime:settings.sameDayCutoffTime,maxAdvanceDays:settings.maxAdvanceDays,workingDays:settings.workingDays,holidayDates:blocked,storeOpen:settings.storeOpen&&settings.lockMode==='open'&&zoneResult.rows[0]?.available===true});
        availableDates.push(date);
      } catch(error) { if (!(error instanceof ApiError) || error.statusCode!==422) throw error; }
    }
    return {timezone:settings.timezone,today,maxDate,availableDates};
  } finally {client.release?.();}
}
