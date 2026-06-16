let products = [];

const catalogState = {
  query: "",
  category: "todos",
  sort: "recomendados",
};

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const searchClear = document.getElementById("searchClear");
const supplementsList = document.getElementById("supplementsList");
const catalogCount = document.getElementById("catalogCount");
const catalogEmpty = document.getElementById("catalogEmpty");
const emptyAdvisorBtn = document.getElementById("emptyAdvisorBtn");
const catalogFilters = document.getElementById("catalogFilters");
const catalogToolsHint = document.querySelector(".catalog-tools__hint");
const catalogSort = document.getElementById("catalogSort");
const catalogFloatingQuote = document.getElementById("catalogFloatingQuote");
const catalogScrollTop = document.getElementById("catalogScrollTop");
let lastCatalogScrollY = window.scrollY || 0;
let scrollTopIsVisible = false;

// URLs de producción (GitHub Pages) para SEO/JSON-LD, nunca el preview de Vercel
const SITE_BASE = "https://carlosbazan28.github.io/javysuplementos/";

function debounce(fn, wait = 160) {
  let timer = null;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  };
}

function toAbsoluteUrl(path) {
  if (!path) return `${SITE_BASE}img/images/javi.webp`;
  if (/^https?:\/\//i.test(path)) return path;
  return SITE_BASE + String(path).replace(/^\/+/, "");
}

function normalizeText(value = "") {
  return value
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function slugify(value = "") {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getProductCategory(product) {
  return slugify(product.category || product.categoria || "otros");
}

function productMatchesCategory(product) {
  if (catalogState.category === "todos") return true;
  if (catalogState.category === "destacados") return Boolean(product.featured || product.destacado);

  return getProductCategory(product) === catalogState.category;
}

function getFlavorNames(product, availableOnly = false) {
  return (product.flavors || [])
    .filter((flavor) => !availableOnly || flavor.available !== false)
    .map((flavor) => flavor.name);
}

function getSearchText(product) {
  return normalizeText([
    product.id,
    product.legacy_id,
    product.name,
    product.brand,
    product.category,
    product.presentation,
    product.tags?.join(" "),
    product.goals?.join(" "),
    getFlavorNames(product).join(" "),
  ].join(" "));
}

function getFilteredProducts() {
  const query = normalizeText(catalogState.query.trim());

  const filtered = products.filter((product) => {
    const categoryMatch = productMatchesCategory(product);
    const queryMatch = !query || getSearchText(product).includes(query);

    return categoryMatch && queryMatch;
  });

  return sortProducts(filtered);
}

function sortProducts(list) {
  const sorted = [...list];
  const price = (p) => Number(p.price ?? p.precio ?? 0);

  switch (catalogState.sort) {
    case "precio-asc":
      return sorted.sort((a, b) => price(a) - price(b));
    case "precio-desc":
      return sorted.sort((a, b) => price(b) - price(a));
    case "nombre":
      return sorted.sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));
    case "recomendados":
    default:
      // Destacados primero, manteniendo el orden original dentro de cada grupo
      return sorted.sort((a, b) => {
        const fa = a.featured || a.destacado ? 1 : 0;
        const fb = b.featured || b.destacado ? 1 : 0;
        return fb - fa;
      });
  }
}

function formatPrice(price) {
  const value = Number(price || 0);
  return value > 0 ? value.toFixed(2) : "Consultar";
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

function productCanBeQuoted(product) {
  if (product.available === false) return false;
  if (!product.flavors?.length) return true;

  return product.flavors.some((flavor) => flavor.available !== false);
}

function isNoFlavorProduct(product) {
  return product?.flavor_mode === "no_flavor";
}

function renderFlavorOptions(product) {
  const flavors = product.flavors || [];
  const selectId = `flavor-${slugify(product.id)}`;
  const enabled = productCanBeQuoted(product);

  if (!flavors.length) {
    return `
      <div class="product-card__flavors">
        <label class="product-card__flavor-label" for="${selectId}">Sabor</label>
        <select class="product-card__flavor-select" id="${selectId}" data-flavor-select disabled>
          <option>Sin sabor</option>
        </select>
      </div>
    `;
  }

  const label = flavors.length === 1 ? "Sabor" : "Sabores";

  return `
    <div class="product-card__flavors" aria-label="${label} disponibles">
      <label class="product-card__flavor-label" for="${selectId}">${label}</label>
      <select class="product-card__flavor-select" id="${selectId}" data-flavor-select ${enabled ? "" : "disabled"}>
        <option value="">Elegir sabor</option>
        ${flavors.map((flavor) => `
          <option value="${escapeHTML(flavor.id)}" ${flavor.available === false ? "disabled" : ""}>
            ${escapeHTML(flavor.name)}${flavor.available === false ? " — No disponible" : ""}
          </option>
        `).join("")}
      </select>
    </div>
  `;
}

function getSelectedFlavor(card, product, shouldRequire = true) {
  const select = card.querySelector("[data-flavor-select]");
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

function wireQuantityStepper(card) {
  const valueEl = card.querySelector("[data-qty-value]");
  if (!valueEl) return;
  card.querySelector("[data-qty-dec]")?.addEventListener("click", () => {
    valueEl.textContent = Math.max(1, (parseInt(valueEl.textContent, 10) || 1) - 1);
  });
  card.querySelector("[data-qty-inc]")?.addEventListener("click", () => {
    valueEl.textContent = Math.min(99, (parseInt(valueEl.textContent, 10) || 1) + 1);
  });
}

function setAddButtonState(button, added) {
  if (!button) return;
  button.classList.toggle("is-added", added);
  button.textContent = added ? "✓ En cotización" : "Agregar a cotización";
}

// Sincroniza el botón de una card con el estado real de la cotización
// (según el sabor seleccionado, si el producto tiene sabores).
function syncAddButton(card, product) {
  const button = card.querySelector(".product-card__btn--buy");
  if (!button) return;
  const selected = getSelectedFlavor(card, product, false);
  const flavorName = selected ? selected.flavor : "";
  setAddButtonState(button, !!window.consultation?.hasItem?.(product.id, flavorName));
}

function syncAllAddButtons() {
  document.querySelectorAll(".product-card").forEach((card) => {
    if (card._javyProduct) syncAddButton(card, card._javyProduct);
  });
}

let consultationSyncBound = false;
function bindConsultationSync() {
  if (consultationSyncBound) return;
  consultationSyncBound = true;
  // Un único listener por página evita fugas al re-filtrar el catálogo.
  document.addEventListener("consultation:change", syncAllAddButtons);
}

function getCardQuantity(card) {
  if (window.matchMedia("(max-width: 767px)").matches) {
    const select = card.querySelector("[data-qty-select]");
    if (select) return Math.max(1, parseInt(select.value, 10) || 1);
  }
  return Math.max(1, parseInt(card.querySelector("[data-qty-value]")?.textContent, 10) || 1);
}

function getCategoryFilters() {
  const categories = products
    .map((product) => product.category)
    .filter(Boolean)
    .filter((category, index, list) => list.indexOf(category) === index)
    .sort((a, b) => a.localeCompare(b, "es"));

  const featuredCount = products.filter((p) => p.featured || p.destacado).length;

  return [
    { label: "Todos", value: "todos", count: products.length },
    { label: "Destacados", value: "destacados", count: featuredCount },
    ...categories.map((category) => ({
      label: category,
      value: slugify(category),
      count: products.filter((p) => getProductCategory(p) === slugify(category)).length,
    })),
  ]
    // Si una categoría/destacados quedan sin productos, no mostrar el chip vacío
    .filter((filter) => filter.value === "todos" || filter.count > 0);
}

function renderFilters() {
  if (!catalogFilters) return;

  catalogFilters.innerHTML = getCategoryFilters().map((filter) => {
    const isActive = filter.value === catalogState.category;
    return `
    <button class="catalog-filter${isActive ? " is-active" : ""}" type="button" data-category="${filter.value}" aria-pressed="${isActive}">
      ${escapeHTML(filter.label)}<span class="catalog-filter__count">${filter.count}</span>
    </button>
  `;
  }).join("");

  updateFilterHint();
}

function renderProductCard(product) {
  const canQuote = productCanBeQuoted(product);
  const detailUrl = `product-page.html?id=${encodeURIComponent(product.id)}`;
  const card = document.createElement("article");
  card.className = `product-card${product.imagenPendiente ? " product-card--image-pending" : ""}`;

  card.innerHTML = `
    ${product.featured ? '<span class="product-card__badge">Destacado</span>' : ""}

    <a class="product-card__media product-card__media-link" href="${detailUrl}" aria-label="Ver ${escapeHTML(product.name)}">
      <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}" class="product-card__img" loading="lazy" decoding="async" />
    </a>

    <div class="product-card__info">
      <div class="product-card__meta">
        <span class="product-card__brand">${escapeHTML(product.brand || "Marca en revision")}</span>
        <span class="product-card__status ${canQuote ? "is-available" : "is-unavailable"}">
          ${canQuote ? "Disponible" : "Consultar stock"}
        </span>
      </div>
      <h3 class="product-card__name">
        <a class="product-card__name-link" href="${detailUrl}">${escapeHTML(product.name)}</a>
      </h3>
      <div class="product-card__price-row">
        <span class="product-card__price">$${formatPrice(product.price)}</span>
        ${product.presentation ? `<span class="product-card__pres">${escapeHTML(product.presentation)}</span>` : ""}
      </div>
      ${renderFlavorOptions(product)}
      <div class="product-card__qty">
        <span class="product-card__qty-label">Cantidad</span>
        <div class="product-card__stepper" role="group" aria-label="Cantidad">
          <button type="button" class="product-card__qty-btn" data-qty-dec aria-label="Disminuir">−</button>
          <span class="product-card__qty-value" data-qty-value aria-live="polite">1</span>
          <button type="button" class="product-card__qty-btn product-card__qty-btn--plus" data-qty-inc aria-label="Aumentar">+</button>
        </div>
        <select class="product-card__qty-select" data-qty-select aria-label="Cantidad">
          ${Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("")}
        </select>
      </div>
    </div>

    <div class="product-card__actions product-card__actions--catalog">
      ${canQuote
        ? '<button class="product-card__btn product-card__btn--buy" type="button">Agregar a cotización</button>'
        : '<button class="product-card__btn product-card__btn--quote" type="button">Consultar disponibilidad</button>'
      }
      <a class="product-card__btn product-card__btn--info" href="${detailUrl}">Ver detalles</a>
    </div>
  `;

  wireQuantityStepper(card);
  card._javyProduct = product;

  const addBtn = card.querySelector(".product-card__btn--buy");
  const quoteBtn = card.querySelector(".product-card__btn--quote");

  addBtn?.addEventListener("click", () => {
    const selectedFlavor = getSelectedFlavor(card, product);
    if (product.flavors?.length && !selectedFlavor) {
      addBtn.textContent = "Elige sabor";
      window.setTimeout(() => { syncAddButton(card, product); }, 1200);
      return;
    }

    const flavorName = selectedFlavor?.flavor || "";
    if (window.consultation?.hasItem?.(product.id, flavorName)) {
      window.consultation?.toast?.("Ya está en tu cotización");
      return;
    }

    const quantity = getCardQuantity(card);
    window.consultation?.addItem?.(product, { ...(selectedFlavor || {}), quantity });
    setAddButtonState(addBtn, true);
    updateFloatingQuoteVisibility();
  });

  // El estado del botón depende del sabor elegido: re-sincroniza al cambiarlo.
  card.querySelector("[data-flavor-select]")?.addEventListener("change", () => {
    syncAddButton(card, product);
  });
  syncAddButton(card, product);

  // El botón "Consultar disponibilidad" solo se renderiza cuando !canQuote
  quoteBtn?.addEventListener("click", () => {
    window.consultation?.askAvailability?.(product, {});
  });

  // "Ver detalles" y la imagen/nombre son <a href> reales; la transición la aplica
  // el handler global de include-nav.js.

  return card;
}

function renderCatalog() {
  if (!supplementsList || !catalogCount || !catalogEmpty) return;

  const results = getFilteredProducts();
  supplementsList.innerHTML = "";
  bindConsultationSync();

  results.forEach((product) => {
    supplementsList.appendChild(renderProductCard(product));
  });

  const label = results.length === 1 ? "producto encontrado" : "productos encontrados";
  catalogCount.textContent = `${results.length} ${label}`;
  catalogEmpty.hidden = results.length > 0;
}

function renderLoading() {
  if (!supplementsList || !catalogCount) return;
  catalogCount.textContent = "Cargando catálogo…";
  supplementsList.innerHTML = Array.from({ length: 8 }, () => `
    <article class="product-card product-card--skeleton" aria-hidden="true">
      <div class="product-card__media skeleton-box"></div>
      <div class="product-card__info">
        <div class="skeleton-line skeleton-line--sm"></div>
        <div class="skeleton-line skeleton-line--lg"></div>
        <div class="skeleton-line skeleton-line--price"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line skeleton-line--btn"></div>
      </div>
    </article>
  `).join("");
}

function injectStructuredData() {
  if (!products.length) return;

  const itemListElement = products.map((product, index) => {
    const offers = Number(product.price) > 0
      ? {
          "@type": "Offer",
          price: Number(product.price).toFixed(2),
          priceCurrency: "USD",
          availability: productCanBeQuoted(product)
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          url: `${SITE_BASE}product-page.html?id=${encodeURIComponent(product.id)}`,
        }
      : undefined;

    const item = {
      "@type": "Product",
      name: product.name,
      image: toAbsoluteUrl(product.image),
      url: `${SITE_BASE}product-page.html?id=${encodeURIComponent(product.id)}`,
    };
    if (product.brand) item.brand = { "@type": "Brand", name: product.brand };
    if (offers) item.offers = offers;

    return { "@type": "ListItem", position: index + 1, item };
  });

  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Catálogo de suplementos | Javy Suplementos",
    itemListElement,
  };

  let script = document.getElementById("catalog-jsonld");
  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "catalog-jsonld";
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

function commitState() {
  renderCatalog();
  writeStateToURL();
}

const debouncedCommit = debounce(commitState, 160);

function writeStateToURL() {
  const params = new URLSearchParams();
  if (catalogState.query.trim()) params.set("q", catalogState.query.trim());
  if (catalogState.category && catalogState.category !== "todos") params.set("cat", catalogState.category);
  if (catalogState.sort && catalogState.sort !== "recomendados") params.set("sort", catalogState.sort);

  const qs = params.toString();
  history.replaceState(null, "", qs ? `${location.pathname}?${qs}` : location.pathname);
}

function readStateFromURL() {
  const params = new URLSearchParams(location.search);
  catalogState.query = params.get("q") || "";
  catalogState.category = params.get("cat") || "todos";
  catalogState.sort = params.get("sort") || "recomendados";

  if (searchInput) searchInput.value = catalogState.query;
  if (searchClear) searchClear.hidden = !catalogState.query;
  if (catalogSort) catalogSort.value = catalogState.sort;
}

searchForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  catalogState.query = searchInput.value;
  searchClear.hidden = !catalogState.query;
  commitState();
});

searchInput?.addEventListener("input", () => {
  catalogState.query = searchInput.value;
  searchClear.hidden = !catalogState.query;
  debouncedCommit();
});

searchClear?.addEventListener("click", () => {
  searchInput.value = "";
  catalogState.query = "";
  searchClear.hidden = true;
  searchInput.focus();
  commitState();
});

catalogSort?.addEventListener("change", () => {
  catalogState.sort = catalogSort.value;
  commitState();
});

function selectCategory(button) {
  catalogState.category = button.dataset.category || "todos";

  document.querySelectorAll(".catalog-filter").forEach((item) => {
    const isActive = item === button;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-pressed", String(isActive));
  });

  commitState();
}

catalogFilters?.addEventListener("click", (event) => {
  const button = event.target.closest(".catalog-filter");
  if (!button) return;

  selectCategory(button);
});

emptyAdvisorBtn?.addEventListener("click", () => {
  openJavyWhatsapp("Hola Javy, quiero consultar disponibilidad de suplementos.");
});

function updateFloatingQuoteVisibility() {
  if (!catalogFloatingQuote) return;

  const hasItems = (window.consultation?.getCount?.() || 0) > 0;
  const shouldShow = window.scrollY > 260 || hasItems;
  catalogFloatingQuote.hidden = !shouldShow;
  catalogFloatingQuote.classList.toggle("is-visible", shouldShow);
}

function updateFilterHint() {
  if (!catalogFilters) return;

  const overflowing = catalogFilters.scrollWidth > catalogFilters.clientWidth + 4;
  catalogFilters.classList.toggle("has-overflow", overflowing);
  if (catalogToolsHint) catalogToolsHint.hidden = !overflowing;
}

window.addEventListener("resize", updateFilterHint, { passive: true });

function updateScrollTopVisibility() {
  if (!catalogScrollTop) return;

  const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  const scrollingUp = currentScrollY < lastCatalogScrollY - 8;
  const farEnough = currentScrollY > 520;
  const scrollingDown = currentScrollY > lastCatalogScrollY + 8;

  if (scrollingDown || !farEnough) {
    scrollTopIsVisible = false;
  } else if (scrollingUp && farEnough) {
    scrollTopIsVisible = true;
  }

  catalogScrollTop.hidden = !scrollTopIsVisible;
  catalogScrollTop.classList.toggle("is-visible", scrollTopIsVisible);
  lastCatalogScrollY = Math.max(0, currentScrollY);
}

catalogFloatingQuote?.addEventListener("click", () => {
  window.consultation?.openPanel?.();
});

catalogScrollTop?.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});

window.addEventListener("scroll", () => {
  updateFloatingQuoteVisibility();
  updateScrollTopVisibility();
}, { passive: true });

function enableDragScroll(element) {
  if (!element) return;

  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;
  let didDrag = false;
  let dragDistance = 0;
  let pressedFilter = null;
  let suppressClick = false;
  const dragThreshold = 10;

  element.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) return;

    isDown = true;
    didDrag = false;
    dragDistance = 0;
    pressedFilter = event.target.closest(".catalog-filter");
    startX = event.clientX;
    scrollLeft = element.scrollLeft;
    element.classList.add("is-dragging");
    element.setPointerCapture?.(event.pointerId);
  });

  element.addEventListener("pointermove", (event) => {
    if (!isDown) return;

    const distance = event.clientX - startX;
    dragDistance = Math.max(dragDistance, Math.abs(distance));
    if (dragDistance < dragThreshold) return;

    didDrag = true;
    element.scrollLeft = scrollLeft - distance;
  });

  function stopDrag(event) {
    const shouldSelectFilter = event?.type === "pointerup" && pressedFilter && !didDrag;

    isDown = false;
    element.classList.remove("is-dragging");
    if (event?.pointerId) element.releasePointerCapture?.(event.pointerId);

    if (shouldSelectFilter) {
      selectCategory(pressedFilter);
      suppressClick = true;
    }

    pressedFilter = null;
  }

  element.addEventListener("pointerup", stopDrag);
  element.addEventListener("pointercancel", stopDrag);
  element.addEventListener("pointerleave", stopDrag);
  element.addEventListener("click", (event) => {
    if (suppressClick) {
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
      return;
    }

    if (!didDrag) return;

    event.preventDefault();
    event.stopPropagation();
    didDrag = false;
  }, true);
}

async function initCatalog() {
  renderLoading();
  enableDragScroll(catalogFilters);
  updateFloatingQuoteVisibility();
  updateScrollTopVisibility();

  products = await window.catalogDb.getProductsWithFlavors();
  readStateFromURL();
  renderFilters();
  renderCatalog();
  injectStructuredData();
  updateFloatingQuoteVisibility();
}

initCatalog();
