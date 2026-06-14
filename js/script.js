const lista = document.getElementById("top-products__list");
const heroProductsBtn = document.querySelector(".hero__button--pri");
const heroAdvisorBtn = document.querySelector(".hero__button--sec");

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

function slugify(value = "") {
  return value
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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
  const selectId = `home-flavor-${slugify(product.id)}`;
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
    if (shouldRequire) select.focus();
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
  return Math.max(1, parseInt(card.querySelector("[data-qty-value]")?.textContent, 10) || 1);
}

function showAddedState(button) {
  const originalText = button.textContent;
  button.textContent = "Agregado";
  button.disabled = true;

  window.setTimeout(() => {
    button.textContent = originalText;
    button.disabled = false;
  }, 1200);
}

function renderFeaturedProducts(productos) {
  if (!lista) return;

  if (!productos.length) {
    lista.innerHTML = `
      <p class="product-card__disclaimer">
        No hay productos destacados por el momento.
      </p>
    `;
    return;
  }

  lista.innerHTML = "";

  productos.forEach((product) => {
    const canQuote = productCanBeQuoted(product);
    const card = document.createElement("article");
    card.classList.add("product-card");
    if (product.imagenPendiente) card.classList.add("product-card--image-pending");

    card.innerHTML = `
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

    const btnConsulta = card.querySelector(".product-card__btn--buy");
    btnConsulta?.addEventListener("click", () => {
      const selectedFlavor = getSelectedFlavor(card, product);
      if (product.flavors?.length && !selectedFlavor) {
        btnConsulta.textContent = "Elige sabor";
        window.setTimeout(() => { btnConsulta.textContent = "Agregar a cotizacion"; }, 1200);
        return;
      }

      const quantity = getCardQuantity(card);
      window.consultation?.addItem?.(product, { ...(selectedFlavor || {}), quantity });
      showAddedState(btnConsulta);
    });

    const btnQuote = card.querySelector(".product-card__btn--quote");
    btnQuote?.addEventListener("click", () => {
      const selectedFlavor = canQuote ? getSelectedFlavor(card, product, false) : {};
      if (canQuote) {
        window.consultation?.quoteSingleProduct?.(product, selectedFlavor || {});
      } else {
        window.consultation?.askAvailability?.(product, selectedFlavor || {});
      }
    });

    const btnInfo = card.querySelector(".product-card__btn--info");
    btnInfo.addEventListener("click", () => {
      const url = `product-page.html?id=${encodeURIComponent(product.id)}`;
      if (window.navigateWithTransition) {
        window.navigateWithTransition(url);
        return;
      }
      window.location.href = url;
    });

    lista.appendChild(card);
  });
}

if (heroProductsBtn) {
  heroProductsBtn.addEventListener("click", () => {
    document.getElementById("productos")?.scrollIntoView({ behavior: "smooth" });
  });
}

if (heroAdvisorBtn) {
  heroAdvisorBtn.addEventListener("click", () => {
    window.consultation?.openPanel?.();
  });
}

async function initHomeProducts() {
  if (!lista) return;
  lista.innerHTML = `<p class="product-card__disclaimer">Cargando productos destacados...</p>`;

  try {
    const homeProducts = await window.catalogDb.getHomeProducts();
    renderFeaturedProducts(homeProducts);
  } catch (error) {
    console.warn("No se pudieron cargar productos del inicio:", error.message);
    const allProducts = await window.catalogDb.getProductsWithFlavors();
    const featuredProducts = allProducts.filter((product) => product.featured).slice(0, 8);
    renderFeaturedProducts(featuredProducts);
  }
}

initHomeProducts();
