#!/usr/bin/env node
/* ============================================================================
   Valida el contenido de las fichas contra docs/contenido/estandar-fichas.md.

   Por qué existe: el estándar escrito no se cumple solo. Hasta el 2026-08-20 el
   catálogo tenía 28 productos mostrando públicamente un precio distinto al que
   se cobraba (el precio estaba incrustado en la descripción y quedó viejo) y 35
   con una advertencia de estimulantes copiada a productos que no los llevan.
   Ninguno de los dos errores se ve leyendo una ficha suelta; los dos se detectan
   en un segundo con una regla.

   Uso:
     node scripts/validar-contenido.mjs                # solo productos activos
     node scripts/validar-contenido.mjs --todos        # incluye inactivos
     node scripts/validar-contenido.mjs --marca Nutrex # filtra por marca
     node scripts/validar-contenido.mjs --pendientes   # lista los que faltan llenar

   Salida: código 1 si hay ERRORES (bloquean publicación). Los AVISOS no
   bloquean: marcan lo que conviene mirar.
   ============================================================================ */
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const INCLUIR_INACTIVOS = args.includes("--todos");
const SOLO_PENDIENTES = args.includes("--pendientes");
const MARCA = args[args.indexOf("--marca") + 1] || null;
const FILTRAR_MARCA = args.includes("--marca") ? MARCA : null;

/* --------------------------- reglas del estándar -------------------------- */

const DESC_MIN = 250;
const DESC_MAX = 400;
const BENEFICIOS_EXACTOS = 4;
const USOS_EXACTOS = 3;

// Frases que anulan la ficha. Cada una viene de un caso real, no de una lista
// teórica: ver el ejemplo rechazado en el estándar.
const PROHIBIDO = [
  { re: /precio de cat[áa]logo/i, msg: "lleva el precio en el texto (se desactualiza)" },
  { re: /\$\s?\d/, msg: "lleva un precio en el texto (se desactualiza)" },
  // Tautología: exige el patrón COMPLETO. "Es un producto de un solo ingrediente
  // activo" es legítimo, así que no basta con buscar "es un producto de".
  { re: /es un producto de .{1,40} dentro de la categor[íi]a/i, msg: "tautología: repite nombre y categoría sin informar" },
  { re: /sabores disponibles:/i, msg: "duplica los sabores (ya salen de product_flavors)" },
  { re: /\b(cura|curan|previene|previenen|elimina la grasa|quema grasa)\b/i, msg: "declaración de salud (riesgo legal)" },
  { re: /\b(el mejor|la mejor|incre[íi]ble|revolucionari[oa]|milagros[oa])\b/i, msg: "publicidad sin sustento" },
];

const USO_VACIO = /consultar la (dosis|informaci[óo]n) indicada en la etiqueta/i;

// La advertencia de estimulantes solo es válida si el producto los lleva.
const MENCIONA_ESTIMULANTES = /estimulante/i;
const INDICIOS_ESTIMULANTE = /(cafe[íi]na|caffeine|pre-?entreno|pre-?workout|energy|term[og][ée]nico|quemador|lipo-?6|hyde|mesomorph|c4\b)/i;

const TIENE_NUMERO_ETIQUETA = /\d+\s*(g|gr|gramos|mg|kg|lb|ml|oz|servida|servidas|c[áa]psulas?|tabletas?|%)/i;

/* ------------------------------ utilidades -------------------------------- */

const texto = (v) => (Array.isArray(v) ? v.join(" ") : String(v || "")).trim();
const lista = (v) => (Array.isArray(v) ? v.filter((x) => String(x).trim()) : []);

async function credenciales() {
  const txt = await readFile(join(ROOT, "js/supabase-config.js"), "utf8");
  const url = txt.match(/SUPABASE_URL\s*=\s*"([^"]+)"/)?.[1];
  const key = txt.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*"([^"]+)"/)?.[1];
  if (!url || !key) throw new Error("No pude leer SUPABASE_URL / KEY de js/supabase-config.js");
  return { url, key };
}

async function traerProductos() {
  const { url, key } = await credenciales();
  const campos = "id,nombre,name,brand,presentation,is_active,descripcion,description,description_long,beneficios,uso";
  const filtro = INCLUIR_INACTIVOS ? "" : "&is_active=eq.true";
  const res = await fetch(`${url}/rest/v1/products?select=${campos}${filtro}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Supabase respondió ${res.status}`);
  return res.json();
}

/* ------------------------------ validación -------------------------------- */

function validar(p) {
  const errores = [];
  const avisos = [];

  const descripcion = texto(p.description_long || p.description || p.descripcion);
  const beneficios = lista(p.beneficios);
  const usos = lista(p.uso);
  const todo = [descripcion, beneficios.join(" "), usos.join(" ")].join(" ");

  const vacio = !descripcion && !beneficios.length && !usos.length;

  // Identidad: prerrequisito para poder escribir algo veraz.
  if (!String(p.brand || "").trim()) errores.push("sin marca");
  if (!String(p.presentation || "").trim()) avisos.push("sin presentación");

  if (vacio) return { pendiente: true, errores, avisos };

  // Frases prohibidas: aplican aunque la ficha esté a medias.
  for (const { re, msg } of PROHIBIDO) {
    if (re.test(todo)) errores.push(msg);
  }

  // Advertencia de estimulantes solo si el producto los lleva. El indicio se
  // busca en el nombre y en el propio texto, no en la categoría.
  if (MENCIONA_ESTIMULANTES.test(todo)) {
    const contexto = `${p.nombre || p.name || ""} ${descripcion}`;
    if (!INDICIOS_ESTIMULANTE.test(contexto)) {
      errores.push("advierte sobre estimulantes sin evidencia de que los lleve");
    }
  }

  if (!descripcion) {
    errores.push("sin descripción");
  } else {
    if (descripcion.length < DESC_MIN) avisos.push(`descripción corta (${descripcion.length} < ${DESC_MIN})`);
    if (descripcion.length > DESC_MAX) avisos.push(`descripción larga (${descripcion.length} > ${DESC_MAX})`);
    if (!TIENE_NUMERO_ETIQUETA.test(descripcion)) {
      errores.push("la descripción no cita ningún dato de etiqueta (g, mg, servidas…)");
    }
  }

  if (beneficios.length !== BENEFICIOS_EXACTOS) {
    errores.push(`${beneficios.length} beneficios (deben ser ${BENEFICIOS_EXACTOS})`);
  }

  if (usos.length !== USOS_EXACTOS) {
    errores.push(`${usos.length} líneas de uso (deben ser ${USOS_EXACTOS})`);
  }
  if (usos.some((u) => USO_VACIO.test(u))) {
    errores.push('modo de uso sin dosis ("consultar la etiqueta")');
  }

  return { pendiente: false, errores, avisos };
}


/* -------------------------------- salida ---------------------------------- */

const productos = await traerProductos();
const alcance = productos.filter((p) => !FILTRAR_MARCA
  || String(p.brand || "").toLowerCase() === FILTRAR_MARCA.toLowerCase());

const conError = [];
const conAviso = [];
const pendientes = [];
let correctos = 0;

for (const p of alcance) {
  const { pendiente, errores, avisos } = validar(p);
  const etiqueta = `${p.brand || "sin marca"} · ${p.nombre || p.name || p.id}`;
  if (pendiente) pendientes.push({ etiqueta, errores, avisos });
  else if (errores.length) conError.push({ etiqueta, errores, avisos });
  else if (avisos.length) { conAviso.push({ etiqueta, avisos }); correctos++; }
  else correctos++;
}

if (SOLO_PENDIENTES) {
  console.log(`\nPendientes de llenar: ${pendientes.length}\n`);
  for (const p of pendientes) console.log(`  ${p.etiqueta}`);
  console.log("");
} else {
  if (conError.length) {
    console.log(`\n✖ ERRORES — ${conError.length} producto(s) no publicables\n`);
    for (const p of conError) {
      console.log(`  ${p.etiqueta}`);
      for (const e of p.errores) console.log(`      ✖ ${e}`);
      for (const a of p.avisos) console.log(`      • ${a}`);
    }
  }

  if (conAviso.length) {
    console.log(`\n⚠ AVISOS — ${conAviso.length} producto(s) publicables, revisar\n`);
    for (const p of conAviso) console.log(`  ${p.etiqueta}\n      • ${p.avisos.join("\n      • ")}`);
  }

  const alcanceTxt = FILTRAR_MARCA ? ` (marca: ${FILTRAR_MARCA})` : "";
  console.log(`\n${"─".repeat(60)}`);
  console.log(`Revisados${alcanceTxt}: ${alcance.length}`);
  console.log(`  ✓ Cumplen el estándar : ${correctos}`);
  console.log(`  ✖ Con errores         : ${conError.length}`);
  console.log(`  ○ Sin contenido aún   : ${pendientes.length}`);
  console.log(`${"─".repeat(60)}\n`);
}

// exitCode en vez de process.exit(): deja que Node cierre solo el socket del
// fetch. Con process.exit() aborta con una aserción de libuv en Windows.
process.exitCode = conError.length ? 1 : 0;
