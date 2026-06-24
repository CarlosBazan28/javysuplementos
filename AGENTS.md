# AGENTS.md

Contexto para **Codex**. Lee esto antes de trabajar.

## Tu rama

- Trabaja siempre en la rama **`codex`**.
- Guarda tus cambios con el comando **`guardar`** (commit + push a `codex`; nunca toca `main`).
  Equivale a `bash scripts/guardar.sh "<mensaje>"`.
- Revisa el estado de las ramas con **`estado-ramas`** (`bash scripts/estado-ramas.sh`).
- **Nunca** hagas push directo a `main`. A producción se llega por Pull Request `codex → main`
  aprobado por el dueño.

## Contexto del proyecto

La fuente de verdad del proyecto (stack, estructura, módulos, flujo de datos, esquema de BD,
convenciones, comandos y deuda técnica) está en **[`README.md`](README.md)**. Léelo antes de
hacer cambios.

Atajos rápidos:
- Ver el sitio en vivo: **`ver-sitio`**
- Agregar un producto (sincroniza Supabase + `product-data.js`): **`agregar-producto`**
- Aligerar imágenes (PNG → WebP): **`aligerar-imagenes`**
- Revisar diseño + lógica de tus cambios: **`revisar-cambios`**

## Recordatorios clave (detalle en `README.md`)

- Sanitiza con `escapeHTML()` todo texto de usuario/BD antes de insertarlo en el DOM.
- El número de WhatsApp vive solo en `js/whatsapp-config.js`.
- Imágenes nuevas en WebP cuando se pueda.
- Mobile primero.
