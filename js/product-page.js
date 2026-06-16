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

function getSelectedFlavor(product, shouldRequire = true) {
  const select = document.getElementById("prod-flavor-select");
  if (!select || !product.flavors?.length) return { flavor: "", flavor_id: "" };

  if (!select.value) {
    if (shouldRequire) {
      select.focus();
      select.classList.add("needs-selection");
      window.setTimeout(() => select.classList.remove("needs-selection"), 1200);
    }
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
    flavorsEl.innerHTML = `
      <select id="prod-flavor-select" class="pdp__select" disabled>
        <option>Sin sabor</option>
      </select>
    `;
    return;
  }

  const enabled = productCanBeQuoted(product);
  flavorsEl.innerHTML = `
    <select id="prod-flavor-select" class="pdp__select" ${enabled ? "" : "disabled"}>
      <option value="">Elegir sabor (${product.flavors.length})</option>
      ${product.flavors.map((flavor) => `
        <option value="${escapeHTML(flavor.id)}" ${flavor.available === false ? "disabled" : ""}>
          ${escapeHTML(flavor.name)}${flavor.available === false ? " - No disponible" : ""}
        </option>
      `).join("")}
    </select>
  `;
}

function wireQuantityStepper(onChange) {
  const valueEl = document.querySelector("[data-qty-value]");
  if (!valueEl) return;
  const update = (next) => {
    valueEl.textContent = next;
    if (typeof onChange === "function") onChange(next);
  };
  document.querySelector("[data-qty-dec]")?.addEventListener("click", () => {
    update(Math.max(1, (parseInt(valueEl.textContent, 10) || 1) - 1));
  });
  document.querySelector("[data-qty-inc]")?.addEventListener("click", () => {
    update(Math.min(99, (parseInt(valueEl.textContent, 10) || 1) + 1));
  });
}

function getQuantity() {
  if (window.matchMedia("(max-width: 767px)").matches) {
    const select = document.querySelector("[data-qty-select]");
    if (select) return Math.max(1, parseInt(select.value, 10) || 1);
  }
  return Math.max(1, parseInt(document.querySelector("[data-qty-value]")?.textContent, 10) || 1);
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

  // URLs de SEO siempre al dominio de producción (GitHub Pages), nunca al preview de Vercel
  const SITE_BASE = "https://carlosbazan28.github.io/javysuplementos/";
  const DEFAULT_IMAGE = SITE_BASE + "img/images/javi.webp";
  const toAbsoluteUrl = (path) => {
    if (!path) return DEFAULT_IMAGE;
    if (/^https?:\/\//i.test(path)) return path;
    return SITE_BASE + String(path).replace(/^\/+/, "");
  };

  const pageUrl = `${SITE_BASE}product-page.html?id=${encodeURIComponent(productId)}`;
  const imageUrl = toAbsoluteUrl(product.image);
  const setMeta = (sel, val) => { const el = document.querySelector(sel); if (el) el.setAttribute("content", val); };
  setMeta('meta[property="og:title"]', `${product.name} | Javy Suplementos`);
  setMeta('meta[property="og:description"]', product.description || `${product.name} — Cotizá ahora por WhatsApp con Javy Suplementos.`);
  setMeta('meta[property="og:image"]', imageUrl);
  setMeta('meta[property="og:url"]', pageUrl);
  setMeta('meta[name="twitter:title"]', `${product.name} | Javy Suplementos`);
  setMeta('meta[name="twitter:description"]', product.description || `${product.name} — Cotizá ahora por WhatsApp con Javy Suplementos.`);
  setMeta('meta[name="twitter:image"]', imageUrl);
  setMeta('meta[name="description"]', product.description || `${product.name} — Mirá el precio y cotizá por WhatsApp.`);

  // canonical dinámico por producto (mismo dominio de producción + ?id=)
  const canonicalEl = document.querySelector('link[rel="canonical"]');
  if (canonicalEl) canonicalEl.setAttribute("href", pageUrl);

  const canQuote = productCanBeQuoted(product);
  const category = product.category || "Producto";
  const presentation = product.presentation || "";
  const priceText = product.price > 0 ? `$${product.price.toFixed(2)}` : "Consultar precio";

  const imgEl = document.getElementById("prod-image");
  imgEl.src = product.image || "img/images/javi.webp";
  imgEl.onerror = () => { imgEl.onerror = null; imgEl.src = "img/images/javi.webp"; };
  imgEl.alt = product.name;

  document.getElementById("prod-title").textContent = product.name;
  document.getElementById("prod-subtitle").textContent =
    presentation ? `${category} · ${presentation}` : (product.subtitulo || category);
  document.getElementById("prod-price").textContent = priceText;

  const barPriceEl = document.getElementById("pdp-bar-price");
  if (barPriceEl) barPriceEl.textContent = priceText;

  const breadcrumbCat = document.getElementById("pdp-breadcrumb-cat");
  if (breadcrumbCat) breadcrumbCat.textContent = category;

  document.getElementById("prod-brand").textContent = product.brand || "Por confirmar";
  document.getElementById("prod-category").textContent = category;

  document.querySelectorAll("[data-status-pill]").forEach((pill) => {
    pill.textContent = canQuote ? "Disponible" : "Consultar stock";
    pill.classList.toggle("is-unavailable", !canQuote);
  });

  renderFlavorField(product);

  // Cantidad / barra inferior
  const unitsEl = document.querySelector("[data-bar-units]");
  const flavorNoteEl = document.querySelector("[data-bar-flavor]");

  const updateBarSub = () => {
    const qty = getQuantity();
    if (unitsEl) unitsEl.textContent = `${qty} unidad${qty > 1 ? "es" : ""}`;
    if (flavorNoteEl) {
      const select = document.getElementById("prod-flavor-select");
      const hasFlavors = !!product.flavors?.length;
      if (!hasFlavors) {
        flavorNoteEl.textContent = "";
      } else if (select && select.value) {
        const f = product.flavors.find((item) => item.id === select.value);
        flavorNoteEl.textContent = f ? ` · ${f.name}` : " · sabor por elegir";
      } else {
        flavorNoteEl.textContent = " · sabor por elegir";
      }
    }
  };

  wireQuantityStepper(updateBarSub);
  document.querySelector("[data-qty-select]")?.addEventListener("change", updateBarSub);
  document.getElementById("prod-flavor-select")?.addEventListener("change", () => {
    document.getElementById("prod-flavor-select")?.classList.remove("needs-selection");
    updateBarSub();
  });
  updateBarSub();

  // Acciones
  const addCtas = Array.from(document.querySelectorAll("[data-add-cta]"));

  if (canQuote) {
    // Estado persistente: refleja si el producto (con el sabor elegido) ya está en la cotización.
    const syncPdpButtons = () => {
      const selected = getSelectedFlavor(product, false);
      const flavorName = selected ? selected.flavor : "";
      const added = !!window.consultation?.hasItem?.(product.id, flavorName);
      addCtas.forEach((btn) => {
        btn.classList.toggle("is-added", added);
        btn.textContent = added ? "✓ En cotización" : "Agregar a cotización";
      });
    };

    addCtas.forEach((btn) => {
      btn.hidden = false;
      btn.addEventListener("click", () => {
        const selectedFlavor = getSelectedFlavor(product);
        if (product.flavors?.length && !selectedFlavor) {
          btn.textContent = "Elige un sabor";
          window.setTimeout(syncPdpButtons, 1200);
          return;
        }

        const flavorName = selectedFlavor?.flavor || "";
        if (window.consultation?.hasItem?.(product.id, flavorName)) {
          window.consultation?.toast?.("Ya está en tu cotización");
          return;
        }

        const quantity = getQuantity();
        window.consultation?.addItem?.(product, { ...(selectedFlavor || {}), quantity });
        syncPdpButtons();
      });
    });

    // El estado depende del sabor elegido y de cambios hechos desde el panel.
    document.getElementById("prod-flavor-select")?.addEventListener("change", syncPdpButtons);
    document.addEventListener("consultation:change", syncPdpButtons);
    syncPdpButtons();
  } else {
    addCtas.forEach((btn) => {
      btn.textContent = "Consultar disponibilidad";
      btn.classList.add("pdp__cta--ghost");
      btn.addEventListener("click", () => {
        window.consultation?.askAvailability?.(product);
      });
    });
  }

  // Contenido informativo
  document.getElementById("tab-beneficios").innerHTML = crearBeneficios(product.beneficios);
  document.getElementById("tab-descripcion").innerHTML = crearParrafos(product.descripcion);
  document.getElementById("tab-uso").innerHTML = crearLista(product.uso);

  setupDetails();
}

function renderNotFound() {
  document.body.innerHTML = `
    <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#050709;color:#fff;font-family:'Roboto',system-ui,sans-serif;padding:1.5rem;text-align:center;">
      <div>
        <h1 style="margin-bottom:0.75rem;">Producto no encontrado</h1>
        <p style="margin-bottom:1rem;color:#A9B4C6;">Verifica el enlace o vuelve al catalogo.</p>
        <a href="supplements-page.html" style="color:#5AB4E9;text-decoration:none;font-weight:500;">Volver al catalogo</a>
      </div>
    </main>
  `;
}

function crearBeneficios(items = []) {
  if (!items.length) return "<p>Información no disponible.</p>";
  return items.map((text) => `<div class="pdp__benefit">${escapeHTML(text)}</div>`).join("");
}

function crearLista(items = []) {
  if (!items.length) return "<p>Información no disponible.</p>";
  return `<ul>${items.map((text) => `<li>${escapeHTML(text)}</li>`).join("")}</ul>`;
}

function crearParrafos(lines = []) {
  if (!lines.length) return "<p>Información no disponible.</p>";
  return lines.map((text) => `<p>${escapeHTML(text)}</p>`).join("");
}

/* Tabs (tablet/desktop) <-> Acordeón (mobile) sobre la misma estructura.
   Un panel se muestra cuando tiene la clase is-active. */
function setupDetails() {
  const tabs = Array.from(document.querySelectorAll(".pdp__tab"));
  const panels = Array.from(document.querySelectorAll(".pdp__panel"));
  const accHeads = Array.from(document.querySelectorAll("[data-acc]"));

  const setActivePanel = (name) => {
    panels.forEach((panel) => {
      const match = panel.dataset.panel === name;
      panel.classList.toggle("is-active", match);
    });
    tabs.forEach((tab) => {
      const match = tab.dataset.tab === name;
      tab.classList.toggle("is-active", match);
      tab.setAttribute("aria-selected", match ? "true" : "false");
    });
  };

  // Modo tabs (single-select)
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => setActivePanel(tab.dataset.tab));
  });

  // Modo acordeón (toggle individual)
  accHeads.forEach((head) => {
    head.addEventListener("click", () => {
      const panel = head.closest(".pdp__panel");
      if (!panel) return;
      const open = panel.classList.toggle("is-active");
      head.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  // Al pasar a tabs (>=768px) garantizar exactamente un panel activo
  const mq = window.matchMedia("(min-width: 768px)");
  const normalizeForTabs = (e) => {
    if (!e.matches) return;
    const firstActive = panels.find((p) => p.classList.contains("is-active")) || panels[0];
    if (firstActive) setActivePanel(firstActive.dataset.panel);
  };
  mq.addEventListener("change", normalizeForTabs);
  normalizeForTabs(mq);
}
