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
      <select id="prod-flavor-select" class="pdp__select" aria-label="Sabor" disabled>
        <option>Sin sabor</option>
      </select>
    `;
    if (window.javyDropdown) window.javyDropdown.enhanceSelects(flavorsEl);
    return;
  }

  const enabled = productCanBeQuoted(product);
  flavorsEl.innerHTML = `
    <select id="prod-flavor-select" class="pdp__select" aria-label="Sabor" ${enabled ? "" : "disabled"}>
      <option value="">Elegir sabor (${product.flavors.length})</option>
      ${product.flavors.map((flavor) => `
        <option value="${escapeHTML(flavor.id)}" ${flavor.available === false ? "disabled" : ""}>
          ${escapeHTML(flavor.name)}${flavor.available === false ? " - No disponible" : ""}
        </option>
      `).join("")}
    </select>
  `;
  if (window.javyDropdown) window.javyDropdown.enhanceSelects(flavorsEl);
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

  // URLs de SEO siempre al dominio de producción (Cloudflare), nunca al preview de Vercel
  const SITE_BASE = "https://javysuplementos.com/";
  const DEFAULT_IMAGE = SITE_BASE + "img/images/javi.webp";
  const toAbsoluteUrl = (path) => {
    if (!path) return DEFAULT_IMAGE;
    if (/^https?:\/\//i.test(path)) return path;
    return SITE_BASE + String(path).replace(/^\/+/, "");
  };

  const pageUrl = `${SITE_BASE}product-page.html?id=${encodeURIComponent(productId)}`;
  const imageUrl = toAbsoluteUrl(product.image);
  const shortDescription = String(product.description_short || product.subtitulo || "").trim();
  const metaDescription = shortDescription || `${product.name} — Cotizá ahora por WhatsApp con Javy Suplementos.`;
  const setMeta = (sel, val) => { const el = document.querySelector(sel); if (el) el.setAttribute("content", val); };
  setMeta('meta[property="og:title"]', `${product.name} | Javy Suplementos`);
  setMeta('meta[property="og:description"]', metaDescription);
  setMeta('meta[property="og:image"]', imageUrl);
  setMeta('meta[property="og:url"]', pageUrl);
  setMeta('meta[name="twitter:title"]', `${product.name} | Javy Suplementos`);
  setMeta('meta[name="twitter:description"]', metaDescription);
  setMeta('meta[name="twitter:image"]', imageUrl);
  setMeta('meta[name="description"]', metaDescription);

  // canonical dinámico por producto (mismo dominio de producción + ?id=)
  const canonicalEl = document.querySelector('link[rel="canonical"]');
  if (canonicalEl) canonicalEl.setAttribute("href", pageUrl);

  const canQuote = productCanBeQuoted(product);
  const category = product.category || "Producto";
  const presentation = product.presentation || "";
  const priceText = product.price > 0 ? `$${product.price.toFixed(2)}` : "Consultar precio";
  const offerActive = product.price > 0 && product.old_price && Number(product.old_price) > Number(product.price);
  const offerDiscount = offerActive ? Math.round((1 - product.price / product.old_price) * 100) : 0;
  const priceHTML = offerActive
    ? `<span class="pdp__price-now">${priceText}</span> <span class="pdp__price-old">$${Number(product.old_price).toFixed(2)}</span> <span class="pdp__discount">-${offerDiscount}%</span>`
    : priceText;

  const imgEl = document.getElementById("prod-image");
  imgEl.src = product.image || "img/images/javi.webp";
  imgEl.onerror = () => { imgEl.onerror = null; imgEl.src = "img/images/javi.webp"; };
  imgEl.alt = product.name;

  document.getElementById("prod-title").textContent = product.name;
  const subtitleEl = document.getElementById("prod-subtitle");
  subtitleEl.textContent = shortDescription;
  subtitleEl.hidden = !shortDescription;
  document.getElementById("prod-price").innerHTML = priceHTML;

  const categoryLabel = document.getElementById("prod-category-label");
  const presentationEl = document.getElementById("prod-presentation");
  const contextSeparator = document.querySelector(".pdp__context-sep");
  if (categoryLabel) categoryLabel.textContent = category;
  if (presentationEl) {
    presentationEl.textContent = presentation;
    presentationEl.hidden = !presentation;
  }
  if (contextSeparator) contextSeparator.hidden = !presentation;

  const brandLabel = document.getElementById("prod-brand-label");
  if (brandLabel) brandLabel.textContent = product.brand || "Marca por confirmar";

  const barPriceEl = document.getElementById("pdp-bar-price");
  if (barPriceEl) barPriceEl.innerHTML = priceHTML;

  const breadcrumbCat = document.getElementById("pdp-breadcrumb-cat");
  if (breadcrumbCat) breadcrumbCat.textContent = category;

  document.getElementById("prod-brand").textContent = product.brand || "Por confirmar";
  document.getElementById("prod-category").textContent = category;

  document.querySelectorAll("[data-status-pill]").forEach((pill) => {
    pill.textContent = canQuote ? "Disponible" : "Agotado";
    pill.classList.toggle("is-agotado", !canQuote);
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
  document.getElementById("prod-flavor-select")?.addEventListener("change", () => {
    document.getElementById("prod-flavor-select")?.classList.remove("needs-selection");
    updateBarSub();
  });
  updateBarSub();

  // Acciones
  const addCtas = Array.from(document.querySelectorAll("[data-add-cta]"));

  if (canQuote) {
    // Estado por sabor + nota con sabores agregados + ✓ en la lista de sabores.
    const syncPdpButtons = () => {
      const selected = getSelectedFlavor(product, false);
      const flavorName = selected ? selected.flavor : "";
      const added = !!window.consultation?.hasItem?.(product.id, flavorName);
      addCtas.forEach((btn) => {
        btn.classList.toggle("is-added", added);
        btn.textContent = added ? "✓ En cotización" : "Agregar a cotización";
      });

      // Nota: "En tu cotización: Chocolate, Vainilla"
      const note = document.querySelector("[data-added-note]");
      if (note) {
        const addedFlavors = window.consultation?.getAddedFlavors?.(product.id) || [];
        if (addedFlavors.length) {
          note.textContent = `En tu cotización: ${addedFlavors.join(", ")}`;
          note.hidden = false;
        } else {
          note.textContent = "";
          note.hidden = true;
        }
      }

      // ✓ en los sabores ya agregados.
      const select = document.getElementById("prod-flavor-select");
      if (select && product.flavors?.length) {
        Array.from(select.options).forEach((opt) => {
          if (!opt.value) return; // placeholder
          const f = product.flavors.find((item) => item.id === opt.value);
          if (!f) return;
          const unavailable = f.available === false ? " - No disponible" : "";
          const inCart = window.consultation?.hasItem?.(product.id, f.name) ? " ✓" : "";
          opt.textContent = `${f.name}${unavailable}${inCart}`;
        });
        window.javyDropdown?.refresh?.(select);
      }
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
          window.consultation?.toast?.(flavorName ? "Ese sabor ya está en tu cotización" : "Ya está en tu cotización");
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

  renderProductInformation(product);
  setupMobilePurchaseBar();
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

function normalizeTextItems(value) {
  const values = Array.isArray(value) ? value : String(value || "").split(/\n+/);
  return values.map((text) => String(text || "").trim()).filter(Boolean);
}

function renderProductInformation(product) {
  const description = normalizeTextItems(product.description_long || product.description || product.descripcion);
  const benefits = normalizeTextItems(product.beneficios);
  const usage = normalizeTextItems(product.uso);

  const descriptionEl = document.getElementById("tab-descripcion");
  const benefitsEl = document.getElementById("tab-beneficios");
  const usageEl = document.getElementById("tab-uso");

  if (descriptionEl) descriptionEl.innerHTML = description.map((text) => `<p>${escapeHTML(text)}</p>`).join("");
  if (benefitsEl) benefitsEl.innerHTML = benefits.map((text) => `<div class="pdp__benefit">${escapeHTML(text)}</div>`).join("");
  if (usageEl) usageEl.innerHTML = usage.map((text) => `<li>${escapeHTML(text)}</li>`).join("");

  const sectionStates = { description: description.length, benefits: benefits.length, usage: usage.length };
  document.querySelectorAll("[data-content-section]").forEach((section) => {
    section.hidden = !sectionStates[section.getAttribute("data-content-section")];
  });

  const details = document.querySelector(".pdp__details");
  if (details) details.hidden = !Object.values(sectionStates).some(Boolean);
}

function setupMobilePurchaseBar() {
  const bar = document.querySelector(".pdp__bar");
  const primaryCta = document.querySelector("[data-primary-cta]");
  const barCta = bar?.querySelector("[data-add-cta]");
  if (!bar || !primaryCta || !barCta) return;

  const mobileQuery = window.matchMedia("(max-width: 767px)");
  let primaryCtaVisible = true;

  const updateBar = () => {
    const shouldShow = mobileQuery.matches && !primaryCtaVisible;
    bar.classList.toggle("is-visible", shouldShow);
    bar.setAttribute("aria-hidden", shouldShow ? "false" : "true");
    barCta.tabIndex = shouldShow ? 0 : -1;
  };

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => {
      primaryCtaVisible = entry.isIntersecting;
      updateBar();
    }, { threshold: 0.15 });
    observer.observe(primaryCta);
  } else {
    const checkVisibility = () => {
      const rect = primaryCta.getBoundingClientRect();
      primaryCtaVisible = rect.bottom > 0 && rect.top < window.innerHeight;
      updateBar();
    };
    window.addEventListener("scroll", checkVisibility, { passive: true });
    checkVisibility();
  }

  mobileQuery.addEventListener("change", updateBar);
  updateBar();
}
