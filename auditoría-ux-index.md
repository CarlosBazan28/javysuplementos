# Auditoría E2E y de calidad de interacción — Home (`index.html`)

**Fecha:** 9 de agosto de 2026
**Alcance:** cada acción que un usuario puede ejecutar desde la home y su continuación hasta WhatsApp.
**Estado revisado:** rama `codex`, commit `8a25c5d`.
**Archivos leídos:** `index.html`, `js/script.js`, `js/cart.js`, `js/db.js`, `js/include-nav.js`,
`Editables/nav.html`, `js/dropdown.js`, `js/icons.js`, `js/whatsapp-config.js`, más
`js/supplements.js` y `js/product-page.js` como referencia comparativa.

> Auditoría de solo lectura. No se modificó ningún archivo del proyecto.
> Complementa a `auditoría-javysuplementos.md` (que cubre estructura y organización, no lógica).

---

## 1. Resumen ejecutivo

El flujo de cotización **funciona de punta a punta**: el contrato `{ flavor, flavor_id, quantity }`
se respeta desde las tres páginas, el número de WhatsApp sale solo de `js/whatsapp-config.js`, y el
saneamiento con `escapeHTML()` está bien aplicado en todo el camino de la home.

La deuda no está en la corrección del negocio, sino en **cuatro áreas de calidad de interacción**:

1. **Colisión de nombres en el scope global** — `formatPrice` se declara tres veces y la última
   gana, dejando el total del mensaje de WhatsApp **sin símbolo de moneda**.
2. **Fallos silenciosos en el último paso del embudo** — si el navegador bloquea el popup de
   WhatsApp, el usuario pulsa "Enviar" y no pasa nada.
3. **Accesibilidad de teclado y lector de pantalla** — ningún diálogo atrapa el foco, el menú móvil
   es tabulable estando invisible, y el badge de cotización es mudo para AT.
4. **Duplicación entre páginas** — ~200 líneas copiadas literalmente entre `script.js`,
   `supplements.js` y `product-page.js`, con divergencias de UX sin motivo.

**Veredicto:** la lógica es sólida; la capa de interacción es donde está el margen de mejora hacia
"alta calidad".

---

## 2. Inventario de acciones de la home

| # | Acción | Disparador (markup) | Handler |
|---|---|---|---|
| A1 | Logo → inicio | `Editables/nav.html:3` | `js/include-nav.js:130-151` (`navigateWithTransition`) |
| A2 | Abrir/cerrar menú móvil | `Editables/nav.html:6` | `js/include-nav.js:102-105` → `setNavToggleState` (`:94-100`) |
| A3 | Links del nav | `Editables/nav.html:10-13` | activo `:78-89`; cierra menú `:107-111`; navega `:130-151` |
| A4 | Link admin / login | `Editables/nav.html:15,21` | `js/include-nav.js:34-50` (`updateAdminEntryState`) |
| A5 | Abrir panel de cotización (nav) | `Editables/nav.html:25-29` | `js/include-nav.js:63-66` → `cart.js:573` `openPanel` |
| A6 | Badge de cotización | `Editables/nav.html:28` | `cart.js:170-179` `updateConsultationBadge` |
| A7 | Hero "Ver productos" | `index.html:69` | `js/script.js:245-249` (`scrollIntoView`) |
| A8 | Hero "Abrir cotización" | `index.html:69` | `js/script.js:251-255` → `cart.js:573` |
| A9 | Click en card destacada | generado en `js/script.js:200, 211, 226` | `<a href>` reales + `include-nav.js:130` |
| A10 | "Agregar a cotización" (card) | `js/script.js:223` | `js/script.js:233-235` → `cart.js:618` `openAddModal` |
| A11 | "Consultar disponibilidad" (agotado) | `js/script.js:224` | `js/script.js:236-238` → `cart.js:527` `askAvailability` |
| A12 | Modal quick-add | `cart.js:642-664` | cerrar `:673-674`; Esc `:606,671`; −/+ `:678-679`; submit `:682-711` |
| A13 | "Agregar a cotización" (combo) | `js/script.js:325` | `js/script.js:329-336` (`addItem` directo, sin modal) |
| A14 | Panel: cambiar cantidad | `cart.js:237-239` | `cart.js:252-256` → `updateQuantity` (`:181`) |
| A15 | Panel: quitar ítem | `cart.js:243-245` | `cart.js:248-250` → `removeItem` (`:289`) |
| A16 | Panel: vaciar (+ confirmación) | `cart.js:788, 775-784` | `:803` → `showClearConfirm` (`:312`); aceptar `:805-809` |
| A17 | Panel: Continuar / Volver (mobile) | `cart.js:787, 789` | `cart.js:815-816` → `goToStep` (`:560`) |
| A18 | Panel: método de entrega | `cart.js:761-765` | `cart.js:817-820` → `renderQuoteFields` (`:379`) |
| A19 | Panel: enviar por WhatsApp | `cart.js:790` | `:814` → `openWhatsApp` (`:485`) → `whatsapp-config.js:11` |
| A20 | Panel: cerrar (X / overlay / Esc) | `cart.js:740` | `cart.js:801-802`; Esc `:822-828` |
| A21 | Reels de Instagram | `index.html:110-146` | embed externo `index.html:149`; sin JS propio |
| A22 | "Ver mas reels" | `index.html:107` | `<a target="_blank">` |
| A23 | Footer: navegación | `index.html:168-172` | `include-nav.js:130-151` (excepto `#hash`) |
| A24 | Footer: teléfono / asesor | `index.html:179, 183` | `whatsapp-config.js:16-25` `hydrateJavyWhatsappLinks` |
| A25 | Footer: email / redes | `index.html:180, 191-193` | nativo |

---

## 3. Recorrido E2E y consistencia de estado

1. **Carga.** `script.js:272` `initHomeProducts()` pinta `"Cargando productos destacados..."`
   (`script.js:259`) → `catalogDb.getHomeProducts()` (`db.js:759`) → caché `productsCache`
   (`db.js:91`) o fallback local (`db.js:590`). Los combos cargan en paralelo (`script.js:356`);
   la sección arranca `hidden` y aparece de golpe.
2. **Estado inicial de las cards.** `syncAddButton` (`script.js:125`) lee `localStorage` vía
   `getAddedFlavors`/`hasItem` → el botón dice "✓ En cotización" ya en la primera pintura. ✅
3. **Agregar con sabores.** Card → `openAddModal` → select + stepper → `hasItem(product.id, flavor)`
   (`cart.js:703`) → `addItem(product, { flavor, flavor_id, quantity })` (`cart.js:708`).
   **El contrato se cumple** (`cart.js:683,701`). `saveConsultation` (`:14`) persiste en
   `javy-consultation` y despacha `consultation:change` → `syncAllAddButtons` + badge. ✅
4. **Agregar sin sabores.** `hasFlavors=false` → `flavor: ""`, `flavor_id: ""` (`cart.js:128-129`).
   Identidad correcta. ✅
5. **Abrir panel.** `openPanel` (`cart.js:573`) fuerza `data-step="products"`, re-renderiza y
   bloquea scroll.
6. **Ajustar cantidades.** `updateQuantity` → `saveConsultation` → re-render completo de la lista.
7. **Enviar.** `openWhatsApp` (`cart.js:485`) valida ítems + campos requeridos →
   `buildConsultationMessage` (`:443`) → `openJavyWhatsapp` (`whatsapp-config.js:11`).

### Consistencia por escenario

| Escenario | Resultado |
|---|---|
| Recarga de página | ✅ estado restaurado desde `javy-consultation` |
| index → PDP → agregar → botón atrás (bfcache) | ❌ `pageshow` (`include-nav.js:123`) solo repone opacidad; badge y cards quedan desactualizados |
| Dos pestañas abiertas | ❌ no hay listener de `storage`; los estados divergen |
| Panel abierto y cambio en otra pestaña | ❌ ídem |
| Migración de la clave legacy `cart` | ⚠️ `getConsultation()` (`cart.js:134-144`) **escribe y despacha eventos desde una función de lectura** |
| Total en el mensaje de WhatsApp | ❌ pierde el `$` (ver C1) |

---

## 4. Hallazgos priorizados

### 🔴 Crítico

#### C1 — Colisión global de `formatPrice`: el mensaje de WhatsApp manda el total sin `$`

`js/cart.js:160` vs `js/script.js:5` vs `js/supplements.js:230`

**Verificado.** Ninguno de los tres archivos está envuelto en IIFE: son scripts clásicos que
comparten el scope global. En `index.html`, `cart.js` carga en la línea 57 y `script.js` en la 58;
en `supplements-page.html`, `cart.js:58` y `supplements.js:59`. En ambos casos la segunda
declaración **sobrescribe** `globalThis.formatPrice`, y las llamadas internas de `cart.js`
resuelven contra la global:

```js
// cart.js:160     -> "$63.00"
// script.js:5     -> "63.00"     ← esta es la que gana en index.html
// supplements.js:230 -> "63.00"  ← esta es la que gana en supplements-page.html
```

Impacto, todo en el camino de conversión:

| Línea | Qué se ve hoy | Qué debería verse |
|---|---|---|
| `cart.js:211` | total del panel: `63.00` | `$63.00` |
| `cart.js:221` | `25.00 c/u · 50.00` | `$25.00 c/u · $50.00` |
| `cart.js:478` | **`Total a pagar: 63.00`** en WhatsApp | `Total a pagar: $63.00` |
| `cart.js:651` | meta del modal quick-add | con `$` |

**Arreglo.** Extraer utilidades compartidas a `js/utils.js`
(`window.javyUtils = { escapeHTML, slugify, formatPrice }`) y borrar las declaraciones duplicadas.
Parche mínimo inmediato: renombrar la de `cart.js` a `formatMoney` y actualizar sus 5 usos.

#### C2 — Un fallo al cargar `nav.html` deja la página entera invisible

`js/include-nav.js:5-6` — **verificado**

```js
document.body.classList.add("page-transition");          // opacity: 0
const html = await fetch("Editables/nav.html", { cache: "no-store" })
  .then((response) => response.text());                  // sin try/catch
```

Si el `fetch` rechaza (offline, 404, despliegue parcial, CSP), la IIFE async aborta con una promesa
no manejada y **nunca se ejecuta** `requestAnimationFrame(() => body.classList.add("page-transition-in"))`
(`:153-155`). El `body` queda en `opacity: 0` (`nav.css:377-381`): **página completamente en blanco**,
sin nav, sin botón de cotización y sin `navigateWithTransition`.

```js
let html = "";
try {
  html = await fetch("Editables/nav.html").then((r) => (r.ok ? r.text() : Promise.reject(r.status)));
} catch (e) {
  console.warn("nav", e);
} finally {
  requestAnimationFrame(() => document.body.classList.add("page-transition-in"));
}
if (!html) return; // la página sigue usable sin nav
```

De paso: usar `cache: "default"` en vez de `no-store`; hoy se refetchea el nav en **cada**
navegación interna.

#### C3 — El envío a WhatsApp falla en silencio si el navegador bloquea el popup

`js/cart.js:499-505` + `js/whatsapp-config.js:9-13`

`openJavyWhatsapp` está documentado como *"devuelve la referencia … para que quien llame pueda
ofrecer un enlace de respaldo"*, pero `openWhatsApp` **descarta el valor de retorno**. Con el
bloqueador de popups activo (frecuente en iOS Safari), el usuario pulsa "Enviar por WhatsApp",
**no pasa absolutamente nada** y no hay ni toast ni error. Es el último paso del embudo.

```js
const win = openJavyWhatsapp(message);
if (!win || win.closed) {
  showQuoteHint("Tu navegador bloqueó la ventana.");
  const a = document.getElementById("quoteFallbackLink"); // <a> persistente en el pie del panel
  a.href = buildJavyWhatsappUrl(message);
  a.hidden = false;
  a.focus();
}
```

Aplica igual a `askAvailability` (`cart.js:538-540`) y `quoteSingleProduct` (`:522-524`), que además
**no hacen nada** si `openJavyWhatsapp` no está definido.

#### C4 — Se renderiza `"$Consultar"` en productos y combos sin precio

`js/script.js:214, 215, 319, 320` (idéntico en `js/supplements.js:740-741`) — **verificado**

```js
<span class="product-card__price">$${formatPrice(product.price)}</span>
```

`formatPrice` (`script.js:5-8`) devuelve `"Consultar"` cuando el precio es 0/null, y el `$` está
hardcodeado **fuera** de la función → el usuario ve literalmente **`$Consultar`**. Ocurre con
cualquier producto sin precio en la BD y con combos cuyo `price` es `null` (`db.js:1227-1229`).

**Arreglo.** Que la función devuelva el símbolo y quitar el `$` de las 4 plantillas. Se resuelve
junto con C1.

#### C5 — El menú móvil es navegable con Tab estando cerrado e invisible

`css/components/nav.css:152-178`

```css
.nav__links { opacity: 0; pointer-events: none; }   /* sin visibility ni inert */
```

En ≤900px los 5 enlaces del menú cerrado **siguen en el orden de tabulación**: el usuario de teclado
tabula desde el logo hacia elementos que no ve y no puede activar con el ratón. Además
`include-nav.js:102-105` no cierra el menú con `Escape`, ni con click fuera, ni bloquea el scroll
del fondo, y `aria-label="Abrir menú"` (`nav.html:6`) nunca cambia a "Cerrar menú".

```css
.nav__links { visibility: hidden; }
.nav__links.is-open { visibility: visible; }
```

y en `setNavToggleState`: `navMenu.inert = !isOpen`,
`navToggle.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú")`, más listeners de
`Escape` y de click fuera con `removeEventListener` al cerrar.

#### C6 — Los diálogos no atrapan el foco ni ocultan el fondo

`js/cart.js:573-585` (panel), `:640-673` (quick-add), `:775-784` (confirmar vaciar)

Los tres declaran `role="dialog"`/`aria-modal="true"` pero:

- No hay trampa de foco: con Tab se sale al contenido de detrás.
- El fondo no queda `inert`/`aria-hidden`, así que un lector de pantalla sigue leyendo las cards.
- El `consultation-confirm` (`alertdialog`) tapa visualmente el panel pero se puede tabular a la
  lista y al formulario de debajo.

**Arreglo.** Helper compartido `trapFocus(container)`: guardar `previouslyFocused`, ciclar
Tab/Shift+Tab entre los focusables y aplicar `inert` a `<main>` al abrir. Los tres diálogos ya
devuelven el foco al cerrar (`cart.js:614`, `:808`); solo falta el ciclo.

---

### 🟡 Recomendado

#### R1 — El foco inicial del modal quick-add va a un `<select>` `aria-hidden`

`js/cart.js:713-715` y `:568-570`

```js
(overlay.querySelector("[data-qa-flavor]") || overlay.querySelector("[data-qa-add]"))?.focus?.();
```

En `cart.js:669` ya corrió `javyDropdown.enhanceSelects(overlay)`, que deja el select nativo con
`tabindex="-1"`, `aria-hidden="true"` y clipeado a 1×1 px (`dropdown.js:295-296`,
`css/dropdown.css:18-21`). El foco aterriza en un elemento invisible y mudo para AT. Lo mismo en
`goToStep("form")`, que enfoca `#quoteMethod` (también *enhanced*, `cart.js:799`).

El propio archivo ya resuelve bien este caso en `cart.js:689`:

```js
const visibleTrigger = flavorSelect._jdd?.querySelector(".jdd__btn, .jdd__combo") || flavorSelect;
```

**Arreglo.** Exponer `window.javyDropdown.focus(select)` y usarlo en los dos sitios.

#### R2 — El badge no es perceptible por lector de pantalla

`Editables/nav.html:25-29` + `js/cart.js:170-179`

`aria-label="Abrir cotización"` es estático; el `<span class="cart-badge">` cambia de número sin
`aria-live` y sin formar parte del nombre accesible. Un usuario ciego no se entera de que se agregó
un producto (el toast anuncia, pero solo 2,2 s y no refleja el total).

```js
const btn = document.getElementById("consultationBtn");
btn?.setAttribute("aria-label", count
  ? `Abrir cotización, ${count} producto${count === 1 ? "" : "s"}`
  : "Abrir cotización");
badge.setAttribute("aria-hidden", "true");
```

más una región `<span class="sr-only" aria-live="polite">` en el nav con el mismo texto.

#### R3 — Cambiar la cantidad pierde el foco y no anuncia el cambio

`js/cart.js:201` + `:252-256` + `:238`

`updateQuantity` → `renderConsultationPanel` → `list.innerHTML = ""` destruye la fila entera,
incluido el botón `+` recién pulsado → el foco cae a `<body>`. **Con teclado es imposible
incrementar dos veces seguidas.** Además el `aria-live="polite"` de `.consultation-item__qty`
(`cart.js:238`) nunca anuncia, porque el nodo con la región viva se recrea en lugar de mutarse.

```js
function updateQuantity(index, quantity) {
  const items = getConsultation();
  if (!items[index]) return;
  items[index].quantity = Math.max(1, Number(quantity || 1));
  saveConsultation(items);
  updateConsultationBadge();
  const row = document.querySelectorAll(".consultation-item")[index];
  if (!row) return renderConsultationPanel();
  row.querySelector(".consultation-item__qty").textContent = items[index].quantity;
  row.querySelector('[data-quote-step="-1"]').disabled = items[index].quantity <= 1;
  updatePanelTotals(items); // extraer de renderConsultationPanel
}
```

Y sacar el `aria-live` a una región única y persistente del panel.

#### R4 — Quitar un ítem no es reversible

`js/cart.js:248-250`

`removeItem` borra sin confirmación ni deshacer, mientras que "Vaciar" **sí** tiene confirmación
(`:312`). La asimetría de fricción es correcta, pero borrar el único ítem por un toque accidental
en móvil (área de 34×34 px, ver R7) es irrecuperable.

**Arreglo.** Toast con acción: guardar `const removed = items[index]` y mostrar
`showToast("Quitado · Deshacer")` con un botón que reinserte en el mismo índice durante 5 s.
Requiere extender `showToast` (`cart.js:39`) para aceptar `{ actionLabel, onAction }`.

#### R5 — Sin estado de error visible cuando el catálogo no carga

`js/script.js:257-270`

```js
} catch (error) {
  console.warn(...);
  const allProducts = await window.catalogDb.getProductsWithFlavors(); // vuelve a lanzar
```

Si `window.catalogDb` no existe (fallo de `db.js` o del CDN de Supabase), la línea 262 lanza, el
`catch` vuelve a lanzar en la 266 → rechazo no manejado y la home se queda **para siempre** en
`"Cargando productos destacados..."`. El estado vacío existe (`script.js:181-186`); el de error, no.
Además ese `catch` es casi código muerto, porque `getProductsWithFlavors` ya tiene fallback interno
(`db.js:582-592`).

```js
catch (error) {
  console.warn(...);
  lista.innerHTML = `<p class="product-card__disclaimer" role="alert">
    No pudimos cargar los productos.
    <button type="button" id="retryHome">Reintentar</button></p>`;
  document.getElementById("retryHome")
    .addEventListener("click", initHomeProducts, { once: true });
}
```

Mismo tratamiento para combos (`script.js:350-353`, que hoy solo esconde la sección).

#### R6 — El estado queda obsoleto al volver con "atrás" o con dos pestañas

`js/include-nav.js:123-128`; no hay listener de `storage`

Flujo muy probable: home → "Ver detalles" → agregar desde la PDP → botón atrás (bfcache) → **el
badge sigue en 0 y la card sigue diciendo "Agregar a cotización"** aunque el producto ya esté dentro.

```js
window.addEventListener("storage", (e) => {
  if (e.key !== CONSULTATION_KEY) return;
  updateConsultationBadge();
  renderConsultationPanel();
  document.dispatchEvent(new CustomEvent("consultation:change", { detail: { items: getConsultation() } }));
});
window.addEventListener("pageshow", (e) => {
  if (!e.persisted) return;
  updateConsultationBadge();
  document.dispatchEvent(new CustomEvent("consultation:change", { detail: { items: getConsultation() } }));
});
```

#### R7 — Áreas táctiles por debajo de 44 px en el panel

`css/components/cart.css:219` (stepper `32px 38px 32px`, alto 32), `:227-237`
(`.consultation-item__step` 32 px), `:259-261` (`.consultation-item__remove` 34×34), `:66-76`
(`.consultation-panel__close` 38×38), `:592-596` (`.quick-add__close` 34×34);
`css/components/cards.css:681-686` (`.product-card__btn` 40 px en móvil), `:688-691`
(`.product-card__detail-link` 28 px).

El proyecto ya acierta en `.quick-add__qty-btn` (44×44, `cart.css:614-618`) y `.jdd__btn`
(`dropdown.css:24`). El panel de cotización — donde se ajusta y se borra dinero — es el peor.

**Arreglo.** Subir a 44 px, o mantener el tamaño visual y ampliar el área con
`::after { position: absolute; inset: -6px }` sobre un contenedor `position: relative`.

#### R8 — `localStorage.setItem` sin protección rompe el flujo de agregar

`js/cart.js:15` — **verificado**

`readStorage` sí está protegido (`:6-12`), pero `saveConsultation` no. En Safari privado o con la
cuota llena, `setItem` lanza → propaga por `addItem` → el handler del modal (`:708`) revienta antes
de `showToast` y `closeAddModal`: **el modal se queda abierto y el usuario no sabe qué pasó**.

```js
function saveConsultation(items) {
  try {
    localStorage.setItem(CONSULTATION_KEY, JSON.stringify(items));
  } catch {
    showToast("No pudimos guardar tu cotización en este navegador");
  }
  document.dispatchEvent(new CustomEvent("consultation:change", { detail: { items } }));
}
```

#### R9 — El aviso de validación no se anuncia ni enfoca el campo

`js/cart.js:416-421`, `:491-495`, `:770`

`#quoteHint` es un `<p hidden>` sin `role="alert"` ni `aria-live`. Al pulsar "Enviar por WhatsApp"
sin completar, el usuario de lector de pantalla no recibe nada y el foco no se mueve al primer
campo faltante. En desktop el hint puede quedar fuera de vista si la columna está scrolleada.

**Arreglo.** `role="alert"` en `#quoteHint`, y que `getMissingQuoteFields` (`:409`) devuelva también
los `id` para hacer `focus()` + `aria-invalid="true"` en el primero (usando el trigger visible del
dropdown, ver R1).

#### R10 — El scroll-lock es vestigial y frágil

`js/cart.js:543-558` + `css/components/cart.css:1-3`

El código guarda `consultationScrollY` y llama a `window.scrollTo(0, targetY)` al desbloquear,
patrón que solo tiene sentido con `position: fixed`. El CSS solo aplica `overflow: hidden` en
`body`, con lo cual `scrollY` nunca cambia y el `scrollTo` es un no-op. En iOS Safari
`overflow: hidden` sobre `body` **no** impide el scroll de fondo. Y el flag booleano es compartido
entre el panel y el modal quick-add: si se abren anidados, cerrar el interior desbloquea el exterior.

**Arreglo.** O implementar el lock real (`position: fixed; top: -Ypx; width: 100%` en `body` +
`overscroll-behavior: contain` en el panel), o borrar `consultationScrollY`/`scrollTo`. Y cambiar el
booleano por un contador (`lockCount++/--`).

#### R11 — `Escape` dispara `closePanel()` aunque el panel esté cerrado

`js/cart.js:822-828`

El listener global corre siempre. Con el modal quick-add abierto en la home, `Esc` ejecuta
**primero** `closePanel()` (que llama a `unlockConsultationScroll()` y a un `scrollTo` espurio) y
**después** `closeAddModal()`. Funciona por casualidad gracias al guard de
`consultationScrollLocked`; es un acoplamiento peligroso.

**Arreglo.** `if (!panel.classList.contains("is-open")) return;` al inicio del handler, y que cada
capa haga `event.stopPropagation()`.

#### R12 — El precio del sabor se ignora en la cotización y en el mensaje

`js/cart.js:118-132` + `js/db.js:200`

`normalizeFlavor` normaliza `price` y `stock` por sabor, pero `productToQuoteItem` siempre usa
`product.price`. Si un sabor tiene precio propio (2 lb vs 5 lb), el total del panel y el
`Total a pagar` del mensaje salen **mal**. `stock` se ignora por completo: se pueden pedir 99
unidades de algo con stock 0.

**Arreglo.** `price: Number(options.flavor_price ?? product.price ?? 0)`, pasar
`flavor_price: f.price` desde `cart.js:701`, y limitar el stepper a `Math.min(99, f.stock ?? 99)`
mostrando "Quedan N".

#### R13 — `flavor_mode` es lógica de negocio muerta

`js/script.js:47-49` (`isNoFlavorProduct`), `js/supplements.js:263-265`, `js/db.js:206-209`

La función existe en dos archivos y **no se llama en ningún sitio**. Un producto con
`flavor_mode: "needs_review"` (sabores todavía sin cargar) se agrega silenciosamente sin sabor y
llega a WhatsApp sin la variante. La BD distingue `has_flavors` / `no_flavor` / `needs_review` y la
web trata los tres igual.

**Arreglo.** En `openAddModal` (`cart.js:624`), si
`product.flavor_mode === "needs_review" && !flavors.length`, mostrar "Sabores por confirmar — te los
consultamos por WhatsApp" y marcar el ítem, o derivar a `askAvailability`.

#### R14 — `Ctrl/Cmd/Shift + click` rompe "abrir en pestaña nueva"

`js/include-nav.js:130-151`

El interceptor global hace `event.preventDefault()` sin comprobar teclas modificadoras ni el botón
del ratón. Ctrl+click en "Ver detalles" o en un link del footer navega en la misma pestaña.

```js
if (event.defaultPrevented || event.button !== 0 ||
    event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
```

Y respetar `prefers-reduced-motion` en `navigateWithTransition` (`:113-118`): saltar los 170 ms.

#### R15 — Combos: UX divergente del resto de la home

`js/script.js:293-342`

- No llaman a `bindConsultationSync()` ni guardan `card._javyProduct`, así que **el botón nunca pasa
  a "✓ En cotización"** ni se resetea al quitar el combo (contraste con `script.js:230, 239`).
- No hay selector de cantidad: siempre `{ quantity: 1 }` (`:334`), mientras que los productos abren
  un modal con stepper.
- Si ya está, muestra un toast y no ofrece nada más (`:330-333`).
- No hay skeleton: la sección aparece de golpe empujando el contenido (CLS).
- `js/script.js:306`: `${i.quantity}×` inserta `quantity` sin `escapeHTML`. Riesgo bajo (es numérico
  en BD), pero rompe la regla del proyecto.

**Arreglo.** Reutilizar `openAddModal` con un producto sintético (`comboToQuoteProduct`, `:279`),
asignar `card._javyProduct` y llamar a `bindConsultationSync()`/`syncAddButton` como en
`renderFeaturedProducts`.

#### R16 — Sin fallback de imagen en las cards de la home

`js/script.js:201, 311`

`product-page.js:140` sí implementa `imgEl.onerror` → `javi.webp`. Las cards de la home y del
catálogo no: una URL de Supabase caída muestra el icono de imagen rota.

```js
lista.addEventListener("error", (e) => {
  if (e.target.matches(".product-card__img")) {
    e.target.src = "img/products/product-placeholder.svg";
  }
}, true); // un único listener delegado, sin onerror inline por card
```

#### R17 — `loading="lazy"` en las cards por encima del pliegue

`js/script.js:201`

Las primeras 2-4 imágenes de destacados suelen ser el LCP en móvil; con `lazy` el navegador retrasa
la petición.

**Arreglo.** `loading="${index < 4 ? "eager" : "lazy"}"` + `fetchpriority="high"` en la primera, y
`decoding="async"` (que `supplements.js:725` sí tiene y `script.js:201` no).

#### R18 — `getConsultation()` re-parsea el JSON en bucle

`js/cart.js:134`, llamado desde `hasItem` (`:25`), `getAddedFlavors` (`:33`),
`getConsultationCount` (`:147`)

En cada `consultation:change`, `syncAllAddButtons` (`script.js:163`) hace por card:
1 `getAddedFlavors` + 1 `hasItem` + 1 `hasItem` **por opción de sabor** (`script.js:156`). Con
8 cards × 8 sabores son ~80 `JSON.parse` + `map` por evento. En el catálogo (180 cards) es
notablemente peor.

**Arreglo.** Memoizar el array parseado e invalidarlo solo en `saveConsultation`; o pasar
`event.detail.items` a `syncAllAddButtons`.

---

### 🟢 Opcional

- **O1 — `index.html` no tiene `<h1>`.** `index.html:66` usa `<h2>`. Las otras páginas sí lo tienen
  (`supplements-page.html:68`, `product-page.html:92`, `contacto.html:67`). Perjudica SEO y la
  navegación por encabezados. Convertir el eslogan del hero en `<h1>` y ajustar `styles.css:538`.
- **O2 — Ancla rota en el footer.** `index.html:170` enlaza a `#destacados`; **no existe** ese `id`
  (los reales son `#productos`, `#combos`, `#educacion`). **Verificado.** Apuntar a `#productos` y
  aprovechar para añadir `#combos`.
- **O3 — Datos de contacto de marcador de posición.** `index.html:180`:
  `href="mailto:contacto@pboom.com"` con el texto visible `correodejavito@pboom.com` — **no
  coinciden** y ambos parecen placeholders. `index.html:198`: `© 2024`. Daña la credibilidad.
  Email real y `<span id="year">` con `new Date().getFullYear()`.
- **O4 — `scrollIntoView` ignora el header sticky y `prefers-reduced-motion`.** `js/script.js:247`:
  `#site-header` es sticky de ~78-92 px (`nav.css:205-208, 307-311`), así que "Ver productos" deja
  el título tapado por el nav. Añadir `scroll-margin-top: 100px` a `#productos, #combos, #educacion`
  y condicionar `behavior` a `matchMedia("(prefers-reduced-motion: reduce)")`.
- **O5 — Código muerto en `js/script.js`.** `renderFlavorOptions` (`:51-82`), `getSelectedFlavor`
  (`:84-96`), `wireQuantityStepper` (`:98-107`), `getCardQuantity` (`:109-115`),
  `isNoFlavorProduct` (`:47-49`), `slugify` (`:31-39`). ~65 líneas restos de las cards con selects
  inline; arrastran el breakpoint `767px` hardcodeado en JS (`:110`). También
  `window.consultation.quoteSingleProduct` (`cart.js:508, 863`) no se llama desde ninguna parte.
- **O6 — Cinco `escapeHTML` y cuatro `slugify` duplicados.** `script.js:21` / `cart.js:150` /
  `supplements.js:246` / `product-page.js:3` / `dropdown.js:22` (`esc`); slugify en `script.js:31` /
  `supplements.js:77` / `db.js:113` (`createSlug`) / `db.js:633` (`categorySlugify`). Causa raíz de
  C1. Un `js/utils.js` cargado primero en las 4 páginas públicas lo cierra.
- **O7 — `getConsultation()` escribe desde una función de lectura.** `js/cart.js:142`: la migración
  legacy llama a `saveConsultation` (que despacha `consultation:change`) dentro de un getter
  invocado decenas de veces durante el render. No hay bucle infinito, pero es un efecto secundario
  oculto. Ejecutar la migración una sola vez en el `DOMContentLoaded` (`cart.js:841`).
- **O8 — Los reels degradan mal y pesan.** `index.html:110-149`: cuatro `<blockquote>` +
  `embed.js` sin lazy ni facade → cuatro iframes de terceros en la home. Si un bloqueador impide
  `embed.js`, quedan cuatro cajas vacías de 520 px (`styles.css:242`). `index.html:149` usa URL
  relativa al protocolo (`//www.instagram.com/...`). `index.html:109`: `<div aria-label="…">` sin
  `role` — el `aria-label` se ignora en un genérico. Facade con miniatura WebP + `https://` +
  `role="list"`.
- **O9 — Contenido fuera de `<main>` y sin skip-link.** `index.html:98` cierra `<main>` antes de la
  sección de reels (`:100`), que sí es contenido principal. La única forma de llegar al contenido
  con teclado es tabular todo el nav en cada página.
- **O10 — `addItem` acumula pero el modal lo impide.** `cart.js:278-282` suma cantidades si el ítem
  existe; sin embargo `:703-707` corta antes con un toast. Si agregas 2 y quieres 2 más, recibes
  "Ese sabor ya está en tu cotización" y la cantidad **no cambia**. Precargar el stepper con la
  cantidad actual y cambiar el botón a "Actualizar cantidad".
- **O11 — Botones deshabilitados sin explicación.** `cart.js:203-205`: `sendBtn`, `clearBtn` y
  `nextBtn` se ponen `disabled` con la cotización vacía; un botón `disabled` no es enfocable ni
  anunciable. Usar `aria-disabled="true"` + `tabindex="0"` interceptando el click con el motivo. Y
  añadir un CTA al estado vacío (`cart.js:748`): "Ver suplementos".
- **O12 — Sin invalidación de `productsCache` en el sitio público.** `js/db.js:91, 550`: una pestaña
  abierta durante horas sigue mostrando precios y disponibilidad del primer fetch. TTL de ~5 min o
  refresco en `visibilitychange`.

---

## 5. Verificaciones que pasan ✅

- **WhatsApp centralizado.** El número solo existe en `js/whatsapp-config.js:1`. `cart.js:505` lo usa
  como fallback pero por referencia a la global, no hardcodeado. `js/admin/sections/leads.js:80`
  construye `wa.me/507${digits}` con el teléfono **del cliente**, no el de Javy — correcto.
- **XSS.** Todo el camino de la home está saneado: `script.js:200-227` (nombre, marca, imagen,
  presentación), `script.js:306-321` (combos), `cart.js:227-246` (ítems del panel), `:642-664`
  (modal), `:385-405` (campos del formulario), `dropdown.js:52-72`. Única laguna cosmética:
  `${i.quantity}` en `script.js:306`.
- **Contrato de `addItem`.** `{ flavor, flavor_id, quantity }` respetado desde el modal
  (`cart.js:683,701`), la PDP (`product-page.js:265`) y combos (`script.js:334`).
- **Listeners.** `bindConsultationSync` (`script.js:169-175`) usa un guard correcto que evita la
  fuga al re-renderizar. Los de `dropdown.js` se limpian bien en `close()` (`:162-171`).
- **`null`/`undefined`.** `productCanBeQuoted` (`script.js:41`), `normalizeQuoteItem` (`cart.js:79`)
  y el uso sistemático de `?.` cubren bien los casos.

> ⚠️ **Nota sobre admin.** `protectAdminPage` **no existe en el código** — no aparece en ningún
> `.js`/`.html`. La verificación de sesión vive en `js/auth.js:55-66` (`getCurrentAdminSession`) y
> `js/auth.js:68` (`requireAdminSession`), consumidas desde `include-nav.js:39`. Conviene alinear la
> documentación (`README.md`, `.claude/agents/logica.md`) o crear el helper.

---

## 6. Patrones inconsistentes entre páginas

| Concepto | Home (`script.js`) | Catálogo (`supplements.js`) | PDP (`product-page.js`) | Problema |
|---|---|---|---|---|
| Agregar a cotización | `:233-235` modal | `:759-761` modal | `:248-268` **inline**, sin modal | Tres páginas, dos UX |
| Feedback al agregar | toast (`cart.js:709`) | toast | **sin toast**, solo cambia el botón (`:266`) | La PDP no confirma nada |
| Sabor no elegido | toast + `aria-invalid` (`cart.js:686-698`) | ídem | texto del botón a "Elige un sabor" 1,2 s (`:253-255`) | Mensaje y mecanismo distintos |
| Sufijo "no disponible" | `" — No disponible"` (`:76`) | `" — No disponible"` (`:305`) | `" - No disponible"` guion corto (`:57, 240`) | Inconsistencia tipográfica |
| Formato de precio | `formatPrice` sin `$` + `$` en plantilla (`:5, 214`) | ídem (`:230, 740`) | inline `$${price.toFixed(2)}` (`:131`) | Origen de C1 y C4 |
| `escapeHTML` | `:21` | `:246` | `:3` | 3 copias (+ `cart.js:150`, `dropdown.js:22`) |
| `slugify` | `:31` (muerto) | `:77` | — | 2 copias + 2 variantes en `db.js` |
| `productCanBeQuoted` | `:41` | `:256` | `:13` | 3 copias idénticas |
| `syncAddButton` | `:125-161` | `:275-311` | `:212-246` (`syncPdpButtons`) | ~35 líneas triplicadas |
| Fallback de imagen rota | ninguno (`:201`) | ninguno (`:725`) | `onerror` (`:140`) | Solo la PDP es robusta |
| `decoding="async"` | ausente (`:201`) | presente (`:725`) | n/a | Divergencia sin motivo |
| Estado de carga | texto plano (`:259`) | **skeletons** (`:827-859`) | ninguno | La home y la PDP se sienten rotas al cargar |
| Aviso de datos offline | ninguno | `catalogOfflineNote` (`:1515-1520`) | ninguno | Solo el catálogo avisa |
| Abrir la cotización | hero (`:251`) + nav | + botón flotante (`:1401-1403`) | + barra móvil | El acceso flotante solo existe en el catálogo |
| `askAvailability` | `(product, {})` (`:237`) | `(product, {})` (`:763`) | `(product)` (`:279`) | Firma usada de dos formas |
| Breakpoint móvil en JS | `767px` (`:110`, muerto) | — | `767px` (`:333`) | Duplicado con `cart.css:465`, `cards.css:570` |

**Arreglo transversal.** Extraer `js/product-card.js` con `renderProductCard`, `syncAddButton`,
`setAddButtonState`, `productCanBeQuoted` y `bindConsultationSync` (hoy copiados literalmente entre
`script.js:117-243` y `supplements.js:267-771`), más `js/utils.js` con
`escapeHTML`/`slugify`/`formatPrice`. Elimina ~200 líneas duplicadas y cierra C1, C4, O6 y la mitad
de esta tabla de un golpe.

---

## 7. Tabla resumen: acción → problema principal → mejora

| Acción del index | Problema principal | Mejora propuesta |
|---|---|---|
| Cargar la home | Sin estado de error; se queda en "Cargando…" para siempre si `catalogDb` falla (`script.js:257-270`) | Bloque de error con "Reintentar" (R5) + skeletons como en el catálogo |
| Toda la página (nav) | `fetch` sin `catch` deja el `body` en `opacity: 0` → pantalla en blanco (`include-nav.js:6`) | `try/catch/finally` que siempre añade `page-transition-in` (C2) |
| Abrir menú móvil | Links tabulables estando invisibles; sin Escape, sin click-fuera, sin scroll-lock | `visibility:hidden` + `inert` + Escape + click-fuera + `aria-label` dinámico (C5) |
| Ver el badge | Mudo para lectores de pantalla; se desactualiza con "atrás" y con 2 pestañas | `aria-label` con el conteo + región `aria-live` + listeners `storage`/`pageshow` (R2, R6) |
| Hero "Ver productos" | El header sticky tapa el título; `smooth` ignora reduced-motion (`script.js:247`) | `scroll-margin-top: 100px` + `behavior` condicional (O4) |
| Hero "Abrir cotización" | Si el panel no existe cae en `openWhatsApp()`, que no hace nada visible (`cart.js:576`) | Fallback a `buildJavyWhatsappUrl` con mensaje genérico, o deshabilitar |
| Click en card destacada | Sin fallback de imagen rota; `lazy` en el LCP (`script.js:201`) | Listener `error` delegado + `eager`/`fetchpriority` en las 4 primeras (R16, R17) |
| "Agregar a cotización" | El modal enfoca un `<select>` `aria-hidden`; sin trampa de foco | `javyDropdown.focus(select)` + `trapFocus` + `inert` en el fondo (R1, C6) |
| "Consultar disponibilidad" | Falla en silencio si el popup se bloquea (`cart.js:538`) | Usar el retorno de `window.open` y ofrecer enlace de respaldo (C3) |
| "Agregar" (combo) | Nunca muestra "✓ En cotización"; sin selector de cantidad (`script.js:329-336`) | Reutilizar `openAddModal` + `card._javyProduct` + `bindConsultationSync` (R15) |
| Abrir panel | Sin trampa de foco; scroll-lock roto en iOS (`cart.js:573`, `:543`) | `trapFocus` + lock con `position:fixed` o eliminar el `scrollTo` muerto (C6, R10) |
| Cambiar cantidad | Se pierde el foco en cada click y el `aria-live` no anuncia (`cart.js:201, 238`) | Update quirúrgico de la fila + región viva persistente (R3) |
| Quitar un ítem | Irreversible; área táctil de 34 px (`cart.js:248`, `cart.css:259`) | Toast "Deshacer" de 5 s + área táctil de 44 px (R4, R7) |
| Vaciar la cotización | Confirmación presente pero sin trampa de foco (`cart.js:775`) | `trapFocus` en el `alertdialog` (C6) |
| Método de entrega | `goToStep("form")` enfoca un select `aria-hidden` (`cart.js:568`) | Enfocar el trigger visible del dropdown (R1) |
| Enviar por WhatsApp | Silencio total si el popup se bloquea; el total llega **sin `$`** | Enlace de respaldo visible + arreglar la colisión de `formatPrice` (C3, C1) |
| Validación al enviar | El hint no se anuncia ni enfoca el campo faltante (`cart.js:416`) | `role="alert"` + `focus()` + `aria-invalid` en el primer campo (R9) |
| Reels de Instagram | 4 iframes de terceros sin lazy; degradan a cajas vacías de 520 px | Facade con miniatura + carga bajo demanda; `role="list"` (O8) |
| Links del footer | `#destacados` no existe; email y año son placeholders (`index.html:170, 180, 198`) | Corregir el ancla, datos reales, año dinámico (O2, O3) |
| Footer → WhatsApp | Correcto: hidratado desde `whatsapp-config.js:16-25` | Sin cambios |

---

## 8. Orden de ataque sugerido

**Tanda 1 — una sola sesión, alto impacto y bajo riesgo**

1. `js/utils.js` con `escapeHTML`/`slugify`/`formatPrice` (con `$`), borrar las duplicadas y quitar
   el `$` de las plantillas → cierra **C1, C4, O6**.
2. `try/catch/finally` en `include-nav.js` → cierra **C2**.
3. Enlace de respaldo de WhatsApp → cierra **C3**.
4. `try/catch` en `saveConsultation` → cierra **R8**.
5. Ancla `#destacados`, año dinámico y email real → cierra **O2, O3**.

**Tanda 2 — accesibilidad**

6. Helper `trapFocus` + `inert` para los tres diálogos (**C6**).
7. `visibility` + `inert` + Escape en el menú móvil (**C5**).
8. `aria-label` con conteo y región `aria-live` para el badge (**R2**).
9. Update quirúrgico de cantidad + región viva única (**R3**).
10. `javyDropdown.focus()` y `role="alert"` en el hint (**R1, R9**).

**Tanda 3 — pulido de interacción**

11. Estado de error con "Reintentar" en home y combos (**R5**).
12. Listeners de `storage` y `pageshow` (**R6**).
13. Áreas táctiles a 44 px en el panel (**R7**).
14. Toast "Deshacer" al quitar (**R4**).
15. Combos con `openAddModal` y sync de botón (**R15**).

**Tanda 4 — refactor transversal**

16. `js/product-card.js` compartido entre home y catálogo.
17. Precio y stock por sabor (**R12**), `flavor_mode` (**R13**), memoización de
    `getConsultation` (**R18**).
