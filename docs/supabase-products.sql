alter table public.products
add column if not exists ncm text;

-- O cadastro passa a ser mantido manualmente, sem campos de integracao SAP.
alter table public.products drop column if exists sap_material_code;
alter table public.products drop column if exists sap_plant;
alter table public.products drop column if exists sap_unit;
alter table public.products drop column if exists sap_material_group;
alter table public.products drop column if exists sync_source;
alter table public.products drop column if exists last_sync_at;

create table if not exists public.ncm_taxes (
  id bigint primary key generated always as identity,
  ncm text not null unique,
  description text,
  ipi_rate numeric not null default 0,
  pis_rate numeric not null default 0,
  cofins_rate numeric not null default 0,
  icms_rate numeric not null default 0,
  import_tax_rate numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.product_structure_items (
  id bigint primary key generated always as identity,
  product_id bigint not null references public.products(id) on delete cascade,
  material_code text not null,
  description text not null,
  quantity numeric not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.product_issues (
  id bigint primary key generated always as identity,
  product_id bigint not null references public.products(id) on delete cascade,
  product_code text not null,
  description text not null,
  created_at timestamptz not null default now()
);

alter table public.product_issues
add column if not exists resolution_note text;

alter table public.product_issues
add column if not exists resolved_at timestamptz;

alter table public.product_issues
drop constraint if exists product_issues_resolution_check;

alter table public.product_issues
add constraint product_issues_resolution_check check (
  resolved_at is null
  or length(trim(coalesce(resolution_note, ''))) >= 5
);

create table if not exists public.product_attachments (
  id bigint primary key generated always as identity,
  product_id bigint not null references public.products(id) on delete cascade,
  name text not null,
  file_type text not null,
  kind text not null check (kind in ('document', 'photo')),
  storage_path text not null unique,
  public_url text not null,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public)
values ('product-files', 'product-files', true)
on conflict (id) do update set public = excluded.public;

alter table public.product_structure_items enable row level security;
alter table public.product_issues enable row level security;
alter table public.ncm_taxes enable row level security;
alter table public.product_attachments enable row level security;

grant select, insert, delete on public.product_structure_items to anon;
grant select, insert, update, delete on public.product_issues to anon;
grant select on public.ncm_taxes to anon;
grant update, delete on public.products to anon;
grant select, insert, delete on public.product_attachments to anon;

drop policy if exists "ncm_taxes_select" on public.ncm_taxes;
drop policy if exists "product_structure_items_select" on public.product_structure_items;
drop policy if exists "product_structure_items_insert" on public.product_structure_items;
drop policy if exists "product_structure_items_delete" on public.product_structure_items;
drop policy if exists "product_issues_select" on public.product_issues;
drop policy if exists "product_issues_insert" on public.product_issues;
drop policy if exists "product_issues_update" on public.product_issues;
drop policy if exists "product_issues_delete" on public.product_issues;
drop policy if exists "products_update_status" on public.products;
drop policy if exists "products_delete" on public.products;
drop policy if exists "product_attachments_select" on public.product_attachments;
drop policy if exists "product_attachments_insert" on public.product_attachments;
drop policy if exists "product_attachments_delete" on public.product_attachments;
drop policy if exists "product_files_select" on storage.objects;
drop policy if exists "product_files_insert" on storage.objects;
drop policy if exists "product_files_delete" on storage.objects;

create policy "ncm_taxes_select"
on public.ncm_taxes
for select
to anon
using (true);

create policy "product_structure_items_select"
on public.product_structure_items
for select
to anon
using (true);

create policy "product_structure_items_insert"
on public.product_structure_items
for insert
to anon
with check (true);

create policy "product_structure_items_delete"
on public.product_structure_items
for delete
to anon
using (true);

create policy "product_issues_select"
on public.product_issues
for select
to anon
using (true);

create policy "product_issues_insert"
on public.product_issues
for insert
to anon
with check (true);

create policy "product_issues_update"
on public.product_issues
for update
to anon
using (true)
with check (true);

create policy "product_issues_delete"
on public.product_issues
for delete
to anon
using (true);

create policy "products_update_status"
on public.products
for update
to anon
using (true)
with check (true);

create policy "products_delete"
on public.products
for delete
to anon
using (true);

create policy "product_attachments_select"
on public.product_attachments for select to anon using (true);

create policy "product_attachments_insert"
on public.product_attachments for insert to anon with check (true);

create policy "product_attachments_delete"
on public.product_attachments for delete to anon using (true);

create policy "product_files_select"
on storage.objects for select to anon
using (bucket_id = 'product-files');

create policy "product_files_insert"
on storage.objects for insert to anon
with check (bucket_id = 'product-files');

create policy "product_files_delete"
on storage.objects for delete to anon
using (bucket_id = 'product-files');
