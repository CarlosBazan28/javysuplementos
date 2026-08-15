# Auditoría de estructura y organización — Javy Suplementos

**Fecha:** 26 de julio de 2026  
**Alcance:** carpetas, archivos, documentación, scripts, recursos, agentes y mantenibilidad.  
**Estado revisado:** rama `codex`, commit `8a25c5d`.

> Esta auditoría es de solo lectura. No se borró, movió ni modificó ningún archivo del proyecto.
> El único archivo creado fue este informe.

## 1. Resumen ejecutivo

El proyecto tiene una estructura funcional y razonable para un sitio estático sin framework. No
conviene introducir una carpeta `src/`, un bundler o una reorganización masiva solo por estética:
las páginas HTML en la raíz simplifican GitHub Pages y el sistema actual funciona sin compilación.

La deuda principal no está en la estructura base, sino en cuatro áreas:

1. **Documentación desactualizada o duplicada:** un PDF conserva comandos antiguos y el `README`
   contiene dos deudas repetidas o ya resueltas parcialmente.
2. **Paridad incompleta entre Claude y Codex:** Claude tiene seis comandos; Codex solo tiene cuatro
   habilidades migradas aunque `AGENTS.md` anuncia seis.
3. **Recursos pesados o posiblemente huérfanos:** 21 imágenes, con un total aproximado de 7.39 MB,
   no aparecen referenciadas en los archivos versionados.
4. **Archivos grandes y responsabilidades mezcladas:** `js/supplements.js`, `js/db.js` y varios CSS
   concentran demasiado código; `Editables` mezcla un fragmento usado en producción con un archivo
   fuente de diseño.

**Veredicto:** organización general buena, con deuda de mantenimiento moderada. No se detectó una
carpeta completa versionada que deba eliminarse inmediatamente.

## 2. Estado verificado

| Comprobación | Resultado |
|---|---|
| Rama activa | `codex` |
| Estado frente a `origin/codex` | Al día |
| Estado frente a `main` | 3 commits detrás, pero son merges y el contenido es idéntico |
| Archivos fuera de Git | Ninguno detectado |
| Archivos del proyecto | 192 |
| Tamaño total aproximado | 30.78 MB |
| Duplicados binarios exactos | Ninguno |
| Sintaxis JS público | Correcta |
| Sintaxis de módulos `js/admin/**` | Correcta |
| Token de versión del admin | Correcto: `adm-38070a5c` |
| `git diff --check` | Sin errores |

Distribución principal:

| Área | Archivos | Tamaño aproximado | Evaluación |
|---|---:|---:|---|
| `img/` | 81 | 18.11 MB | Requiere depuración y optimización |
| `Editables/` | 2 | 11.06 MB | Mezcla runtime y fuente de diseño |
| `js/` | 41 | 0.77 MB | Funcional, algunos módulos demasiado grandes |
| `docs/` | 6 | 0.49 MB | Útil, pero sin índice ni estado de vigencia |
| `css/` | 18 | 0.19 MB | Buena separación inicial; quedan archivos vacíos y monolitos |
| `supabase/` | 6 versionados | 0.04 MB | Orden básico correcto; falta guía de migraciones |

## 3. Auditoría por carpeta

### Raíz del proyecto — conservar

Las páginas HTML, `CNAME`, `robots.txt`, `sitemap.xml`, `site.webmanifest` y `vercel.json` deben
permanecer en la raíz. Es coherente con el despliegue estático actual. Moverlas a `src/` o `public/`
obligaría a introducir un proceso de build que hoy no aporta suficiente valor.

Mejoras:

- Mantener en la raíz solo páginas públicas, archivos de despliegue y documentación principal.
- Añadir `.editorconfig` para fijar UTF-8, saltos de línea, indentación y fin de archivo.
- Considerar un `package.json` privado únicamente para agrupar comandos de verificación; no para
  introducir un framework.

### `css/` — mejorar gradualmente

La separación entre `components/`, `pages/`, tokens y estilos globales es correcta. Hallazgos:

- `css/pages/home.css` y `css/pages/products.css` están vacíos y no están referenciados.
- `css/dropdown.css` es un componente reutilizable, pero está fuera de `css/components/`.
- `css/pages/supplements.css` tiene 1,357 líneas.
- `css/admin-dashboard.css` tiene 951 líneas.
- `css/components/cart.css` tiene 663 líneas.
- `css/styles.css` todavía mezcla estilos globales con estilos del home.

Recomendación: eliminar los dos archivos vacíos cuando se autorice; mover el dropdown a
`css/components/dropdown.css`; trasladar los estilos exclusivos del inicio a `pages/home.css`; y
dividir los CSS grandes por bloque funcional solo cuando exista una revisión visual por página.

### `js/` — conservar, pero modularizar por responsabilidad

La carpeta `js/admin/` está mejor organizada que el JavaScript público: separa arranque, estado,
vistas, secciones y drawers. `js/vendor/` también está correctamente aislada.

Los principales candidatos a división son:

| Archivo | Líneas | Mejora propuesta |
|---|---:|---|
| `js/supplements.js` | 1,546 | Separar filtros, render de cards, búsqueda y panel responsive |
| `js/db.js` | 1,406 | Separar productos, sabores, categorías, combos, ajustes e historial |
| `js/cart.js` | 873 | Separar almacenamiento, UI, validación y construcción del mensaje |
| `js/dropdown.js` | 441 | Mover a una zona de componentes o UI compartida |

También existen cinco implementaciones públicas de `escapeHTML()` y más de una de `slugify()`.
La centralización propuesta en el `README` sigue siendo válida, pero debe hacerse acompañada de
pruebas porque estos helpers protegen renderizados con `innerHTML`.

No debe eliminarse `js/product-data.js`: es un fallback generado desde Supabase y mantiene el
catálogo disponible si falla la conexión.

### `img/` — prioridad de limpieza

El inventario detectó 21 recursos sin referencia textual en HTML, CSS, JS, JSON, Markdown o SQL:

- **13 imágenes de productos**, aproximadamente 7.38 MB.
- **8 iconos/placeholders antiguos**, de poco peso.

Los productos candidatos son:

`iso100-2lb.png`, `iso100-5lb.png`, `isofit-5lb-nutrex.png`,
`biosport-xtreme-gainer-3kg-clean.png`, `lcarnite-60caps.png`,
`creatine-nutrex-60srv.png`, `Carnivor-Beef-Protein.png`,
`creatine-fruit-punch-60srv.png`, `lipo-6-black-60caps.png`,
`isofit-2lb-nutrex.png`, `whey-nutrex-5lb.png`, `whey-nutrex-2lb.png` e
`iso100-5lb-convertido-a-grande.jpeg`.

Los recursos pequeños candidatos son:

`bolsa-compra.png`, `buscar.png`, `fuego.png`, `logo-16x16.png`, `menu.png`, `whatsapp.png`,
`before-placeholder.svg` y `after-placeholder.svg`.

**No deben borrarse todavía.** Supabase puede contener rutas locales que no sean visibles en el
checkout. Antes de retirar cualquier imagen se debe comparar esta lista con:

1. los campos de imagen de productos y combos en Supabase;
2. `js/product-data.js` recién exportado;
3. las solicitudes reales de recursos en producción.

Además, `img/products/nutrex-bcaa.webp` pesa 2.08 MB y mide 2048×2048; está en WebP, pero aún es
demasiado pesado para una card. `img/images/javi.webp` pesa 1.16 MB. Ambos deben optimizarse sin
cambiar su apariencia. Los PNG de iconos PWA sí pueden necesitar conservar ese formato.

### `Editables/` — separar runtime de fuentes de diseño

Esta carpeta contiene dos elementos con funciones totalmente distintas:

- `Editables/nav.html` es un archivo de producción cargado por `js/include-nav.js`.
- `Editables/javito.xcf` es una fuente de diseño de 11.06 MB, sin uso en runtime.

No se puede quitar `Editables/` mientras el nav se cargue desde allí. La mejora correcta es:

1. mover `nav.html` a `partials/nav.html` o `includes/nav.html` y actualizar su carga;
2. respaldar `javito.xcf` en almacenamiento de diseño, Git LFS o un repositorio separado;
3. retirar `Editables/` solo cuando ambos pasos estén completos.

### `docs/` — definir qué está vigente y qué es histórico

- `design-system.md` y `seguridad-cloudflare.md` son documentación vigente.
- `guia-claude-code.md` es la fuente editable de la guía operativa.
- `guia-claude-code.pdf` fue generado antes y todavía muestra `/preview`, `/sync`,
  `/nuevo-producto`, `/optimizar-img` y `/revisar`; ya no coincide con los comandos actuales.
- `admin-mejoras.html` y `Plan-mejoras-admin-Javy.pdf` forman un plan/auditoría anterior. Deben
  marcarse como histórico o indicar qué puntos siguen pendientes.

Recomendación:

- crear `docs/README.md` con columnas **documento**, **estado**, **fuente**, **fecha** y **responsable**;
- regenerar `guia-claude-code.pdf` desde el `.md` vigente o dejar solo el `.md`;
- mover los planes cerrados a `docs/archive/2026-06-plan-admin/`;
- no mantener simultáneamente HTML/PDF si nadie consume ambos formatos.

### `supabase/` — conservar migraciones; retirar residuo local

`schema.sql` y `migrations/` deben conservarse. Las migraciones comienzan en `fase3`, por lo que
conviene añadir `supabase/README.md` que explique:

- si `schema.sql` representa una instalación completa;
- el orden y estado aplicado de cada migración;
- qué cambios históricos ya están incorporados en el schema base;
- cómo exportar y validar `product-data.js`.

`supabase/functions/ai-fill/` está vacía y no está versionada. El archivo que contenía fue eliminado
intencionalmente en el commit `88b6459`. Esa carpeta local puede retirarse sin afectar Git, pero no
se borró durante esta auditoría.

### `scripts/` — útiles, con dos mejoras de robustez

- `estado-ramas.sh` depende de `awk`; en un shell mínimo puede mostrar errores y aun terminar con
  código 0. Puede analizar los conteos con `read` de Bash y evitar esa dependencia.
- `guardar.sh` permite continuar si no encuentra Node, aunque entonces no valida el token del panel.
  Si hubo cambios en `admin.html` o `js/admin/**`, debería detenerse en lugar de aceptar ese riesgo.

Sería útil añadir un único `scripts/verificar.*` que ejecute sintaxis JS, token del admin,
`git diff --check` y futuras validaciones.

## 4. Agentes y comandos

### Agentes que deben conservarse

| Agente | Claude | Codex | Estado |
|---|---|---|---|
| `disenador` | `.claude/agents/disenador.md` | `.codex/agents/disenador.toml` | Vigente |
| `logica` | `.claude/agents/logica.md` | `.codex/agents/logica.toml` | Vigente |

Ambos están referenciados por `revisar-cambios`. No se detectó ningún agente obsoleto. Las dos
copias no son intercambiables porque Claude y Codex usan formatos distintos, pero sus instrucciones
sí pueden desviarse con el tiempo. Conviene mantener un texto canónico y generar o verificar ambas
envolturas.

### Comandos/habilidades

Claude tiene:

`agregar-producto`, `aligerar-imagenes`, `estado-ramas`, `guardar`, `revisar-cambios` y `ver-sitio`.

Codex tiene:

`estado-ramas`, `guardar`, `revisar-cambios` y `ver-sitio`.

Por tanto, faltan en `.agents/skills/` las habilidades equivalentes a:

- `agregar-producto`;
- `aligerar-imagenes`.

No debe borrarse `.agents/`, `.claude/` ni `.codex/` mientras el modelo de dos ramas siga vigente.
Si en el futuro se abandona Claude o Codex, primero debe cambiarse el modelo de ramas, el `README`,
los scripts y las guías; eliminar solo una carpeta dejaría instrucciones contradictorias.

### Configuración local que no debería versionarse

`.claude/settings.local.json` está rastreado por Git y contiene permisos acumulados de tareas y
rutas locales. Debe mantenerse local, agregarse a `.gitignore` y retirarse del índice de Git en una
tarea posterior. No es necesario borrar la copia de cada desarrollador.

## 5. Archivos candidatos a retirar o archivar

| Candidato | Acción recomendada | Condición previa | Riesgo |
|---|---|---|---|
| `css/pages/home.css` | Retirar o usar para estilos del home | Confirmar nuevamente que sigue vacío | Bajo |
| `css/pages/products.css` | Retirar | Confirmar nuevamente que sigue vacío y sin referencias | Bajo |
| `supabase/functions/ai-fill/` | Retirar localmente | Ninguna; está vacío y no versionado | Bajo |
| `docs/guia-claude-code.pdf` | Regenerar o retirar | Confirmar si alguien necesita PDF | Bajo |
| `docs/admin-mejoras.html` + PDF | Archivar con fecha/estado | Confirmar qué hallazgos siguen abiertos | Medio |
| 21 imágenes sin referencias | Retirar después de validación | Comparar con Supabase y producción | Alto si se omite la validación |
| `Editables/javito.xcf` | Externalizar o usar Git LFS | Tener respaldo y propietario claro | Medio |
| `.claude/settings.local.json` | Dejar de versionar | Añadir regla de ignore y conservar copia local | Bajo |

## 6. Archivos y carpetas que no deben eliminarse

- Los HTML de la raíz y archivos de GitHub Pages/Vercel.
- `Editables/nav.html` hasta que se migre su ruta.
- `js/product-data.js`, porque es el fallback del catálogo.
- `js/vendor/`, porque el panel usa jsPDF y AutoTable para exportación.
- `supabase/schema.sql` y `supabase/migrations/`.
- Los agentes `disenador` y `logica`.
- Las carpetas `.agents`, `.claude` y `.codex` mientras ambas herramientas sigan en uso.

## 7. Inconsistencias de documentación que deben corregirse

1. El `README` dice que aún debe decidirse una fuente de verdad entre Supabase y
   `product-data.js`, pero antes ya define Supabase como fuente y el JS como artefacto generado.
2. La deuda sobre columnas redundantes del schema aparece dos veces.
3. El `README` dice que el manifest usa `logo.png` con `sizes: "any"`; el manifest actual usa
   iconos de 32×32 y 1024×1024. Sigue faltando 192×192 y 512×512, pero la explicación está vieja.
4. `AGENTS.md` anuncia dos comandos que todavía no existen como habilidades de Codex.
5. El PDF de la guía de Claude contiene nombres de comandos anteriores.

## 8. Organización objetivo recomendada

Sin introducir un build, la mejora incremental podría quedar así:

```text
/
  *.html                         páginas públicas y admin; se mantienen en raíz
  /partials
    nav.html                     fragmentos cargados en runtime
  /css
    base.css
    tokens.css
    styles.css                   solo global
    /components
      dropdown.css
      ...
    /pages
      home.css
      supplements.css
      product.css
      ...
  /js
    /admin
    /components
      dropdown.js
    /data                        separación futura de db.js
    /pages                       separación futura de scripts por página
    /vendor
  /img
    /icons
    /products
    /testimonials
  /docs
    README.md                    índice de vigencia documental
    /archive
  /scripts
  /supabase
    README.md                    instalación, migraciones y exportación
    schema.sql
    /migrations
```

Las fuentes XCF/PSD y otros originales pesados deberían vivir fuera del árbol publicado o en un
sistema específico de activos, no junto a fragmentos HTML de producción.

## 9. Plan de mejora por orden

### Prioridad 1 — bajo riesgo

1. Corregir `README.md` y regenerar o retirar el PDF desactualizado.
2. Crear las dos habilidades faltantes de Codex.
3. Dejar de versionar `.claude/settings.local.json`.
4. Añadir `docs/README.md`, `supabase/README.md` y `.editorconfig`.
5. Retirar los dos CSS vacíos y la carpeta local vacía, con autorización explícita.

### Prioridad 2 — requiere comprobación

1. Contrastar las 21 imágenes candidatas con Supabase y producción.
2. Optimizar los WebP activos de más de 1 MB.
3. Archivar la auditoría/plan anterior del admin con su estado real.
4. Separar `nav.html` de `javito.xcf` y retirar la carpeta `Editables` cuando quede vacía.

### Prioridad 3 — refactor controlado

1. Centralizar helpers compartidos.
2. Dividir `supplements.js`, `db.js`, `cart.js` y los CSS grandes.
3. Añadir pruebas mínimas de cotización, normalización, escape de HTML y permisos del admin.
4. Crear un verificador único y luego incorporarlo a CI.

## 10. Conclusión

No hace falta reconstruir el proyecto ni adoptar un framework. La mejor mejora es una limpieza
incremental: alinear documentación y comandos, retirar residuos comprobados, validar activos contra
Supabase y dividir únicamente los módulos que ya superaron un tamaño manejable. Los agentes
actuales siguen siendo útiles; el trabajo pendiente es completar su integración y evitar que las
copias de Claude y Codex se desincronicen.
