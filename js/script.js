const productEntries = typeof PRODUCTS !== "undefined" ? Object.entries(PRODUCTS) : [];
const productos = productEntries.map(([id, product]) => ({
  id,
  nombre: product.nombre,
  descripcion: product.subtitulo || product.descripcion?.[0] || "",
  precio: product.precio,
  imagen: product.imagen,
  alt: product.alt || product.nombre,
  tag: product.tag || "",
}));

const lista = document.getElementById("top-products__list");
const heroProductsBtn = document.querySelector(".hero__button--pri");
const heroAdvisorBtn = document.querySelector(".hero__button--sec");

function formatPrice(price) {
  return Number(price).toFixed(2);
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
    window.consultation?.openWhatsApp?.();
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
