const productEntries = typeof PRODUCTS !== "undefined" ? Object.entries(PRODUCTS) : [];
const productos = productEntries.map(([id, product]) => ({
  id,
  nombre: product.nombre,
  descripcion: product.subtitulo || product.descripcion?.[0] || "",
  precio: product.precio,
  marca: product.marca,
  categoria: product.categoria,
  disponible: product.disponible,
  imagen: product.imagen,
  imagenPendiente: product.imagenPendiente,
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
  const selectId = `home-flavor-${product.id}`;

  if (!flavors.length) {
    return `
      <div class="product-card__flavors" aria-label="Sabores disponibles">
        <label class="product-card__flavor-label" for="${selectId}">Sabor</label>
        <select class="product-card__flavor-select" id="${selectId}" disabled>
          <option>Consultar disponibilidad</option>
        </select>
      </div>
    `;
  }

  return `
    <div class="product-card__flavors" aria-label="${label} disponibles">
      <label class="product-card__flavor-label" for="${selectId}">${label}</label>
      <select class="product-card__flavor-select" id="${selectId}" data-flavor-select>
        <option value="">Elegir sabor (${flavors.length})</option>
        ${flavors.map((flavor) => `<option value="${escapeHTML(flavor)}">${escapeHTML(flavor)}</option>`).join("")}
      </select>
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
    if (p.imagenPendiente) card.classList.add("product-card--image-pending");

    card.innerHTML = `
      <div class="product-card__media">
        <img src="${p.imagen}" alt="${escapeHTML(p.alt)}" class="product-card__img" loading="lazy" />
      </div>

      <div class="product-card__info">
        <div class="product-card__meta">
          <span>${escapeHTML(p.marca || "Marca en revisión")}</span>
          <span class="${p.disponible ? "is-available" : "is-unavailable"}">
            ${p.disponible ? "Disponible" : "Consultar stock"}
          </span>
        </div>
        <h3 class="product-card__name">${escapeHTML(p.nombre)}</h3>
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
      const selectedFlavor = card.querySelector("[data-flavor-select]")?.value || "";
      window.consultation?.addItem?.(p.id, { flavor: selectedFlavor });
      showAddedState(btnConsulta);
    });

    const btnInfo = card.querySelector(".product-card__btn--info");
    btnInfo.addEventListener("click", () => {
      window.location.href = `product-page.html?id=${encodeURIComponent(p.id)}`;
    });

    lista.appendChild(card);
  });
}
