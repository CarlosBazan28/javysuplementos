-- ============================================================
-- Fase 6 — Historial de actividad (quién hizo qué, con detalle)
-- ============================================================
-- Migración IDEMPOTENTE y NO destructiva.
-- Aplicar en Supabase → SQL Editor DESPUÉS de revisarla.
--
-- Crea la tabla activity_log, donde la app registra cada acción del panel
-- (crear / editar / precio / disponibilidad / eliminar) sobre productos,
-- sabores, categorías y combos. El registro lo hace la app en cada escritura.
--
-- Requiere la función public.is_admin() (ya creada en schema.sql) para las
-- políticas de seguridad. Si por algún motivo no existe, se crea aquí.
-- ============================================================

begin;

-- Por si se aplica esta migración en un proyecto sin schema.sql completo.
-- OJO (Fase 9): este bloque recrea is_admin() con la definición VIEJA
-- (role = 'admin'), que deja fuera a los editores. Si vuelves a correr esta
-- migración, corre después supabase/migrations/fase9-roles.sql.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where user_id = auth.uid()
      and role = 'admin'
      and is_active = true
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

create table if not exists public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  actor_email text,                 -- quién (email del admin), sellado por la app
  action      text not null,        -- create | update | price | availability | delete
  entity_type text not null,        -- product | flavor | category | combo | admin
  entity_id   uuid,                 -- id de la entidad (puede quedar tras un delete)
  entity_name text,                 -- nombre al momento del cambio (para que sea legible)
  field       text,                 -- campo afectado (ej. precio, disponibilidad)
  old_value   text,                 -- valor anterior (antes →)
  new_value   text,                 -- valor nuevo (→ después)
  summary     text                  -- frase legible ya armada por la app
);

create index if not exists activity_log_created_at_idx on public.activity_log (created_at desc);
create index if not exists activity_log_entity_type_idx on public.activity_log (entity_type);
create index if not exists activity_log_actor_idx       on public.activity_log (actor_email);

-- Seguridad: solo administradores autenticados pueden leer/insertar. Nunca anon.
alter table public.activity_log enable row level security;

drop policy if exists "Admins can read activity log"   on public.activity_log;
drop policy if exists "Admins can insert activity log" on public.activity_log;

create policy "Admins can read activity log"
on public.activity_log
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert activity log"
on public.activity_log
for insert
to authenticated
with check (public.is_admin());

commit;

-- ============================================================
-- Nota: el historial empieza a registrar desde que se aplica esta migración
-- y se publica el código que la usa. No hay historial retroactivo.
-- ============================================================
