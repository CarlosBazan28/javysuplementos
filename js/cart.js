const CONSULTATION_KEY = "javy-consultation";
const LEGACY_CART_KEY = "cart";
const CONSULTATION_PHONE = "50763932305";

function readStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function getConsultation() {
  const current = readStorage(CONSULTATION_KEY);
  if (current.length) return current;

  const legacyCart = readStorage(LEGACY_CART_KEY);
  if (!legacyCart.length) return [];

  const migrated = legacyCart.map((item) => ({ id: item.id }));
  saveConsultation(migrated);
  return migrated;
}

function saveConsultation(items) {
  localStorage.setItem(CONSULTATION_KEY, JSON.stringify(items));
}

function getConsultationCount() {
  return getConsultation().length;
}

function getProductById(id) {
  if (typeof PRODUCTS === "undefined") return null;
  return PRODUCTS[id] || null;
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

function updateConsultationBadge() {
  const badge = document.getElementById("consultationBadge") || document.getElementById("cartBadge");
  if (!badge) return;

  const count = getConsultationCount();
  badge.textContent = String(count);
  badge.hidden = count === 0;
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

  items.forEach((item) => {
    const product = getProductById(item.id);
    const productName = product?.nombre || item.id;
    const row = document.createElement("li");
    row.className = "consultation-item";
    row.innerHTML = `
      <img src="${product?.imagen || "img/icons/logo.png"}" alt="${escapeHTML(productName)}" class="consultation-item__img" />
      <div class="consultation-item__info">
        <strong>${escapeHTML(productName)}</strong>
        <span>${escapeHTML(product?.marca || "Producto")} · ${escapeHTML(product?.categoria || "Categoría por confirmar")}</span>
        ${item.flavor ? `<span>Sabor: ${escapeHTML(item.flavor)}</span>` : ""}
      </div>
      <button class="consultation-item__remove" type="button" aria-label="Quitar ${escapeHTML(productName)}">
        Quitar
      </button>
    `;

    row.querySelector(".consultation-item__remove")?.addEventListener("click", () => {
      removeItem(item.id);
    });

    list.appendChild(row);
  });
}

function addItem(id, options = {}) {
  const items = getConsultation();
  const flavor = options.flavor?.trim() || "";
  const existingItem = items.find((item) => item.id === id);

  if (existingItem) {
    if (flavor) existingItem.flavor = flavor;
  } else {
    items.push(flavor ? { id, flavor } : { id });
  }

  saveConsultation(items);
  updateConsultationBadge();
  renderConsultationPanel();
}

function removeItem(id) {
  const items = getConsultation().filter((item) => item.id !== id);
  saveConsultation(items);
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
  const objective = getPanelFieldValue("consultationObjective");
  const question = getPanelFieldValue("consultationQuestion");

  const lines = items.map((item, index) => {
    const product = getProductById(item.id);
    const flavorText = item.flavor ? ` - Sabor: ${item.flavor}` : "";
    return `${index + 1}. ${product?.nombre || item.id}${flavorText}`;
  });

  return [
    items.length ? "Hola Javy, quiero asesoria sobre estos suplementos:" : "Hola Javy, quiero asesoria sobre suplementos.",
    "",
    ...lines,
    "",
    `Mi objetivo es: ${objective || ""}`,
    `Mi duda es: ${question || ""}`,
  ].join("\n");
}

function openWhatsApp() {
  const message = encodeURIComponent(buildConsultationMessage());
  window.open(`https://wa.me/${CONSULTATION_PHONE}?text=${message}`, "_blank");
}

function openPanel() {
  const panel = document.getElementById("consultationPanel");
  const overlay = document.getElementById("consultationOverlay");
  if (!panel || !overlay) return openWhatsApp();

  renderConsultationPanel();
  panel.classList.add("is-open");
  overlay.hidden = false;
  document.body.classList.add("has-consultation-open");
  panel.querySelector(".consultation-panel__close")?.focus();
}

function closePanel() {
  const panel = document.getElementById("consultationPanel");
  const overlay = document.getElementById("consultationOverlay");
  if (!panel || !overlay) return;

  panel.classList.remove("is-open");
  overlay.hidden = true;
  document.body.classList.remove("has-consultation-open");
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
  panel.setAttribute("aria-label", "Asesoría por WhatsApp");
  panel.innerHTML = `
    <div class="consultation-panel__header">
      <div>
        <p class="consultation-panel__eyebrow">WhatsApp con Javy</p>
        <h2>Asesoría</h2>
      </div>
      <button class="consultation-panel__close" type="button" aria-label="Cerrar consulta">x</button>
    </div>

    <p class="consultation-empty" id="consultationEmpty">Aún no agregaste productos.</p>
    <ul class="consultation-list" id="consultationList"></ul>

    <div class="consultation-form">
      <label for="consultationObjective">Objetivo</label>
      <select id="consultationObjective">
        <option value="">Seleccionar</option>
        <option>Ganar masa muscular</option>
        <option>Bajar grasa</option>
        <option>Mejorar rendimiento</option>
        <option>Empezar desde cero</option>
      </select>

      <label for="consultationQuestion">Duda</label>
      <textarea id="consultationQuestion" rows="4" placeholder="Ej: entreno 4 veces por semana y quiero saber cuál me conviene"></textarea>
    </div>

    <div class="consultation-panel__actions">
      <button class="consultation-panel__clear" id="consultationClear" type="button">Vaciar</button>
      <button class="consultation-panel__send" id="consultationSend" type="button">Enviar por WhatsApp</button>
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
};

window.cart = {
  getCart: getConsultation,
  saveCart: saveConsultation,
  getCartCount: getConsultationCount,
  updateCartBadge: updateConsultationBadge,
  addToCart: addItem,
};
