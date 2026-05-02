const productEntries = typeof PRODUCTS !== "undefined" ? Object.entries(PRODUCTS) : [];
const productos = productEntries.map(([id, product]) => ({
  id,
  nombre: product.nombre,
  descripcion: product.subtitulo || product.descripcion?.[0] || "",
  precio: product.precio,
  imagen: product.imagen,
  alt: product.alt || product.nombre,
  sabores: product.sabores || [],
  tag: product.tag || "",
})).filter((product) => PRODUCTS[product.id]?.destacado);

const lista = document.getElementById("top-products__list");
const heroProductsBtn = document.querySelector(".hero__button--pri");
const heroAdvisorBtn = document.querySelector(".hero__button--sec");

function formatPrice(price) {
  return Number(price).toFixed(2);
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

function renderFlavorOptions(product) {
  const flavors = product.sabores || [];
  const label = flavors.length === 1 ? "Sabor" : "Sabores";

  if (!flavors.length) {
    return `
      <div class="product-card__flavors" aria-label="Sabores disponibles">
        <span class="product-card__flavor-label">Sabores</span>
        <span class="product-card__flavor-chip product-card__flavor-chip--muted">Consultar</span>
      </div>
    `;
  }

  const visibleFlavors = flavors.slice(0, 3);
  const hiddenCount = flavors.length - visibleFlavors.length;

  return `
    <div class="product-card__flavors" aria-label="${label} disponibles">
      <span class="product-card__flavor-label">${label}</span>
      <span class="product-card__flavor-list">
        ${visibleFlavors.map((flavor) => `<span class="product-card__flavor-chip">${escapeHTML(flavor)}</span>`).join("")}
        ${hiddenCount > 0 ? `<span class="product-card__flavor-chip product-card__flavor-chip--more">+${hiddenCount}</span>` : ""}
      </span>
    </div>
  `;
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

if (lista) {
  if (!productos.length) {
    lista.innerHTML = `
      <p class="product-card__disclaimer">
        No hay productos disponibles por el momento.
      </p>
    `;
  }

  productos.forEach((p) => {
    const card = document.createElement("article");
    card.classList.add("product-card");

    card.innerHTML = `
      <div class="product-card__media">
        <img src="${p.imagen}" alt="${p.alt}" class="product-card__img" loading="lazy" />
      </div>

      <div class="product-card__info">
        <h3 class="product-card__name">${p.nombre}</h3>
        <p class="product-card__price">$ ${formatPrice(p.precio)}</p>
        ${renderFlavorOptions(p)}
        <p class="product-card__disclaimer">Agregalo a tu consulta para pedir asesoría por WhatsApp</p>
      </div>

      <div class="product-card__actions">
        <button class="product-card__btn product-card__btn--buy" type="button">Agregar a consulta</button>
        <button class="product-card__btn product-card__btn--info" type="button">Ver detalles</button>
      </div>
    `;

    const btnConsulta = card.querySelector(".product-card__btn--buy");
    btnConsulta.addEventListener("click", () => {
      window.consultation?.addItem?.(p.id);
      showAddedState(btnConsulta);
    });

    const btnInfo = card.querySelector(".product-card__btn--info");
    btnInfo.addEventListener("click", () => {
      window.location.href = `product-page.html?id=${encodeURIComponent(p.id)}`;
    });

    lista.appendChild(card);
  });
}
