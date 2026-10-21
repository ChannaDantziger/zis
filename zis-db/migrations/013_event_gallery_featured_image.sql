-- Separate gallery visibility from the single image used in the storefront hero.
-- Prepare only; apply manually through the approved database workflow.

alter table public.event_gallery_images
  add column if not exists is_featured boolean not null default false;

alter table public.event_gallery_images
  alter column is_published set default true;

alter table public.event_gallery_images
  drop constraint if exists event_gallery_featured_must_be_published;

alter table public.event_gallery_images
  add constraint event_gallery_featured_must_be_published
  check (not is_featured or is_published);

create unique index if not exists uq_event_gallery_single_featured
  on public.event_gallery_images (is_featured)
  where is_featured = true and is_deleted = false;

with first_published as (
  select event_gallery_image_id
    from public.event_gallery_images
   where is_published = true and is_deleted = false
   order by sort_order, event_gallery_image_id
   limit 1
)
update public.event_gallery_images image
   set is_featured = true
  from first_published
 where image.event_gallery_image_id = first_published.event_gallery_image_id
   and not exists (
     select 1 from public.event_gallery_images
      where is_featured = true and is_deleted = false
   );

comment on column public.event_gallery_images.is_featured is
  'At most one published, non-deleted gallery image is selected for the storefront hero.';
