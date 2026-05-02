const products = typeof PRODUCTS !== "undefined" ? Object.entries(PRODUCTS) : [];

const catalogState = {
  query: "",
  category: "todos",
};

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const searchClear = document.getElementById("searchClear");
const filterButtons = document.querySelectorAll(".catalog-filter");
const supplementsList = document.getElementById("supplementsList");
const catalogCount = document.getElementById("catalogCount");
const catalogEmpty = document.getElementById("catalogEmpty");
const emptyAdvisorBtn = document.getElementById("emptyAdvisorBtn");
const catalogFilters = document.getElementById("catalogFilters");

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
  return slugify(product.categoria || "otros");
}

function productMatchesCategory(product) {
  if (catalogState.category === "todos") return true;
  if (catalogState.category === "destacados") return Boolean(product.destacado);

  return getProductCategory(product) === catalogState.category;
}

function getSearchText(id, product) {
  return normalizeText([
    id,
    product.nombre,
    product.subtitulo,
    product.categoria,
    product.marca,
    product.tag,
    product.sabores?.join(" "),
    product.objetivos?.join(" "),
    product.descripcion?.join(" "),
    product.beneficios?.join(" "),
  ].join(" "));
}

function getFilteredProducts() {
  const query = normalizeText(catalogState.query.trim());

  return products.filter(([id, product]) => {
    const categoryMatch = productMatchesCategory(product);
    const queryMatch = !query || getSearchText(id, product).includes(query);

    return categoryMatch && queryMatch;
  });
}

function formatPrice(price) {
  return Number(price).toFixed(2);
}

function getFlavorLabel(product) {
  if (!product.sabores?.length) return "Sabores: consultar";
  if (product.sabores.length <= 3) return `Sabores: ${product.sabores.join(", ")}`;

  return `Sabores: ${product.sabores.slice(0, 3).join(", ")} +${product.sabores.length - 3}`;
}

function renderProductCard(id, product) {
  const card = document.createElement("article");
  card.className = "product-card";

  card.innerHTML = `
    <span class="product-card__badge">${product.categoria || "Suplemento"}</span>

    <div class="product-card__media">
      <img src="${product.imagen}" alt="${product.alt || product.nombre}" class="product-card__img" loading="lazy" />
    </div>

    <div class="product-card__info">
      <div class="product-card__meta">
        <span>${product.marca || "Marca por confirmar"}</span>
        <span class="${product.disponible ? "is-available" : "is-unavailable"}">
          ${product.disponible ? "Disponible" : "Consultar stock"}
        </span>
      </div>
      <h3 class="product-card__name">${product.nombre}</h3>
      <p class="product-card__price">$ ${formatPrice(product.precio)}</p>
      <p class="product-card__flavors">${getFlavorLabel(product)}</p>
      <p class="product-card__disclaimer">${product.subtitulo || "Disponible para consulta por WhatsApp"}</p>
    </div>

    <div class="product-card__actions">
      <button class="product-card__btn product-card__btn--buy" type="button">Agregar a consulta</button>
      <button class="product-card__btn product-card__btn--info" type="button">Ver detalles</button>
    </div>
  `;

  const addBtn = card.querySelector(".product-card__btn--buy");
  const detailsBtn = card.querySelector(".product-card__btn--info");

  addBtn.addEventListener("click", () => {
    window.consultation?.addItem?.(id);
    addBtn.textContent = "Agregado";
    addBtn.disabled = true;

    window.setTimeout(() => {
      addBtn.textContent = "Agregar a consulta";
      addBtn.disabled = false;
    }, 1200);
  });

  detailsBtn.addEventListener("click", () => {
    window.location.href = `product-page.html?id=${encodeURIComponent(id)}`;
  });

  return card;
}

function renderCatalog() {
  if (!supplementsList || !catalogCount || !catalogEmpty) return;

  const results = getFilteredProducts();
  supplementsList.innerHTML = "";

  results.forEach(([id, product]) => {
    supplementsList.appendChild(renderProductCard(id, product));
  });

  const label = results.length === 1 ? "producto encontrado" : "productos encontrados";
  catalogCount.textContent = `${results.length} ${label}`;
  catalogEmpty.hidden = results.length > 0;
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

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    catalogState.category = button.dataset.category || "todos";

    filterButtons.forEach((item) => {
      item.classList.toggle("is-active", item === button);
    });

    renderCatalog();
  });
});

emptyAdvisorBtn?.addEventListener("click", () => {
  window.consultation?.openPanel?.();
});

function enableDragScroll(element) {
  if (!element) return;

  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;
  let didDrag = false;

  element.addEventListener("pointerdown", (event) => {
    isDown = true;
    didDrag = false;
    startX = event.clientX;
    scrollLeft = element.scrollLeft;
    element.classList.add("is-dragging");
    element.setPointerCapture?.(event.pointerId);
  });

  element.addEventListener("pointermove", (event) => {
    if (!isDown) return;

    const distance = event.clientX - startX;
    if (Math.abs(distance) > 5) didDrag = true;
    element.scrollLeft = scrollLeft - distance;
  });

  function stopDrag(event) {
    isDown = false;
    element.classList.remove("is-dragging");
    if (event?.pointerId) element.releasePointerCapture?.(event.pointerId);
  }

  element.addEventListener("pointerup", stopDrag);
  element.addEventListener("pointercancel", stopDrag);
  element.addEventListener("pointerleave", stopDrag);
  element.addEventListener("click", (event) => {
    if (!didDrag) return;

    event.preventDefault();
    event.stopPropagation();
    didDrag = false;
  }, true);
}

enableDragScroll(catalogFilters);
renderCatalog();
