(async function () {
  const host = document.getElementById("site-header");
  if (!host) return;

  const html = await fetch("Editables/nav.html").then((response) => response.text());
  host.innerHTML = html;

  // Actualiza el contador apenas cargue el nav compartido.
  window.consultation?.updateBadge?.();

  const consultationBtn = document.getElementById("consultationBtn") || document.getElementById("cartBtn");
  consultationBtn?.addEventListener("click", () => {
    window.consultation?.openPanel?.();
  });

  const navToggle = document.getElementById("navToggle");
  const navMenu = document.getElementById("navMenu");

  navToggle?.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!isOpen));
    navToggle.classList.toggle("is-open", !isOpen);
    navMenu?.classList.toggle("is-open", !isOpen);
  });

  navMenu?.addEventListener("click", (event) => {
    if (!(event.target instanceof HTMLAnchorElement)) return;

    navToggle?.setAttribute("aria-expanded", "false");
    navToggle?.classList.remove("is-open");
    navMenu.classList.remove("is-open");
  });
})();
