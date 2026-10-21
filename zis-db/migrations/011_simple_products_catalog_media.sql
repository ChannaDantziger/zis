-- Forward-only catalog model: simple sellable products, optional variants, ordering, and media rules.
-- Review against the actual schema and backup before applying to any shared/production database.

alter table public.products
  add column if not exists price_per_item numeric(12,2) check (price_per_item >= 0),
  add column if not exists available_items integer not null default 0 check (available_items >= 0),
  add column if not exists product_code text,
  add column if not exists display_order integer not null default 10 check (display_order >= 0);

alter table public.products alter column status set default 'active';
alter table public.products alter column default_min_sets drop not null;
alter table public.products alter column default_min_sets drop default;
alter table public.products drop column if exists default_min_sets;

alter table public.order_items alter column product_variant_id drop not null;
alter table public.order_items alter column set_size_snapshot drop not null;
alter table public.order_items alter column set_size_snapshot drop default;
alter table public.order_items alter column product_code_snapshot drop not null;
alter table public.order_items alter column product_code_snapshot drop default;

create index if not exists idx_products_public_order
  on public.products(category_id, display_order, product_id)
  where status = 'active' and is_deleted = false;

create or replace function public.enforce_product_publication()
returns trigger language plpgsql as $$
declare
  has_primary_image boolean;
  has_variants boolean;
begin
  if new.status <> 'active' then return new; end if;
  if new.is_deleted then raise exception 'Deleted products cannot be active'; end if;
  select exists(select 1 from public.categories c where c.category_id=new.category_id and c.status='active' and not c.is_deleted)
    into has_primary_image;
  if not has_primary_image then raise exception 'Active products require an active category'; end if;
  select exists(select 1 from public.product_images i where i.product_id=new.product_id and i.product_variant_id is null and i.image_type='primary' and not i.is_deleted)
    into has_primary_image;
  if not has_primary_image then raise exception 'Active products require a primary image'; end if;
  select exists(select 1 from public.product_variants v where v.product_id=new.product_id and not v.is_deleted)
    into has_variants;
  if has_variants then
    if not exists(select 1 from public.product_variants v where v.product_id=new.product_id and v.status='active' and not v.is_deleted) then
      raise exception 'Active products with variants require an active variant';
    end if;
    if exists(select 1 from public.product_variants v where v.product_id=new.product_id and v.status='active' and not v.is_deleted
      and not exists(select 1 from public.product_images i where i.product_variant_id=v.product_variant_id and i.image_type='primary' and not i.is_deleted)) then
      raise exception 'Active variants require a primary image';
    end if;
  elsif new.price_per_item is null or new.available_items is null then
    raise exception 'Active simple products require price and stock';
  end if;
  return new;
end $$;

-- Replace the earlier rule that required every active product to have a variant.
drop trigger if exists trg_validate_published_product on public.products;
drop trigger if exists trg_enforce_product_publication on public.products;
create trigger trg_enforce_product_publication before insert or update of status,category_id,price_per_item,available_items
  on public.products for each row execute function public.enforce_product_publication();

create or replace function public.enforce_variant_publication()
returns trigger language plpgsql as $$
begin
  if new.status='active' and (
    not exists(select 1 from public.products p where p.product_id=new.product_id and not p.is_deleted)
    or not exists(select 1 from public.product_images i where i.product_id=new.product_id and i.product_variant_id is null and i.image_type='primary' and not i.is_deleted)
    or not exists(select 1 from public.product_images i where i.product_variant_id=new.product_variant_id and i.image_type='primary' and not i.is_deleted)
  ) then raise exception 'Active variants require product and variant images'; end if;
  return new;
end $$;

drop trigger if exists trg_enforce_variant_publication on public.product_variants;
create trigger trg_enforce_variant_publication before insert or update of status,product_id
  on public.product_variants for each row execute function public.enforce_variant_publication();

-- Product image type is inferred from its relation: primary product image or primary variant image.
-- General gallery images remain in event_gallery_images and use the event-gallery bucket/route.
alter table public.event_gallery_images alter column alt_text drop not null;
alter table public.event_gallery_images alter column alt_text set default '';
alter table public.event_gallery_images drop constraint if exists event_gallery_images_alt_text_check;
alter table public.event_gallery_images drop column if exists alt_text;
alter table public.event_gallery_images drop column if exists caption;

comment on column public.products.price_per_item is 'Unit price for simple products without variants.';
comment on column public.products.available_items is 'Available unit stock for simple products without variants.';
comment on column public.products.display_order is 'Storefront ordering; UI suggests increments of ten but permits manual values.';
comment on table public.event_gallery_images is 'General/event gallery images; location is the only required metadata, with active publication state and ordering.';
