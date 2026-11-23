-- 08.11.2026: read-only diagnostics for browser test order.
-- Run manually via the approved database workflow. Do not share credentials or customer data.
-- Return the rows and, if a query errors, its SQLSTATE and error text.
-- Run each SELECT separately and save each result. Many SQL editors show only
-- the last result grid; the screenshot of tables is query 4 only.

-- 1. Verify the order is still pending and whether an approval/payment row exists.
select o.order_number, o.is_test, o.status, o.payment_status,
       o.total, o.delivery_date,
       extract(epoch from o.updated_at)::text as version,
       exists (select 1 from public.test_payment_approvals a
               where a.order_id = o.order_id) as approval_exists,
       (select count(*) from public.payments p
        where p.order_id = o.order_id) as payment_rows
from public.orders o
where o.order_number = 'ZIS-7DC6799D-2F3A-42BE-B52E-166E4540059A';

-- 2. Check quantities required by this order against current stock.
select i.product_name_snapshot, i.variant_name_snapshot,
       i.quantity_sets, i.set_size_snapshot, i.product_variant_id is not null as is_variant,
       case when i.product_variant_id is null
            then i.quantity_sets * i.set_size_snapshot else i.quantity_sets end as required_stock,
       case when i.product_variant_id is null
            then p.available_items else v.available_sets end as available_stock,
       p.set_size as current_product_set_size,
       p.status as product_status, v.status as variant_status
from public.orders o
join public.order_items i on i.order_id = o.order_id
join public.products p on p.product_id = i.product_id
left join public.product_variants v on v.product_variant_id = i.product_variant_id
where o.order_number = 'ZIS-7DC6799D-2F3A-42BE-B52E-166E4540059A'
order by i.product_name_snapshot, i.variant_name_snapshot;

-- 3. Check shipping prices for the test order. Delivery dates are now global;
-- this query no longer diagnoses date availability.
select z.name, z.city, z.is_active as zone_active,
       count(r.shipping_rule_id) as rules_total,
       count(r.shipping_rule_id) filter (where r.is_active) as rules_active
from public.shipping_zones z
left join public.shipping_rules r on r.shipping_zone_id = z.shipping_zone_id
where z.city in ('בית שמש', 'ביתר', 'ירושלים')
group by z.shipping_zone_id, z.name, z.city, z.is_active
order by z.city;

-- 4. Check that the test payment schema objects exist; no migration is run here.
select to_regclass('public.test_payment_approvals') as approvals_table,
       to_regclass('public.payments') as payments_table,
       to_regclass('public.inventory_movements') as movements_table;

-- If all rows look valid, obtain the API error code and SQLSTATE from the server log
-- for the approval attempt. The browser currently hides that detail.

-- 5. If the API reports ORDER_PRICE_CHANGED, compare current product totals
-- with the saved snapshots. Run separately; no customer details are returned.
select o.order_number, o.subtotal as saved_subtotal, o.shipping_total as saved_shipping,
       o.total as saved_total,
       sum(oi.quantity_sets * oi.unit_set_price_snapshot) as snapshot_product_total,
       sum(oi.quantity_sets * p.price_per_item * p.set_size) as current_product_total,
       count(*) filter (where oi.unit_set_price_snapshot <> p.price_per_item * p.set_size) as changed_price_lines
from public.orders o
join public.order_items oi on oi.order_id = o.order_id
join public.products p on p.product_id = oi.product_id
where o.order_number = 'ZIS-7DC6799D-2F3A-42BE-B52E-166E4540059A'
  and oi.product_variant_id is null
group by o.order_number, o.subtotal, o.shipping_total, o.total;
