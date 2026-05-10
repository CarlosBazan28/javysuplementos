create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  brand text,
  category text not null,
  price numeric,
  presentation text,
  image_url text,
  description text,
  available boolean default true,
  featured boolean default false,
  tags text[] default '{}',
  goals text[] default '{}',
  legacy_id text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.products add column if not exists id uuid default gen_random_uuid();
alter table public.products add column if not exists slug text;
alter table public.products add column if not exists name text;
alter table public.products add column if not exists brand text;
alter table public.products add column if not exists category text;
alter table public.products add column if not exists price numeric;
alter table public.products add column if not exists presentation text;
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists description text;
alter table public.products add column if not exists available boolean default true;
alter table public.products add column if not exists featured boolean default false;
alter table public.products add column if not exists tags text[] default '{}';
alter table public.products add column if not exists goals text[] default '{}';
alter table public.products add column if not exists legacy_id text;
alter table public.products add column if not exists created_at timestamptz default now();
alter table public.products add column if not exists updated_at timestamptz default now();

update public.products set name = coalesce(name, 'Producto sin nombre') where name is null;
update public.products set category = coalesce(category, 'Producto') where category is null;
update public.products set id = gen_random_uuid() where id is null;
update public.products
set slug = lower(regexp_replace(coalesce(slug, legacy_id, name || '-' || id::text), '[^a-zA-Z0-9]+', '-', 'g'))
where slug is null or slug = '';
alter table public.products alter column id set not null;
alter table public.products alter column slug set not null;
alter table public.products alter column name set not null;
alter table public.products alter column category set not null;
alter table public.products alter column available set default true;
alter table public.products alter column featured set default false;
alter table public.products alter column tags set default '{}';
alter table public.products alter column goals set default '{}';
alter table public.products alter column created_at set default now();
alter table public.products alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_pkey'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products add constraint products_pkey primary key (id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_slug_key'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products add constraint products_slug_key unique (slug);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_legacy_id_key'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products add constraint products_legacy_id_key unique (legacy_id);
  end if;
end;
$$;

create table if not exists public.product_flavors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  available boolean default true,
  created_at timestamptz default now()
);

alter table public.product_flavors add column if not exists id uuid default gen_random_uuid();
alter table public.product_flavors add column if not exists product_id uuid;
alter table public.product_flavors add column if not exists name text;
alter table public.product_flavors add column if not exists available boolean default true;
alter table public.product_flavors add column if not exists created_at timestamptz default now();

update public.product_flavors set name = coalesce(name, 'Sabor sin nombre') where name is null;
update public.product_flavors set id = gen_random_uuid() where id is null;
alter table public.product_flavors alter column id set not null;
alter table public.product_flavors alter column name set not null;
alter table public.product_flavors alter column available set default true;
alter table public.product_flavors alter column created_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_flavors_pkey'
      and conrelid = 'public.product_flavors'::regclass
  ) then
    alter table public.product_flavors add constraint product_flavors_pkey primary key (id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_flavors_product_id_fkey'
      and conrelid = 'public.product_flavors'::regclass
  ) then
    alter table public.product_flavors
      add constraint product_flavors_product_id_fkey
      foreign key (product_id) references public.products(id) on delete cascade;
  end if;
end;
$$;

create index if not exists products_category_idx on public.products (category);
create index if not exists products_featured_idx on public.products (featured);
create index if not exists products_slug_idx on public.products (slug);
create index if not exists products_legacy_id_idx on public.products (legacy_id);
create index if not exists product_flavors_product_id_idx on public.product_flavors (product_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_products_updated_at on public.products;

create trigger set_products_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.product_flavors enable row level security;

drop policy if exists "Products are readable by everyone" on public.products;
drop policy if exists "Authenticated users can insert products" on public.products;
drop policy if exists "Authenticated users can update products" on public.products;
drop policy if exists "Authenticated users can delete products" on public.products;

create policy "Products are readable by everyone"
on public.products
for select
to anon, authenticated
using (true);

create policy "Authenticated users can insert products"
on public.products
for insert
to authenticated
with check (true);

create policy "Authenticated users can update products"
on public.products
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete products"
on public.products
for delete
to authenticated
using (true);

drop policy if exists "Product flavors are readable by everyone" on public.product_flavors;
drop policy if exists "Authenticated users can insert product flavors" on public.product_flavors;
drop policy if exists "Authenticated users can update product flavors" on public.product_flavors;
drop policy if exists "Authenticated users can delete product flavors" on public.product_flavors;

create policy "Product flavors are readable by everyone"
on public.product_flavors
for select
to anon, authenticated
using (true);

create policy "Authenticated users can insert product flavors"
on public.product_flavors
for insert
to authenticated
with check (true);

create policy "Authenticated users can update product flavors"
on public.product_flavors
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete product flavors"
on public.product_flavors
for delete
to authenticated
using (true);
