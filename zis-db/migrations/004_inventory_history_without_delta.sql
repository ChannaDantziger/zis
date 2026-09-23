-- Inventory correction: keep current stock on product_variants and before/after history only.
-- Review and apply only after confirming that no reporting code depends on quantity_sets_delta.

alter table public.inventory_movements
  drop column if exists quantity_sets_delta;

comment on table public.inventory_movements is
  'Inventory history. Current stock is stored only on product_variants.available_sets; history records before/after values and context.';
