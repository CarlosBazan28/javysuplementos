# Javy Suplementos

**Tienda de suplementos deportivos en San Miguelito, Panamá.** No es un e-commerce con pago
online: el cliente arma una **cotización** y la envía por **WhatsApp**. El cierre de venta es
manual, por chat.

> Este `README.md` es la **fuente de verdad** del contexto del proyecto. Los archivos `CLAUDE.md`
> (para Claude Code) y `AGENTS.md` (para Codex) son envoltorios finos que apuntan aquí y solo
> definen en qué rama trabaja cada herramienta.

---

## Stack y despliegue

- **Frontend:** HTML + CSS + JavaScript vanilla. Sin frameworks, sin build, sin bundler.
- **Backend:** Supabase (PostgreSQL + Auth + Storage de imágenes).
- **Producción:** GitHub Pages servido tras **Cloudflare** (proxy) → `https://javysuplementos.com`
  (DNS, cabeceras de seguridad, rate-limit y Turnstile en [`docs/seguridad-cloudflare.md`](docs/seguridad-cloudflare.md)).
- **Previews:** Vercel despliega automáticamente las ramas de desarrollo (puede tener password
  protection → da 401 al acceder desde afuera).
- **Sin** linter, formatter, tests ni CI/CD.

---

## Modelo de ramas

| Rama | Rol |
|---|---|
| `main` | **Producción** (GitHub Pages). Solo se llega por Pull Request aprobado. **Nunca** push directo. |
| `claude` | Rama de desarrollo persistente para el trabajo con **Claude Code**. |
| `codex` | Rama de desarrollo persistente para el trabajo con **Codex**. |

- Cada herramienta **commitea y pushea solo a su rama** (con `/guardar`).
- A producción: Pull Request `claude → main` o `codex → main`, aprobado por el dueño.
- Para que las dos ramas de desarrollo no diverjan, después de cada merge a `main` conviene
  actualizarlas con `git merge origin/main`. Usa `/estado-ramas` para ver cuánto está cada una
  "detrás de main".

---

## Comandos del proyecto (slash commands)

| Comando | Qué hace |
|---|---|
| `/guardar` | Commit + push a tu rama de desarrollo (bloquea `main`). |
| `/estado-ramas` | Muestra el estado de cada rama: al día / por subir / por bajar / detrás de `main`. |
| `/ver-sitio` | Levanta un servidor local para ver el sitio en vivo. |
| `/agregar-producto` | Agrega un producto manteniendo Supabase y `product-data.js` sincronizados. |
| `/aligerar-imagenes` | Convierte PNG pesados a WebP y actualiza las referencias. |
| `/revisar-cambios` | Lanza en paralelo la revisión de diseño + lógica de tus cambios. |

Además, `node scripts/generate-pages.mjs` regenera las páginas estáticas del catálogo
(`producto/`, `categoria/`, `js/product-urls.js` y `sitemap.xml`) desde Supabase. **Corrélo
cada vez que cambien productos o categorías** y revisá el `git diff` antes de commitear.

La lógica de `/guardar` y `/estado-ramas` vive en `scripts/guardar.sh` y `scripts/estado-ramas.sh`
(usables también desde cualquier terminal, por Claude y por Codex).

`scripts/guardar.sh` corre además `node scripts/bump-admin-version.mjs`, que recalcula el token
de versión del panel admin (`?v=adm-<hash>` en `admin.html` + `js/admin/**`) a partir del
contenido de los módulos: si el panel cambió, el token cambia y la caché baja el grafo completo
(evita el "panel en negro" por mezclar versiones); si no cambió, no genera diff. También acepta
`--check` (sale con error si el token está desactualizado).

---

## Estructura de archivos

```text
/                      páginas .html (7)
/producto/<slug>/      fichas estáticas generadas (una por producto)
/categoria/<slug>/     landings de categoría generadas
/css                   estilos
  /components          nav, auth, cards, cart, buttons, footer (reutilizables)
  /pages               home, supplements, products, contacto, login, testimonials
  tokens.css           variables CSS de marca (--brand, --neon, etc.)
  styles.css           global + hero
  base.css             reset
  admin-dashboard.css  estilos del panel admin
/js                    lógica de cliente (ver "Módulos globales")
/img                   /products, /images, /icons, /testimonials (preferir .webp)
/scripts               estado-ramas.sh, guardar.sh (flujo de git)
/supabase/schema.sql   esquema de la base de datos
/Editables/nav.html    markup del nav compartido
```

---

## Páginas

- `index.html` — home: hero, productos destacados, reels de Instagram, footer.
- `supplements-page.html` — catálogo filtrable.
- `product-page.html` — detalle de producto, carga por `?id=` (UUID o legacy_id). Sigue vivo
  para no romper enlaces ya compartidos, pero su `canonical` apunta a `/producto/<slug>/`.
- `producto/<slug>/index.html` — **generadas** por `scripts/generate-pages.mjs`. Traen title,
  meta description, Open Graph y JSON-LD ya escritos en el HTML (los scrapers de WhatsApp y
  Facebook no ejecutan JS, así que sin esto el preview salía genérico). Se hidratan con
  Supabase al cargar; si Supabase no responde, conservan el contenido estático.
- `categoria/<slug>/index.html` — **generadas**. Landing por categoría con al menos 3 productos.
- `contacto.html` — página Sobre nosotros, acceso a WhatsApp y selector Google Maps/Waze.
- `testimonios.html` — testimonios de clientes.
- `login.html` — login de admin (Supabase Auth). Lleva `noindex`.
- `admin.html` — panel de gestión de productos (protegido). Lleva `noindex`.
- `construccion.html` — aviso de "sitio en construcción". Lleva `noindex`. No carga catálogo
  ni carrito: solo logo, mensaje y dos enlaces (WhatsApp e Instagram). Ver "Modo
  mantenimiento".

---

## Modo mantenimiento

`js/mantenimiento.js` es el interruptor global del sitio público. Cuando está activo, cualquier
página pública redirige a `/construccion.html` **antes** de pintar nada, así el visitante no ve
el catálogo ni puede armar una cotización.

- **Encender / apagar:** en `js/mantenimiento.js`, la constante `ACTIVO` (`true` = sitio cerrado,
  `false` = sitio normal). Es la única línea que hay que tocar.
- **Ver el sitio real mientras está cerrado:** entrar una vez a
  `https://javysuplementos.com/?ver=javy`. El permiso queda guardado en `sessionStorage` mientras
  dure la pestaña.
- **No se bloquean:** `construccion.html`, `login.html`, `admin.html` y `404.html`.
- El script se inyecta sin `defer` justo debajo del `<meta>` de CSP en todas las páginas públicas
  (raíz + `producto/**` + `categoria/**`). El template de `scripts/generate-pages.mjs` ya lo
  incluye, así que las páginas regeneradas lo conservan.
- Si cambia el contenido del script, subir el `?v=` en las páginas para saltear caché de
  Cloudflare/GitHub Pages.

---

## Módulos globales (`window.*`)

Los scripts cargan con `defer` y se comunican por objetos en `window`:

- `window.catalogDb` — `js/db.js`. CRUD de productos contra Supabase, con caché en memoria y
  normalización de campos.
- `window.consultation` (alias `window.cart`) — `js/cart.js`. La cotización: agregar/quitar items,
  persistencia y mensaje de WhatsApp.
- `window.javyAuth` — `js/auth.js`. Sesión de admin y verificación de perfil.
- `window.javyIcons` — `js/icons.js`. Iconos SVG inline (`get`, `enhance`).
- `window.navigateWithTransition` — `js/include-nav.js`. Inyecta el nav y hace transiciones con fade.
- `window.PRODUCTS` — `js/product-data.js`. ~180 productos hardcodeados (fallback, ver abajo).

Otros archivos de `js/`: `script.js` (home), `supplements.js` (catálogo + filtros),
`product-page.js` (detalle + meta tags dinámicos), `contacto.js` (WhatsApp + ubicación), `login.js`,
`testimonials.js`, `testimonials-data.js`, `supabase-config.js`, `whatsapp-config.js`.

**Panel admin**: vive en `js/admin/` como módulos ES. La entrada es
`js/admin/boot-guard.js` (script clásico que carga `main.js` con `import()` dinámico y
muestra un error con botón *Reintentar* si el grafo no carga), luego
`main.js` → `shell.js` (router) → `sections/*` y `drawers/*`. Todos los imports llevan un
token de versión `?v=adm-<hash>` que gestiona `scripts/bump-admin-version.mjs` (ver abajo);
**no se edita a mano**.

El formulario de producto (`drawers/product-drawer.js`) tiene edición completamente manual
para descripción corta, descripción larga, beneficios y modo de uso. Su **vista previa en vivo**
permite alternar entre la card real del catálogo y una representación del detalle completo.
Beneficios y modo de uso se escriben con un elemento por línea; al guardar se convierten en
arreglos. Categorías, objetivos y tags alimentan la búsqueda y los filtros aunque no aparezcan
en la card.

---

## Flujo de datos

Lectura de productos: **Supabase → caché en memoria → `js/product-data.js` (fallback)**.
Si Supabase no responde, el sitio sigue funcionando con los datos locales. **Supabase es la fuente
de verdad**; `js/product-data.js` es un artefacto **generado** desde Supabase con
`node scripts/export-product-data.mjs` y **no se edita a mano** (revisar el `git diff` antes de
commitear). Para el sentido inverso (sembrar Supabase desde el fallback la primera vez) está
`seedProductsFromLocalData()` en Ajustes del panel.

## Flujo de cotización

1. Cliente agrega producto → `window.consultation.addItem()`.
2. Se guarda en `localStorage` con clave `javy-consultation` (clave legacy: `cart`).
3. `buildConsultationMessage()` arma el texto (nombre, zona, items, cantidades, precios).
4. Se abre `https://wa.me/<numero>?text=...` con el mensaje. El número vive **solo** en
   `js/whatsapp-config.js` (`JAVY_WHATSAPP_NUMBER`).

---

## Panel administrativo

1. Login en `login.html` con email + password (Supabase Auth).
2. Se verifica que el usuario exista en `admin_profiles` con `role='admin'` e `is_active=true`; si
   no, sign-out automático.
3. `protectAdminPage()` valida sesión antes de mostrar el dashboard.
4. CRUD de productos/sabores/categorías; las imágenes suben al bucket `product-images`.
5. La seguridad real la impone **RLS en Supabase**, no la UI.

El panel cubre: Dashboard, Productos, Sabores/variantes, Inicio (curación del home), Mensajes
(historial de leads capturados por el formulario anterior), Categorías, Combos, Accesos y Ajustes, más el **drawer de
edición de producto**. Filtros de revisión:
sin imagen, sin sabor, faltan sabores, sin sabores activos, revisar tipo de sabor, no disponibles,
precio vacío, destacados.

---

## Esquema de base de datos (`supabase/schema.sql`)

- `products` — catálogo (tiene columnas redundantes: `name`/`nombre`, `price`/`precio_centavos`).
- `product_flavors` — sabores/variantes de cada producto, con disponibilidad individual.
- `categories` — categorías y tipos (Proteínas, Creatinas, Pre-entrenos, etc.).
- `admin_profiles` — vincula usuarios de Auth con el rol admin.
- `settings` — configuración tipo clave/valor (JSONB).
- `leads` — historial de solicitudes del formulario anterior; la página pública ya no crea
  registros, pero los admins conservan lectura/gestión vía RLS. Migración histórica:
  `supabase/migrations/fase7-leads.sql`.

**RLS activado** en todas las tablas: lectura pública, escritura solo para admins verificados vía
la función `public.is_admin()`. En el frontend solo se usan claves públicas tipo `anon`
(configuradas en `js/supabase-config.js`). **Nunca** guardar service role keys en el frontend.

---

## Cómo correr localmente

Mejor usar un servidor local (evita problemas de rutas). Dentro de Claude/Codex: `/ver-sitio`.
Manual:

```bash
python3 -m http.server 8080   # o:  npx serve .
```

Luego abrir `http://localhost:8080` (usar el puerto que indique la terminal si cambia).

## Comandos de verificación (antes de commitear)

```bash
git status --short
git diff --check
node --check js/cart.js
node --check js/include-nav.js
node --check js/icons.js
node scripts/bump-admin-version.mjs --check
```

Los módulos del panel (`js/admin/**`) son ES modules; `node --check` a secas falla con `import`.
Verifícalos así:

```bash
for f in js/admin/*.js js/admin/*/*.js; do node --input-type=module --check < "$f" || echo "❌ $f"; done
```

Si modificas una página pública, revisa también su JS:

```bash
node --check js/script.js
node --check js/supplements.js
node --check js/product-page.js
```

> Nota: `node --check` no aplica a ES modules (`import`/`export`); esos se verifican abriendo la
> página en el navegador y mirando la consola.

---

## Convenciones

- Mantener HTML, CSS y JavaScript **vanilla**. No agregar frameworks sin una razón fuerte.
- **Sanitizar siempre** con `escapeHTML()` antes de insertar texto de usuario/BD en el DOM.
- Imágenes nuevas en **WebP** cuando sea posible (hay PNG pesados sin optimizar).
- El número de WhatsApp vive **solo** en `js/whatsapp-config.js` (`JAVY_WHATSAPP_NUMBER`).
- Las URLs de SEO (canonical, og:url, og:image) apuntan al dominio de producción de **GitHub
  Pages**, no a Vercel.
- `admin.html` y `login.html` llevan `noindex`.
- Productos: mantener sincronizados Supabase **y** `js/product-data.js`.
- Reutilizar clases y patrones existentes. Prefijos coherentes: `admin-*` / `ad-*` (panel),
  `product-*` (productos), `cart-*` (carrito).
- Priorizar **mobile primero**.
- Si cambias CSS/JS cacheado, actualiza el query string del archivo en el HTML (`?v=...`).
- Si agregas un recurso externo (script, fuente, iframe, API), actualiza la **CSP** en el `<meta>`
  de la página **y** en las reglas de Cloudflare ([`docs/seguridad-cloudflare.md`](docs/seguridad-cloudflare.md)),
  o el navegador lo bloqueará.

---

## Deuda técnica conocida

- El panel admin depende del token de versión `?v=adm-<hash>` para que la caché no mezcle
  módulos (lo gestiona `scripts/bump-admin-version.mjs` vía `/guardar`). Si el panel crece,
  evaluar empaquetarlo en un solo archivo (esbuild) para eliminar el problema de raíz.
- Helpers duplicados (`escapeHTML`, `slugify`, normalización) repartidos en varios archivos →
  centralizar en un `js/utils.js`.
- Productos duplicados entre Supabase y `product-data.js` → decidir una sola fuente de verdad.
- Columnas redundantes en `schema.sql` (`nombre`/`name`, `price`/`precio_centavos`).
- Imágenes PNG sin optimizar (algunas >1MB).
- Sin tests, linter ni CI/CD.
- Breakpoints dispares entre módulos (900/767/620/520/480px). Estándar propuesto para código
  **nuevo**: `480px`, `768px`, `1024px`. La migración de los existentes queda pendiente (requiere
  revisión visual página por página).
- Faltan iconos PWA en tamaños 192×192 y 512×512 (el `site.webmanifest` usa `logo.png` con
  `sizes:"any"`). Generarlos con `/aligerar-imagenes` para Lighthouse PWA al 100%.
- Columnas redundantes del schema (`name`/`nombre`, `price`/`precio_centavos`): pendiente migración
  para dejar una sola canónica; mientras tanto `js/db.js` las consolida en lectura.
