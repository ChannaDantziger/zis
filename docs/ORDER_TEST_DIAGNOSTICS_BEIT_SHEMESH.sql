-- 08.11.2026: read-only checks for the new Beit Shemesh test order.
-- Run each SELECT separately in the approved database workflow. Do not run migrations.
-- Return results without customer details or credentials.

-- 1. Order state, version, and evidence of simulated approval.
select o.order_number, o.is_test, o.status, o.payment_status,
       o.subtotal, o.shipping_total, o.total, o.delivery_date,
       extract(epoch from o.updated_at)::text as version,
       z.city as shipping_city,
       exists (select 1 from public.test_payment_approvals a
               where a.order_id = o.order_id) as approval_exists,
       (select count(*) from public.payments p where p.order_id = o.order_id) as payment_rows
from public.orders o
join public.shipping_zones z on z.shipping_zone_id = o.shipping_zone_id
where o.order_number = 'ZIS-3AC44FA4-1676-4026-9CB1-A12A7A820E6B';

-- 2. Current product availability and price versus saved order lines.
select i.product_name_snapshot, i.quantity_sets, i.set_size_snapshot,
       i.unit_set_price_snapshot, i.product_variant_id is not null as is_variant,
       case when i.product_variant_id is null
            then i.quantity_sets * i.set_size_snapshot else i.quantity_sets end as required_stock,
       case when i.product_variant_id is null
            then p.available_items else v.available_sets end as available_stock,
       p.set_size as current_set_size, p.status as product_status,
       v.status as variant_status,
       case when i.product_variant_id is null
            then p.price_per_item * p.set_size else v.price_per_item * p.set_size end as current_set_price
from public.orders o
join public.order_items i on i.order_id = o.order_id
join public.products p on p.product_id = i.product_id
left join public.product_variants v on v.product_variant_id = i.product_variant_id
where o.order_number = 'ZIS-3AC44FA4-1676-4026-9CB1-A12A7A820E6B'
order by i.product_name_snapshot;

-- 3. All currently active shipping rules for this order's area.
select z.city, z.is_active as zone_active, r.is_active as rule_active,
       r.base_price, r.size_from_sets, r.size_to_sets,
       r.size_surcharge, r.time_surcharge, r.urgency_surcharge
from public.orders o
join public.shipping_zones z on z.shipping_zone_id = o.shipping_zone_id
left join public.shipping_rules r on r.shipping_zone_id = z.shipping_zone_id
where o.order_number = 'ZIS-3AC44FA4-1676-4026-9CB1-A12A7A820E6B'
order by r.size_from_sets;
