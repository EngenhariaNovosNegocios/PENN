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

alter table public.product_structure_items enable row level security;
alter table public.product_issues enable row level security;
alter table public.ncm_taxes enable row level security;

grant select, insert, delete on public.product_structure_items to anon;
grant select, insert, update, delete on public.product_issues to anon;
grant select on public.ncm_taxes to anon;
grant update, delete on public.products to anon;

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
