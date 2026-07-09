alter table public.products
add column if not exists ncm text;

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

grant select, insert on public.product_structure_items to anon;
grant select, insert, delete on public.product_issues to anon;
grant select on public.ncm_taxes to anon;
grant update on public.products to anon;

drop policy if exists "ncm_taxes_select" on public.ncm_taxes;
drop policy if exists "product_structure_items_select" on public.product_structure_items;
drop policy if exists "product_structure_items_insert" on public.product_structure_items;
drop policy if exists "product_issues_select" on public.product_issues;
drop policy if exists "product_issues_insert" on public.product_issues;
drop policy if exists "product_issues_delete" on public.product_issues;
drop policy if exists "products_update_status" on public.products;

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
