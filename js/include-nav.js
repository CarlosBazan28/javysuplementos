(async function () {
  const host = document.getElementById("site-header");
  if (!host) return;

  document.body.classList.add("page-transition");
  const html = await fetch("Editables/nav.html", { cache: "no-store" }).then((response) => response.text());
  host.innerHTML = html;
  window.javyIcons?.enhance?.(host);
  document.dispatchEvent(new CustomEvent("javy:nav-ready"));

  const adminLinks = host.querySelectorAll(".admin-nav-btn[href]");

  const setAdminLinks = (text, href) => {
    adminLinks.forEach((link) => {
      const iconName = href.includes("admin") ? "layout-dashboard" : "log-in";
      const icon = window.javyIcons?.get?.(iconName, "btn-icon admin-nav-btn__icon") || "";
      link.href = href;
      link.innerHTML = `
        ${icon}
        <span>${text}</span>
      `;
      link.classList.remove("is-auth-checking");
      link.removeAttribute("aria-busy");
    });
  };

  const setAdminLinksChecking = () => {
    adminLinks.forEach((link) => {
      link.classList.add("is-auth-checking");
      link.setAttribute("aria-busy", "true");
    });
  };

  const updateAdminEntryState = async () => {
    if (!adminLinks.length || !window.javyAuth?.hasSupabase?.()) return;

    try {
      setAdminLinksChecking();
      const { session, profile } = await window.javyAuth.getCurrentAdminSession();
      if (session && profile) {
        setAdminLinks("Panel administrativo", "admin.html");
        return;
      }

      setAdminLinks("Iniciar sesión", "login.html");
    } catch (error) {
      console.warn("No se pudo verificar la sesion administrativa:", error.message);
      setAdminLinks("Iniciar sesión", "login.html");
    }
  };

  updateAdminEntryState();

  if (window.supabaseClient?.auth?.onAuthStateChange) {
    window.supabaseClient.auth.onAuthStateChange(() => {
      updateAdminEntryState();
    });
  }

  // Actualiza el contador apenas cargue el nav compartido.
  window.consultation?.updateBadge?.();

  const consultationBtn = document.getElementById("consultationBtn") || document.getElementById("cartBtn");
  consultationBtn?.addEventListener("click", () => {
    window.consultation?.openPanel?.();
  });

  const navToggle = document.getElementById("navToggle");
  const navMenu = document.getElementById("navMenu");
  const siteHeader = host.querySelector(".site-header");

  const updateHeaderState = () => {
    siteHeader?.classList.toggle("is-scrolled", window.scrollY > 10);
  };

  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  navMenu?.querySelectorAll("a[href]").forEach((link) => {
    const href = link.getAttribute("href") || "";
    const linkPage = href.split("#")[0] || "index.html";
    const linkHash = href.includes("#") ? `#${href.split("#")[1]}` : "";
    const isSamePage = linkPage === currentPage || (currentPage === "" && linkPage === "index.html");
    const isActiveHash = linkHash && window.location.hash === linkHash;
    const isActivePage = isSamePage && !linkHash;

    if (isActiveHash || isActivePage) {
      link.classList.add("is-active");
    }
  });

  updateHeaderState();
  window.addEventListener("scroll", updateHeaderState, { passive: true });

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

  window.navigateWithTransition = (url) => {
    document.body.classList.add("page-transition-out");
    window.setTimeout(() => {
      window.location.href = url;
    }, 170);
  };

  document.addEventListener("click", (event) => {
    const link = event.target.closest?.("a[href]");
    if (!link) return;

    const href = link.getAttribute("href");
    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("http") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      link.target === "_blank"
    ) {
      return;
    }

    const targetUrl = new URL(href, window.location.href);
    if (targetUrl.pathname === window.location.pathname && targetUrl.hash) return;

    event.preventDefault();
    window.navigateWithTransition(targetUrl.href);
  });

  requestAnimationFrame(() => {
    document.body.classList.add("page-transition-in");
  });
})();
