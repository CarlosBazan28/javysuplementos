-- ============================================================
-- Fase 3 — Taxonomía de categorías en 2 niveles (Familia → Tipo)
-- ============================================================
-- Migración IDEMPOTENTE y NO destructiva (no borra productos ni sabores).
-- Aplicar en Supabase → SQL Editor DESPUÉS de revisarla.
-- Modelo: una categoría es Familia (parent_id NULL) o Tipo (hijo de una familia).
-- products.category_id puede apuntar a una Familia o a un Tipo.
-- Se conserva products.category (texto) como respaldo / fallback.
-- ============================================================

begin;

-- 1) Jerarquía: parent_id en categories
alter table public.categories
  add column if not exists parent_id uuid references public.categories(id) on delete set null;

-- El nombre NO puede ser único global en una jerarquía (un tipo puede repetir
-- nombre entre familias). La unicidad real la da el slug.
alter table public.categories drop constraint if exists categories_name_key;

-- 2) FK de producto → categoría (familia o tipo)
alter table public.products
  add column if not exists category_id uuid references public.categories(id) on delete set null;

create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists categories_parent_id_idx on public.categories(parent_id);

-- 3) Familias (parent_id NULL). Slugs con prefijo fam- para no chocar con los defaults viejos.
insert into public.categories (name, slug, sort_order, is_active, parent_id) values
  ('Proteínas',                'fam-proteinas',     1, true, null),
  ('Ganadores',                'fam-ganadores',     2, true, null),
  ('Creatina',                 'fam-creatina',      3, true, null),
  ('Pre-entrenos',             'fam-pre-entrenos',  4, true, null),
  ('Aminoácidos',              'fam-aminoacidos',   5, true, null),
  ('Quemadores',               'fam-quemadores',    6, true, null),
  ('Energía y rendimiento',    'fam-energia',       7, true, null),
  ('Potenciadores hormonales', 'fam-potenciadores', 8, true, null),
  ('Salud y bienestar',        'fam-salud',         9, true, null)
on conflict (slug) do update
  set name = excluded.name, sort_order = excluded.sort_order, is_active = true, parent_id = null, updated_at = now();

-- 4) Tipos (hijos). parent_id resuelto por el slug de la familia.
insert into public.categories (name, slug, sort_order, is_active, parent_id)
select t.name, t.slug, t.sort_order, true, f.id
from (values
  ('Whey',                     'tipo-whey',                    1, 'fam-proteinas'),
  ('ISO (aislada)',            'tipo-iso',                     2, 'fam-proteinas'),
  ('Beef',                     'tipo-beef',                    3, 'fam-proteinas'),
  ('Caseína',                  'tipo-caseina',                 4, 'fam-proteinas'),
  ('Vegana',                   'tipo-vegana',                  5, 'fam-proteinas'),
  ('Mass gainer',              'tipo-mass-gainer',             1, 'fam-ganadores'),
  ('Lean gainer',              'tipo-lean-gainer',             2, 'fam-ganadores'),
  ('Sin sabor',                'tipo-creatina-sin-sabor',      1, 'fam-creatina'),
  ('Saborizada',               'tipo-creatina-saborizada',     2, 'fam-creatina'),
  ('Con transportadores',      'tipo-creatina-transportadores',3, 'fam-creatina'),
  ('Con estimulante',          'tipo-pre-con-estimulante',     1, 'fam-pre-entrenos'),
  ('Suave',                    'tipo-pre-suave',               2, 'fam-pre-entrenos'),
  ('Sin estimulante',          'tipo-pre-sin-estimulante',     3, 'fam-pre-entrenos'),
  ('BCAA',                     'tipo-bcaa',                    1, 'fam-aminoacidos'),
  ('EAA',                      'tipo-eaa',                     2, 'fam-aminoacidos'),
  ('BCAA+EAA',                 'tipo-bcaa-eaa',                3, 'fam-aminoacidos'),
  ('Amino+energía',            'tipo-amino-energia',           4, 'fam-aminoacidos'),
  ('Glutamina',                'tipo-glutamina',               5, 'fam-aminoacidos'),
  ('Termogénico',              'tipo-termogenico',             1, 'fam-quemadores'),
  ('Stim-free',                'tipo-stim-free',               2, 'fam-quemadores'),
  ('L-Carnitina',              'tipo-l-carnitina',             3, 'fam-quemadores'),
  ('Diuréticos',               'tipo-diureticos',              4, 'fam-quemadores'),
  ('Bebidas',                  'tipo-bebidas',                 1, 'fam-energia'),
  ('Cafeína',                  'tipo-cafeina',                 2, 'fam-energia'),
  ('Carbohidratos',            'tipo-carbohidratos',           3, 'fam-energia'),
  ('Boosters de testosterona', 'tipo-boosters-testo',          1, 'fam-potenciadores'),
  ('Multivitamínicos',         'tipo-multivitaminicos',        1, 'fam-salud'),
  ('Vitaminas',                'tipo-vitaminas',               2, 'fam-salud'),
  ('Minerales',                'tipo-minerales',               3, 'fam-salud'),
  ('Omega',                    'tipo-omega',                   4, 'fam-salud'),
  ('Sueño/estrés',             'tipo-sueno-estres',            5, 'fam-salud'),
  ('Hepático',                 'tipo-hepatico',                6, 'fam-salud'),
  ('Antioxidantes',            'tipo-antioxidantes',           7, 'fam-salud'),
  ('Inmune',                   'tipo-inmune',                  8, 'fam-salud'),
  ('Belleza',                  'tipo-belleza',                 9, 'fam-salud'),
  ('Greens',                   'tipo-greens',                 10, 'fam-salud')
) as t(name, slug, sort_order, family_slug)
join public.categories f on f.slug = t.family_slug
on conflict (slug) do update
  set name = excluded.name, sort_order = excluded.sort_order, parent_id = excluded.parent_id, is_active = true, updated_at = now();

-- 5) Backfill: mapear el texto de categoría existente a la nueva taxonomía.
--    Los genéricos (Creatinas, Quemadores, Pre Entrenos, Aminoácidos, Salud y
--    Bienestar) caen en su Familia; el resto en su Tipo. Lo no mapeado queda NULL.
update public.products p
set category_id = c.id
from public.categories c
where c.slug = case p.category
    when 'Proteínas Whey'    then 'tipo-whey'
    when 'Proteínas ISO'     then 'tipo-iso'
    when 'Caseínas'          then 'tipo-caseina'
    when 'Ganadores de Peso' then 'tipo-mass-gainer'
    when 'Creatinas'         then 'fam-creatina'
    when 'Pre Entrenos'      then 'fam-pre-entrenos'
    when 'Aminoácidos'       then 'fam-aminoacidos'
    when 'Glutamina'         then 'tipo-glutamina'
    when 'Quemadores'        then 'fam-quemadores'
    when 'Energía y Cafeína' then 'tipo-cafeina'
    when 'Carbohidratos'     then 'tipo-carbohidratos'
    when 'Bebidas y Snacks'  then 'tipo-bebidas'
    when 'Potenciadores'     then 'fam-potenciadores'
    when 'Multivitamínicos'  then 'tipo-multivitaminicos'
    when 'Salud y Bienestar' then 'fam-salud'
    else null
  end
  and p.category_id is null;

-- 6) (Opcional) Desactivar los 8 defaults planos viejos, ya superados por la
--    nueva taxonomía. No borra nada; el admin puede reactivarlos. Comenta este
--    bloque si prefieres conservarlos visibles.
update public.categories
set is_active = false, updated_at = now()
where parent_id is null
  and slug in ('proteinas','creatinas','pre-entrenos','quemadores','vitaminas','aminoacidos','accesorios','otros');

commit;

-- ============================================================
-- VERIFICACIÓN (correr por separado, NO es parte de la migración).
-- Selecciona y ejecuta UNA query a la vez.
-- ============================================================

-- A) Productos por Familia / Tipo:
-- select f.name as familia, c.name as tipo, count(p.id) as productos
-- from public.categories c
-- left join public.categories f on f.id = c.parent_id
-- left join public.products p on p.category_id = c.id
-- where c.slug like 'fam-%' or c.slug like 'tipo-%'
-- group by 1, 2
-- order by 1, 2;

-- B) Productos que quedaron SIN categoría mapeada:
-- select category, count(*) as sin_mapear
-- from public.products
-- where category_id is null
-- group by category
-- order by 2 desc;
