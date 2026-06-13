document.addEventListener("DOMContentLoaded", initProductPage);

function escapeHTML(value = "") {
  return value
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function productCanBeQuoted(product) {
  if (product.available === false) return false;
  if (!product.flavors?.length) return true;
  return product.flavors.some((flavor) => flavor.available !== false);
}

function isNoFlavorProduct(product) {
  return product?.flavor_mode === "no_flavor";
}

function getSelectedFlavor(product) {
  const select = document.getElementById("prod-flavor-select");
  if (!select || !product.flavors?.length) return { flavor: "", flavor_id: "" };
  if (!select.value) {
    select.focus();
    return null;
  }

  const flavor = product.flavors.find((item) => item.id === select.value);
  if (!flavor || flavor.available === false) return null;
  return { flavor: flavor.name, flavor_id: flavor.id };
}

function renderFlavorField(product) {
  const flavorsEl = document.getElementById("prod-flavors");
  if (!flavorsEl) return;

  if (!product.flavors?.length) {
    flavorsEl.textContent = isNoFlavorProduct(product) ? "Sin sabor" : "No aplica / consultar";
    return;
  }

  const enabled = productCanBeQuoted(product);
  flavorsEl.innerHTML = `
    <select id="prod-flavor-select" class="product-detail__select" ${enabled ? "" : "disabled"}>
      <option value="">Elegir sabor (${product.flavors.length})</option>
      ${product.flavors.map((flavor) => `
        <option value="${escapeHTML(flavor.id)}" ${flavor.available === false ? "disabled" : ""}>
          ${escapeHTML(flavor.name)}${flavor.available === false ? " - No disponible" : ""}
        </option>
      `).join("")}
    </select>
  `;
}

async function initProductPage() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");

  if (!productId || !window.catalogDb) {
    renderNotFound();
    return;
  }

  const product = await window.catalogDb.getProductById(productId);
  if (!product) {
    renderNotFound();
    return;
  }

  document.title = `${product.name} | Javy Suplementos`;

  const pageUrl = window.location.href;
  const setMeta = (sel, val) => { const el = document.querySelector(sel); if (el) el.setAttribute("content", val); };
  setMeta('meta[property="og:title"]', `${product.name} | Javy Suplementos`);
  setMeta('meta[property="og:description"]', product.description || `${product.name} — Cotizá ahora por WhatsApp con Javy Suplementos.`);
  setMeta('meta[property="og:image"]', product.image || "https://javysuplementos-git-claude-carlosdev-projects1.vercel.app/img/images/javi.webp");
  setMeta('meta[property="og:url"]', pageUrl);
  setMeta('meta[name="twitter:title"]', `${product.name} | Javy Suplementos`);
  setMeta('meta[name="twitter:description"]', product.description || `${product.name} — Cotizá ahora por WhatsApp con Javy Suplementos.`);
  setMeta('meta[name="twitter:image"]', product.image || "https://javysuplementos-git-claude-carlosdev-projects1.vercel.app/img/images/javi.webp");
  setMeta('meta[name="description"]', product.description || `${product.name} — Mirá el precio y cotizá por WhatsApp.`);

  const imgEl = document.getElementById("prod-image");
  const titleEl = document.getElementById("prod-title");
  const subtitleEl = document.getElementById("prod-subtitle");
  const priceEl = document.getElementById("prod-price");
  const tagEl = document.getElementById("prod-tag");
  const brandEl = document.getElementById("prod-brand");
  const categoryEl = document.getElementById("prod-category");
  const statusEl = document.getElementById("prod-status");
  const quoteEl = document.getElementById("prod-whatsapp");
  const addConsultationEl = document.getElementById("prod-add-consultation");
  const availabilityEl = document.getElementById("prod-availability");

  const beneficiosEl = document.getElementById("tab-beneficios");
  const descripcionEl = document.getElementById("tab-descripcion");
  const usoEl = document.getElementById("tab-uso");
  const canQuote = productCanBeQuoted(product);

  titleEl.textContent = product.name;
  subtitleEl.textContent = product.subtitulo || product.description || `${product.category} ${product.presentation || ""}`;
  priceEl.textContent = product.price > 0 ? `$${product.price.toFixed(2)}` : "Consultar precio";
  tagEl.textContent = canQuote ? "Disponible" : "Consultar stock";
  tagEl.classList.toggle("is-unavailable", !canQuote);
  brandEl.textContent = product.brand || "Por confirmar";
  categoryEl.textContent = product.category || "Producto";
  statusEl.textContent = canQuote ? "Disponible para cotizar" : "Consultar disponibilidad";

  imgEl.src = product.image;
  imgEl.alt = product.name;

  renderFlavorField(product);

  addConsultationEl.hidden = !canQuote;
  availabilityEl.hidden = canQuote;
  quoteEl.textContent = canQuote ? "Cotizar este producto" : "Consultar disponibilidad";

  addConsultationEl?.addEventListener("click", () => {
    const selectedFlavor = getSelectedFlavor(product);
    if (product.flavors?.length && !selectedFlavor) {
      addConsultationEl.textContent = "Elige sabor";
      window.setTimeout(() => { addConsultationEl.textContent = "Agregar a cotizacion"; }, 1200);
      return;
    }

    window.consultation?.addItem?.(product, selectedFlavor || {});
    addConsultationEl.textContent = "Agregado a cotizacion";
  });

  quoteEl?.addEventListener("click", () => {
    const selectedFlavor = canQuote ? getSelectedFlavor(product) : {};
    if (canQuote && product.flavors?.length && !selectedFlavor) return;
    window.consultation?.quoteSingleProduct?.(product, selectedFlavor || {});
  });

  availabilityEl?.addEventListener("click", () => {
    window.consultation?.askAvailability?.(product);
  });

  beneficiosEl.innerHTML = crearLista(product.beneficios);
  descripcionEl.innerHTML = crearParrafos(product.descripcion);
  usoEl.innerHTML = crearLista(product.uso);

  setupTabs();
}

function renderNotFound() {
  document.body.innerHTML = `
    <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#050709;color:#fff;font-family:system-ui;padding:1.5rem;text-align:center;">
      <div>
        <h1 style="margin-bottom:0.75rem;">Producto no encontrado</h1>
        <p style="margin-bottom:1rem;color:#A9B4C6;">Verifica el enlace o vuelve al catalogo.</p>
        <a href="supplements-page.html" style="color:#5AB4E9;text-decoration:none;font-weight:600;">Volver al catalogo</a>
      </div>
    </main>
  `;
}

function crearLista(items = []) {
  if (!items.length) return "<p>Informacion no disponible.</p>";
  return `
    <ul class="product-detail__list">
      ${items.map((text) => `<li>${escapeHTML(text)}</li>`).join("")}
    </ul>
  `;
}

function crearParrafos(lines = []) {
  if (!lines.length) return "<p>Informacion no disponible.</p>";
  return lines.map((text) => `<p>${escapeHTML(text)}</p>`).join("");
}

function setupTabs() {
  const tabButtons = document.querySelectorAll(".product-tabs__btn");
  const tabPanels = document.querySelectorAll(".product-tabs__panel");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;

      tabButtons.forEach((button) => {
        const isActive = button === btn;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-selected", isActive ? "true" : "false");
      });

      tabPanels.forEach((panel) => {
        const match = panel.dataset.tabPanel === target;
        panel.classList.toggle("is-active", match);
        panel.hidden = !match;
      });
    });
  });
}
