const CONSULTATION_KEY = "javy-consultation";
const LEGACY_CART_KEY = "cart";

// Imagen por defecto de un ítem de la cotización. Absoluta a propósito: ver
// quoteImageSrc().
const QUOTE_FALLBACK_IMAGE = "/img/icons/logo.png";

/* La BD guarda las imágenes con ruta relativa ("img/products/x.webp"), pero el
   panel de cotización se abre desde CUALQUIER página, incluidas las que viven
   en un subdirectorio (/producto/<slug>/ y /categoria/<slug>/). Ahí el
   navegador resolvía esa ruta contra el directorio de la página
   —/producto/<slug>/img/products/x.webp— y daba 404: el ítem aparecía con la
   imagen rota. Anclarlas a la raíz al pintarlas arregla también las
   cotizaciones ya guardadas en localStorage, que tienen la ruta relativa
   adentro. Mismo criterio que productImageSrc() en js/product-page.js. */
function quoteImageSrc(path) {
  const clean = String(path || "").trim();
  if (!clean) return QUOTE_FALLBACK_IMAGE;
  if (/^(https?:)?\/\//.test(clean) || clean.startsWith("data:")) return clean;
  return clean.startsWith("/") ? clean : "/" + clean;
}
let consultationScrollY = 0;
let consultationScrollLocked = false;

function readStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function saveConsultation(items) {
  // En Safari privado o con la cuota llena setItem lanza. Sin protección el
  // error se propagaba por addItem y reventaba el handler del modal antes de
  // cerrarlo: el usuario se quedaba con el modal abierto y sin explicación.
  try {
    localStorage.setItem(CONSULTATION_KEY, JSON.stringify(items));
  } catch (error) {
    console.warn("No se pudo guardar la cotización:", error.message);
    showToast("No pudimos guardar tu cotización en este navegador");
  }
  // Punto único por donde pasan add/remove/updateQuantity/clear: avisamos a la UI
  // (cards, detalle) para que sincronicen el estado de sus botones.
  document.dispatchEvent(new CustomEvent("consultation:change", { detail: { items } }));
}

// ¿Este producto (con este sabor) ya está en la cotización?
// La identidad coincide con la de addItem(): product_id + flavor (nombre).
function hasItem(productId, flavor = "") {
  if (!productId) return false;
  return getConsultation().some((item) => (
    item.product_id === productId && (item.flavor || "") === (flavor || "")
  ));
}

// Nombres de sabor de este producto que ya están en la cotización (para la nota).
function getAddedFlavors(productId) {
  if (!productId) return [];
  return getConsultation()
    .filter((item) => item.product_id === productId && item.flavor)
    .map((item) => item.flavor);
}

let toastTimerId = null;
function showToast(message) {
  let toast = document.getElementById("javyToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "javyToast";
    toast.className = "javy-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }

  toast.textContent = String(message || "");
  // Reinicia la animación si ya estaba visible.
  toast.classList.remove("is-visible");
  void toast.offsetWidth;
  toast.classList.add("is-visible");

  window.clearTimeout(toastTimerId);
  toastTimerId = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2200);
}

// Abre WhatsApp y, si el navegador bloquea el popup, deja un enlace de respaldo
// visible. Sin esto el usuario pulsa "Enviar" y no pasa absolutamente nada
// (iOS Safari bloquea window.open con frecuencia): es el último paso del embudo.
function sendToWhatsapp(message) {
  const url = typeof buildJavyWhatsappUrl === "function"
    ? buildJavyWhatsappUrl(message)
    : `https://wa.me/${JAVY_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  const win = typeof openJavyWhatsapp === "function"
    ? openJavyWhatsapp(message)
    : window.open(url, "_blank");

  if (win && !win.closed) {
    hideWhatsappFallback();
    return true;
  }

  showWhatsappFallback(url);
  return false;
}

function hideWhatsappFallback() {
  document.getElementById("javyWaFallback")?.classList.remove("is-visible");
}

function showWhatsappFallback(url) {
  let box = document.getElementById("javyWaFallback");
  if (!box) {
    box = document.createElement("div");
    box.id = "javyWaFallback";
    box.className = "javy-toast javy-toast--action";
    box.setAttribute("role", "alert");
    box.innerHTML = `
      <span>Tu navegador bloqueó la ventana de WhatsApp.</span>
      <a class="javy-toast__link" target="_blank" rel="noopener">Abrir WhatsApp</a>
      <button type="button" class="javy-toast__close" aria-label="Cerrar aviso">×</button>
    `;
    box.querySelector(".javy-toast__close").addEventListener("click", hideWhatsappFallback);
    document.body.appendChild(box);
  }

  const link = box.querySelector(".javy-toast__link");
  link.href = url;
  box.classList.add("is-visible");
  link.focus();
}

function getLegacyProductSnapshot(id) {
  if (typeof PRODUCTS === "undefined" || !PRODUCTS[id]) return null;
  const product = PRODUCTS[id];

  return {
    product_id: product.id,
    legacy_id: product.id,
    name: product.nombre,
    brand: product.marca,
    category: product.categoria,
    price: Number(product.precio || 0),
    presentation: product.presentacion || "",
    image: product.imagen || QUOTE_FALLBACK_IMAGE,
    available: product.disponible !== false,
  };
}

function normalizeQuoteItem(item) {
  if (item.product_id && item.name) {
    return {
      product_id: item.product_id,
      legacy_id: item.legacy_id || item.product_id,
      name: item.name,
      brand: item.brand || "",
      category: item.category || "",
      price: Number(item.price || 0),
      presentation: item.presentation || "",
      image: item.image || QUOTE_FALLBACK_IMAGE,
      flavor: item.flavor || "",
      flavor_id: item.flavor_id || "",
      quantity: Math.max(1, Number(item.quantity || 1)),
    };
  }

  const fallback = getLegacyProductSnapshot(item.id || item.product_id);
  if (!fallback) {
    return {
      product_id: item.id || item.product_id,
      name: item.id || item.product_id || "Producto",
      brand: "",
      category: "",
      price: 0,
      presentation: "",
      image: QUOTE_FALLBACK_IMAGE,
      flavor: item.flavor || "",
      quantity: Math.max(1, Number(item.quantity || 1)),
    };
  }

  return {
    ...fallback,
    flavor: item.flavor || "",
    quantity: Math.max(1, Number(item.quantity || 1)),
  };
}

function productToQuoteItem(product, options = {}) {
  return {
    product_id: product.id,
    legacy_id: product.legacy_id || product.id,
    name: product.name || product.nombre,
    brand: product.brand || product.marca || "",
    category: product.category || product.categoria || "",
    price: Number(product.price ?? product.precio ?? 0),
    presentation: product.presentation || product.presentacion || "",
    image: product.image || product.imagen || QUOTE_FALLBACK_IMAGE,
    flavor: options.flavor || "",
    flavor_id: options.flavor_id || "",
    quantity: Math.max(1, Number(options.quantity || 1)),
  };
}

function getConsultation() {
  const current = readStorage(CONSULTATION_KEY).map(normalizeQuoteItem);
  if (current.length) return current;

  const legacyCart = readStorage(LEGACY_CART_KEY);
  if (!legacyCart.length) return [];

  const migrated = legacyCart.map(normalizeQuoteItem);
  saveConsultation(migrated);
  return migrated;
}

function getConsultationCount() {
  return getConsultation().reduce((total, item) => total + Number(item.quantity || 1), 0);
}

function escapeHTML(value = "") {
  return value
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Nombre propio (no `formatPrice`) a propósito: script.js y supplements.js son
// scripts clásicos que comparten el scope global y declaran su propia
// formatPrice; como cargan DESPUÉS de cart.js, sobrescribían esta y el total
// del mensaje de WhatsApp salía sin el símbolo de moneda.
function formatMoney(price) {
  const value = Number(price || 0);
  return value > 0 ? `$${value.toFixed(2)}` : "Consultar";
}

function getDisplayPresentation(item) {
  if (!item.presentation) return "";
  return item.name.toLowerCase().includes(item.presentation.toLowerCase()) ? "" : ` ${item.presentation}`;
}

function updateConsultationBadge() {
  const badges = document.querySelectorAll("#consultationBadge, #cartBadge, [data-consultation-count]");
  if (!badges.length) return;

  const count = getConsultationCount();
  badges.forEach((badge) => {
    badge.textContent = String(count);
    badge.hidden = count === 0;
  });
}

function updateQuantity(index, quantity) {
  const items = getConsultation();
  if (!items[index]) return;

  items[index].quantity = Math.max(1, Number(quantity || 1));
  saveConsultation(items);
  updateConsultationBadge();
  renderConsultationPanel();
}

function renderConsultationPanel() {
  const panel = document.getElementById("consultationPanel");
  const list = document.getElementById("consultationList");
  const empty = document.getElementById("consultationEmpty");
  const sendBtn = document.getElementById("consultationSend");
  const clearBtn = document.getElementById("consultationClear");
  const nextBtn = document.getElementById("consultationNext");
  if (!panel || !list || !empty || !sendBtn || !clearBtn) return;

  const items = getConsultation();
  list.innerHTML = "";
  empty.hidden = items.length > 0;
  sendBtn.disabled = items.length === 0;
  clearBtn.disabled = items.length === 0;
  if (nextBtn) nextBtn.disabled = items.length === 0;

  const totalEl = document.getElementById("consultationTotal");
  const totalValueEl = document.getElementById("consultationTotalValue");
  if (totalEl && totalValueEl) {
    const { total } = computeQuoteTotals(items);
    totalValueEl.textContent = formatMoney(total);
    totalEl.hidden = items.length === 0 || total <= 0;
  }

  items.forEach((item, index) => {
    const unit = Number(item.price);
    const qty = Number(item.quantity || 1);
    const presentation = getDisplayPresentation(item).trim();
    const priceLine = unit > 0
      ? (qty > 1
          ? `${formatMoney(unit)} c/u · <strong>${formatMoney(unit * qty)}</strong>`
          : formatMoney(unit))
      : "Consultar";

    const row = document.createElement("li");
    row.className = "consultation-item";
    row.innerHTML = `
      <img src="${escapeHTML(quoteImageSrc(item.image))}" alt="${escapeHTML(item.name)}" class="consultation-item__img" />
      <div class="consultation-item__info">
        <strong class="consultation-item__name">${escapeHTML(item.name)}</strong>
        <span class="consultation-item__meta">${escapeHTML(item.brand || "Producto")} · ${escapeHTML(item.category || "Categoria por confirmar")}</span>
        <span class="consultation-item__price">${presentation ? escapeHTML(presentation) + " · " : ""}${priceLine}</span>
        ${item.flavor ? `<span class="consultation-item__flavor">${escapeHTML(item.flavor)}</span>` : ""}
        <div class="consultation-item__quantity">
          <span class="consultation-item__quantity-label">Cantidad</span>
          <div class="consultation-item__stepper" role="group" aria-label="Cantidad de ${escapeHTML(item.name)}">
            <button class="consultation-item__step" type="button" data-quote-step="-1" aria-label="Quitar uno"${qty <= 1 ? " disabled" : ""}>&minus;</button>
            <span class="consultation-item__qty" aria-live="polite">${qty}</span>
            <button class="consultation-item__step" type="button" data-quote-step="1" aria-label="Agregar uno">+</button>
          </div>
        </div>
      </div>
      <button class="consultation-item__remove" type="button" aria-label="Quitar ${escapeHTML(item.name)}">
        <span class="btn-icon" data-javy-icon="trash"></span>
      </button>
    `;

    row.querySelector(".consultation-item__remove")?.addEventListener("click", () => {
      removeItem(index);
    });

    row.querySelectorAll("[data-quote-step]").forEach((btn) => {
      btn.addEventListener("click", () => {
        updateQuantity(index, qty + Number(btn.dataset.quoteStep));
      });
    });

    list.appendChild(row);
  });

  window.javyIcons?.enhance?.(list);
}

function addItem(productOrId, options = {}) {
  const product = typeof productOrId === "string"
    ? getLegacyProductSnapshot(productOrId)
    : productOrId;

  if (!product) return;

  const nextItem = productToQuoteItem(product, options);
  const items = getConsultation();
  const existingItem = items.find((item) => (
    item.product_id === nextItem.product_id &&
    (item.flavor || "") === (nextItem.flavor || "")
  ));

  if (existingItem) {
    existingItem.quantity += nextItem.quantity;
  } else {
    items.push(nextItem);
  }

  saveConsultation(items);
  updateConsultationBadge();
  renderConsultationPanel();
}

function removeItem(indexOrId) {
  const items = getConsultation();
  const nextItems = typeof indexOrId === "number"
    ? items.filter((_, index) => index !== indexOrId)
    : items.filter((item) => item.product_id !== indexOrId && item.legacy_id !== indexOrId);

  saveConsultation(nextItems);
  updateConsultationBadge();
  renderConsultationPanel();
}

function clearConsultation() {
  saveConsultation([]);
  updateConsultationBadge();
  renderConsultationPanel();
}

// Confirmación antes de vaciar: evita borrar toda la cotización por accidente.
function isClearConfirmOpen() {
  const confirm = document.getElementById("consultationConfirm");
  return !!confirm && !confirm.hidden;
}

function showClearConfirm() {
  const confirm = document.getElementById("consultationConfirm");
  if (!confirm) return clearConsultation();
  if (!getConsultation().length) return;
  confirm.hidden = false;
  document.getElementById("consultationConfirmCancel")?.focus({ preventScroll: true });
}

function hideClearConfirm(refocus = true) {
  const confirm = document.getElementById("consultationConfirm");
  if (!confirm) return;
  confirm.hidden = true;
  if (refocus) {
    const clearBtn = document.getElementById("consultationClear");
    if (clearBtn && !clearBtn.disabled) clearBtn.focus({ preventScroll: true });
  }
}

function getPanelFieldValue(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

const QUOTE_METHODS = {
  retiro: {
    title: "Retiro en Tienda",
    fields: [
      { id: "quoteName", label: "Nombre de quien retira", type: "text", placeholder: "Nombre y apellido", autocomplete: "name", required: true },
      { id: "quotePhone", label: "Telefono", type: "tel", placeholder: "Ej: 6000-0000", autocomplete: "tel", required: true },
    ],
  },
  ferguson: {
    title: "Transporte Ferguson",
    fields: [
      { id: "quoteName", label: "Nombre del destinatario", type: "text", placeholder: "Nombre y apellido", autocomplete: "name", required: true },
      { id: "quotePhone", label: "Telefono", type: "tel", placeholder: "Ej: 6000-0000", autocomplete: "tel", required: true },
      {
        id: "quoteDestino",
        label: "Destino / sucursal",
        type: "select",
        placeholder: "Selecciona la sucursal",
        required: true,
        options: [
          { group: "Panamá Oeste", items: ["Chorrera", "Arraiján"] },
          { group: "Colón / Darién", items: ["Colón", "Darién"] },
          { group: "Panamá", items: ["Calle 50", "San Pedro", "J. Arosemena", "Vista Hermosa", "24 de Diciembre"] },
          { group: "Provincias Centrales", items: ["Penonomé", "Aguadulce", "Chitré", "Las Tablas", "Santiago"] },
          { group: "Chiriquí", items: ["David", "Boquete", "Concepción", "Volcán", "Puerto Armuelles"] },
        ],
      },
      { id: "quoteCedula", label: "Cedula", type: "text", placeholder: "Ej: 8-888-8888", required: true },
    ],
  },
  domicilio: {
    title: "Domicilio",
    fields: [
      { id: "quoteName", label: "Nombre", type: "text", placeholder: "Nombre y apellido", autocomplete: "name", required: true },
      { id: "quotePhone", label: "Telefono", type: "tel", placeholder: "Ej: 6000-0000", autocomplete: "tel", required: true },
      { id: "quoteDireccion", label: "Direccion / zona", type: "text", placeholder: "Ej: San Miguelito, calle principal...", autocomplete: "street-address", required: true },
      { id: "quoteHora", label: "Hora preferida (opcional)", type: "text", placeholder: "Ej: despues de las 5 pm", required: false },
    ],
  },
};

function getQuoteMethod() {
  return document.getElementById("quoteMethod")?.value || "retiro";
}

function renderQuoteFields(method) {
  const container = document.getElementById("quoteFields");
  if (!container) return;
  if (window.javyDropdown) window.javyDropdown.destroy(container);

  const config = QUOTE_METHODS[method] || QUOTE_METHODS.retiro;
  container.innerHTML = config.fields.map((field) => {
    const labelHtml = `<label for="${field.id}">${escapeHTML(field.label)}</label>`;

    if (field.type === "select") {
      const groupsHtml = (field.options || []).map((opt) => {
        const optionsHtml = opt.items
          .map((item) => `<option value="${escapeHTML(item)}">${escapeHTML(item)}</option>`)
          .join("");
        return `<optgroup label="${escapeHTML(opt.group)}">${optionsHtml}</optgroup>`;
      }).join("");

      return `<div class="consultation-field">${labelHtml}
        <select id="${field.id}"${field.required ? " required" : ""}>
          <option value="">${escapeHTML(field.placeholder || "Selecciona una opcion")}</option>
          ${groupsHtml}
        </select></div>`;
    }

    return `<div class="consultation-field">${labelHtml}
      <input id="${field.id}" type="${field.type}" placeholder="${escapeHTML(field.placeholder || "")}"${field.autocomplete ? ` autocomplete="${field.autocomplete}"` : ""}${field.required ? " required" : ""} /></div>`;
  }).join("");
  if (window.javyDropdown) window.javyDropdown.enhanceSelects(container);
}

function getMissingQuoteFields() {
  const config = QUOTE_METHODS[getQuoteMethod()] || QUOTE_METHODS.retiro;
  return config.fields
    .filter((field) => field.required && !getPanelFieldValue(field.id))
    .map((field) => field.label);
}

function showQuoteHint(text) {
  const hint = document.getElementById("quoteHint");
  if (!hint) return;
  hint.textContent = text || "";
  hint.hidden = !text;
}

function computeQuoteTotals(items) {
  const lineTotals = items
    .filter((item) => Number(item.price) > 0)
    .map((item) => Number(item.price) * Number(item.quantity || 1));
  const total = lineTotals.reduce((sum, value) => sum + value, 0);
  const hasUnpriced = items.some((item) => !(Number(item.price) > 0));
  return { lineTotals, total, hasUnpriced };
}

function buildProductLine(item) {
  const name = `${item.name}${getDisplayPresentation(item)}`;
  const flavorText = item.flavor ? ` | Sabor: ${item.flavor}` : "";
  const qty = Number(item.quantity || 1);
  const qtyText = qty > 1 ? `(x${qty}) ` : "";
  const priceText = Number(item.price) > 0
    ? `  $${(Number(item.price) * qty).toFixed(2)}`
    : "  Consultar";
  return `${qtyText}${name}${flavorText}${priceText}`;
}

function buildConsultationMessage() {
  const items = getConsultation();
  const method = getQuoteMethod();
  const config = QUOTE_METHODS[method] || QUOTE_METHODS.retiro;

  const dataLines = [];
  const name = getPanelFieldValue("quoteName");
  const phone = getPanelFieldValue("quotePhone");
  if (name) dataLines.push(name);
  if (phone) dataLines.push(phone);
  if (method === "ferguson") {
    const destino = getPanelFieldValue("quoteDestino");
    const cedula = getPanelFieldValue("quoteCedula");
    if (destino) dataLines.push(`Destino: ${destino}`);
    if (cedula) dataLines.push(`Cedula: ${cedula}`);
  } else if (method === "domicilio") {
    const direccion = getPanelFieldValue("quoteDireccion");
    const hora = getPanelFieldValue("quoteHora");
    if (direccion) dataLines.push(`Direccion: ${direccion}`);
    if (hora) dataLines.push(`Hora: ${hora}`);
  }

  const productLines = items.length
    ? items.map(buildProductLine)
    : ["- Quiero cotizar suplementos disponibles."];

  const { lineTotals, total, hasUnpriced } = computeQuoteTotals(items);

  const lines = [config.title, ""];
  if (dataLines.length) lines.push(...dataLines, "");
  lines.push(...productLines, "");

  if (lineTotals.length) {
    const sumExpr = lineTotals.map((value) => value.toFixed(2)).join(" + ");
    lines.push(`${sumExpr} = ${total.toFixed(2)}`, "");
    lines.push(`Total a pagar: ${formatMoney(total)}`);
  }
  if (hasUnpriced) lines.push("* Productos con precio por confirmar.");

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function openWhatsApp() {
  if (!getConsultation().length) {
    showQuoteHint("Agrega al menos un producto a la cotizacion.");
    return;
  }

  const missing = getMissingQuoteFields();
  if (missing.length) {
    showQuoteHint(`Completa: ${missing.join(", ")}.`);
    return;
  }

  showQuoteHint("");
  sendToWhatsapp(buildConsultationMessage());
}

function quoteSingleProduct(product, options = {}) {
  const item = productToQuoteItem(product, options);
  const flavorText = item.flavor ? `\nSabor: ${item.flavor}` : "";
  const priceText = item.price > 0 ? `\nPrecio aprox: $${item.price.toFixed(2)}` : "";
  const message = [
    `Hola Javy, quiero cotizar este producto: ${item.name}.`,
    item.presentation ? `Presentacion: ${item.presentation}` : "",
    item.brand ? `Marca: ${item.brand}` : "",
    flavorText,
    priceText,
    "",
    "Quiero saber disponibilidad, precio final y opciones de entrega.",
  ].filter(Boolean).join("\n");

  sendToWhatsapp(message);
}

function askAvailability(product, options = {}) {
  const item = productToQuoteItem(product, options);
  const message = [
    `Hola Javy, quiero consultar disponibilidad de ${item.name}.`,
    item.brand ? `Marca: ${item.brand}` : "",
    item.presentation ? `Presentacion: ${item.presentation}` : "",
    item.flavor ? `Sabor: ${item.flavor}` : "",
    "",
    "Me confirmas disponibilidad, precio final y opciones de entrega?",
  ].filter(Boolean).join("\n");

  sendToWhatsapp(message);
}

function lockConsultationScroll() {
  if (consultationScrollLocked) return;

  consultationScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.classList.add("has-consultation-open");
  consultationScrollLocked = true;
}

function unlockConsultationScroll() {
  if (!consultationScrollLocked) return;

  const targetY = consultationScrollY;
  document.body.classList.remove("has-consultation-open");
  consultationScrollLocked = false;
  window.scrollTo(0, targetY);
}

function goToStep(step) {
  const panel = document.getElementById("consultationPanel");
  if (!panel) return;

  panel.dataset.step = step;
  showQuoteHint("");

  // mover el foco al inicio de la nueva etapa (a11y: el usuario percibe el avance)
  const focusId = step === "form" ? "quoteMethod" : "consultationNext";
  const target = document.getElementById(focusId);
  if (target && !target.disabled) target.focus({ preventScroll: true });
}

function openPanel() {
  const panel = document.getElementById("consultationPanel");
  const overlay = document.getElementById("consultationOverlay");
  if (!panel || !overlay) return openWhatsApp();

  panel.dataset.step = "products";
  renderConsultationPanel();
  overlay.hidden = false;
  panel.setAttribute("aria-hidden", "false");
  panel.classList.add("is-open");
  lockConsultationScroll();
  panel.querySelector(".consultation-panel__close")?.focus({ preventScroll: true });
}

function closePanel() {
  const panel = document.getElementById("consultationPanel");
  const overlay = document.getElementById("consultationOverlay");
  if (!panel || !overlay) return;

  if (window.javyDropdown) window.javyDropdown.closeAll();
  hideClearConfirm(false);
  panel.classList.remove("is-open");
  panel.setAttribute("aria-hidden", "true");
  overlay.hidden = true;
  unlockConsultationScroll();
}

/* ----------------------------------------------------------------------------
   Modal de "Agregar": elige sabor (si hay) + cantidad antes de sumar a la
   cotización. Reemplaza los selectores inline de las cards para acortarlas.
   ---------------------------------------------------------------------------- */
let addModalEl = null;
let addModalOpener = null;
function addModalOnKey(e) { if (e.key === "Escape") closeAddModal(); }
function closeAddModal() {
  if (!addModalEl) return;
  if (window.javyDropdown && window.javyDropdown.closeAll) window.javyDropdown.closeAll();
  document.removeEventListener("keydown", addModalOnKey);
  addModalEl.remove();
  addModalEl = null;
  unlockConsultationScroll();
  addModalOpener?.focus?.({ preventScroll: true }); // devolver el foco a quien lo abrió
  addModalOpener = null;
}

function openAddModal(productOrId) {
  const product = typeof productOrId === "string" ? getLegacyProductSnapshot(productOrId) : productOrId;
  if (!product) return;
  closeAddModal();
  addModalOpener = document.activeElement; // para devolver el foco al cerrar

  const flavors = (product.flavors || []).filter(Boolean);
  const hasFlavors = flavors.length > 0;
  const name = product.name || product.nombre || "Producto";
  const brand = product.brand || product.marca || "";
  const image = product.image || product.imagen || QUOTE_FALLBACK_IMAGE;
  const price = Number(product.price ?? product.precio ?? 0);

  const flavorField = hasFlavors ? `
    <div class="quick-add__field">
      <label class="quick-add__label" for="quickAddFlavor">Sabor</label>
      <select id="quickAddFlavor" class="quick-add__select" data-qa-flavor>
        <option value="">Elegir sabor</option>
        ${flavors.map((f) => `<option value="${escapeHTML(f.id)}"${f.available === false ? " disabled" : ""}>${escapeHTML(f.name)}${f.available === false ? " — No disponible" : ""}</option>`).join("")}
      </select>
    </div>` : "";

  const overlay = document.createElement("div");
  overlay.className = "quick-add-overlay";
  overlay.innerHTML = `
    <div class="quick-add" role="dialog" aria-modal="true" aria-label="Agregar ${escapeHTML(name)} a la cotización">
      <button class="quick-add__close" type="button" aria-label="Cerrar" data-qa-close>
        <span class="btn-icon" data-javy-icon="x" aria-hidden="true"></span>
      </button>
      <div class="quick-add__head">
        <img class="quick-add__img" src="${escapeHTML(quoteImageSrc(image))}" alt="" />
        <div class="quick-add__headinfo">
          <strong class="quick-add__name">${escapeHTML(name)}</strong>
          <span class="quick-add__meta">${brand ? escapeHTML(brand) + " · " : ""}${escapeHTML(formatMoney(price))}</span>
        </div>
      </div>
      ${flavorField}
      <div class="quick-add__field">
        <span class="quick-add__label">Cantidad</span>
        <div class="quick-add__stepper" role="group" aria-label="Cantidad">
          <button type="button" class="quick-add__qty-btn" data-qa-dec aria-label="Disminuir">−</button>
          <span class="quick-add__qty" data-qa-qty aria-live="polite">1</span>
          <button type="button" class="quick-add__qty-btn quick-add__qty-btn--plus" data-qa-inc aria-label="Aumentar">+</button>
        </div>
      </div>
      <button class="quick-add__submit" type="button" data-qa-add>Agregar a cotización</button>
    </div>`;

  document.body.appendChild(overlay);
  addModalEl = overlay;
  window.javyIcons?.enhance?.(overlay);
  if (window.javyDropdown) window.javyDropdown.enhanceSelects(overlay);
  lockConsultationScroll();
  document.addEventListener("keydown", addModalOnKey);

  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeAddModal(); });
  overlay.querySelector("[data-qa-close]").addEventListener("click", closeAddModal);

  let qty = 1;
  const qtyEl = overlay.querySelector("[data-qa-qty]");
  overlay.querySelector("[data-qa-dec]").addEventListener("click", () => { qty = Math.max(1, qty - 1); qtyEl.textContent = qty; });
  overlay.querySelector("[data-qa-inc]").addEventListener("click", () => { qty = Math.min(99, qty + 1); qtyEl.textContent = qty; });

  const flavorSelect = overlay.querySelector("[data-qa-flavor]");
  overlay.querySelector("[data-qa-add]").addEventListener("click", () => {
    const opts = { quantity: qty };
    if (hasFlavors) {
      const val = flavorSelect.value;
      if (!val) {
        // javyDropdown deja el select nativo invisible y aria-hidden: el foco
        // y el aria-invalid deben ir al trigger visible del dropdown.
        const visibleTrigger = flavorSelect._jdd?.querySelector(".jdd__btn, .jdd__combo") || flavorSelect;
        flavorSelect.classList.add("needs-selection");
        visibleTrigger.setAttribute("aria-invalid", "true");
        window.setTimeout(() => {
          flavorSelect.classList.remove("needs-selection");
          visibleTrigger.removeAttribute("aria-invalid");
        }, 1200);
        showToast("Elegí un sabor");
        visibleTrigger.focus?.();
        return;
      }
      const f = flavors.find((x) => String(x.id) === String(val));
      if (f) { opts.flavor = f.name; opts.flavor_id = f.id; }
    }
    if (hasItem(product.id, opts.flavor || "")) {
      showToast(opts.flavor ? "Ese sabor ya está en tu cotización" : "Ya está en tu cotización");
      closeAddModal();
      return;
    }
    addItem(product, opts);
    showToast("Agregado a tu cotización");
    closeAddModal();
  });

  window.setTimeout(() => {
    (overlay.querySelector("[data-qa-flavor]") || overlay.querySelector("[data-qa-add]"))?.focus?.();
  }, 40);
}

function createConsultationPanel() {
  if (document.getElementById("consultationPanel")) return;

  const overlay = document.createElement("div");
  overlay.className = "consultation-overlay";
  overlay.id = "consultationOverlay";
  overlay.hidden = true;

  const panel = document.createElement("aside");
  panel.className = "consultation-panel";
  panel.id = "consultationPanel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "Cotizacion por WhatsApp");
  panel.setAttribute("aria-hidden", "true");
  panel.dataset.step = "products";
  panel.innerHTML = `
    <div class="consultation-panel__header">
      <div>
        <p class="consultation-panel__eyebrow">WhatsApp con Javy</p>
        <h2>Mi cotizacion</h2>
      </div>
      <button class="consultation-panel__close" type="button" aria-label="Cerrar cotizacion">
        <span class="btn-icon" data-javy-icon="x" aria-hidden="true"></span>
      </button>
    </div>

    <div class="consultation-panel__body">
      <section class="consultation-panel__products" aria-label="Productos de la cotizacion">
        <h3 class="consultation-section__title">Productos</h3>
        <p class="consultation-empty" id="consultationEmpty">Aun no agregaste productos a la cotizacion.</p>
        <ul class="consultation-list" id="consultationList"></ul>
        <div class="consultation-total" id="consultationTotal" hidden>
          <span>Total estimado</span>
          <strong id="consultationTotalValue">$0.00</strong>
        </div>
      </section>

      <section class="consultation-panel__checkout" aria-label="Datos de envio">
        <h3 class="consultation-section__title">Datos de envio</h3>
        <div class="consultation-form">
          <div class="consultation-field">
            <label for="quoteMethod">Metodo de entrega</label>
            <select id="quoteMethod">
              <option value="retiro">Retiro en Tienda</option>
              <option value="ferguson">Transporte Ferguson</option>
              <option value="domicilio">Domicilio</option>
            </select>
          </div>

          <div id="quoteFields"></div>

          <p class="consultation-form__hint" id="quoteHint" hidden></p>
        </div>
      </section>
    </div>

    <div class="consultation-confirm" id="consultationConfirm" role="alertdialog" aria-modal="true" aria-labelledby="consultationConfirmTitle" hidden>
      <div class="consultation-confirm__card">
        <p class="consultation-confirm__title" id="consultationConfirmTitle">¿Vaciar toda la cotización?</p>
        <p class="consultation-confirm__text">Se quitarán todos los productos. Esta acción no se puede deshacer.</p>
        <div class="consultation-confirm__actions">
          <button class="consultation-confirm__cancel" id="consultationConfirmCancel" type="button">Cancelar</button>
          <button class="consultation-confirm__accept" id="consultationConfirmAccept" type="button">Sí, vaciar</button>
        </div>
      </div>
    </div>

    <div class="consultation-panel__footer">
      <button class="consultation-nav__back" id="consultationBack" type="button">‹ Volver</button>
      <button class="consultation-panel__clear" id="consultationClear" type="button">Vaciar</button>
      <button class="consultation-nav__next" id="consultationNext" type="button">Continuar ›</button>
      <button class="consultation-panel__send" id="consultationSend" type="button">Enviar por WhatsApp</button>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(panel);
  window.javyIcons?.enhance?.(panel);

  renderQuoteFields(getQuoteMethod());
  if (window.javyDropdown) window.javyDropdown.enhance(panel.querySelector("#quoteMethod"));

  overlay.addEventListener("click", closePanel);
  panel.querySelector(".consultation-panel__close")?.addEventListener("click", closePanel);
  panel.querySelector("#consultationClear")?.addEventListener("click", showClearConfirm);
  panel.querySelector("#consultationConfirmCancel")?.addEventListener("click", () => hideClearConfirm());
  panel.querySelector("#consultationConfirmAccept")?.addEventListener("click", () => {
    clearConsultation();
    hideClearConfirm(false);
    panel.querySelector(".consultation-panel__close")?.focus({ preventScroll: true });
  });
  panel.querySelector("#consultationConfirm")?.addEventListener("click", (event) => {
    // clic en el fondo (fuera de la tarjeta) = cancelar
    if (event.target === event.currentTarget) hideClearConfirm();
  });
  panel.querySelector("#consultationSend")?.addEventListener("click", openWhatsApp);
  panel.querySelector("#consultationNext")?.addEventListener("click", () => goToStep("form"));
  panel.querySelector("#consultationBack")?.addEventListener("click", () => goToStep("products"));
  panel.querySelector("#quoteMethod")?.addEventListener("change", (event) => {
    renderQuoteFields(event.target.value);
    showQuoteHint("");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (document.querySelector(".jdd.is-open")) return;
    // Esc cierra primero el aviso de vaciar; si no, cierra el panel.
    if (isClearConfirmOpen()) hideClearConfirm();
    else closePanel();
  });

  // En mobile el teclado virtual reduce el viewport y puede tapar inputs;
  // al enfocar, scrolleamos el input para que quede visible.
  panel.querySelector(".consultation-panel__checkout")?.addEventListener("focusin", (event) => {
    if (event.target.matches("input, select, textarea")) {
      setTimeout(() => event.target.scrollIntoView({ behavior: "smooth", block: "nearest" }), 350);
    }
  });

  renderConsultationPanel();
}

document.addEventListener("DOMContentLoaded", () => {
  createConsultationPanel();
  updateConsultationBadge();
});

window.consultation = {
  getItems: getConsultation,
  saveItems: saveConsultation,
  getCount: getConsultationCount,
  updateBadge: updateConsultationBadge,
  addItem,
  removeItem,
  hasItem,
  getAddedFlavors,
  toast: showToast,
  clear: clearConsultation,
  buildMessage: buildConsultationMessage,
  openWhatsApp,
  openPanel,
  closePanel,
  openAddModal,
  renderPanel: renderConsultationPanel,
  quoteSingleProduct,
  askAvailability,
};

window.cart = {
  getCart: getConsultation,
  saveCart: saveConsultation,
  getCartCount: getConsultationCount,
  updateCartBadge: updateConsultationBadge,
  addToCart: addItem,
};
