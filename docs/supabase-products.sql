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
add column if not exists due_date date;

alter table public.product_issues
add column if not exists priority text not null default 'media';

alter table public.product_issues
drop constraint if exists product_issues_priority_check;

alter table public.product_issues
add constraint product_issues_priority_check check (
  priority in ('baixa', 'media', 'alta', 'critica')
);

alter table public.product_issues
drop constraint if exists product_issues_resolution_check;

alter table public.product_issues
add constraint product_issues_resolution_check check (
  resolved_at is null
  or length(trim(coalesce(resolution_note, ''))) >= 10
);

alter table public.product_issues drop constraint if exists product_issues_description_check;
alter table public.product_issues add constraint product_issues_description_check check (length(trim(description)) >= 10) not valid;

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

create table if not exists public.product_development_projects (
  id bigint primary key generated always as identity,
  product_id bigint not null unique references public.products(id) on delete cascade,
  requester text not null,
  owner text not null,
  target_launch_date date,
  target_price numeric,
  expected_demand text,
  potential_clients text,
  market_potential text,
  technical_specs text,
  development_reason text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_development_tasks (
  id bigint primary key generated always as identity,
  project_id bigint not null references public.product_development_projects(id) on delete cascade,
  stage_key text not null,
  title text not null,
  owner_area text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'blocked', 'completed', 'not_applicable')),
  due_date date,
  notes text,
  sort_order integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.product_development_projects
add column if not exists archived_at timestamptz;

create table if not exists public.product_budget_items (
  id bigint primary key generated always as identity,
  product_id bigint not null references public.products(id) on delete cascade,
  item_code text,
  item_name text not null,
  amount numeric not null check (amount >= 0),
  currency text not null default 'BRL' check (currency in ('BRL', 'USD')),
  overhead_rate numeric not null default 0 check (overhead_rate >= 0),
  quantity numeric not null default 1 check (quantity > 0),
  unit_type text not null default 'UN' check (unit_type in ('UN', 'PC', 'KIT', 'CX', 'KG', 'M', 'L', 'H')),
  mkp numeric not null default 1 check (mkp > 0),
  approved boolean not null default false,
  structure_item_id bigint references public.product_structure_items(id) on delete set null,
  provisional_code text,
  final_code text,
  created_at timestamptz not null default now()
);

alter table public.product_budget_items add column if not exists quantity numeric not null default 1;
alter table public.product_budget_items add column if not exists unit_type text not null default 'UN';
alter table public.product_budget_items add column if not exists mkp numeric not null default 1;
alter table public.product_budget_items add column if not exists approved boolean not null default false;
alter table public.product_budget_items add column if not exists structure_item_id bigint references public.product_structure_items(id) on delete set null;
alter table public.product_budget_items add column if not exists provisional_code text;
alter table public.product_budget_items add column if not exists final_code text;

create table if not exists public.raw_materials (
  id bigint primary key generated always as identity,
  code text not null unique,
  name text not null,
  unit_type text not null default 'UN',
  is_provisional boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.product_categories (
  id bigint primary key generated always as identity,
  name text not null unique,
  created_at timestamptz not null default now()
);

insert into public.product_categories (name)
select distinct category from public.products where category is not null and trim(category) <> ''
on conflict (name) do nothing;

create table if not exists public.product_development_task_attachments (
  id bigint primary key generated always as identity,
  task_id bigint not null references public.product_development_tasks(id) on delete cascade,
  name text not null,
  storage_path text not null unique,
  public_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.product_launch_date_history (
  id bigint primary key generated always as identity,
  project_id bigint not null references public.product_development_projects(id) on delete cascade,
  old_date date,
  new_date date,
  reason text not null,
  changed_at timestamptz not null default now()
);

create table if not exists public.quotation_packages (
  id bigint primary key generated always as identity,
  project_id bigint not null references public.product_development_projects(id) on delete cascade,
  name text not null,
  provisional_code text,
  supplier text,
  currency text not null default 'BRL' check (currency in ('BRL','USD')),
  due_date date,
  status text not null default 'draft' check (status in ('draft','waiting_supplier','received','analysis','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.quotation_package_items (
  id bigint primary key generated always as identity,
  package_id bigint not null references public.quotation_packages(id) on delete cascade,
  item_code text,
  description text not null,
  quantity numeric not null default 1 check (quantity > 0),
  unit_type text not null default 'UN',
  unit_price numeric not null default 0 check (unit_price >= 0),
  mkp numeric not null default 1 check (mkp > 0),
  overhead_rate numeric not null default 0 check (overhead_rate >= 0),
  created_at timestamptz not null default now()
);

alter table public.quotation_packages
add column if not exists include_in_total boolean not null default false;

alter table public.quotation_package_items
add column if not exists sap_code text;

alter table public.quotation_package_items add column if not exists currency text not null default 'BRL';
alter table public.quotation_package_items add column if not exists exchange_rate numeric not null default 1;
alter table public.quotation_package_items add column if not exists ncm text;
alter table public.quotation_package_items add column if not exists apply_ipi boolean not null default false;
alter table public.quotation_package_items add column if not exists apply_pis boolean not null default false;
alter table public.quotation_package_items add column if not exists apply_cofins boolean not null default false;
alter table public.quotation_package_items add column if not exists apply_icms boolean not null default false;
alter table public.quotation_package_items add column if not exists apply_import_tax boolean not null default false;

create table if not exists public.product_development_project_history (
  id bigint primary key generated always as identity,
  project_id bigint not null references public.product_development_projects(id) on delete cascade,
  field_name text not null,
  old_value text,
  new_value text,
  changed_at timestamptz not null default now()
);

-- Base consolidada para recomendações e priorização estratégica de NPI.
create table if not exists public.product_strategic_profiles (
  id bigint primary key generated always as identity,
  product_id bigint not null unique references public.products(id) on delete cascade,
  application text,
  compatibility text,
  annual_sales numeric check (annual_sales is null or annual_sales >= 0),
  stock_quantity numeric check (stock_quantity is null or stock_quantity >= 0),
  minimum_stock numeric check (minimum_stock is null or minimum_stock >= 0),
  unit_cost numeric check (unit_cost is null or unit_cost >= 0),
  sale_price numeric check (sale_price is null or sale_price >= 0),
  lead_time_days integer check (lead_time_days is null or lead_time_days >= 0),
  supplier_name text,
  supplier_country text,
  single_source boolean not null default false,
  certification_status text not null default 'not_required' check (certification_status in ('not_required','pending','valid','expired')),
  certification_expiry date,
  competitor_name text,
  competitor_price numeric check (competitor_price is null or competitor_price >= 0),
  lifecycle_status text not null default 'active' check (lifecycle_status in ('development','active','phase_out','discontinued')),
  known_risks text,
  strategic_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_strategic_history (
  id bigint primary key generated always as identity,
  product_id bigint not null references public.products(id) on delete cascade,
  event_type text not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.product_budget_items drop constraint if exists product_budget_items_quantity_check;
alter table public.product_budget_items add constraint product_budget_items_quantity_check check (quantity > 0);
alter table public.product_budget_items drop constraint if exists product_budget_items_unit_type_check;
alter table public.product_budget_items add constraint product_budget_items_unit_type_check check (unit_type in ('UN', 'PC', 'KIT', 'CX', 'KG', 'M', 'L', 'H'));
alter table public.product_budget_items drop constraint if exists product_budget_items_mkp_check;
alter table public.product_budget_items add constraint product_budget_items_mkp_check check (mkp > 0);

insert into storage.buckets (id, name, public)
values ('product-files', 'product-files', true)
on conflict (id) do update set public = excluded.public;

alter table public.product_structure_items enable row level security;
alter table public.product_issues enable row level security;
alter table public.ncm_taxes enable row level security;
alter table public.product_attachments enable row level security;
alter table public.product_development_projects enable row level security;
alter table public.product_development_tasks enable row level security;
alter table public.product_budget_items enable row level security;
alter table public.raw_materials enable row level security;
alter table public.product_categories enable row level security;
alter table public.product_development_task_attachments enable row level security;
alter table public.product_launch_date_history enable row level security;
alter table public.quotation_packages enable row level security;
alter table public.quotation_package_items enable row level security;
alter table public.product_strategic_profiles enable row level security;
alter table public.product_strategic_history enable row level security;
alter table public.product_development_project_history enable row level security;

grant select, insert, delete on public.product_structure_items to anon;
grant select, insert, update, delete on public.product_issues to anon;
grant select on public.ncm_taxes to anon;
grant update, delete on public.products to anon;
grant select, insert, delete on public.product_attachments to anon;
grant select, insert, update, delete on public.product_development_projects to anon;
grant select, insert, update, delete on public.product_development_tasks to anon;
grant select, insert, update, delete on public.product_budget_items to anon;
grant select, insert, update, delete on public.raw_materials to anon;
grant select, insert, update, delete on public.product_categories to anon;
grant select, insert, delete on public.product_development_task_attachments to anon;
grant select, insert on public.product_launch_date_history to anon;
grant select, insert, update, delete on public.quotation_packages to anon;
grant select, insert, update, delete on public.quotation_package_items to anon;
grant select, insert, update, delete on public.product_strategic_profiles to anon;
grant select, insert on public.product_strategic_history to anon;
grant select, insert on public.product_development_project_history to anon;

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
drop policy if exists "development_projects_all" on public.product_development_projects;
drop policy if exists "development_tasks_all" on public.product_development_tasks;
drop policy if exists "product_budget_items_all" on public.product_budget_items;
drop policy if exists "raw_materials_all" on public.raw_materials;
drop policy if exists "product_categories_all" on public.product_categories;
drop policy if exists "development_task_attachments_all" on public.product_development_task_attachments;
drop policy if exists "launch_date_history_all" on public.product_launch_date_history;
drop policy if exists "quotation_packages_all" on public.quotation_packages;
drop policy if exists "quotation_package_items_all" on public.quotation_package_items;
drop policy if exists "product_strategic_profiles_all" on public.product_strategic_profiles;
drop policy if exists "product_strategic_history_all" on public.product_strategic_history;
drop policy if exists "development_project_history_all" on public.product_development_project_history;

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

create policy "development_projects_all"
on public.product_development_projects for all to anon
using (true) with check (true);

create policy "development_tasks_all"
on public.product_development_tasks for all to anon
using (true) with check (true);

create policy "product_budget_items_all"
on public.product_budget_items for all to anon
using (true) with check (true);

create policy "raw_materials_all"
on public.raw_materials for all to anon
using (true) with check (true);

create policy "product_categories_all" on public.product_categories for all to anon using (true) with check (true);
create policy "development_task_attachments_all" on public.product_development_task_attachments for all to anon using (true) with check (true);
create policy "launch_date_history_all" on public.product_launch_date_history for all to anon using (true) with check (true);
create policy "quotation_packages_all" on public.quotation_packages for all to anon using (true) with check (true);
create policy "quotation_package_items_all" on public.quotation_package_items for all to anon using (true) with check (true);
create policy "product_strategic_profiles_all" on public.product_strategic_profiles for all to anon using (true) with check (true);
create policy "product_strategic_history_all" on public.product_strategic_history for all to anon using (true) with check (true);
create policy "development_project_history_all" on public.product_development_project_history for all to anon using (true) with check (true);
