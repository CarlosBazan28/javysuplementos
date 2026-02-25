(async function () {
  const host = document.getElementById("site-header");
  if (!host) return;

  const html = await fetch("Editables/nav.html").then(r => r.text());
  host.innerHTML = html;

  // Actualiza el badge apenas cargue el nav
  window.cart?.updateCartBadge?.();

  // Click del carrito (por ahora solo prueba)
  const cartBtn = document.getElementById("cartBtn");
  cartBtn?.addEventListener("click", () => {
    // más adelante aquí abres tu modal/drawer del carrito
    console.log("Abrir carrito (pendiente)");
  });
})();
