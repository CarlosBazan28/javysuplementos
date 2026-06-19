-- ============================================================
-- Fase 4 — Combos (paquetes de productos, ej. "proteína + creatina")
-- ============================================================
-- Migración IDEMPOTENTE y NO destructiva.
-- Aplicar en Supabase → SQL Editor DESPUÉS de revisarla.
-- ============================================================

begin;

-- 1) Tabla de combos
create table if not exists public.combos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  price numeric,
  precio_centavos integer default 0,
  old_price numeric,
  is_active boolean default true,
  show_on_home boolean default false,
  sort_order integer default 100,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2) Items del combo (qué productos lo componen, con sabor opcional)
create table if not exists public.combo_items (
  id uuid primary key default gen_random_uuid(),
  combo_id uuid not null references public.combos(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  flavor_id uuid references public.product_flavors(id) on delete set null,
  quantity integer default 1,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create index if not exists combo_items_combo_id_idx on public.combo_items(combo_id);
create index if not exists combos_active_idx on public.combos(is_active);
create index if not exists combos_show_on_home_idx on public.combos(show_on_home, sort_order);

-- 3) updated_at automático (reusa la función existente)
drop trigger if exists set_combos_updated_at on public.combos;
create trigger set_combos_updated_at
before update on public.combos
for each row execute function public.set_updated_at();

-- 4) RLS: lectura pública de combos activos, escritura solo admins (espejo de products)
alter table public.combos enable row level security;
alter table public.combo_items enable row level security;

drop policy if exists "Combos are readable by everyone" on public.combos;
create policy "Combos are readable by everyone"
on public.combos
for select
to anon, authenticated
using (is_active = true or public.is_admin());

drop policy if exists "Admins can manage combos" on public.combos;
create policy "Admins can manage combos"
on public.combos
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Combo items are readable by everyone" on public.combo_items;
create policy "Combo items are readable by everyone"
on public.combo_items
for select
to anon, authenticated
using (true);

drop policy if exists "Admins can manage combo items" on public.combo_items;
create policy "Admins can manage combo items"
on public.combo_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

commit;

-- ============================================================
-- VERIFICACIÓN (correr por separado, no es parte de la migración):
-- select count(*) as combos from public.combos;
-- select c.name, count(ci.id) as items
-- from public.combos c
-- left join public.combo_items ci on ci.combo_id = c.id
-- group by c.name order by c.name;
-- ============================================================
