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

function normalizeText(value = "") {
  return value
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function inferCategory(product) {
  const haystack = normalizeText(`${product.nombre} ${product.subtitulo} ${product.tag}`);

  if (haystack.includes("creatina")) return "creatinas";
  if (
    haystack.includes("whey") ||
    haystack.includes("protein") ||
    haystack.includes("proteina") ||
    haystack.includes("iso")
  ) {
    return "proteinas";
  }
  if (
    haystack.includes("lipo") ||
    haystack.includes("carnitina") ||
    haystack.includes("termogenico") ||
    haystack.includes("definicion") ||
    haystack.includes("grasa")
  ) {
    return "definicion";
  }

  return "otros";
}

function getSearchText(id, product) {
  return normalizeText([
    id,
    product.nombre,
    product.subtitulo,
    product.tag,
    product.descripcion?.join(" "),
    product.beneficios?.join(" "),
  ].join(" "));
}

function getFilteredProducts() {
  const query = normalizeText(catalogState.query.trim());

  return products.filter(([id, product]) => {
    const categoryMatch = catalogState.category === "todos" || inferCategory(product) === catalogState.category;
    const queryMatch = !query || getSearchText(id, product).includes(query);

    return categoryMatch && queryMatch;
  });
}

function formatPrice(price) {
  return Number(price).toFixed(2);
}

function renderProductCard(id, product) {
  const card = document.createElement("article");
  card.className = "product-card";

  card.innerHTML = `
    <div class="product-card__media">
      <img src="${product.imagen}" alt="${product.alt || product.nombre}" class="product-card__img" loading="lazy" />
    </div>

    <div class="product-card__info">
      <h3 class="product-card__name">${product.nombre}</h3>
      <p class="product-card__price">$ ${formatPrice(product.precio)}</p>
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
  window.consultation?.openWhatsApp?.();
});

renderCatalog();
