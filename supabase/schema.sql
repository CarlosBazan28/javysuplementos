create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nombre text not null,
  subtitulo text,
  precio_centavos integer default 0,
  moneda text default 'USD',
  tag text,
  imagen_url text,
  alt text,
  whatsapp_mensaje text,
  beneficios text[] default '{}',
  descripcion text[] default '{}',
  uso text[] default '{}',
  is_active boolean default true,
  name text,
  brand text,
  category text,
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
alter table public.products add column if not exists nombre text;
alter table public.products add column if not exists subtitulo text;
alter table public.products add column if not exists precio_centavos integer default 0;
alter table public.products add column if not exists moneda text default 'USD';
alter table public.products add column if not exists tag text;
alter table public.products add column if not exists imagen_url text;
alter table public.products add column if not exists alt text;
alter table public.products add column if not exists whatsapp_mensaje text;
alter table public.products add column if not exists beneficios text[] default '{}';
alter table public.products add column if not exists descripcion text[] default '{}';
alter table public.products add column if not exists uso text[] default '{}';
alter table public.products add column if not exists is_active boolean default true;
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

update public.products set id = gen_random_uuid() where id is null;
update public.products set nombre = coalesce(nullif(nombre, ''), nullif(name, ''), 'Producto sin nombre') where nombre is null or nombre = '';
update public.products set name = coalesce(nullif(name, ''), nombre) where name is null or name = '';
update public.products set category = coalesce(nullif(category, ''), nullif(tag, ''), 'Producto') where category is null or category = '';
update public.products set price = coalesce(price, precio_centavos::numeric / 100) where price is null and precio_centavos is not null;
update public.products set precio_centavos = coalesce(precio_centavos, round(coalesce(price, 0) * 100)::integer, 0) where precio_centavos is null;
update public.products set moneda = coalesce(nullif(moneda, ''), 'USD') where moneda is null or moneda = '';
update public.products set image_url = coalesce(nullif(image_url, ''), nullif(imagen_url, '')) where image_url is null or image_url = '';
update public.products set imagen_url = coalesce(nullif(imagen_url, ''), nullif(image_url, ''), 'img/products/product-placeholder.svg') where imagen_url is null or imagen_url = '';
update public.products set alt = coalesce(nullif(alt, ''), nombre) where alt is null or alt = '';
update public.products set subtitulo = coalesce(nullif(subtitulo, ''), category || coalesce(' ' || nullif(presentation, ''), '') || '.') where subtitulo is null or subtitulo = '';
update public.products set whatsapp_mensaje = coalesce(nullif(whatsapp_mensaje, ''), 'Hola Javy, quiero asesoría sobre ' || nombre || '.') where whatsapp_mensaje is null or whatsapp_mensaje = '';
update public.products set description = coalesce(nullif(description, ''), array_to_string(descripcion, E'\n'), subtitulo) where description is null or description = '';
update public.products set descripcion = array[description] where descripcion is null or cardinality(descripcion) = 0;
update public.products set beneficios = array['Producto disponible para cotización por WhatsApp.'] where beneficios is null or cardinality(beneficios) = 0;
update public.products set uso = array['Consultar la dosis indicada en la etiqueta del producto.'] where uso is null or cardinality(uso) = 0;
update public.products set available = coalesce(available, is_active, true) where available is null;
update public.products set is_active = coalesce(is_active, available, true) where is_active is null;
update public.products set featured = coalesce(featured, false) where featured is null;
update public.products set tags = coalesce(tags, '{}') where tags is null;
update public.products set goals = coalesce(goals, '{}') where goals is null;
update public.products
set slug = lower(regexp_replace(coalesce(nullif(slug, ''), legacy_id, nombre || '-' || id::text), '[^a-zA-Z0-9]+', '-', 'g'))
where slug is null or slug = '';
update public.products set slug = regexp_replace(slug, '(^-+|-+$)', '', 'g');

with duplicated_slugs as (
  select id, row_number() over (partition by slug order by created_at, id) as duplicate_position
  from public.products
  where slug is not null
)
update public.products p
set slug = p.slug || '-' || left(p.id::text, 8)
from duplicated_slugs d
where p.id = d.id
  and d.duplicate_position > 1;

alter table public.products alter column id set not null;
alter table public.products alter column slug set not null;
alter table public.products alter column nombre set not null;
alter table public.products alter column precio_centavos set default 0;
alter table public.products alter column moneda set default 'USD';
alter table public.products alter column beneficios set default '{}';
alter table public.products alter column descripcion set default '{}';
alter table public.products alter column uso set default '{}';
alter table public.products alter column is_active set default true;
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

update public.product_flavors set id = gen_random_uuid() where id is null;
update public.product_flavors set name = coalesce(nullif(name, ''), 'Sabor sin nombre') where name is null or name = '';
update public.product_flavors set available = coalesce(available, true) where available is null;

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
create index if not exists products_is_active_idx on public.products (is_active);
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
