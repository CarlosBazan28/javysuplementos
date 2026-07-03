# Guía de seguridad — Cloudflare + Supabase

Esta guía cubre la **configuración de dashboard** (la hace el dueño) que acompaña a los cambios de
código del Bloque 1. El código (CSP por meta-tag, Turnstile en el login) ya está en el repo; aquí
está lo que va en los paneles de Cloudflare y Supabase.

> **Reemplaza `TUDOMINIO.com`** por el dominio real comprado en Cloudflare en todos los pasos.

---

## 1.1 — Poner Cloudflare delante de GitHub Pages

**Objetivo:** servir el sitio a través de Cloudflare (proxy) sin cambiar el deploy de GitHub Pages.

1. **GitHub → repo → Settings → Pages → Custom domain:** escribir `TUDOMINIO.com` y guardar.
   Esto crea/usa el archivo `CNAME` en la raíz del repo (ya versionado).
2. **Cloudflare → DNS → Records:**
   - Registro `CNAME` para el apex: **Name** `@` → **Target** `carlosbazan28.github.io`,
     **Proxy status = Proxied** (nube naranja). Cloudflare hace CNAME flattening en el apex.
   - (Opcional) `CNAME` `www` → `carlosbazan28.github.io`, también Proxied.
3. **Cloudflare → SSL/TLS → Overview:** modo **Full (strict)**.
4. **Cloudflare → SSL/TLS → Edge Certificates:** activar **Always Use HTTPS** y **Automatic HTTPS
   Rewrites**.
5. En GitHub Pages, marcar **Enforce HTTPS** una vez que el certificado esté emitido.

Verificación: `https://TUDOMINIO.com` carga el sitio; el certificado lo emite Cloudflare.

---

## 1.2 — Cabeceras de seguridad (Cloudflare Response Header Rules)

**Cloudflare → Rules → Transform Rules → Modify Response Header → Create rule.**

Crear **dos** reglas de tipo *Set static* (el orden importa: la de admin/login primero).

### Regla A — Admin/login (estricta, anti-clickjacking total)

- **When incoming requests match:**
  `http.request.uri.path in {"/admin.html" "/login.html"}`
- **Then set response headers:**

| Header | Value |
|---|---|
| `Content-Security-Policy` | (ver bloque "CSP admin/login" abajo) |
| `X-Frame-Options` | `DENY` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` |

**CSP admin/login** (una sola línea):

```
default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests; script-src 'self' https://cdn.jsdelivr.net https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://fodwjfiyfmscklqsqrip.supabase.co; connect-src 'self' https://cdn.jsdelivr.net https://fodwjfiyfmscklqsqrip.supabase.co wss://fodwjfiyfmscklqsqrip.supabase.co https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com
```

### Regla B — Resto del sitio (páginas públicas)

- **When incoming requests match:**
  `not http.request.uri.path in {"/admin.html" "/login.html"}`
- **Then set response headers:**

| Header | Value |
|---|---|
| `Content-Security-Policy` | (ver bloque "CSP público" abajo) |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` |

**CSP público** (una sola línea — incluye Instagram, Google Maps y analítica):

```
default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests; script-src 'self' https://cdn.jsdelivr.net https://www.instagram.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://fodwjfiyfmscklqsqrip.supabase.co https://*.cdninstagram.com https://*.fbcdn.net https://www.instagram.com; connect-src 'self' https://cdn.jsdelivr.net https://fodwjfiyfmscklqsqrip.supabase.co wss://fodwjfiyfmscklqsqrip.supabase.co https://cloudflareinsights.com; frame-src https://www.instagram.com https://www.google.com
```

### Desplegar la CSP con red de seguridad (Report-Only primero)

1. Antes de enforzar, crea las reglas usando el header **`Content-Security-Policy-Report-Only`**
   en vez de `Content-Security-Policy` (mismo valor).
2. Navega todo el sitio (home con reels, contacto con mapa, login, panel) y revisa la consola del
   navegador: no debe haber `Refused to load ...`.
3. Cuando esté limpio, renombra el header a `Content-Security-Policy` (enforce).

> Nota: el repo ya trae una CSP **baseline por `<meta>`** en cada HTML. La de Cloudflare la
> refuerza y añade lo que el meta-tag no puede (`frame-ancestors`, HSTS). Si ajustas una, ajusta
> la otra para que no se contradigan.

---

## 1.4 — Rate limiting del login (anti fuerza bruta)

**Cloudflare → Security → WAF → Rate limiting rules → Create rule.**

- **Nombre:** `login-rate-limit`
- **When:** `http.request.uri.path eq "/login.html"`
  (si tu plan lo permite, añade también el path del endpoint de auth de Supabase)
- **Rate:** `10` requests per `1 minute` por `IP`
- **Then:** Block, por `10 minutes`.

Esto frena ataques de fuerza bruta a nivel de red, antes de llegar a Supabase.

---

## 1.4b — Protección del formulario de contacto (leads)

El formulario de contacto inserta `leads` en Supabase con la clave `anon` (lo permite RLS). En el
código ya hay un **honeypot** que descarta bots tontos. Para frenar spam más insistente sin meter
fricción a los humanos, añadí protección a nivel de borde:

- **Cloudflare → Security → WAF → Rate limiting:** una regla sobre `http.request.uri.path eq
  "/contacto.html"` (p. ej. 5 envíos por minuto por IP).
- (Opcional) **Managed Challenge** de Cloudflare para esa ruta si llega spam real.

Si en el futuro hace falta verificación fuerte del captcha en el insert, la vía correcta es una
**Supabase Edge Function** que valide el token de Turnstile (siteverify) e inserte con service role.
Queda anotado como mejora futura para no añadir un backend antes de necesitarlo.

---

## 1.5 — Captcha Turnstile en el login

El código ya está listo (`login.html` tiene el widget y el script; `js/login.js` envía el token a
Supabase). Falta crear las llaves y activar el captcha en Supabase.

1. **Cloudflare → Turnstile → Add widget:**
   - **Domain:** `TUDOMINIO.com` (y `localhost` para probar en local).
   - **Widget mode:** Managed.
   - Copia el **Site Key** (público) y el **Secret Key** (privado).
2. **En el repo — `login.html`:** reemplaza el `data-sitekey` de prueba
   (`1x00000000000000000000AA`) por tu **Site Key** real. Bump del `?v=` de `login.js` si tocas algo.
3. **Supabase → Authentication → Settings → Bot and Abuse Protection (Captcha):**
   - Enable Captcha protection = ON.
   - Provider = **Turnstile by Cloudflare**.
   - Pega el **Secret Key**. Guardar.

> Mientras el captcha esté **desactivado** en Supabase, el login funciona igual (el token se
> ignora). Al activarlo, el token pasa a ser obligatorio y el código ya lo envía. El site key de
> prueba del repo "siempre pasa": **debe** reemplazarse por el real antes de depender del captcha.

---

## 2.5 — Analítica (Cloudflare Web Analytics)

Al estar el sitio proxied por Cloudflare, no hace falta pegar ningún script: Cloudflare puede
**inyectar el beacon automáticamente**.

1. **Cloudflare → Analytics & Logs → Web Analytics → Add a site / Enable.**
2. Elegí el sitio `javysuplementos.com` y activá **Automatic Setup** (inyección automática).
3. La CSP ya permite `static.cloudflareinsights.com` (script) y `cloudflareinsights.com` (beacon),
   así que no se rompe nada.

Es gratis, sin cookies y no requiere banner de consentimiento.

---

## 3.1 — Caché de assets (evitar el "panel en negro" tras un deploy)

**Síntoma:** tras desplegar, el panel admin se queda en negro en el navegador normal pero
funciona en incógnito.

**Causa:** el sitio se sirve por **GitHub Pages detrás de Cloudflare** (el `vercel.json` del repo
**no se usa** en producción — GitHub Pages no lo lee; quedó como referencia, no como config real).
Cloudflare cachea los `.js`/`.css` con `Cache-Control: max-age=14400` (**4 horas**) y **sin
`must-revalidate`**. Cuando despliegas, el navegador baja el `main.js` nuevo (su URL cambia con el
`?v=`), pero los `import "./..."` internos sin versión se sirven de esa caché de 4 h → versión
vieja. `main.js` nuevo + módulos viejos = el grafo no monta = pantalla negra. En incógnito no hay
caché → todo fresco → funciona.

**Mitigación en código (ya aplicada):** todos los `import` de `js/admin/*` llevan un token de
versión compartido (`?v=adm1`), igual que el script de entrada en `admin.html`. Para desplegar
cambios de los módulos del panel, reemplaza `adm1` → `adm2` en **todo el repo** de una sola vez
(`admin.html` + `js/admin/**`). Así el grafo entero se baja consistente y nunca se mezclan
versiones.

**Arreglo de raíz en Cloudflare (recomendado, una sola vez):** que Cloudflare deje de cachear los
assets 4 h sin revalidar.

**Cloudflare → Caching → Cache Rules → Create rule:**

- **Nombre:** `assets-revalidate`
- **When incoming requests match:**
  `http.request.uri.path.extension in {"js" "mjs" "css" "html"}`
- **Then:**

| Ajuste | Valor |
|---|---|
| Cache eligibility | Eligible for cache |
| Edge TTL | Respect origin TTL |
| **Browser Cache TTL** | **Respect origin TTL** (o `No cache` si quieres ser estricto) |

Con esto Cloudflare respeta el `max-age=600` (10 min) de GitHub Pages en vez de forzar 4 h, y el
navegador revalida pronto. Combinado con el token de versión del código, el panel ya no se queda
en negro tras un deploy.

Verificación:
`curl -sI https://javysuplementos.com/js/admin/main.js | grep -i cache-control`
→ ya **no** debe mostrar `max-age=14400`.

---

## Verificación final

- `https://securityheaders.com/?q=https://TUDOMINIO.com` → calificación A o superior.
- `curl -sI https://TUDOMINIO.com/admin.html | grep -i -E "x-frame|content-security|strict-transport"`
  muestra `X-Frame-Options: DENY` y la CSP estricta.
- Login: el widget de Turnstile aparece; un login válido entra; tras un fallo el widget se reinicia.
- Consola del navegador sin violaciones de CSP en home (reels), contacto (mapa), login y panel.
