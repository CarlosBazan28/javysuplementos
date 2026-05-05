create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
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

create table if not exists public.product_flavors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  available boolean default true,
  created_at timestamptz default now()
);

create index if not exists products_category_idx on public.products (category);
create index if not exists products_featured_idx on public.products (featured);
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
