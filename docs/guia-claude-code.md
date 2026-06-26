# Guía de Claude Code — Javy Suplementos

Guía práctica para trabajar **en local** con Claude Code en este proyecto.
Todo lo que está dentro de `.claude/` se sube al repo, así que estos atajos y
configuraciones los tienen todos los que clonen el proyecto.

---

## 1. Arranque diario (rutina)

```bash
# 1. Entra a la carpeta del proyecto y abre VS Code
cd javysuplementos
code .

# 2. En la terminal integrada, inicia Claude Code
claude

# 3. Trae lo último antes de trabajar (tu rama: claude para Claude, codex para Codex)
git pull origin claude
```

> Para ver de un vistazo si tu rama está al día o tienes cambios por subir/bajar, usa
> `/estado-ramas`.

Para ver los cambios en vivo, dentro de Claude escribe `/ver-sitio` y abre la URL
que te dé (normalmente http://localhost:8080).

---

## 2. Comandos slash (atajos a medida)

Escribe `/` en Claude y aparecen. Los de este proyecto:

| Comando | Qué hace |
|---|---|
| `/ver-sitio` | Levanta un servidor local para ver el sitio en vivo. |
| `/guardar` | Commit + push a tu rama de desarrollo (nunca toca `main`). |
| `/estado-ramas` | Muestra el estado de cada rama: al día / por subir / por bajar / detrás de `main`. |
| `/agregar-producto` | Agrega un producto manteniendo Supabase y `product-data.js` sincronizados. |
| `/aligerar-imagenes` | Convierte PNG pesados a WebP y actualiza las referencias. |
| `/revisar-cambios` | Lanza en paralelo la revisión de diseño + lógica de tus cambios. |

Puedes pasarle datos, por ejemplo:
`/agregar-producto Proteína Whey Gold marca ON, $54, 5lb, sabores chocolate y vainilla`

Para crear uno nuevo: crea un archivo `.md` en `.claude/commands/`. El nombre del
archivo es el nombre del comando.

---

## 3. Subagentes (trabajar en varias cosas a la vez)

Los subagentes son "ayudantes" especializados que corren **en paralelo**. Este
proyecto trae dos:

- **disenador** — audita diseño, CSS y responsive (mobile/tablet/desktop).
- **logica** — audita JS, funcionalidad y seguridad (`escapeHTML`, WhatsApp, etc.).

Formas de usarlos:

1. **Automático:** pide algo amplio y Claude decide.
   > "Revisa el diseño y la lógica de los últimos cambios al mismo tiempo."
2. **Explícito:** nómbralo.
   > "Usa el subagente *disenador* para revisar `css/pages/product.css`."
3. **Con el comando `/revisar-cambios`** — lanza los dos a la vez y consolida los hallazgos.

> 💡 La clave para paralelizar: pedir varias cosas independientes en **un mismo
> mensaje**. Claude lanza varios agentes a la vez en lugar de uno por uno.

Para crear más subagentes: archivo `.md` en `.claude/agents/` (o usa `/agents`).

---

## 4. Permisos (menos interrupciones)

El archivo `.claude/settings.json` ya autoriza los comandos seguros (git, server
local, lectura de archivos, `cwebp`) para que Claude no te pregunte permiso a cada
rato. Lo que **sí** sigue protegido:

- `git push origin main` está **bloqueado** (a producción solo por PR aprobado).
- No lee archivos de secretos (`.env`, `.key`, `.pem`).

Para ajustar permisos sin editar el JSON a mano, usa el comando `/permissions`
dentro de Claude.

> ⚠️ Hay un modo "saltar todos los permisos" (`--dangerously-skip-permissions`).
> NO lo uses salvo en entornos aislados; le quita los frenos de seguridad.

---

## 5. Plan Mode (para cambios grandes)

Antes de un cambio grande, activa **Plan Mode**: presiona `Shift+Tab` para ciclar
los modos hasta ver "plan mode".

En este modo Claude **investiga y te propone un plan** sin tocar nada. Tú lo
apruebas y recién ahí ejecuta. Ideal para rediseños o cambios que tocan varios
archivos, porque evitas sorpresas.

---

## 6. Trabajar en varias features a la vez — Git Worktrees

Un *worktree* es una segunda carpeta con OTRA rama del mismo repo. Te deja tener,
por ejemplo, "rediseño del footer" y "arreglo del carrito" abiertos a la vez, cada
uno con su propia sesión de Claude, **sin que se pisen**.

```bash
# Desde la carpeta del proyecto, crea un worktree para una feature nueva
git worktree add ../javy-footer -b feature/footer

# Ábrelo en otra ventana de VS Code y corre Claude ahí
cd ../javy-footer
claude
```

- Cada worktree es una carpeta independiente con sus propios archivos.
- Puedes correr varias sesiones de Claude (una por carpeta) al mismo tiempo.
- Cuando termines una feature, súbela y borra el worktree:

```bash
git worktree remove ../javy-footer
```

> Alternativa más simple: abrir **dos o tres terminales** con `claude` en cada una
> dentro de la misma carpeta. Sirve para tareas que no chocan entre sí.

---

## 7. Servidor en segundo plano

Claude puede dejar el servidor de preview corriendo **mientras sigue editando**.
Así ves los cambios al instante sin frenar el trabajo. El comando `/ver-sitio` ya lo
levanta en background.

---

## 8. Buenas prácticas del proyecto (recordatorios)

- Cada herramienta trabaja en su rama: **`claude`** (Claude Code) y **`codex`** (Codex).
  A `main` solo por PR aprobado. Guarda con `/guardar`; revisa estado con `/estado-ramas`.
- Imágenes nuevas en **WebP** cuando se pueda.
- Texto de usuario/BD al DOM: siempre con **`escapeHTML()`**.
- El número de WhatsApp solo vive en `js/whatsapp-config.js`.
- Productos: mantener sincronizados Supabase **y** `js/product-data.js`.

---

## 9. Chuleta rápida

| Quiero... | Hago... |
|---|---|
| Ver el sitio en vivo | `/ver-sitio` |
| Guardar cambios (commit + push a tu rama) | `/guardar` |
| Ver el estado de las ramas | `/estado-ramas` |
| Agregar un producto | `/agregar-producto ...` |
| Aligerar imágenes | `/aligerar-imagenes` |
| Revisar diseño + lógica | `/revisar-cambios` |
| Planear un cambio grande | `Shift+Tab` → Plan Mode |
| Ajustar permisos | `/permissions` |
| Ver/crear subagentes | `/agents` |
| Dos features a la vez | `git worktree add ...` |
