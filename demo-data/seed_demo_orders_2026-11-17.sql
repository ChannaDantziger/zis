-- נתוני דמה: 20 הזמנות לתאריך היום ועוד 20 ל-7 הימים הקרובים.
-- להרצה ידנית בלבד בסביבת DEV/DB בדיקה. אין להריץ ב-Production.
-- משתמש במוצרים, וריאציות, אזורי משלוח ומנהלת קיימים; לא משנה מלאי.
-- הזמנות מסומנות is_test=true ומדמות אישור ספק בלבד. אין חיוב אמיתי.
-- נדרש שהסכמה עד מיגרציה 017 לפחות הוחלה. אינו מיגרציה.

begin;

-- ניקוי תוצאות של הרצה קודמת של הקובץ הזה בלבד.
-- כל הפעולות מוגבלות למספרי ההזמנה עם הקידומת הייחודית של קובץ הדמו.
delete from public.payments p
 using public.orders o
 where p.order_id=o.order_id and o.order_number like 'DEMO-20261117-%';

delete from public.order_items oi
 using public.orders o
 where oi.order_id=o.order_id and o.order_number like 'DEMO-20261117-%';

delete from public.order_status_history h
 using public.orders o
 where h.order_id=o.order_id and o.order_number like 'DEMO-20261117-%';

delete from public.orders
 where order_number like 'DEMO-20261117-%';

do $$
declare
  v_admin uuid;
  v_zone uuid;
  v_method text := 'משלוח';
  v_order_id uuid;
  v_order_no text;
  v_customer text;
  v_day integer;
  v_i integer;
  v_product record;
  v_item_count integer;
  v_available_products integer;
  v_subtotal numeric(12,2);
  v_shipping numeric(12,2);
  v_total numeric(12,2);
  v_address jsonb;
  v_delivery date;
begin
  create temporary table demo_order_items_stage (
    order_id uuid, product_id uuid, product_variant_id uuid,
    product_name_snapshot text, variant_name_snapshot text,
    product_code_snapshot text, set_size_snapshot integer,
    unit_set_price_snapshot numeric(12,2), quantity_sets integer,
    line_total numeric(12,2)
  ) on commit drop;

  select admin_user_id into v_admin
    from public.admin_users
   where status='active' and role='operations_manager'
   order by created_at limit 1;
  if v_admin is null then
    raise exception 'נדרשת מנהלת תפעול פעילה כדי ליצור הזמנות דמה';
  end if;

  select shipping_zone_id into v_zone
    from public.shipping_zones where is_active
   order by city, name limit 1;
  if v_zone is null then raise exception 'לא נמצא אזור משלוח פעיל'; end if;

  if not exists (
    select 1 from public.products p
     where p.status='active' and not p.is_deleted
       and ((exists (select 1 from public.product_variants v where v.product_id=p.product_id and v.status='active' and not v.is_deleted))
         or (not exists (select 1 from public.product_variants v where v.product_id=p.product_id and not v.is_deleted)
             and p.price_per_item is not null and p.available_items >= p.set_size))
  ) then raise exception 'לא נמצאו מוצרים פעילים עם מלאי ומחיר'; end if;

  select count(*) into v_available_products
    from public.products p
   where p.status='active' and not p.is_deleted
     and ((exists (select 1 from public.product_variants v where v.product_id=p.product_id and v.status='active' and not v.is_deleted))
       or (not exists (select 1 from public.product_variants v where v.product_id=p.product_id and not v.is_deleted)
           and p.price_per_item is not null and p.available_items >= p.set_size));

  -- תאריכי אספקה: היום, ולאחר מכן כל אחד מ-7 הימים הקרובים.
  for v_i in 1..40 loop
    v_day := case when v_i <= 20 then 0 else 1 + ((v_i - 21) % 7) end;
    v_delivery := (now() at time zone 'Asia/Jerusalem')::date + v_day;
    v_order_id := gen_random_uuid();
    v_order_no := 'DEMO-20261117-' || lpad(v_i::text, 3, '0');
    v_customer := 'ניסוי לקוח ' || lpad(v_i::text, 2, '0');
    v_address := jsonb_build_object('street','ניסוי רחוב ' || v_i,'city',
      (select city from public.shipping_zones where shipping_zone_id=v_zone),
      'postalCode','0000000','country','IL');

    -- לרוב הזמנה אחת עם מוצר; כל הזמנה רב-מוצרית מכילה 2 או 3 מוצרים שונים.
    v_item_count := least(
      case when v_i % 10 = 0 then 3 when v_i % 4 = 0 then 2 else 1 end,
      v_available_products
    );
    v_subtotal := 0;

    -- מוצר/וריאציה פעילים קיימים; המחיר נשמר כ-Snapshot.
    for v_product in
      select p.product_id, p.name product_name, p.set_size,
             v.product_variant_id, coalesce(v.name,'מוצר פשוט') variant_name,
             coalesce(v.product_code,p.product_code) product_code,
             case when v.product_variant_id is not null then v.price_per_item*p.set_size
                  else p.price_per_item*p.set_size end set_price
        from public.products p
        left join lateral (
          select vv.product_variant_id,vv.name,vv.product_code,vv.price_per_item
            from public.product_variants vv
           where vv.product_id=p.product_id and vv.status='active' and not vv.is_deleted
           order by vv.is_default desc, vv.product_variant_id limit 1
        ) v on true
       where p.status='active' and not p.is_deleted
         and ((v.product_variant_id is not null) or
           (not exists(select 1 from public.product_variants vv where vv.product_id=p.product_id and not vv.is_deleted)
             and p.price_per_item is not null and p.available_items >= p.set_size))
       order by md5(p.product_id::text || v_i::text)
       limit v_item_count
    loop
      if v_product.set_price is null then
        raise exception 'למוצר שנבחר אין מחיר תקין';
      end if;
      v_subtotal := v_subtotal + v_product.set_price;
      insert into demo_order_items_stage (
        order_id, product_id, product_variant_id, product_name_snapshot,
        variant_name_snapshot, product_code_snapshot, set_size_snapshot,
        unit_set_price_snapshot, quantity_sets, line_total
      ) values (
        v_order_id, v_product.product_id, v_product.product_variant_id,
        v_product.product_name, v_product.variant_name,
        coalesce(v_product.product_code,'DEMO-' || v_i), v_product.set_size,
        v_product.set_price, 1, v_product.set_price
      );
    end loop;

    if (select count(*) from demo_order_items_stage where order_id=v_order_id) <> v_item_count then
      raise exception 'נדרשים % מוצרים שונים להזמנת דמה %, אך אין מספיק מוצרים פעילים', v_item_count, v_i;
    end if;

    -- עלות משלוח דמה אפסית, כדי לא להניח תעריף/כלל עסקי לא ידוע.
    v_shipping := 0;
    v_total := v_subtotal + v_shipping;

    insert into public.orders (
      order_id, order_number, status, payment_status, customer_name, customer_phone,
      customer_email, delivery_address, shipping_zone_id, shipping_method_snapshot,
      delivery_date, subtotal, shipping_total, discount_total, total, created_at,
      updated_at, payment_confirmed_at, delivery_phone, is_test, test_created_by
    ) values (
      v_order_id, v_order_no, 'ordered', 'paid', v_customer,
      '+972500000' || lpad(v_i::text, 2, '0'), 'demo' || v_i || '@example.invalid',
      v_address, v_zone, v_method, v_delivery, v_subtotal, v_shipping, 0, v_total,
      now(), now(), now(), '+972500000' || lpad(v_i::text, 2, '0'), true, v_admin
    );

    insert into public.order_items (
      order_id, product_id, product_variant_id, product_name_snapshot,
      variant_name_snapshot, product_code_snapshot, set_size_snapshot,
      unit_set_price_snapshot, quantity_sets, line_total
    ) select order_id, product_id, product_variant_id, product_name_snapshot,
             variant_name_snapshot, product_code_snapshot, set_size_snapshot,
             unit_set_price_snapshot, quantity_sets, line_total
        from demo_order_items_stage where order_id=v_order_id;

    -- ספק דמה: מצב paid משקף אישור עסקה מדומה; is_test מוציא מהכנסות אמיתיות.
    insert into public.payments (
      order_id, provider, provider_transaction_id, amount, currency, status,
      is_simulated, provider_payload
    ) values (
      v_order_id, 'demo_gateway', v_order_no, v_total, 'ILS', 'paid', false,
      jsonb_build_object('simulated',true,'charged',false,'note','נתוני דמה בלבד; אין חיוב אמיתי')
    );
    insert into public.order_status_history(order_id,from_status,to_status,changed_by,note)
      values(v_order_id,null,'ordered',v_admin,'הזמנת דמה; אישור תשלום מספק דמה, ללא חיוב');
  end loop;
end $$;

commit;

-- אימות כמות: 20 להיום ועוד 20 לשבעת הימים הבאים.
select is_test, payment_status,
       case when delivery_date=(now() at time zone 'Asia/Jerusalem')::date then 'היום' else 'השבוע הקרוב' end as group_name,
       count(*) as orders
  from public.orders
 where order_number like 'DEMO-20261117-%'
 group by 1,2,3 order by 3;
