let products = [];

const catalogState = {
  query: "",
  category: "todos",
};

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const searchClear = document.getElementById("searchClear");
const supplementsList = document.getElementById("supplementsList");
const catalogCount = document.getElementById("catalogCount");
const catalogEmpty = document.getElementById("catalogEmpty");
const emptyAdvisorBtn = document.getElementById("emptyAdvisorBtn");
const catalogFilters = document.getElementById("catalogFilters");
const catalogFloatingQuote = document.getElementById("catalogFloatingQuote");
const catalogScrollTop = document.getElementById("catalogScrollTop");
let lastCatalogScrollY = window.scrollY || 0;
let scrollTopIsVisible = false;

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

function productLabel(product, key) {
  return product[key] || product[{
    name: "nombre",
    brand: "marca",
    category: "categoria",
    price: "precio",
    presentation: "presentacion",
    image: "imagen",
    available: "disponible",
    featured: "destacado",
  }[key]];
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

  return products.filter((product) => {
    const categoryMatch = productMatchesCategory(product);
    const queryMatch = !query || getSearchText(product).includes(query);

    return categoryMatch && queryMatch;
  });
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

  return [
    { label: "Todos", value: "todos" },
    { label: "Destacados", value: "destacados" },
    ...categories.map((category) => ({ label: category, value: slugify(category) })),
  ];
}

function renderFilters() {
  if (!catalogFilters) return;

  catalogFilters.innerHTML = getCategoryFilters().map((filter) => `
    <button class="catalog-filter${filter.value === catalogState.category ? " is-active" : ""}" type="button" data-category="${filter.value}">
      ${escapeHTML(filter.label)}
    </button>
  `).join("");
}

function renderProductCard(product) {
  const canQuote = productCanBeQuoted(product);
  const card = document.createElement("article");
  card.className = `product-card${product.imagenPendiente ? " product-card--image-pending" : ""}`;

  card.innerHTML = `
    ${product.featured ? '<span class="product-card__badge">Destacado</span>' : ""}

    <div class="product-card__media">
      <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}" class="product-card__img" loading="lazy" />
    </div>

    <div class="product-card__info">
      <div class="product-card__meta">
        <span class="product-card__brand">${escapeHTML(product.brand || "Marca en revision")}</span>
        <span class="product-card__status ${canQuote ? "is-available" : "is-unavailable"}">
          ${canQuote ? "Disponible" : "Consultar stock"}
        </span>
      </div>
      <h3 class="product-card__name">${escapeHTML(product.name)}</h3>
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
      <button class="product-card__btn product-card__btn--info" type="button">Ver detalles</button>
    </div>
  `;

  wireQuantityStepper(card);

  const addBtn = card.querySelector(".product-card__btn--buy");
  const quoteBtn = card.querySelector(".product-card__btn--quote");
  const detailsBtn = card.querySelector(".product-card__btn--info");

  addBtn?.addEventListener("click", () => {
    const originalText = addBtn.textContent;
    const selectedFlavor = getSelectedFlavor(card, product);
    if (product.flavors?.length && !selectedFlavor) {
      addBtn.textContent = "Elige sabor";
      window.setTimeout(() => { addBtn.textContent = originalText; }, 1200);
      return;
    }

    const quantity = getCardQuantity(card);
    window.consultation?.addItem?.(product, { ...(selectedFlavor || {}), quantity });
    addBtn.textContent = "Agregado";
    addBtn.disabled = true;

    window.setTimeout(() => {
      addBtn.textContent = originalText;
      addBtn.disabled = false;
    }, 1200);
  });

  // El botón "Consultar disponibilidad" solo se renderiza cuando !canQuote
  quoteBtn?.addEventListener("click", () => {
    window.consultation?.askAvailability?.(product, {});
  });

  detailsBtn.addEventListener("click", () => {
    const url = `product-page.html?id=${encodeURIComponent(product.id)}`;
    if (window.navigateWithTransition) {
      window.navigateWithTransition(url);
      return;
    }
    window.location.href = url;
  });

  return card;
}

function renderCatalog() {
  if (!supplementsList || !catalogCount || !catalogEmpty) return;

  const results = getFilteredProducts();
  supplementsList.innerHTML = "";

  results.forEach((product) => {
    supplementsList.appendChild(renderProductCard(product));
  });

  const label = results.length === 1 ? "producto encontrado" : "productos encontrados";
  catalogCount.textContent = `${results.length} ${label}`;
  catalogEmpty.hidden = results.length > 0;
}

function renderLoading() {
  if (!supplementsList || !catalogCount) return;
  catalogCount.textContent = "Cargando catalogo...";
  supplementsList.innerHTML = `<p class="catalog-empty">Estamos preparando los productos.</p>`;
}

searchForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  catalogState.query = searchInput.value;
  searchClear.hidden = !catalogState.query;
  renderCatalog();
});

searchInput?.addEventListener("input", () => {
  catalogState.query = searchInput.value;
  searchClear.hidden = !catalogState.query;
  renderCatalog();
});

searchClear?.addEventListener("click", () => {
  searchInput.value = "";
  catalogState.query = "";
  searchClear.hidden = true;
  searchInput.focus();
  renderCatalog();
});

function selectCategory(button) {
  catalogState.category = button.dataset.category || "todos";

  document.querySelectorAll(".catalog-filter").forEach((item) => {
    item.classList.toggle("is-active", item === button);
  });

  renderCatalog();
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

  const shouldShow = window.scrollY > 260;
  catalogFloatingQuote.hidden = !shouldShow;
  catalogFloatingQuote.classList.toggle("is-visible", shouldShow);
}

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
  renderFilters();
  renderCatalog();
}

initCatalog();
