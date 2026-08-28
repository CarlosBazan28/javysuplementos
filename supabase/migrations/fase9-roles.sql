-- ============================================================
-- Fase 9 — Roles y gestión de usuarios desde el panel
-- ============================================================
-- Migración IDEMPOTENTE y NO destructiva.
-- Aplicar en Supabase → SQL Editor DESPUÉS de revisarla.
--
-- IMPORTANTE: esta migración va DESPUÉS de fase4, fase6 y fase7, porque
-- redefine public.is_admin() y esas migraciones la crean con la definición
-- vieja (role = 'admin'). Si vuelves a correr una migración anterior, corre
-- esta de nuevo al final.
--
-- Qué introduce:
--   • Tres roles reales en admin_profiles: admin | editor | viewer.
--   • Tres funciones de permiso: is_staff(), can_write(), can_manage_users().
--   • is_admin() pasa a ser un ALIAS de can_write() (Admin + Editor), para no
--     tener que reescribir las ~20 políticas que ya la usan.
--   • Un candado que impide quedarse sin ningún administrador activo.
--
--   Rol    | Puede
--   -------+--------------------------------------------------------------
--   admin  | Todo. Único que crea/edita/elimina usuarios.
--   editor | Catálogo completo (productos, combos, categorías, inicio,
--          | mensajes, ajustes). No toca usuarios.
--   viewer | Solo lectura. Entra al panel y ve todo, no modifica nada.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Columnas nuevas en admin_profiles
-- ------------------------------------------------------------
alter table public.admin_profiles add column if not exists email        text;
alter table public.admin_profiles add column if not exists display_name text;
alter table public.admin_profiles add column if not exists created_by   text;
alter table public.admin_profiles add column if not exists updated_at   timestamptz default now();

-- is_active nace nullable; un null rompería los checks de permiso.
update public.admin_profiles set is_active = true where is_active is null;
alter table public.admin_profiles alter column is_active set default true;
alter table public.admin_profiles alter column is_active set not null;

-- Backfill: todo lo que ya existía era admin de facto.
update public.admin_profiles
set role = 'admin'
where role is null or btrim(role) = '';

update public.admin_profiles
set display_name = split_part(email, '@', 1)
where (display_name is null or btrim(display_name) = '') and email is not null;

-- Solo los tres roles conocidos (idempotente: se agrega si no existe).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'admin_profiles_role_check'
      and conrelid = 'public.admin_profiles'::regclass
  ) then
    alter table public.admin_profiles
      add constraint admin_profiles_role_check
      check (role in ('admin', 'editor', 'viewer'));
  end if;
end $$;

drop trigger if exists set_admin_profiles_updated_at on public.admin_profiles;
create trigger set_admin_profiles_updated_at
before update on public.admin_profiles
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 2. Funciones de permiso
-- ------------------------------------------------------------

-- Cualquier perfil activo (admin, editor o viewer): puede entrar al panel y
-- leer lo privado (mensajes, historial, categorías/combos inactivos).
create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where user_id = auth.uid()
      and is_active = true
  );
$$;

-- Admin o Editor: puede escribir en el catálogo.
create or replace function public.can_write()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where user_id = auth.uid()
      and role in ('admin', 'editor')
      and is_active = true
  );
$$;

-- Solo Admin: gestiona usuarios del panel.
create or replace function public.can_manage_users()
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

-- OJO: is_admin() ya NO significa "es administrador", significa "puede
-- escribir" (Admin o Editor). Se mantiene el nombre para no reescribir las
-- ~20 políticas que la usan en schema.sql y en las migraciones anteriores.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.can_write();
$$;

grant execute on function public.is_staff()          to anon, authenticated;
grant execute on function public.can_write()         to anon, authenticated;
grant execute on function public.can_manage_users()  to anon, authenticated;
grant execute on function public.is_admin()          to anon, authenticated;

-- ------------------------------------------------------------
-- 3. Políticas que cambian de portón
-- ------------------------------------------------------------

-- admin_profiles: leer, cualquier miembro del equipo; escribir, solo Admin.
drop policy if exists "Users can read own admin profile" on public.admin_profiles;
drop policy if exists "Admins can manage admin profiles" on public.admin_profiles;

create policy "Users can read own admin profile"
on public.admin_profiles
for select
to authenticated
using (user_id = auth.uid() or public.is_staff());

create policy "Admins can manage admin profiles"
on public.admin_profiles
for all
to authenticated
using (public.can_manage_users())
with check (public.can_manage_users());

-- Lectura para todo el equipo (el Lector también necesita ver estas pantallas).
do $$
begin
  if to_regclass('public.leads') is not null then
    drop policy if exists "Admins can read leads" on public.leads;
    create policy "Admins can read leads"
      on public.leads for select to authenticated
      using (public.is_staff());
  end if;

  if to_regclass('public.activity_log') is not null then
    drop policy if exists "Admins can read activity log" on public.activity_log;
    create policy "Admins can read activity log"
      on public.activity_log for select to authenticated
      using (public.is_staff());
  end if;

  if to_regclass('public.combos') is not null then
    drop policy if exists "Combos are readable by everyone" on public.combos;
    create policy "Combos are readable by everyone"
      on public.combos for select to anon, authenticated
      using (is_active = true or public.is_staff());
  end if;
end $$;

drop policy if exists "Categories are readable by everyone" on public.categories;
create policy "Categories are readable by everyone"
on public.categories
for select
to anon, authenticated
using (is_active = true or public.is_staff());

-- ------------------------------------------------------------
-- 4. Candado anti-lockout: nunca cero administradores activos
-- ------------------------------------------------------------
create or replace function public.guard_last_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  quedan int;
begin
  -- Solo importa si la fila afectada ERA un admin activo.
  if not (old.role = 'admin' and old.is_active = true) then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  select count(*) into quedan
  from public.admin_profiles
  where role = 'admin' and is_active = true and id <> old.id;


  if tg_op = 'UPDATE' and new.role = 'admin' and new.is_active = true then
    quedan := quedan + 1;
  end if;

  if quedan = 0 then
    raise exception 'No puedes quedarte sin administradores activos. Asigna el rol Admin a otra persona primero.';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- Es una función de TRIGGER: corre sola al tocar admin_profiles y no tiene por
-- qué quedar expuesta en /rest/v1/rpc/ (el EXECUTE es público por defecto).
revoke execute on function public.guard_last_admin() from public, anon, authenticated;

drop trigger if exists guard_last_admin_trg on public.admin_profiles;
create trigger guard_last_admin_trg
before update or delete on public.admin_profiles
for each row execute function public.guard_last_admin();

commit;

-- ============================================================
-- Después de aplicar: la Edge Function `admin-users` es la que crea y elimina
-- usuarios de Auth (necesita la service_role key, que nunca puede vivir en el
-- navegador). Desplegarla con:  supabase functions deploy admin-users
-- ============================================================
