-- ============================================================
-- Fase 5 — Historial simple (quién creó/editó) + email en accesos
-- ============================================================
-- Migración IDEMPOTENTE y NO destructiva.
-- Aplicar en Supabase → SQL Editor DESPUÉS de revisarla.
-- Nota: la parte de combos requiere que la migración de la Fase 4 ya esté
-- aplicada (si no existe la tabla combos, ese bloque se salta solo).
--
-- created_by / updated_by guardan el EMAIL del admin (texto), seteado por la app
-- en cada escritura. No usamos uuid para no depender de leer auth.users.
-- ============================================================

begin;

alter table public.products        add column if not exists created_by text;
alter table public.products        add column if not exists updated_by text;
alter table public.product_flavors add column if not exists created_by text;
alter table public.product_flavors add column if not exists updated_by text;
alter table public.categories      add column if not exists created_by text;
alter table public.categories      add column if not exists updated_by text;

-- Email informativo en los perfiles admin (para la pantalla de accesos).
alter table public.admin_profiles  add column if not exists email text;

-- Combos solo si la Fase 4 ya está aplicada.
do $$
begin
  if to_regclass('public.combos') is not null then
    alter table public.combos add column if not exists created_by text;
    alter table public.combos add column if not exists updated_by text;
  end if;
end $$;

commit;

-- ============================================================
-- (Opcional) Backfill del email de TU propio perfil admin, para que la pantalla
-- de accesos no lo muestre vacío. Reemplaza el email por el tuyo y corre aparte:
-- update public.admin_profiles set email = 'tu-correo@ejemplo.com'
-- where user_id = auth.uid();
-- ============================================================
