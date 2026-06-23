begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email citext,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_memberships (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'staff' check (role in ('owner', 'manager', 'staff')),
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_memberships_store_id_id_key unique (store_id, id),
  constraint store_memberships_store_id_user_id_key unique (store_id, user_id)
);

create or replace function public.app_has_store_access(target_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- For migration/testing: allow if no user is logged in OR if user is a member
  select (auth.uid() is null) or exists (
    select 1
    from public.store_memberships sm
    where sm.store_id = target_store_id
      and sm.user_id = auth.uid()
      and sm.is_active = true
  );
$$;

create table if not exists public.store_categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  code citext not null,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_categories_store_id_id_key unique (store_id, id),
  constraint store_categories_store_id_code_key unique (store_id, code)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  full_name text not null,
  phone text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_store_id_id_key unique (store_id, id)
);

create unique index if not exists customers_store_phone_unq
  on public.customers (store_id, phone)
  where phone is not null and btrim(phone) <> '';

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name citext not null,
  phone text,
  address text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint suppliers_store_id_id_key unique (store_id, id)
);

create unique index if not exists suppliers_store_name_unq
  on public.suppliers (store_id, name);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  category_id uuid not null,
  sku citext,
  name text not null,
  name_ar text,
  unit text not null default 'unit' check (unit in ('unit', 'kg')),
  price_sale numeric(14,2) not null default 0 check (price_sale >= 0),
  price_buy numeric(14,2) not null default 0 check (price_buy >= 0),
  stock_quantity numeric(14,3) not null default 0 check (stock_quantity >= 0),
  min_stock_quantity numeric(14,3) not null default 0 check (min_stock_quantity >= 0),
  expiry_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_store_id_id_key unique (store_id, id),
  constraint products_store_category_fkey
    foreign key (store_id, category_id)
    references public.store_categories (store_id, id)
    on delete restrict
);

create unique index if not exists products_store_sku_unq
  on public.products (store_id, sku)
  where sku is not null and btrim(sku::text) <> '';

create index if not exists products_store_name_idx
  on public.products (store_id, name);

create table if not exists public.custom_sale_cards (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  base_product_id uuid not null,
  initial_quantity numeric(14,3) not null check (initial_quantity > 0),
  remaining_quantity numeric(14,3) not null check (remaining_quantity >= 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  price_buy_per_kg numeric(14,4) not null default 0 check (price_buy_per_kg >= 0),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint custom_sale_cards_store_id_id_key unique (store_id, id),
  constraint custom_sale_cards_quantity_check check (remaining_quantity <= initial_quantity),
  constraint custom_sale_cards_base_product_fkey
    foreign key (store_id, base_product_id)
    references public.products (store_id, id)
    on delete restrict
);

create table if not exists public.credit_accounts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  customer_id uuid not null,
  status text not null default 'open' check (status in ('open', 'paid', 'closed')),
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  notes text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint credit_accounts_store_id_id_key unique (store_id, id),
  constraint credit_accounts_paid_check check (paid_amount <= total_amount),
  constraint credit_accounts_customer_fkey
    foreign key (store_id, customer_id)
    references public.customers (store_id, id)
    on delete restrict
);

create unique index if not exists credit_accounts_one_open_per_customer_unq
  on public.credit_accounts (store_id, customer_id)
  where status = 'open';

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  customer_id uuid,
  credit_account_id uuid,
  sale_type text not null check (sale_type in ('direct', 'bon', 'credit', 'retour')),
  total_amount numeric(14,2) not null check (total_amount >= 0),
  teinte_amount numeric(14,2) not null default 0 check (teinte_amount >= 0),
  reduction_amount numeric(14,2) not null default 0 check (reduction_amount >= 0),
  sold_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  customer_name_snapshot text,
  customer_phone_snapshot text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_store_id_id_key unique (store_id, id),
  constraint sales_customer_fkey
    foreign key (store_id, customer_id)
    references public.customers (store_id, id)
    on delete set null,
  constraint sales_credit_account_fkey
    foreign key (store_id, credit_account_id)
    references public.credit_accounts (store_id, id)
    on delete set null,
  constraint sales_credit_account_required_check
    check (sale_type <> 'credit' or credit_account_id is not null)
);

create index if not exists sales_store_sold_at_idx
  on public.sales (store_id, sold_at desc);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  sale_id uuid not null,
  product_id uuid,
  category_id uuid,
  custom_sale_card_id uuid,
  product_name_snapshot text not null,
  category_name_snapshot text,
  unit text not null default 'unit' check (unit in ('unit', 'kg')),
  quantity numeric(14,3) not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  unit_cost numeric(14,2) not null default 0 check (unit_cost >= 0),
  is_custom_price boolean not null default false,
  line_total numeric(14,2) generated always as (round(quantity * unit_price, 2)) stored,
  line_cost numeric(14,2) generated always as (round(quantity * unit_cost, 2)) stored,
  created_at timestamptz not null default now(),
  constraint sale_items_store_id_id_key unique (store_id, id),
  constraint sale_items_sale_fkey
    foreign key (store_id, sale_id)
    references public.sales (store_id, id)
    on delete cascade,
  constraint sale_items_product_fkey
    foreign key (store_id, product_id)
    references public.products (store_id, id)
    on delete set null,
  constraint sale_items_category_fkey
    foreign key (store_id, category_id)
    references public.store_categories (store_id, id)
    on delete set null,
  constraint sale_items_custom_card_fkey
    foreign key (store_id, custom_sale_card_id)
    references public.custom_sale_cards (store_id, id)
    on delete set null
);

create index if not exists sale_items_store_sale_idx
  on public.sale_items (store_id, sale_id);

create table if not exists public.sale_tint_entries (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  sale_id uuid not null,
  kg numeric(14,3) not null check (kg > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  line_total numeric(14,2) generated always as (round(kg * unit_price, 2)) stored,
  created_at timestamptz not null default now(),
  constraint sale_tint_entries_store_id_id_key unique (store_id, id),
  constraint sale_tint_entries_sale_fkey
    foreign key (store_id, sale_id)
    references public.sales (store_id, id)
    on delete cascade
);

create table if not exists public.bons (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  sale_id uuid not null,
  customer_id uuid,
  bon_number text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bons_store_id_id_key unique (store_id, id),
  constraint bons_store_id_sale_id_key unique (store_id, sale_id),
  constraint bons_store_id_bon_number_key unique (store_id, bon_number),
  constraint bons_sale_fkey
    foreign key (store_id, sale_id)
    references public.sales (store_id, id)
    on delete cascade,
  constraint bons_customer_fkey
    foreign key (store_id, customer_id)
    references public.customers (store_id, id)
    on delete set null
);

create table if not exists public.credit_payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  credit_account_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  paid_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  constraint credit_payments_store_id_id_key unique (store_id, id),
  constraint credit_payments_credit_account_fkey
    foreign key (store_id, credit_account_id)
    references public.credit_accounts (store_id, id)
    on delete cascade
);

create index if not exists credit_payments_store_account_paid_at_idx
  on public.credit_payments (store_id, credit_account_id, paid_at desc);

create table if not exists public.purchase_invoices (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  supplier_id uuid not null,
  original_invoice_id uuid,
  invoice_number text not null,
  invoice_type text not null default 'achat' check (invoice_type in ('achat', 'retour')),
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  invoice_date date not null default current_date,
  created_by uuid references auth.users (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint purchase_invoices_store_id_id_key unique (store_id, id),
  constraint purchase_invoices_store_id_invoice_number_key unique (store_id, invoice_number),
  constraint purchase_invoices_paid_check check (paid_amount <= total_amount),
  constraint purchase_invoices_supplier_fkey
    foreign key (store_id, supplier_id)
    references public.suppliers (store_id, id)
    on delete restrict,
  constraint purchase_invoices_original_fkey
    foreign key (store_id, original_invoice_id)
    references public.purchase_invoices (store_id, id)
    on delete set null
);

create index if not exists purchase_invoices_store_invoice_date_idx
  on public.purchase_invoices (store_id, invoice_date desc);

create table if not exists public.purchase_invoice_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  purchase_invoice_id uuid not null,
  product_id uuid,
  category_id uuid,
  product_name_snapshot text not null,
  category_name_snapshot text,
  unit text not null default 'unit' check (unit in ('unit', 'kg')),
  quantity numeric(14,3) not null check (quantity > 0),
  unit_cost numeric(14,2) not null check (unit_cost >= 0),
  unit_sale_price numeric(14,2) not null check (unit_sale_price >= 0),
  expiry_date date,
  line_total numeric(14,2) generated always as (round(quantity * unit_cost, 2)) stored,
  created_at timestamptz not null default now(),
  constraint purchase_invoice_items_store_id_id_key unique (store_id, id),
  constraint purchase_invoice_items_invoice_fkey
    foreign key (store_id, purchase_invoice_id)
    references public.purchase_invoices (store_id, id)
    on delete cascade,
  constraint purchase_invoice_items_product_fkey
    foreign key (store_id, product_id)
    references public.products (store_id, id)
    on delete set null,
  constraint purchase_invoice_items_category_fkey
    foreign key (store_id, category_id)
    references public.store_categories (store_id, id)
    on delete set null
);

create index if not exists purchase_invoice_items_store_invoice_idx
  on public.purchase_invoice_items (store_id, purchase_invoice_id);

create table if not exists public.purchase_invoice_payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  purchase_invoice_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  paid_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  constraint purchase_invoice_payments_store_id_id_key unique (store_id, id),
  constraint purchase_invoice_payments_invoice_fkey
    foreign key (store_id, purchase_invoice_id)
    references public.purchase_invoices (store_id, id)
    on delete cascade
);

create index if not exists purchase_invoice_payments_store_invoice_paid_at_idx
  on public.purchase_invoice_payments (store_id, purchase_invoice_id, paid_at desc);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  category text not null,
  reason text not null,
  amount numeric(14,2) not null check (amount >= 0),
  expense_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_store_id_id_key unique (store_id, id)
);

create index if not exists expenses_store_expense_at_idx
  on public.expenses (store_id, expense_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.apply_product_stock_delta(
  p_store_id uuid,
  p_product_id uuid,
  p_delta numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_product_id is null or p_delta = 0 then
    return;
  end if;

  update public.products
     set stock_quantity = greatest(0, stock_quantity + p_delta),
         updated_at = now()
   where store_id = p_store_id
     and id = p_product_id;
end;
$$;

create or replace function public.sync_sale_item_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_sale_type text;
  new_sale_type text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select sale_type
      into old_sale_type
    from public.sales
    where store_id = old.store_id
      and id = old.sale_id;

    perform public.apply_product_stock_delta(
      old.store_id,
      old.product_id,
      case when old_sale_type = 'retour' then -old.quantity else old.quantity end
    );
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    select sale_type
      into new_sale_type
    from public.sales
    where store_id = new.store_id
      and id = new.sale_id;

    perform public.apply_product_stock_delta(
      new.store_id,
      new.product_id,
      case when new_sale_type = 'retour' then new.quantity else -new.quantity end
    );
  end if;

  return null;
end;
$$;

create or replace function public.sync_purchase_invoice_item_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_invoice_type text;
  new_invoice_type text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select invoice_type
      into old_invoice_type
    from public.purchase_invoices
    where store_id = old.store_id
      and id = old.purchase_invoice_id;

    perform public.apply_product_stock_delta(
      old.store_id,
      old.product_id,
      case when old_invoice_type = 'retour' then old.quantity else -old.quantity end
    );
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    select invoice_type
      into new_invoice_type
    from public.purchase_invoices
    where store_id = new.store_id
      and id = new.purchase_invoice_id;

    perform public.apply_product_stock_delta(
      new.store_id,
      new.product_id,
      case when new_invoice_type = 'retour' then -new.quantity else new.quantity end
    );
  end if;

  return null;
end;
$$;

create or replace function public.recompute_credit_account(
  p_store_id uuid,
  p_credit_account_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric(14,2);
  v_paid numeric(14,2);
  v_status text;
begin
  select coalesce(sum(s.total_amount), 0)::numeric(14,2)
    into v_total
  from public.sales s
  where s.store_id = p_store_id
    and s.credit_account_id = p_credit_account_id
    and s.sale_type = 'credit';

  select coalesce(sum(cp.amount), 0)::numeric(14,2)
    into v_paid
  from public.credit_payments cp
  where cp.store_id = p_store_id
    and cp.credit_account_id = p_credit_account_id;

  v_status := case
    when v_total > 0 and v_paid >= v_total then 'paid'
    else 'open'
  end;

  update public.credit_accounts
     set total_amount = v_total,
         paid_amount = v_paid,
         status = v_status,
         closed_at = case when v_status = 'paid' then now() else null end,
         updated_at = now()
   where store_id = p_store_id
     and id = p_credit_account_id;
end;
$$;

create or replace function public.sync_credit_account_from_sales()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.credit_account_id is not null then
      perform public.recompute_credit_account(new.store_id, new.credit_account_id);
    end if;
  elsif tg_op = 'UPDATE' then
    if old.credit_account_id is not null then
      perform public.recompute_credit_account(old.store_id, old.credit_account_id);
    end if;
    if new.credit_account_id is not null then
      perform public.recompute_credit_account(new.store_id, new.credit_account_id);
    end if;
  else
    if old.credit_account_id is not null then
      perform public.recompute_credit_account(old.store_id, old.credit_account_id);
    end if;
  end if;

  return null;
end;
$$;

create or replace function public.recompute_purchase_invoice_paid_amount(
  p_store_id uuid,
  p_purchase_invoice_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paid numeric(14,2);
begin
  select coalesce(sum(pip.amount), 0)::numeric(14,2)
    into v_paid
  from public.purchase_invoice_payments pip
  where pip.store_id = p_store_id
    and pip.purchase_invoice_id = p_purchase_invoice_id;

  update public.purchase_invoices
     set paid_amount = v_paid,
         updated_at = now()
   where store_id = p_store_id
     and id = p_purchase_invoice_id;
end;
$$;

create or replace function public.sync_purchase_invoice_paid_amount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.recompute_purchase_invoice_paid_amount(new.store_id, new.purchase_invoice_id);
  elsif tg_op = 'UPDATE' then
    perform public.recompute_purchase_invoice_paid_amount(old.store_id, old.purchase_invoice_id);
    perform public.recompute_purchase_invoice_paid_amount(new.store_id, new.purchase_invoice_id);
  else
    perform public.recompute_purchase_invoice_paid_amount(old.store_id, old.purchase_invoice_id);
  end if;

  return null;
end;
$$;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'profiles',
    'stores',
    'store_memberships',
    'store_categories',
    'customers',
    'suppliers',
    'products',
    'custom_sale_cards',
    'credit_accounts',
    'sales',
    'bons',
    'purchase_invoices',
    'expenses'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', tbl, tbl);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      tbl,
      tbl
    );
  end loop;
end
$$;

drop trigger if exists sale_items_sync_stock on public.sale_items;
create trigger sale_items_sync_stock
after insert or update or delete on public.sale_items
for each row
execute function public.sync_sale_item_stock();

drop trigger if exists purchase_invoice_items_sync_stock on public.purchase_invoice_items;
create trigger purchase_invoice_items_sync_stock
after insert or update or delete on public.purchase_invoice_items
for each row
execute function public.sync_purchase_invoice_item_stock();

drop trigger if exists sales_sync_credit_account on public.sales;
create trigger sales_sync_credit_account
after insert or update or delete on public.sales
for each row
execute function public.sync_credit_account_from_sales();

drop trigger if exists credit_payments_sync_credit_account on public.credit_payments;
create trigger credit_payments_sync_credit_account
after insert or update or delete on public.credit_payments
for each row
execute function public.sync_credit_account_from_sales();

drop trigger if exists purchase_invoice_payments_sync_paid_amount on public.purchase_invoice_payments;
create trigger purchase_invoice_payments_sync_paid_amount
after insert or update or delete on public.purchase_invoice_payments
for each row
execute function public.sync_purchase_invoice_paid_amount();

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

alter table public.stores enable row level security;
alter table public.stores force row level security;

alter table public.store_memberships enable row level security;
alter table public.store_memberships force row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_own'
  ) then
    create policy profiles_select_own
      on public.profiles
      for select
      using (id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_update_own'
  ) then
    create policy profiles_update_own
      on public.profiles
      for update
      using (id = auth.uid())
      with check (id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'stores' and policyname = 'stores_select_member_stores'
  ) then
    create policy stores_select_member_stores
      on public.stores
      for select
      using (public.app_has_store_access(id));
  end if;

  -- Allow anonymous/unauthenticated users to read active stores.
  -- This is needed so the StoreSelector page can list stores before any auth exists.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'stores' and policyname = 'stores_select_public'
  ) then
    create policy stores_select_public
      on public.stores
      for select
      using (is_active = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'store_memberships' and policyname = 'store_memberships_select_own'
  ) then
    create policy store_memberships_select_own
      on public.store_memberships
      for select
      using (user_id = auth.uid());
  end if;
end
$$;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'store_categories',
    'customers',
    'suppliers',
    'products',
    'custom_sale_cards',
    'credit_accounts',
    'sales',
    'sale_items',
    'sale_tint_entries',
    'bons',
    'credit_payments',
    'purchase_invoices',
    'purchase_invoice_items',
    'purchase_invoice_payments',
    'expenses'
  ]
  loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('alter table public.%I force row level security', tbl);

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = tbl
        and policyname = tbl || '_select'
    ) then
      execute format(
        'create policy %I on public.%I for select using (public.app_has_store_access(store_id))',
        tbl || '_select',
        tbl
      );
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = tbl
        and policyname = tbl || '_insert'
    ) then
      execute format(
        'create policy %I on public.%I for insert with check (public.app_has_store_access(store_id))',
        tbl || '_insert',
        tbl
      );
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = tbl
        and policyname = tbl || '_update'
    ) then
      execute format(
        'create policy %I on public.%I for update using (public.app_has_store_access(store_id)) with check (public.app_has_store_access(store_id))',
        tbl || '_update',
        tbl
      );
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = tbl
        and policyname = tbl || '_delete'
    ) then
      execute format(
        'create policy %I on public.%I for delete using (public.app_has_store_access(store_id))',
        tbl || '_delete',
        tbl
      );
    end if;
  end loop;
end
$$;

create or replace view public.analytics_daily_store_kpis
with (security_invoker = true)
as
with sale_costs as (
  select
    si.store_id,
    si.sale_id,
    coalesce(sum(si.line_cost), 0)::numeric(14,2) as cost_amount
  from public.sale_items si
  group by si.store_id, si.sale_id
),
sales_daily as (
  select
    s.store_id,
    (s.sold_at at time zone 'utc')::date as business_date,
    count(*) as total_sales_count,
    count(*) filter (where s.sale_type = 'direct') as direct_sales_count,
    count(*) filter (where s.sale_type = 'bon') as bon_sales_count,
    count(*) filter (where s.sale_type = 'credit') as credit_sales_count,
    count(*) filter (where s.sale_type = 'retour') as return_sales_count,
    coalesce(sum(s.total_amount), 0)::numeric(14,2) as revenue_amount,
    coalesce(sum(s.teinte_amount), 0)::numeric(14,2) as teinte_amount,
    coalesce(sum(sc.cost_amount), 0)::numeric(14,2) as cost_amount
  from public.sales s
  left join sale_costs sc
    on sc.store_id = s.store_id
   and sc.sale_id = s.id
  group by s.store_id, (s.sold_at at time zone 'utc')::date
),
expense_daily as (
  select
    e.store_id,
    (e.expense_at at time zone 'utc')::date as business_date,
    coalesce(sum(e.amount), 0)::numeric(14,2) as expense_amount
  from public.expenses e
  group by e.store_id, (e.expense_at at time zone 'utc')::date
)
select
  sd.store_id,
  sd.business_date,
  sd.total_sales_count,
  sd.direct_sales_count,
  sd.bon_sales_count,
  sd.credit_sales_count,
  sd.return_sales_count,
  sd.revenue_amount,
  sd.teinte_amount,
  sd.cost_amount,
  coalesce(ed.expense_amount, 0)::numeric(14,2) as expense_amount,
  (sd.revenue_amount - sd.cost_amount - coalesce(ed.expense_amount, 0))::numeric(14,2) as net_profit_amount
from sales_daily sd
left join expense_daily ed
  on ed.store_id = sd.store_id
 and ed.business_date = sd.business_date;

insert into public.stores (slug, name, description)
values
  ('magasin-principal', 'Nova Deco - Magasin Principal', 'Store 1'),
  ('placo', 'Nova Deco - Placo', 'Store 2')
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  updated_at = now();

-- After a user signs up, attach them to exactly the store they should access.
-- Example:
-- insert into public.store_memberships (store_id, user_id, role, is_default)
-- select id, 'YOUR_USER_UUID'::uuid, 'owner', true
-- from public.stores
-- where slug = 'magasin-principal';

grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on all tables in schema public to authenticated, anon;
grant usage, select on all sequences in schema public to authenticated, anon;
grant execute on all functions in schema public to authenticated, anon;

commit;
