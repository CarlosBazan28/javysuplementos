let products = [];

const catalogState = {
  query: "",
  category: "todos",
};

const OBJECTIVE_GUIDES = [
  {
    id: "masa-muscular",
    emoji: "M",
    title: "Ganar masa muscular",
    description: "Opciones con proteina, creatina y ganadores de peso.",
    categories: ["Ganadores de Peso", "Proteinas Whey", "Proteinas ISO", "Creatinas"],
    goals: ["Ganar masa muscular", "Masa muscular", "Subir calorias", "Fuerza"],
    message: "Hola Javy, quiero una recomendacion para ganar masa muscular.\nMe interesan opciones como proteina, creatina o ganador de masa.\nQuiero saber que tienes disponible, precios y que me recomiendas segun mi presupuesto.",
  },
  {
    id: "definicion",
    emoji: "D",
    title: "Definicion / bajar grasa",
    description: "Productos para apoyar energia, control y etapa de definicion.",
    categories: ["Quemadores", "Proteinas ISO", "Salud y Bienestar"],
    goals: ["Definicion", "Energia"],
    message: "Hola Javy, quiero una recomendacion para definicion o bajar grasa.\nQuiero saber que quemadores, proteinas o suplementos tienes disponibles y cual me conviene.",
  },
  {
    id: "energia",
    emoji: "E",
    title: "Mas energia para entrenar",
    description: "Pre entrenos, bebidas y opciones para enfoque.",
    categories: ["Pre Entrenos", "Bebidas y Snacks", "Energia y Cafeina"],
    goals: ["Energia", "Enfoque", "Rendimiento"],
    message: "Hola Javy, quiero mas energia para entrenar.\nMe interesan pre entrenos, bebidas o cafeina. Quiero saber disponibilidad, precios y cual me recomiendas.",
  },
  {
    id: "recuperacion",
    emoji: "R",
    title: "Recuperacion muscular",
    description: "Opciones para recuperarte mejor despues de entrenar.",
    categories: ["Aminoacidos", "Glutamina", "Proteinas Whey", "Proteinas ISO"],
    goals: ["Recuperacion", "Rendimiento"],
    message: "Hola Javy, quiero una recomendacion para recuperacion muscular.\nQuiero saber que aminoacidos, glutamina o proteina tienes disponible.",
  },
  {
    id: "salud",
    emoji: "S",
    title: "Salud y vitaminas",
    description: "Vitaminas, bienestar general y soporte diario.",
    categories: ["Salud y Bienestar", "Multivitaminicos"],
    goals: ["Salud general", "Bienestar general", "Sistema inmune", "Antioxidante"],
    message: "Hola Javy, quiero una recomendacion de salud y vitaminas.\nQuiero saber que tienes disponible para bienestar general y que me recomiendas.",
  },
  {
    id: "empezando",
    emoji: "1",
    title: "Estoy empezando",
    description: "Una ruta sencilla para comenzar sin comprar de mas.",
    categories: ["Proteinas Whey", "Creatinas", "Salud y Bienestar"],
    goals: ["Masa muscular", "Fuerza", "Salud general"],
    message: "Hola Javy, estoy empezando con suplementos.\nQuiero una recomendacion sencilla segun mi objetivo, presupuesto y rutina.",
  },
  {
    id: "no-se",
    emoji: "?",
    title: "No se que necesito",
    description: "Javy te orienta segun objetivo, rutina y presupuesto.",
    categories: ["Proteinas Whey", "Creatinas", "Pre Entrenos", "Salud y Bienestar"],
    goals: [],
    message: "Hola Javy, no se que suplemento necesito.\nQuiero que me orientes segun mi objetivo, rutina, presupuesto y disponibilidad.",
  },
];

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const searchClear = document.getElementById("searchClear");
const supplementsList = document.getElementById("supplementsList");
const catalogCount = document.getElementById("catalogCount");
const catalogEmpty = document.getElementById("catalogEmpty");
const emptyAdvisorBtn = document.getElementById("emptyAdvisorBtn");
const catalogFilters = document.getElementById("catalogFilters");
const goalGrid = document.getElementById("goalGrid");
const goalResult = document.getElementById("goalResult");

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

function renderFlavorOptions(product) {
  const flavors = product.flavors || [];
  const label = flavors.length === 1 ? "Sabor" : "Sabores";
  const selectId = `flavor-${slugify(product.id)}`;
  const enabled = productCanBeQuoted(product);

  if (!flavors.length) {
    return `
      <div class="product-card__flavors" aria-label="Sabores disponibles">
        <label class="product-card__flavor-label" for="${selectId}">Sabor</label>
        <select class="product-card__flavor-select" id="${selectId}" disabled>
          <option>No aplica / consultar</option>
        </select>
      </div>
    `;
  }

  return `
    <div class="product-card__flavors" aria-label="${label} disponibles">
      <label class="product-card__flavor-label" for="${selectId}">${label}</label>
      <select class="product-card__flavor-select" id="${selectId}" data-flavor-select ${enabled ? "" : "disabled"}>
        <option value="">Elegir sabor (${flavors.length})</option>
        ${flavors.map((flavor) => `
          <option value="${escapeHTML(flavor.id)}" ${flavor.available === false ? "disabled" : ""}>
            ${escapeHTML(flavor.name)}${flavor.available === false ? " - No disponible" : ""}
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
        <span>${escapeHTML(product.brand || "Marca en revision")}</span>
        <span class="${canQuote ? "is-available" : "is-unavailable"}">
          ${canQuote ? "Disponible" : "Consultar stock"}
        </span>
      </div>
      <h3 class="product-card__name">${escapeHTML(product.name)}</h3>
      <p class="product-card__price">$ ${formatPrice(product.price)}</p>
      ${renderFlavorOptions(product)}
      <p class="product-card__disclaimer">${escapeHTML(product.presentation || "Disponible para cotizacion por WhatsApp")}</p>
    </div>

    <div class="product-card__actions product-card__actions--catalog">
      ${canQuote ? '<button class="product-card__btn product-card__btn--buy" type="button">Agregar a cotizacion</button>' : ""}
      ${canQuote ? '<button class="product-card__btn product-card__btn--quote" type="button">Cotizar este producto</button>' : '<button class="product-card__btn product-card__btn--quote" type="button">Consultar disponibilidad</button>'}
      <button class="product-card__btn product-card__btn--info" type="button">Ver detalles</button>
    </div>
  `;

  const addBtn = card.querySelector(".product-card__btn--buy");
  const quoteBtn = card.querySelector(".product-card__btn--quote");
  const detailsBtn = card.querySelector(".product-card__btn--info");

  addBtn?.addEventListener("click", () => {
    const selectedFlavor = getSelectedFlavor(card, product);
    if (product.flavors?.length && !selectedFlavor) {
      addBtn.textContent = "Elige sabor";
      window.setTimeout(() => { addBtn.textContent = "Agregar a cotizacion"; }, 1200);
      return;
    }

    window.consultation?.addItem?.(product, selectedFlavor || {});
    addBtn.textContent = "Agregado";
    addBtn.disabled = true;

    window.setTimeout(() => {
      addBtn.textContent = "Agregar a cotizacion";
      addBtn.disabled = false;
    }, 1200);
  });

  quoteBtn?.addEventListener("click", () => {
    const selectedFlavor = canQuote ? getSelectedFlavor(card, product, false) : {};
    if (!canQuote) {
      window.consultation?.askAvailability?.(product, selectedFlavor || {});
      return;
    }

    window.consultation?.quoteSingleProduct?.(product, selectedFlavor || {});
  });

  detailsBtn.addEventListener("click", () => {
    window.location.href = `product-page.html?id=${encodeURIComponent(product.id)}`;
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

function productMatchesObjective(product, guide) {
  const category = normalizeText(product.category);
  const goals = normalizeText(product.goals?.join(" "));
  const tags = normalizeText(product.tags?.join(" "));
  const haystack = `${category} ${goals} ${tags}`;

  return guide.categories.some((item) => haystack.includes(normalizeText(item))) ||
    guide.goals.some((item) => haystack.includes(normalizeText(item)));
}

function renderObjectiveCards() {
  if (!goalGrid) return;

  goalGrid.innerHTML = OBJECTIVE_GUIDES.map((guide) => `
    <article class="goal-card">
      <span class="goal-card__icon" aria-hidden="true">${escapeHTML(guide.emoji)}</span>
      <h3>${escapeHTML(guide.title)}</h3>
      <p>${escapeHTML(guide.description)}</p>
      <button type="button" data-goal="${escapeHTML(guide.id)}">Ver recomendaciones</button>
    </article>
  `).join("");
}

function renderObjectiveResult(guide) {
  if (!goalResult) return;

  const relatedProducts = products.filter((product) => productMatchesObjective(product, guide)).slice(0, 6);
  const categories = guide.categories.map((category) => `<span>${escapeHTML(category)}</span>`).join("");
  const productLinks = relatedProducts.length
    ? relatedProducts.map((product) => `<li>${escapeHTML(product.name)}${product.available === false ? " (consultar stock)" : ""}</li>`).join("")
    : "<li>Javy puede recomendarte segun tu presupuesto y rutina.</li>";

  goalResult.hidden = false;
  goalResult.innerHTML = `
    <div class="goal-result__content">
      <p class="goal-result__eyebrow">Recomendacion para</p>
      <h3>${escapeHTML(guide.title)}</h3>
      <p>${escapeHTML(guide.description)}</p>
      <div class="goal-result__chips">${categories}</div>
      <ul>${productLinks}</ul>
    </div>
    <button class="goal-result__btn" type="button" data-goal-whatsapp="${escapeHTML(guide.id)}">
      Cotizar este objetivo por WhatsApp
    </button>
  `;
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

goalGrid?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-goal]");
  if (!button) return;

  const guide = OBJECTIVE_GUIDES.find((item) => item.id === button.dataset.goal);
  if (!guide) return;
  renderObjectiveResult(guide);
  goalResult?.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

goalResult?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-goal-whatsapp]");
  if (!button) return;

  const guide = OBJECTIVE_GUIDES.find((item) => item.id === button.dataset.goalWhatsapp);
  if (!guide) return;
  openJavyWhatsapp(guide.message);
});

emptyAdvisorBtn?.addEventListener("click", () => {
  openJavyWhatsapp("Hola Javy, quiero consultar disponibilidad de suplementos.");
});

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
  renderObjectiveCards();
  enableDragScroll(catalogFilters);

  products = await window.catalogDb.getProductsWithFlavors();
  renderFilters();
  renderCatalog();
}

initCatalog();
