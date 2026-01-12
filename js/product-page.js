document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");

  if (!productId || !PRODUCTS[productId]) {
    document.body.innerHTML = `
      <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#050709;color:#fff;font-family:system-ui;padding:1.5rem;text-align:center;">
        <div>
          <h1 style="margin-bottom:0.75rem;">Producto no encontrado</h1>
          <p style="margin-bottom:1rem;color:#A9B4C6;">Verifica el enlace o vuelve al inicio.</p>
          <a href="index.html" style="color:#5AB4E9;text-decoration:none;font-weight:600;">Volver al inicio</a>
        </div>
      </main>
    `;
    return;
  }

  const product = PRODUCTS[productId];

  document.title = `Javy Supplements – ${product.nombre}`;

  const imgEl = document.getElementById("prod-image");
  const titleEl = document.getElementById("prod-title");
  const subtitleEl = document.getElementById("prod-subtitle");
  const priceEl = document.getElementById("prod-price");
  const tagEl = document.getElementById("prod-tag");
  const waEl = document.getElementById("prod-whatsapp");

  const beneficiosEl = document.getElementById("tab-beneficios");
  const descripcionEl = document.getElementById("tab-descripcion");
  const usoEl = document.getElementById("tab-uso");

  titleEl.textContent = product.nombre;
  subtitleEl.textContent = product.subtitulo;
  priceEl.textContent = `$${product.precio.toFixed(2)}`;
  tagEl.textContent = product.tag || "";

  imgEl.src = product.imagen;
  imgEl.alt = product.alt || product.nombre;

  const mensaje = encodeURIComponent(product.whatsappMensaje || `Hola, quiero información sobre ${product.nombre}`);
  waEl.href = `https://wa.me/50763932305?text=${mensaje}`;

  beneficiosEl.innerHTML = crearLista(product.beneficios);
  descripcionEl.innerHTML = crearParrafos(product.descripcion);
  usoEl.innerHTML = crearLista(product.uso);

  setupTabs();
});

function crearLista(items = []) {
  if (!items.length) return "<p>Información no disponible.</p>";
  return `
    <ul class="product-detail__list">
      ${items.map((t) => `<li>${t}</li>`).join("")}
    </ul>
  `;
}

function crearParrafos(lines = []) {
  if (!lines.length) return "<p>Información no disponible.</p>";
  return lines.map((t) => `<p>${t}</p>`).join("");
}

function setupTabs() {
  const tabButtons = document.querySelectorAll(".product-tabs__btn");
  const tabPanels = document.querySelectorAll(".product-tabs__panel");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;

      tabButtons.forEach((b) => {
        const isActive = b === btn;
        b.classList.toggle("is-active", isActive);
        b.setAttribute("aria-selected", isActive ? "true" : "false");
      });

      tabPanels.forEach((panel) => {
        const match = panel.dataset.tabPanel === target;
        panel.classList.toggle("is-active", match);
        panel.hidden = !match;
      });
    });
  });
}