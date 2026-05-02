(async function () {
  const host = document.getElementById("site-header");
  if (!host) return;

  const html = await fetch("Editables/nav.html").then((response) => response.text());
  host.innerHTML = html;

  // Actualiza el contador apenas cargue el nav compartido.
  window.consultation?.updateBadge?.();

  const consultationBtn = document.getElementById("consultationBtn") || document.getElementById("cartBtn");
  consultationBtn?.addEventListener("click", () => {
    window.consultation?.openWhatsApp?.();
  });
})();
