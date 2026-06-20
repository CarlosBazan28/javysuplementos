# CLAUDE.md

Contexto del proyecto para Claude Code. Lee esto antes de trabajar.

## Qué es

**Javy Suplementos** — tienda de suplementos deportivos en San Miguelito, Panamá.
No es un e-commerce con pago online: el cliente arma una **cotización** y la envía
por **WhatsApp**. El cierre de venta es manual, por chat.

## Stack y despliegue

- **Frontend:** HTML + CSS + JavaScript vanilla. Sin frameworks, sin build, sin bundler.
- **Backend:** Supabase (PostgreSQL + Auth + Storage de imágenes).
- **Producción:** GitHub Pages → `https://carlosbazan28.github.io/javysuplementos`
- **Previews:** Vercel despliega automáticamente la rama `claude` (puede tener password protection → da 401 al acceder desde afuera).
- **Sin** linter, formatter, tests ni CI/CD.

## Estructura de archivos

```
/                     páginas .html (7)
/css                  estilos
  /components         nav, auth, cards, cart, buttons, footer (reutilizables)
  /pages              home, supplements, products, contacto, login, testimonials
  tokens.css          variables CSS de marca (--brand, --neon, etc.)
  styles.css          global + hero
  base.css            reset
  admin-dashboard.css
/js                   lógica de cliente (ver abajo)
/img                  /products, /images, /icons, /testimonials (preferir .webp)
/supabase/schema.sql  esquema de la base de datos
/Editables/nav.html   markup del nav compartido
```

## Páginas

- `index.html` — home: hero, productos destacados, reels de Instagram, footer
- `supplements-page.html` — catálogo filtrable
- `product-page.html` — detalle de producto, carga por `?id=` (UUID o legacy_id)
- `contacto.html` — formulario de contacto
- `testimonios.html` — testimonios de clientes
- `login.html` — login de admin (Supabase Auth)
- `admin.html` — panel de gestión de productos (protegido)

## Módulos globales (window.*)

Los scripts cargan con `defer` y se comunican por objetos en `window`:

- `window.catalogDb` — `js/db.js`. CRUD de productos contra Supabase, con caché en memoria y normalización de campos.
- `window.consultation` (alias `window.cart`) — `js/cart.js`. La cotización: agregar/quitar items, persistencia y mensaje de WhatsApp.
- `window.javyAuth` — `js/auth.js`. Sesión de admin y verificación de perfil.
- `window.javyIcons` — `js/icons.js`. Iconos SVG inline (`get`, `enhance`).
- `window.navigateWithTransition` — `js/include-nav.js`. Inyecta el nav y hace transiciones con fade.
- `window.PRODUCTS` — `js/product-data.js`. ~180 productos hardcodeados (fallback, ver abajo).

Otros: `js/script.js` (home), `js/supplements.js` (catálogo + filtros),
`js/product-page.js` (detalle + meta tags dinámicos), `js/admin-dashboard.js` (panel admin),
`js/contacto.js`, `js/login.js`, `js/supabase-config.js`, `js/whatsapp-config.js`.

## Flujo de datos

Lectura de productos: **Supabase → caché en memoria → `product-data.js` (fallback)**.
Si Supabase no responde, el sitio sigue funcionando con los datos locales.
Esto significa que los productos viven en **dos lugares** (Supabase y `product-data.js`) —
mantenerlos sincronizados es deuda técnica conocida.

## Flujo de cotización

1. Cliente agrega producto → `window.consultation.addItem()`
2. Se guarda en `localStorage` con clave `javy-consultation` (clave legacy: `cart`)
3. `buildConsultationMessage()` arma el texto (nombre, zona, items, cantidades, precios)
4. Se abre `https://wa.me/50763932305?text=...` con el mensaje

## Admin

1. Login en `login.html` con email + password (Supabase Auth)
2. Se verifica que el usuario exista en `admin_profiles` con `role='admin'` e `is_active=true`; si no, sign-out automático
3. `protectAdminPage()` valida sesión antes de mostrar el dashboard
4. CRUD de productos/sabores/categorías; las imágenes suben al bucket `product-images`
5. La seguridad real la impone **RLS en Supabase**, no la UI

## Esquema de base de datos (`supabase/schema.sql`)

- `products` — catálogo (tiene columnas redundantes: `name`/`nombre`, `price`/`precio_centavos`)
- `product_flavors` — sabores/variantes de cada producto, con disponibilidad individual
- `categories` — categorías (Proteínas, Creatinas, Pre-entrenos, etc.)
- `admin_profiles` — vincula usuarios de Auth con el rol admin
- `settings` — configuración tipo clave/valor (JSONB)

**RLS activado** en todas las tablas: lectura pública, escritura solo para admins
verificados vía la función `public.is_admin()`.

## Rama de trabajo

- Desarrollar siempre en la rama **`claude`**.
- **Nunca** hacer push directo a `main`. Para producción se hace merge `claude → main` vía Pull Request, con aprobación del dueño.

## Convenciones

- **Sanitizar siempre** con `escapeHTML()` antes de insertar texto de usuario/BD en el DOM.
- Imágenes nuevas en **WebP** cuando sea posible (hay PNG pesados sin optimizar).
- El número de WhatsApp está centralizado en `js/whatsapp-config.js` (`JAVY_WHATSAPP_NUMBER`). No hardcodearlo en otros archivos.
- Las URLs de SEO (canonical, og:url, og:image) apuntan al dominio de producción de **GitHub Pages**, no a Vercel.
- `admin.html` y `login.html` llevan `noindex` (no se deben indexar en Google).

## Deuda técnica conocida

- `js/admin-dashboard.js` es monolítico (~1.200 líneas) → conviene dividir en módulos.
- Helpers duplicados (`escapeHTML`, `slugify`, normalización) repartidos en varios archivos → centralizar en un `utils.js`.
- Productos duplicados entre Supabase y `product-data.js` → decidir una sola fuente de verdad.
- Columnas redundantes en `schema.sql` (`nombre`/`name`, etc.).
- Imágenes PNG sin optimizar (algunas >1MB).
- Sin tests, linter ni CI/CD.
