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

function updateConsultationBadge() {
  const badge = document.getElementById("consultationBadge") || document.getElementById("cartBadge");
  if (!badge) return;

  const count = getConsultationCount();
  badge.textContent = String(count);
  badge.hidden = count === 0;
}

function addItem(id) {
  const items = getConsultation();
  const exists = items.some((item) => item.id === id);

  if (!exists) {
    items.push({ id });
    saveConsultation(items);
  }

  updateConsultationBadge();
}

function removeItem(id) {
  const items = getConsultation().filter((item) => item.id !== id);
  saveConsultation(items);
  updateConsultationBadge();
}

function clearConsultation() {
  saveConsultation([]);
  updateConsultationBadge();
}

function buildConsultationMessage() {
  const items = getConsultation();

  if (!items.length) {
    return [
      "Hola Javy, quiero asesoría sobre suplementos.",
      "",
      "Mi objetivo es:",
      "Mi duda es:",
    ].join("\n");
  }

  const productLines = items.map((item, index) => {
    const product = getProductById(item.id);
    return `${index + 1}. ${product?.nombre || item.id}`;
  });

  return [
    "Hola Javy, quiero asesoría sobre estos suplementos:",
    "",
    ...productLines,
    "",
    "Mi objetivo es:",
    "Mi duda es:",
  ].join("\n");
}

function openWhatsApp() {
  const message = encodeURIComponent(buildConsultationMessage());
  window.open(`https://wa.me/${CONSULTATION_PHONE}?text=${message}`, "_blank");
}

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
};

// Compatibilidad temporal con el nombre anterior mientras migramos la interfaz.
window.cart = {
  getCart: getConsultation,
  saveCart: saveConsultation,
  getCartCount: getConsultationCount,
  updateCartBadge: updateConsultationBadge,
  addToCart: addItem,
};
