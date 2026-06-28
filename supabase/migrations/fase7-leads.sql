-- ============================================================================
-- Fase 7 — Leads del formulario de contacto.
-- Captura las solicitudes que llegan por el formulario de contacto: el público
-- (anon) puede INSERTAR, solo los admins pueden LEER / actualizar / borrar.
-- Idempotente: se puede correr varias veces sin romper nada.
-- Requiere que ya existan public.is_admin() y public.set_updated_at() (schema.sql).
-- ============================================================================

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  product text,
  message text,
  status text not null default 'nuevo',
  source text default 'contacto',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.leads add column if not exists id uuid default gen_random_uuid();
alter table public.leads add column if not exists name text;
alter table public.leads add column if not exists email text;
alter table public.leads add column if not exists phone text;
alter table public.leads add column if not exists product text;
alter table public.leads add column if not exists message text;
alter table public.leads add column if not exists status text default 'nuevo';
alter table public.leads add column if not exists source text default 'contacto';
alter table public.leads add column if not exists created_at timestamptz default now();
alter table public.leads add column if not exists updated_at timestamptz default now();

update public.leads set status = 'nuevo' where status is null or status = '';
alter table public.leads alter column status set default 'nuevo';
alter table public.leads alter column status set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'leads_status_check'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
      add constraint leads_status_check
      check (status in ('nuevo', 'atendido', 'archivado'));
  end if;
end;
$$;

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);

drop trigger if exists set_leads_updated_at on public.leads;
create trigger set_leads_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

alter table public.leads enable row level security;

drop policy if exists "Anyone can submit a lead" on public.leads;
drop policy if exists "Admins can read leads" on public.leads;
drop policy if exists "Admins can update leads" on public.leads;
drop policy if exists "Admins can delete leads" on public.leads;

-- El formulario de contacto es público: cualquiera puede crear un lead.
create policy "Anyone can submit a lead"
on public.leads
for insert
to anon, authenticated
with check (true);

-- La lectura y gestión queda restringida a administradores verificados.
create policy "Admins can read leads"
on public.leads
for select
to authenticated
using (public.is_admin());

create policy "Admins can update leads"
on public.leads
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete leads"
on public.leads
for delete
to authenticated
using (public.is_admin());
