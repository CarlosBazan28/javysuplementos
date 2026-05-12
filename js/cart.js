const CONSULTATION_KEY = "javy-consultation";
const LEGACY_CART_KEY = "cart";
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
  localStorage.setItem(CONSULTATION_KEY, JSON.stringify(items));
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
    image: product.imagen || "img/icons/logo.png",
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
      image: item.image || "img/icons/logo.png",
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
      image: "img/icons/logo.png",
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
    image: product.image || product.imagen || "img/icons/logo.png",
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

function formatPrice(price) {
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
  if (!panel || !list || !empty || !sendBtn || !clearBtn) return;

  const items = getConsultation();
  list.innerHTML = "";
  empty.hidden = items.length > 0;
  sendBtn.disabled = items.length === 0;
  clearBtn.disabled = items.length === 0;

  items.forEach((item, index) => {
    const row = document.createElement("li");
    row.className = "consultation-item";
    row.innerHTML = `
      <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" class="consultation-item__img" />
      <div class="consultation-item__info">
        <strong>${escapeHTML(item.name)}</strong>
        <span>${escapeHTML(item.brand || "Producto")} · ${escapeHTML(item.category || "Categoria por confirmar")}</span>
        <span>${escapeHTML(item.presentation || "Presentacion por confirmar")} · ${formatPrice(item.price)}</span>
        ${item.flavor ? `<span>Sabor: ${escapeHTML(item.flavor)}</span>` : ""}
        <label class="consultation-item__quantity">
          Cantidad
          <input type="number" min="1" step="1" value="${item.quantity}" data-quote-quantity="${index}" />
        </label>
      </div>
      <button class="consultation-item__remove" type="button" aria-label="Quitar ${escapeHTML(item.name)}">
        Quitar
      </button>
    `;

    row.querySelector(".consultation-item__remove")?.addEventListener("click", () => {
      removeItem(index);
    });

    row.querySelector("[data-quote-quantity]")?.addEventListener("change", (event) => {
      updateQuantity(index, event.target.value);
    });

    list.appendChild(row);
  });
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

function getPanelFieldValue(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function buildConsultationMessage() {
  const items = getConsultation();
  const customerName = getPanelFieldValue("quoteCustomerName");
  const customerZone = getPanelFieldValue("quoteCustomerZone");
  const comment = getPanelFieldValue("quoteComment");

  const lines = items.map((item) => {
    const flavorText = item.flavor ? ` | Sabor: ${item.flavor}` : "";
    const priceText = item.price > 0 ? ` | Precio aprox: $${Number(item.price).toFixed(2)}` : "";
    return `- ${item.name}${getDisplayPresentation(item)}${flavorText} | Cantidad: ${item.quantity}${priceText}`;
  });

  return [
    "Hola Javy, quiero hacer una cotizacion.",
    "",
    "Productos:",
    ...(lines.length ? lines : ["- Quiero cotizar suplementos disponibles."]),
    "",
    "Datos:",
    `Nombre: ${customerName || ""}`,
    `Zona: ${customerZone || ""}`,
    "",
    "Comentario:",
    comment || "",
    "",
    "Quiero saber disponibilidad, precio final y opciones de entrega.",
  ].join("\n");
}

function openWhatsApp() {
  const message = buildConsultationMessage();
  if (typeof openJavyWhatsapp === "function") {
    openJavyWhatsapp(message);
    return;
  }

  const encodedMessage = encodeURIComponent(message);
  window.open(`https://wa.me/50763932305?text=${encodedMessage}`, "_blank");
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

  if (typeof openJavyWhatsapp === "function") {
    openJavyWhatsapp(message);
  }
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

  if (typeof openJavyWhatsapp === "function") {
    openJavyWhatsapp(message);
  }
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

function openPanel() {
  const panel = document.getElementById("consultationPanel");
  const overlay = document.getElementById("consultationOverlay");
  if (!panel || !overlay) return openWhatsApp();

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

  panel.classList.remove("is-open");
  panel.setAttribute("aria-hidden", "true");
  overlay.hidden = true;
  unlockConsultationScroll();
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
  panel.innerHTML = `
    <div class="consultation-panel__header">
      <div>
        <p class="consultation-panel__eyebrow">WhatsApp con Javy</p>
        <h2>Mi cotizacion</h2>
      </div>
      <button class="consultation-panel__close" type="button" aria-label="Cerrar cotizacion">x</button>
    </div>

    <p class="consultation-empty" id="consultationEmpty">Aun no agregaste productos a la cotizacion.</p>
    <ul class="consultation-list" id="consultationList"></ul>

    <div class="consultation-form">
      <label for="quoteCustomerName">Nombre</label>
      <input id="quoteCustomerName" type="text" placeholder="Tu nombre" autocomplete="name" />

      <label for="quoteCustomerZone">Zona</label>
      <input id="quoteCustomerZone" type="text" placeholder="Ej: San Miguelito, Condado, Brisas" autocomplete="address-level2" />

      <label for="quoteComment">Comentario</label>
      <textarea id="quoteComment" rows="4" placeholder="Ej: quiero entrega a domicilio despues de las 5 pm"></textarea>
    </div>

    <div class="consultation-panel__actions">
      <button class="consultation-panel__clear" id="consultationClear" type="button">Vaciar</button>
      <button class="consultation-panel__send" id="consultationSend" type="button">Enviar cotizacion por WhatsApp</button>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(panel);

  overlay.addEventListener("click", closePanel);
  panel.querySelector(".consultation-panel__close")?.addEventListener("click", closePanel);
  panel.querySelector("#consultationClear")?.addEventListener("click", clearConsultation);
  panel.querySelector("#consultationSend")?.addEventListener("click", openWhatsApp);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePanel();
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
  clear: clearConsultation,
  buildMessage: buildConsultationMessage,
  openWhatsApp,
  openPanel,
  closePanel,
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
