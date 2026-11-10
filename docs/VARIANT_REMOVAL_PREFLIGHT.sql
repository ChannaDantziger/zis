-- Read-only preflight for the owner's 08.11.2026 simple-product decision.
-- Run manually through the approved database workflow. Do not run a migration yet.
-- Return counts/IDs only; do not share customer details or secrets.
-- IMPORTANT: Select and run ONE numbered SELECT at a time. Running the whole
-- file may show only the final result grid. We still need results 1, 1b and 2.

-- 1. Each product's variants, price spread and stock that would need conversion.
-- Price counts are indicative only: legacy price_per_set and price_per_item use different units.
select p.product_id, p.name, p.set_size,
       to_jsonb(p)->>'price_per_item' as product_price_per_item,
       to_jsonb(p)->>'available_items' as product_available_items,
       count(v.product_variant_id) as variant_count,
       count(distinct coalesce(to_jsonb(v)->>'price_per_item', to_jsonb(v)->>'price_per_set')) as distinct_variant_prices,
       coalesce(sum((to_jsonb(v)->>'available_sets')::integer), 0) as variant_available_sets,
       coalesce(sum((to_jsonb(v)->>'available_sets')::integer * p.set_size), 0) as variant_available_items
from public.products p
left join public.product_variants v on v.product_id = p.product_id and coalesce((to_jsonb(v)->>'is_deleted')::boolean, false) = false
group by p.product_id, p.name, p.set_size, to_jsonb(p)->>'price_per_item', to_jsonb(p)->>'available_items'
having count(v.product_variant_id) > 0
order by p.name, p.product_id;

-- 1b. Variant-level values needed to choose one simple-product price and stock.
select v.product_id, v.product_variant_id, v.name, v.status,
       to_jsonb(v)->>'price_per_item' as price_per_item,
       to_jsonb(v)->>'price_per_set' as legacy_price_per_set,
       to_jsonb(v)->>'available_sets' as available_sets
from public.product_variants v
where coalesce((to_jsonb(v)->>'is_deleted')::boolean, false) = false
order by v.product_id, v.product_variant_id;

-- 2. Existing order references by status; snapshots retain historical prices.
select o.status, o.payment_status,
       count(distinct o.order_id) as orders_with_variants,
       count(oi.order_item_id) as variant_lines,
       count(*) filter (where to_jsonb(oi)->>'set_size_snapshot' is null) as lines_without_set_size_snapshot
from public.order_items oi
join public.orders o on o.order_id = oi.order_id
where oi.product_variant_id is not null
group by o.status, o.payment_status
order by o.status, o.payment_status;

-- 3. Variant references that prevent physical deletion or need a display policy.
select (select count(*) from public.product_images where product_variant_id is not null) as variant_images,
       (select count(*) from public.inventory_movements where product_variant_id is not null) as variant_movements,
       (select count(*) from public.production_allocations) as production_allocations,
       (select count(*) from public.variant_weekly_capacity) as weekly_capacity_rows;
