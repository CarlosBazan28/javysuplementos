(function () {
  const PAGE_SIZE = 24;
  const PLACEHOLDER_IMAGE = "img/products/product-placeholder.svg";

  const state = {
    products: [],
    categories: [],
    currentSection: "dashboard",
    selectedProductId: null,
    imageObjectUrl: null,
    variantProductId: null,
    homeIds: [],
    visibleCount: PAGE_SIZE,
    filterScrollY: 0,
    filterScrollLocked: false,
    filters: {
      query: "",
      category: "all",
      availability: "all",
      home: "all",
      review: "all",
      sort: "recent",
    },
  };

  const els = {};

  function $(selector) {
    return document.querySelector(selector);
  }

  function cacheElements() {
    Object.assign(els, {
      gate: $("#adminGate"),
      gateMessage: $("#adminGateMessage"),
      dashboard: $("#adminDashboard"),
      sectionTitle: $("#adminSectionTitle"),
      navItems: document.querySelectorAll("[data-admin-section]"),
      contextActions: document.querySelectorAll("[data-show-sections]"),
      quickSearch: $("#adminQuickSearch"),
      newProductBtn: $("#adminNewProductBtn"),
      logoutBtn: $("#adminLogoutBtn"),
      stats: $("#adminStats"),
      recent: $("#adminRecentProducts"),
      opsAgotados: $("#adminOpsAgotados"),
      opsAgotadosCount: $("#adminOpsAgotadosCount"),
      opsOfertas: $("#adminOpsOfertas"),
      opsOfertasCount: $("#adminOpsOfertasCount"),
      opsStale: $("#adminOpsStale"),
      opsStaleCount: $("#adminOpsStaleCount"),
      seedBtn: $("#adminSeedBtn"),
      categoryFilter: $("#adminCategoryFilter"),
      availabilityFilter: $("#adminAvailabilityFilter"),
      homeFilter: $("#adminHomeFilter"),
      reviewFilter: $("#adminReviewFilter"),
      sortFilter: $("#adminSortFilter"),
      filterToggle: $("#adminFilterToggle"),
      filterPanel: $("#adminFilterPanel"),
      filterBackdrop: $("#adminFilterBackdrop"),
      filterApply: $("#adminFilterApply"),
      filterClear: $("#adminFilterClear"),
      filterClose: $("#adminFilterClose"),
      filterCount: $("#adminFilterCount"),
      productResultCount: $("#adminProductResultCount"),
      tableWrap: $("#adminProductTableWrap"),
      cardWrap: $("#adminProductCards"),
      productsEmpty: $("#adminProductsEmpty"),
      loadMoreBtn: $("#adminLoadMoreBtn"),
      variantProductSelect: $("#variantProductSelect"),
      variantManager: $("#variantManager"),
      homeCounter: $("#adminHomeCounter"),
      homeList: $("#adminHomeList"),
      homePool: $("#adminHomePool"),
      saveHomeBtn: $("#adminSaveHomeBtn"),
      drawer: $("#productDrawer"),
      productForm: $("#adminProductForm"),
      drawerTitle: $("#productDrawerTitle"),
      imagePreview: $("#productImagePreview"),
      deleteProductBtn: $("#adminDeleteProductBtn"),
      formMessage: $("#adminProductFormMessage"),
      toastRegion: $("#adminToastRegion"),
    });
    ensureFilterPortal();
  }

  function ensureFilterPortal() {
    if (!els.filterPanel || !els.filterBackdrop) return;
    if (els.filterBackdrop.parentElement !== document.body) {
      document.body.appendChild(els.filterBackdrop);
    }
    if (els.filterPanel.parentElement !== document.body) {
      document.body.appendChild(els.filterPanel);
    }
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

  function icon(name, className = "btn-icon") {
    return window.javyIcons?.get?.(name, className) || "";
  }

  function normalizeText(value = "") {
    return value.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function parseList(value = "") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  function listToInput(list = []) {
    return Array.isArray(list) ? list.join(", ") : "";
  }

  function formatPrice(price) {
    const value = Number(price || 0);
    return value > 0 ? `$${value.toFixed(2)}` : "Consultar";
  }

  function productImage(product) {
    return product?.image || product?.image_url || PLACEHOLDER_IMAGE;
  }

  function getAvailableFlavorCount(product) {
    return (product.flavors || []).filter((flavor) => flavor.available !== false).length;
  }

  function hasProductImage(product) {
    return Boolean(productImage(product)) && productImage(product) !== PLACEHOLDER_IMAGE;
  }

  function hasProductPrice(product) {
    return Number(product.price || 0) > 0;
  }

  function hasProductFlavors(product) {
    return Boolean(product.flavors?.length);
  }

  function getFlavorMode(product) {
    return ["has_flavors", "no_flavor", "needs_review"].includes(product?.flavor_mode)
      ? product.flavor_mode
      : "needs_review";
  }

  function isNoFlavorProduct(product) {
    return getFlavorMode(product) === "no_flavor";
  }

  function requiresFlavors(product) {
    return getFlavorMode(product) === "has_flavors";
  }

  function needsFlavorReview(product) {
    return getFlavorMode(product) === "needs_review";
  }

  function hasInactiveFlavorsOnly(product) {
    return requiresFlavors(product) && hasProductFlavors(product) && getAvailableFlavorCount(product) === 0;
  }

  function isMissingRequiredFlavors(product) {
    return requiresFlavors(product) && !hasProductFlavors(product);
  }

  function isFeaturedProduct(product) {
    return Boolean(product.featured || product.is_featured);
  }

  function getProductPrice(product) {
    return Number(product.price || 0);
  }

  function isAgotado(product) {
    return product?.available === false;
  }

  function hasActiveOffer(product) {
    const price = Number(product?.price || 0);
    const oldPrice = Number(product?.old_price || 0);
    return price > 0 && oldPrice > price;
  }

  function getDiscountPercent(product) {
    if (!hasActiveOffer(product)) return 0;
    return Math.round((1 - Number(product.price) / Number(product.old_price)) * 100);
  }

  function daysSince(dateValue) {
    if (!dateValue) return 0;
    const then = new Date(dateValue).getTime();
    if (Number.isNaN(then)) return 0;
    return Math.floor((Date.now() - then) / 86400000);
  }

  // Sabores agotados de productos que en sí están disponibles (caso típico:
  // el producto se vende, pero a un sabor puntual se le acabó el stock).
  function getAgotadoFlavorEntries() {
    const entries = [];
    state.products.forEach((product) => {
      if (isAgotado(product)) return;
      (product.flavors || []).forEach((flavor) => {
        if (flavor.available === false) entries.push({ product, flavor });
      });
    });
    return entries;
  }

  function findFlavorById(flavorId) {
    for (const product of state.products) {
      const flavor = (product.flavors || []).find((item) => item.id === flavorId);
      if (flavor) return flavor;
    }
    return null;
  }

  function getActiveFilterCount() {
    return [
      state.filters.category !== "all",
      state.filters.availability !== "all",
      state.filters.home !== "all",
      state.filters.review !== "all",
      state.filters.sort !== "recent",
    ].filter(Boolean).length;
  }

  function syncFilterControls() {
    if (els.categoryFilter) els.categoryFilter.value = state.filters.category;
    if (els.availabilityFilter) els.availabilityFilter.value = state.filters.availability;
    if (els.homeFilter) els.homeFilter.value = state.filters.home;
    if (els.reviewFilter) els.reviewFilter.value = state.filters.review;
    if (els.sortFilter) els.sortFilter.value = state.filters.sort;
  }

  function updateFilterCount() {
    if (!els.filterCount) return;
    const count = getActiveFilterCount();
    els.filterCount.hidden = count === 0;
    els.filterCount.textContent = count;
  }

  function setFilterPanelOpen(isOpen) {
    ensureFilterPortal();
    if (!els.filterPanel || !els.filterToggle || !els.filterBackdrop) return;
    const wasOpen = els.filterToggle.getAttribute("aria-expanded") === "true";
    if (isOpen === wasOpen) return;

    if (isOpen && window.matchMedia("(max-width: 860px)").matches) {
      state.filterScrollY = window.scrollY || window.pageYOffset || 0;
      document.body.classList.add("admin-filter-open");
      state.filterScrollLocked = true;
    } else if (!isOpen && state.filterScrollLocked) {
      document.body.classList.remove("admin-filter-open");
      window.scrollTo(0, state.filterScrollY);
      state.filterScrollLocked = false;
    }

    els.filterPanel.hidden = !isOpen;
    els.filterBackdrop.hidden = !isOpen;
    els.filterPanel.classList.toggle("is-open", isOpen);
    els.filterBackdrop.classList.toggle("is-open", isOpen);
    els.filterToggle.setAttribute("aria-expanded", String(isOpen));
    els.filterPanel.setAttribute("aria-hidden", String(!isOpen));
    if (isOpen) {
      els.filterPanel.scrollTop = 0;
      els.filterPanel.focus({ preventScroll: true });
    } else {
      els.filterToggle.focus({ preventScroll: true });
    }
  }

  function unlockFilterScrollIfNeeded() {
    if (!state.filterScrollLocked || window.matchMedia("(max-width: 860px)").matches) return;
    document.body.classList.remove("admin-filter-open");
    window.scrollTo(0, state.filterScrollY);
    state.filterScrollLocked = false;
  }

  function resetProductFilters() {
    state.filters = {
      ...state.filters,
      category: "all",
      availability: "all",
      home: "all",
      review: "all",
      sort: "recent",
    };
    state.visibleCount = PAGE_SIZE;
    syncFilterControls();
    renderProducts();
  }

  function setGate(message, isError = false) {
    if (!els.gateMessage) return;
    els.gateMessage.textContent = message;
    els.gateMessage.style.color = isError ? "#ffc1ce" : "";
  }

  function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `admin-toast${type === "error" ? " is-error" : ""}`;
    toast.textContent = message;
    els.toastRegion?.appendChild(toast);
    window.setTimeout(() => toast.remove(), 4200);
  }

  // Modal de confirmación accesible (reemplaza window.confirm). Devuelve Promise<boolean>.
  function confirmDialog({ title, message, confirmText = "Confirmar", cancelText = "Cancelar", danger = false }) {
    return new Promise((resolve) => {
      const lastFocused = document.activeElement;
      const overlay = document.createElement("div");
      overlay.className = "admin-confirm";
      overlay.innerHTML = `
        <div class="admin-confirm__backdrop" data-confirm-cancel></div>
        <div class="admin-confirm__panel" role="dialog" aria-modal="true" aria-labelledby="adminConfirmTitle">
          <h3 id="adminConfirmTitle">${escapeHTML(title)}</h3>
          <p>${escapeHTML(message)}</p>
          <div class="admin-confirm__actions">
            <button type="button" class="admin-secondary" data-confirm-cancel>${escapeHTML(cancelText)}</button>
            <button type="button" class="${danger ? "admin-danger" : "admin-primary"}" data-confirm-ok>${escapeHTML(confirmText)}</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);

      const okBtn = overlay.querySelector("[data-confirm-ok]");
      const cancelBtn = overlay.querySelector("button[data-confirm-cancel]");
      okBtn.focus({ preventScroll: true });

      function close(result) {
        overlay.remove();
        document.removeEventListener("keydown", onKey, true);
        lastFocused?.focus?.({ preventScroll: true });
        resolve(result);
      }
      function onKey(event) {
        if (event.key === "Escape") {
          event.preventDefault();
          close(false);
        } else if (event.key === "Tab") {
          event.preventDefault(); // trap simple entre los dos botones
          (document.activeElement === okBtn ? cancelBtn : okBtn).focus();
        }
      }
      overlay.addEventListener("click", (event) => {
        if (event.target.closest("[data-confirm-ok]")) close(true);
        else if (event.target.closest("[data-confirm-cancel]")) close(false);
      });
      document.addEventListener("keydown", onKey, true);
    });
  }

  function setFormMessage(message = "", isError = false) {
    if (!els.formMessage) return;
    els.formMessage.textContent = message;
    els.formMessage.classList.toggle("is-error", Boolean(isError));
  }

  function setButtonLoading(button, isLoading, loadingText = "Guardando...") {
    if (!button) return;
    // Solo cambia el texto del label, nunca el botón completo: así el icono
    // (un <span class="btn-icon"> hermano) sobrevive al estado de carga.
    const target = button.querySelector(".btn-label") || button;
    if (isLoading) {
      button.dataset.originalText = target.textContent;
      target.textContent = loadingText;
      button.disabled = true;
      return;
    }
    if (button.dataset.originalText != null) {
      target.textContent = button.dataset.originalText;
    }
    button.disabled = false;
    delete button.dataset.originalText;
  }

  function requireSupabase() {
    if (!window.supabaseClient) {
      throw new Error("Supabase no esta disponible. Revisa el CDN o la conexion.");
    }
  }

  async function protectAdminPage() {
    requireSupabase();
    setGate("Revisando sesion activa...");

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;

    const session = data?.session;
    if (!session?.user?.id) {
      setGate("No hay sesión activa. Te llevo al inicio de sesión.", true);
      window.setTimeout(() => { window.location.href = "login.html"; }, 900);
      return false;
    }

    setGate("Validando permisos de administrador...");
    const profile = window.javyAuth
      ? await window.javyAuth.getAdminProfile(session.user.id)
      : await window.catalogDb.getAdminProfile(session.user.id);

    if (!profile) {
      await supabaseClient.auth.signOut();
      setGate("El acceso es exclusivo para administración.", true);
      window.setTimeout(() => { window.location.href = "login.html"; }, 1300);
      return false;
    }

    els.gate.hidden = true;
    els.dashboard.hidden = false;
    return true;
  }

  async function loadData() {
    state.categories = await window.catalogDb.getCategories();
    state.products = await window.catalogDb.getProductsWithFlavors({ cache: false, fallback: false });
    state.homeIds = state.products
      .filter((product) => product.show_on_home)
      .sort((a, b) => (a.home_order ?? 999) - (b.home_order ?? 999))
      .map((product) => product.id);

    if (!state.homeIds.length) {
      state.homeIds = state.products.filter((product) => product.featured).slice(0, 8).map((product) => product.id);
    }

    if (!state.variantProductId && state.products.length) state.variantProductId = state.products[0].id;
  }

  function renderCategoryOptions() {
    const options = [
      `<option value="all">Todas las categorias</option>`,
      ...state.categories.map((category) => `<option value="${escapeHTML(category.name)}">${escapeHTML(category.name)}</option>`),
    ];

    if (els.categoryFilter) {
      els.categoryFilter.innerHTML = options.join("");
      syncFilterControls();
    }

    const categorySelect = els.productForm?.elements.category;
    if (categorySelect) {
      categorySelect.innerHTML = [
        `<option value="">Selecciona categoria</option>`,
        ...state.categories.map((category) => `<option value="${escapeHTML(category.name)}">${escapeHTML(category.name)}</option>`),
      ].join("");
    }
  }

  function getFilteredProducts() {
    const query = normalizeText(state.filters.query);
    let products = state.products.filter((product) => {
      const searchText = normalizeText([
        product.name,
        product.brand,
        product.category,
        product.presentation,
        product.tags?.join(" "),
        product.goals?.join(" "),
        product.flavors?.map((flavor) => flavor.name).join(" "),
      ].join(" "));

      const categoryMatch = state.filters.category === "all" || product.category === state.filters.category;
      const availabilityMatch =
        state.filters.availability === "all" ||
        (state.filters.availability === "available" && product.available !== false) ||
        (state.filters.availability === "unavailable" && product.available === false);
      const homeMatch =
        state.filters.home === "all" ||
        (state.filters.home === "home" && state.homeIds.includes(product.id)) ||
        (state.filters.home === "not-home" && !state.homeIds.includes(product.id));
      const reviewMatch =
        state.filters.review === "all" ||
        (state.filters.review === "missing-image" && !hasProductImage(product)) ||
        (state.filters.review === "no-flavor" && isNoFlavorProduct(product)) ||
        (state.filters.review === "missing-flavors" && isMissingRequiredFlavors(product)) ||
        (state.filters.review === "inactive-flavors" && hasInactiveFlavorsOnly(product)) ||
        (state.filters.review === "flavor-review" && needsFlavorReview(product)) ||
        (state.filters.review === "unavailable" && product.available === false) ||
        (state.filters.review === "empty-price" && !hasProductPrice(product)) ||
        (state.filters.review === "featured" && isFeaturedProduct(product));

      return (!query || searchText.includes(query)) && categoryMatch && availabilityMatch && homeMatch && reviewMatch;
    });

    products = products.sort((a, b) => {
      if (state.filters.sort === "name") return a.name.localeCompare(b.name, "es");
      if (state.filters.sort === "price-asc") return getProductPrice(a) - getProductPrice(b);
      if (state.filters.sort === "price-desc") return getProductPrice(b) - getProductPrice(a);
      if (state.filters.sort === "availability") return Number(b.available !== false) - Number(a.available !== false);
      return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
    });

    return products;
  }

  function renderDashboard() {
    const total = state.products.length;
    const available = state.products.filter((product) => product.available !== false).length;
    const unavailable = total - available;
    const home = state.homeIds.length;
    const flavors = state.products.reduce((sum, product) => sum + (product.flavors?.length || 0), 0);
    const withoutImage = state.products.filter((product) => !hasProductImage(product)).length;
    const noFlavor = state.products.filter(isNoFlavorProduct).length;
    const missingFlavors = state.products.filter(isMissingRequiredFlavors).length;
    const inactiveFlavors = state.products.filter(hasInactiveFlavorsOnly).length;
    const flavorReview = state.products.filter(needsFlavorReview).length;
    const emptyPrice = state.products.filter((product) => !hasProductPrice(product)).length;
    const featured = state.products.filter((product) => isFeaturedProduct(product)).length;

    els.stats.innerHTML = [
      ["Total productos", total, "Catalogo"],
      ["Disponibles", available, "Activos"],
      ["Agotados", unavailable, "Reactivar", "bad", "unavailable"],
      ["Inicio", home, "Home"],
      ["Sabores", flavors, "Variantes"],
      ["Sin imagen", withoutImage, "Revisar", "warn", "missing-image"],
      ["Sin sabor", noFlavor, "Correctos", "ok", "no-flavor"],
      ["Faltan sabores", missingFlavors, "Revisar", "warn", "missing-flavors"],
      ["Sin sabores activos", inactiveFlavors, "Revisar", "warn", "inactive-flavors"],
      ["Revisar tipo de sabor", flavorReview, "Clasificar", "warn", "flavor-review"],
      ["Precio vacio", emptyPrice, "Revisar", "bad", "empty-price"],
      ["Destacados", featured, "Actuales", "ok", "featured"],
    ].map(([label, value, note, tone, review]) => {
      const tag = review ? "button" : "article";
      const attrs = review ? ` type="button" data-products-review="${review}"` : "";
      return `
      <${tag} class="admin-stat${tone ? ` admin-stat--${tone}` : ""}"${attrs}>
        <span>${label}</span>
        <strong>${value}</strong>
        <small>${note}</small>
      </${tag}>
    `;
    }).join("");

    const recent = [...state.products]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 6);

    els.recent.innerHTML = recent.length ? recent.map((product) => `
      <article>
        <img src="${escapeHTML(productImage(product))}" alt="" />
        <div>
          <strong>${escapeHTML(product.name)}</strong>
          <small>${escapeHTML(product.brand || product.category || "Producto")}</small>
        </div>
        <button class="admin-chip-btn" type="button" data-edit-product="${product.id}">${icon("pencil")}Editar</button>
      </article>
    `).join("") : `<p class="admin-help-text">Aun no hay productos en Supabase.</p>`;

    renderOpsCenter();
  }

  function opsCountBadge(el, count) {
    if (!el) return;
    el.hidden = count === 0;
    el.textContent = count;
  }

  // OJO: `subtitle` se inserta como HTML (admite <strong>/<s>), así que el caller
  // DEBE pre-escapar cualquier texto que venga de la BD. `title` e `image` sí se
  // escapan aquí dentro.
  function opsItem({ image, title, subtitle, action }) {
    return `
      <article class="admin-ops__item">
        <img src="${escapeHTML(image)}" alt="" />
        <div class="admin-ops__info">
          <strong>${escapeHTML(title)}</strong>
          <small>${subtitle}</small>
        </div>
        ${action}
      </article>
    `;
  }

  function renderOpsCenter() {
    // Agotados: productos completos + sabores puntuales agotados.
    const agotadoProducts = state.products.filter(isAgotado);
    const agotadoFlavors = getAgotadoFlavorEntries();
    const agotadoTotal = agotadoProducts.length + agotadoFlavors.length;
    opsCountBadge(els.opsAgotadosCount, agotadoTotal);

    if (els.opsAgotados) {
      const productRows = agotadoProducts.map((product) => opsItem({
        image: productImage(product),
        title: product.name,
        subtitle: escapeHTML(product.brand || product.category || "Producto"),
        action: availabilityToggle(product),
      }));
      const flavorRows = agotadoFlavors.map(({ product, flavor }) => opsItem({
        image: productImage(product),
        title: product.name,
        subtitle: `Sabor agotado: <strong>${escapeHTML(flavor.name)}</strong>`,
        action: flavorToggle(flavor),
      }));
      els.opsAgotados.innerHTML = agotadoTotal
        ? [...productRows, ...flavorRows].join("")
        : `<p class="admin-ops__empty">Todo disponible. Nada agotado por ahora.</p>`;
    }

    // Ofertas activas: old_price > price.
    const offers = state.products.filter(hasActiveOffer);
    opsCountBadge(els.opsOfertasCount, offers.length);
    if (els.opsOfertas) {
      els.opsOfertas.innerHTML = offers.length ? offers.map((product) => opsItem({
        image: productImage(product),
        title: product.name,
        subtitle: `<s>${formatPrice(product.old_price)}</s> ${formatPrice(product.price)} <span class="admin-ops__discount">-${getDiscountPercent(product)}%</span>`,
        action: `<button class="admin-chip-btn" type="button" data-remove-offer="${product.id}">${icon("x")}Quitar oferta</button>`,
      })).join("") : `<p class="admin-ops__empty">No hay ofertas activas.</p>`;
    }

    // Agotado hace mucho: agotados con updated_at viejo (>= 21 dias).
    const STALE_DAYS = 21;
    const stale = state.products
      .filter((product) => isAgotado(product) && daysSince(product.updated_at) >= STALE_DAYS)
      .sort((a, b) => daysSince(b.updated_at) - daysSince(a.updated_at));
    opsCountBadge(els.opsStaleCount, stale.length);
    if (els.opsStale) {
      els.opsStale.innerHTML = stale.length ? stale.map((product) => opsItem({
        image: productImage(product),
        title: product.name,
        subtitle: `Agotado, sin cambios hace ${daysSince(product.updated_at)} dias`,
        action: availabilityToggle(product),
      })).join("") : `<p class="admin-ops__empty">Nada pendiente de reabastecer.</p>`;
    }
  }

  function productStatus(product) {
    if (product.available === false) return `<span class="admin-status admin-status--bad">No disponible</span>`;
    if (!hasProductPrice(product)) return `<span class="admin-status admin-status--bad">Precio vacio</span>`;
    if (needsFlavorReview(product)) return `<span class="admin-status admin-status--warn">Revisar tipo de sabor</span>`;
    if (isNoFlavorProduct(product)) return `<span class="admin-status admin-status--ok">Sin sabor</span>`;
    if (isMissingRequiredFlavors(product)) return `<span class="admin-status admin-status--warn">Faltan sabores</span>`;
    if (hasInactiveFlavorsOnly(product)) return `<span class="admin-status admin-status--warn">Sin sabores activos</span>`;
    return `<span class="admin-status admin-status--ok">Disponible</span>`;
  }

  function flavorSummaryText(product) {
    const total = (product.flavors || []).length;
    const available = getAvailableFlavorCount(product);

    if (isNoFlavorProduct(product)) return "Sin sabor";
    if (needsFlavorReview(product)) return "Pendiente por clasificar";
    if (isMissingRequiredFlavors(product)) return "Faltan sabores";
    if (hasInactiveFlavorsOnly(product)) return `0 de ${total} sabores activos`;
    return `${available} de ${total} sabores`;
  }

  function flavorSummaryBadge(product) {
    if (!requiresFlavors(product) || isMissingRequiredFlavors(product) || hasInactiveFlavorsOnly(product)) return "";
    return `<span class="admin-status admin-status--ok">${flavorSummaryText(product)}</span>`;
  }

  function productReviewBadges(product) {
    return [
      !hasProductImage(product) ? `<span class="admin-status admin-status--warn">Sin imagen</span>` : "",
      isFeaturedProduct(product) ? `<span class="admin-status admin-status--ok">Destacado</span>` : "",
    ].filter(Boolean).join("");
  }

  function productActions(product) {
    return `
      <div class="admin-row-actions">
        ${availabilityToggle(product)}
        <button class="admin-chip-btn" type="button" data-edit-product="${product.id}">${icon("pencil")}Editar</button>
        <button class="admin-chip-btn" type="button" data-manage-variants="${product.id}">${icon("tags")}Sabores</button>
      </div>
    `;
  }

  function productMobileActions(product) {
    return `
      <div class="admin-mobile-actions">
        ${availabilityToggle(product)}
        <button class="admin-chip-btn admin-card-main-action" type="button" data-edit-product="${product.id}">${icon("pencil")}Editar</button>
        <div class="admin-card-secondary-actions">
          <button class="admin-chip-btn" type="button" data-manage-variants="${product.id}">${icon("tags")}Sabores</button>
        </div>
      </div>
    `;
  }

  // Switch deslizante reutilizable para disponibilidad (producto o sabor).
  // Un solo control sistematico en tabla, cards y centro de operaciones.
  function availabilitySwitch({ on, attr, id, onLabel = "Disponible", offLabel = "Agotado" }) {
    return `
      <button type="button" role="switch" aria-checked="${on}" ${attr}="${id}"
        class="admin-switch${on ? " is-on" : ""}" aria-label="${on ? onLabel : offLabel}">
        <span class="admin-switch__track"><span class="admin-switch__thumb"></span></span>
        <span class="admin-switch__label">${on ? onLabel : offLabel}</span>
      </button>
    `;
  }

  function availabilityToggle(product) {
    return availabilitySwitch({ on: product.available !== false, attr: "data-toggle-available", id: product.id });
  }

  function flavorToggle(flavor) {
    return availabilitySwitch({ on: flavor.available !== false, attr: "data-toggle-flavor", id: flavor.id });
  }

  function priceCell(product) {
    return `<button class="admin-price-edit" type="button" data-edit-price="${product.id}" title="Editar precio rapido">
      <span class="admin-price-edit__value">${formatPrice(product.price)}</span>${icon("pencil", "admin-price-edit__icon")}
    </button>`;
  }

  function flavorCell(product) {
    const flavors = product.flavors || [];
    if (!flavors.length) return `<small>${escapeHTML(flavorSummaryText(product))}</small>`;
    const chips = flavors.map((flavor) => `
      <button type="button" class="admin-flavor-chip${flavor.available === false ? " is-off" : ""}" data-toggle-flavor="${flavor.id}" aria-pressed="${flavor.available !== false}" title="${flavor.available === false ? "Agotado" : "Disponible"} - clic para cambiar">
        ${escapeHTML(flavor.name)}
      </button>`).join("");
    return `<div class="admin-flavor-chips">${chips}</div>`;
  }

  function renderProducts() {
    const filtered = getFilteredProducts();
    const visible = filtered.slice(0, state.visibleCount);

    updateFilterCount();
    if (els.productResultCount) {
      els.productResultCount.textContent = `Mostrando ${visible.length} de ${filtered.length} productos`;
    }
    els.productsEmpty.hidden = Boolean(filtered.length);
    els.loadMoreBtn.hidden = filtered.length <= state.visibleCount;

    els.tableWrap.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Imagen</th>
            <th>Nombre</th>
            <th>Categoria</th>
            <th>Precio</th>
            <th>Estado</th>
            <th>Sabores</th>
            <th>Inicio</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${visible.map((product) => `
            <tr>
              <td>
                <div class="admin-product-image-cell">
                  <img src="${escapeHTML(productImage(product))}" alt="" />
                  ${!hasProductImage(product) ? '<span class="admin-image-warning">Sin imagen</span>' : ""}
                </div>
              </td>
              <td>
                <div class="admin-product-name">
                  <strong>${escapeHTML(product.name)}</strong>
                  <span>${escapeHTML(product.brand || "Marca pendiente")} ${product.presentation ? `- ${escapeHTML(product.presentation)}` : ""}</span>
                </div>
              </td>
              <td>${escapeHTML(product.category || "Otros")}</td>
              <td>${priceCell(product)}</td>
              <td><div class="admin-status-stack">${productStatus(product)}${productReviewBadges(product)}</div></td>
              <td>${flavorCell(product)}</td>
              <td>${state.homeIds.includes(product.id) ? '<span class="admin-status admin-status--ok">Si</span>' : '<span class="admin-status admin-status--warn">No</span>'}</td>
              <td>${productActions(product)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    els.cardWrap.innerHTML = visible.map((product) => `
      <article class="admin-product-card">
        <img src="${escapeHTML(productImage(product))}" alt="" />
        <div>
          <h3>${escapeHTML(product.name)}</h3>
          <p class="admin-card-price-row">${priceCell(product)} <span class="admin-card-cat">${escapeHTML(product.category || "Otros")}</span></p>
          <div class="admin-card-meta">
            ${productStatus(product)}
            ${productReviewBadges(product)}
            ${flavorSummaryBadge(product)}
            ${state.homeIds.includes(product.id) ? '<span class="admin-status admin-status--ok">Inicio</span>' : ""}
          </div>
          ${(product.flavors || []).length ? `<div class="admin-flavor-chips">${(product.flavors || []).map((flavor) => `<button type="button" class="admin-flavor-chip${flavor.available === false ? " is-off" : ""}" data-toggle-flavor="${flavor.id}" aria-pressed="${flavor.available !== false}" title="${flavor.available === false ? "Agotado" : "Disponible"} - clic para cambiar">${escapeHTML(flavor.name)}</button>`).join("")}</div>` : ""}
          <div class="admin-card-actions">${productMobileActions(product)}</div>
        </div>
      </article>
    `).join("");
  }

  function renderVariantSelect() {
    els.variantProductSelect.innerHTML = state.products.map((product) => `
      <option value="${product.id}">${escapeHTML(product.name)}</option>
    `).join("");

    if (state.variantProductId) els.variantProductSelect.value = state.variantProductId;
  }

  function renderVariants() {
    renderVariantSelect();
    const product = state.products.find((item) => item.id === state.variantProductId);
    if (!product) {
      els.variantManager.innerHTML = `<p class="admin-help-text">Selecciona un producto para manejar sabores.</p>`;
      return;
    }

    const flavors = product.flavors || [];
    els.variantManager.innerHTML = `
      <div class="admin-variant-toolbar">
        <input id="variantNameNew" placeholder="Ej: Chocolate" />
        <input id="variantPresentationNew" placeholder="Presentacion" />
        <input id="variantPriceNew" type="number" min="0" step="0.01" placeholder="Precio" />
        <input id="variantStockNew" type="number" min="0" step="1" placeholder="Stock" />
        <button class="admin-primary" type="button" id="addVariantBtn">${icon("plus")}Agregar</button>
      </div>
      <div class="admin-variant-list">
        ${flavors.length ? flavors.map((flavor) => `
          <article class="admin-variant-row" data-flavor-id="${flavor.id}">
            <input value="${escapeHTML(flavor.name)}" data-flavor-name aria-label="Nombre del sabor" />
            <input value="${escapeHTML(flavor.presentation || "")}" data-flavor-presentation aria-label="Presentacion del sabor" />
            <input value="${flavor.price ?? ""}" type="number" min="0" step="0.01" data-flavor-price aria-label="Precio del sabor" />
            <input value="${flavor.stock ?? ""}" type="number" min="0" step="1" data-flavor-stock aria-label="Stock del sabor" />
            <div class="admin-variant-actions">
              <label class="admin-toggle">
                <input type="checkbox" ${flavor.available !== false ? "checked" : ""} data-flavor-available />
                Disponible
              </label>
              <button class="admin-chip-btn" type="button" data-save-flavor>${icon("save")}Guardar</button>
              <button class="admin-chip-btn" type="button" data-delete-flavor>${icon("trash")}Eliminar</button>
            </div>
          </article>
        `).join("") : `<p class="admin-help-text">Este producto no tiene sabores o variantes.</p>`}
      </div>
    `;
  }

  function renderHomeProducts() {
    const selected = state.homeIds
      .map((id) => state.products.find((product) => product.id === id))
      .filter(Boolean);
    const pool = state.products.filter((product) => !state.homeIds.includes(product.id));

    els.homeCounter.textContent = `${selected.length} de 8`;
    els.homeCounter.classList.toggle("admin-status--bad", selected.length < 4 || selected.length > 8);

    els.homeList.innerHTML = selected.length ? selected.map((product, index) => `
      <article class="admin-home-card" data-home-id="${product.id}">
        <img src="${escapeHTML(productImage(product))}" alt="" />
        <div>
          <h4>${index + 1}. ${escapeHTML(product.name)}</h4>
          <p>${escapeHTML(product.brand || product.category || "Producto")} - ${formatPrice(product.price)}</p>
          <div class="admin-home-actions">
            <button class="admin-chip-btn" type="button" data-home-up="${product.id}" ${index === 0 ? "disabled" : ""}>${icon("arrow-up")}Subir</button>
            <button class="admin-chip-btn" type="button" data-home-down="${product.id}" ${index === selected.length - 1 ? "disabled" : ""}>${icon("arrow-down")}Bajar</button>
            <button class="admin-chip-btn" type="button" data-home-remove="${product.id}">${icon("trash")}Quitar</button>
          </div>
        </div>
      </article>
    `).join("") : `<p class="admin-help-text">Selecciona al menos 4 productos para el inicio.</p>`;

    els.homePool.innerHTML = pool.length ? pool.slice(0, 60).map((product) => `
      <article class="admin-home-card">
        <img src="${escapeHTML(productImage(product))}" alt="" />
        <div>
          <h4>${escapeHTML(product.name)}</h4>
          <p>${escapeHTML(product.category || "Otros")} - ${formatPrice(product.price)}</p>
          <button class="admin-chip-btn" type="button" data-home-add="${product.id}" ${state.homeIds.length >= 8 ? "disabled" : ""}>${icon("plus")}Agregar</button>
        </div>
      </article>
    `).join("") : `<p class="admin-help-text">Todos los productos visibles ya estan seleccionados.</p>`;
  }

  function renderAll() {
    renderCategoryOptions();
    renderDashboard();
    renderProducts();
    renderVariants();
    renderHomeProducts();
  }

  function setSection(section) {
    state.currentSection = section;
    const titles = {
      dashboard: "Dashboard",
      products: "Productos",
      variants: "Sabores y variantes",
      home: "Productos del inicio",
      settings: "Configuracion",
    };

    els.sectionTitle.textContent = titles[section] || "Dashboard";
    document.querySelectorAll("[data-section-panel]").forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.sectionPanel === section);
    });
    els.navItems.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.adminSection === section);
    });

    els.contextActions.forEach((item) => {
      const sections = (item.dataset.showSections || "").split(",").map((value) => value.trim());
      item.hidden = !sections.includes(section);
    });

    if (section !== "products") setFilterPanelOpen(false);
  }

  function getProductById(id) {
    return state.products.find((product) => product.id === id);
  }

  function updateDiscountHint() {
    const hint = els.productForm?.querySelector("[data-price-hint]");
    if (!hint) return;
    const price = Number(els.productForm.elements.price.value);
    const oldPrice = Number(els.productForm.elements.old_price.value);
    if (price > 0 && oldPrice > price) {
      hint.hidden = false;
      hint.textContent = `Oferta: -${Math.round((1 - price / oldPrice) * 100)}% de descuento`;
    } else {
      hint.hidden = true;
      hint.textContent = "";
    }
  }

  function clearFieldErrors() {
    els.productForm.querySelectorAll("[data-field-error]").forEach((item) => {
      item.textContent = "";
      item.classList.remove("is-error");
    });
  }

  function setFieldError(name, message) {
    const target = els.productForm.querySelector(`[data-field-error="${name}"]`);
    if (!target) return;
    target.textContent = message;
    target.classList.add("is-error");
  }

  function validateProductForm(data) {
    clearFieldErrors();
    let isValid = true;

    if (!data.name?.trim()) {
      setFieldError("name", "El nombre es obligatorio.");
      isValid = false;
    }

    if (!data.category?.trim()) {
      setFieldError("category", "Debes seleccionar una categoria.");
      isValid = false;
    }

    if (data.price === "" || data.price == null || Number(data.price) < 0) {
      setFieldError("price", "El precio actual es obligatorio y no puede ser negativo.");
      isValid = false;
    }

    if (data.old_price !== "" && data.old_price != null && Number(data.old_price) <= Number(data.price)) {
      setFieldError("old_price", "El precio anterior debe ser mayor que el actual.");
      isValid = false;
    }

    if (data.show_on_home && (!data.home_order || Number(data.home_order) < 1 || Number(data.home_order) > 8)) {
      setFieldError("home_order", "Usa un orden entre 1 y 8 para productos del inicio.");
      isValid = false;
    }

    return isValid;
  }

  function openProductDrawer(productId = null) {
    state.lastFocused = document.activeElement;
    state.selectedProductId = productId;
    const product = productId ? getProductById(productId) : null;
    const form = els.productForm;

    form.reset();
    clearFieldErrors();
    setFormMessage("");
    els.drawerTitle.textContent = product ? "Editar producto" : "Agregar producto";
    els.deleteProductBtn.hidden = !product;
    els.imagePreview.src = product ? productImage(product) : PLACEHOLDER_IMAGE;

    if (product) {
      form.elements.name.value = product.name || "";
      form.elements.brand.value = product.brand || "";
      form.elements.category.value = product.category || "";
      form.elements.presentation.value = product.presentation || "";
      form.elements.description_short.value = product.description_short || "";
      form.elements.description_long.value = product.description_long || product.description || "";
      form.elements.price.value = product.price || "";
      form.elements.old_price.value = product.old_price || "";
      // Imagen CRUDA de la BD (no la resuelta con fallback local), para no
      // sobreescribir la URL real al guardar sin tocar la imagen.
      const storedImage = product.stored_image_url ?? product.image_url;
      form.elements.image_url.value = storedImage === PLACEHOLDER_IMAGE ? "" : storedImage || "";
      form.elements.label.value = product.label || "";
      form.elements.home_order.value = product.home_order || "";
      form.elements.tags.value = listToInput(product.tags);
      form.elements.goals.value = listToInput(product.goals);
      form.elements.flavor_mode.value = getFlavorMode(product);
      form.elements.is_available.checked = product.available !== false;
      form.elements.is_featured.checked = Boolean(product.featured);
      form.elements.show_on_home.checked = state.homeIds.includes(product.id) || Boolean(product.show_on_home);
    } else {
      form.elements.is_available.checked = true;
      form.elements.is_featured.checked = false;
      form.elements.show_on_home.checked = false;
      form.elements.flavor_mode.value = "needs_review";
    }

    updateDiscountHint();
    els.drawer.hidden = false;
    els.drawer.setAttribute("aria-hidden", "false");
    form.elements.name.focus();
  }

  function releaseImageObjectUrl() {
    if (state.imageObjectUrl) {
      URL.revokeObjectURL(state.imageObjectUrl);
      state.imageObjectUrl = null;
    }
  }

  function closeProductDrawer() {
    els.drawer.hidden = true;
    els.drawer.setAttribute("aria-hidden", "true");
    state.selectedProductId = null;
    releaseImageObjectUrl();
    // Restaurar el foco a quien abrió el drawer (a11y).
    state.lastFocused?.focus?.({ preventScroll: true });
    state.lastFocused = null;
  }

  // Atrapa el foco dentro del drawer y cierra con Escape (patrón del panel de cotización).
  function handleDrawerKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeProductDrawer();
      return;
    }
    if (event.key !== "Tab") return;
    const focusables = Array.from(
      els.drawer.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])')
    ).filter((el) => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function collectProductFormData() {
    const form = els.productForm;
    return {
      name: form.elements.name.value.trim(),
      brand: form.elements.brand.value.trim(),
      category: form.elements.category.value,
      price: form.elements.price.value,
      old_price: form.elements.old_price.value,
      presentation: form.elements.presentation.value.trim(),
      image_url: form.elements.image_url.value.trim(),
      description_short: form.elements.description_short.value.trim(),
      description_long: form.elements.description_long.value.trim(),
      label: form.elements.label.value.trim(),
      home_order: form.elements.home_order.value,
      tags: parseList(form.elements.tags.value),
      goals: parseList(form.elements.goals.value),
      flavor_mode: form.elements.flavor_mode.value,
      is_available: form.elements.is_available.checked,
      available: form.elements.is_available.checked,
      is_featured: form.elements.is_featured.checked,
      featured: form.elements.is_featured.checked,
      show_on_home: form.elements.show_on_home.checked,
    };
  }

  async function refreshAfterMutation(message) {
    await loadData();
    renderAll();
    if (message) showToast(message);
  }

  async function handleProductSubmit(event) {
    event.preventDefault();
    const submitBtn = els.productForm.querySelector("button[type='submit']");
    const productData = collectProductFormData();
    const imageFile = els.productForm.elements.image_file.files?.[0];

    if (!validateProductForm(productData)) {
      setFormMessage("Revisa los campos marcados.", true);
      return;
    }

    // URL de una imagen subida en ESTE envío; si la mutación falla después,
    // la borramos para no dejar basura huérfana en el bucket.
    let uploadedImageUrl = "";
    try {
      setButtonLoading(submitBtn, true);
      setFormMessage("Guardando producto...");

      if (imageFile) {
        uploadedImageUrl = await window.catalogDb.uploadProductImage(imageFile);
        productData.image_url = uploadedImageUrl;
      }

      if (state.selectedProductId) {
        await window.catalogDb.updateProduct(state.selectedProductId, productData);
      } else {
        const created = await window.catalogDb.createProduct(productData);
        state.selectedProductId = created.id;
      }

      await refreshAfterMutation("Producto guardado correctamente.");
      closeProductDrawer();
    } catch (error) {
      if (uploadedImageUrl) {
        await window.catalogDb.removeProductImage(uploadedImageUrl);
      }
      setFormMessage(error.message, true);
      showToast("Error al guardar el producto.", "error");
    } finally {
      setButtonLoading(submitBtn, false);
    }
  }

  async function deleteSelectedProduct() {
    const product = getProductById(state.selectedProductId);
    if (!product) return;

    const ok = await confirmDialog({
      title: "Eliminar producto",
      message: `Se eliminará "${product.name}" y todos sus sabores. Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;

    try {
      setButtonLoading(els.deleteProductBtn, true, "Eliminando...");
      await window.catalogDb.deleteProduct(product.id);
      await refreshAfterMutation("Producto eliminado correctamente.");
      closeProductDrawer();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setButtonLoading(els.deleteProductBtn, false);
    }
  }

  async function toggleProductAvailability(productId) {
    const product = getProductById(productId);
    if (!product) return;

    try {
      // Update parcial de solo disponibilidad: no reescribe imagen/slug/precio.
      await window.catalogDb.setProductAvailability(productId, product.available === false);
      await refreshAfterMutation("Disponibilidad actualizada.");
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function toggleFlavorAvailability(flavorId) {
    const flavor = findFlavorById(flavorId);
    if (!flavor) return;
    try {
      // Update parcial: solo cambia la disponibilidad del sabor.
      await window.catalogDb.setFlavorAvailability(flavorId, flavor.available === false);
      await refreshAfterMutation("Disponibilidad del sabor actualizada.");
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function removeProductOffer(productId) {
    const product = getProductById(productId);
    if (!product) return;
    try {
      // Update parcial de precio: mantiene el precio actual y limpia old_price.
      await window.catalogDb.setProductPricing(productId, { price: product.price, oldPrice: null });
      await refreshAfterMutation("Oferta retirada.");
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  // Campo inline: el precio se vuelve un input del mismo alto de la fila, con un
  // solo boton de guardar. Sin capa flotante, no se puede romper por scroll/posicion.
  function startPriceEdit(productId, button) {
    const product = getProductById(productId);
    if (!product || !button) return;

    const editor = document.createElement("span");
    editor.className = "admin-price-editor";
    editor.innerHTML = `
      <input type="number" min="0" step="0.01" value="${product.price ?? ""}" data-price-input aria-label="Nuevo precio" />
      <button type="button" class="admin-price-save" data-save-price="${productId}" aria-label="Guardar precio">${icon("save", "")}</button>
    `;
    button.replaceWith(editor);

    const input = editor.querySelector("[data-price-input]");
    input.focus();
    input.select();
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        savePriceEdit(productId, editor);
      } else if (event.key === "Escape") {
        event.preventDefault();
        renderProducts();
      }
    });
  }

  async function savePriceEdit(productId, editor) {
    const input = editor?.querySelector("[data-price-input]");
    const value = input?.value;
    if (value === "" || value == null || !Number.isFinite(Number(value)) || Number(value) < 0) {
      showToast("Escribe un precio valido (0 o mayor).", "error");
      input?.focus();
      return;
    }
    try {
      await window.catalogDb.setProductPricing(productId, { price: value });
      await refreshAfterMutation("Precio actualizado.");
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function saveFlavor(flavorId, row) {
    const name = row.querySelector("[data-flavor-name]").value.trim();
    const presentation = row.querySelector("[data-flavor-presentation]").value.trim();
    const price = row.querySelector("[data-flavor-price]").value;
    const stock = row.querySelector("[data-flavor-stock]").value;
    const available = row.querySelector("[data-flavor-available]").checked;
    const product = getProductById(state.variantProductId);

    if (!name) {
      showToast("El nombre del sabor es obligatorio.", "error");
      return;
    }

    const duplicated = product.flavors?.some((flavor) =>
      flavor.id !== flavorId && normalizeText(flavor.name) === normalizeText(name)
    );

    if (duplicated) {
      showToast("No puedes duplicar sabores dentro del mismo producto.", "error");
      return;
    }

    await window.catalogDb.updateFlavor(flavorId, {
      name,
      presentation,
      price,
      stock,
      available,
      is_available: available,
    });
    await refreshAfterMutation("Sabor actualizado.");
  }

  async function addVariant() {
    const product = getProductById(state.variantProductId);
    const nameInput = $("#variantNameNew");
    const name = nameInput?.value.trim();
    if (!product || !name) {
      showToast("Escribe el nombre del sabor.", "error");
      nameInput?.focus();
      return;
    }

    const duplicated = product.flavors?.some((flavor) => normalizeText(flavor.name) === normalizeText(name));
    if (duplicated) {
      showToast("Este sabor ya existe en el producto.", "error");
      return;
    }

    try {
      await window.catalogDb.createFlavor(product.id, {
        name,
        presentation: $("#variantPresentationNew")?.value || "",
        price: $("#variantPriceNew")?.value || "",
        stock: $("#variantStockNew")?.value || "",
        available: true,
        is_available: true,
      });
      await refreshAfterMutation("Sabor agregado correctamente.");
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  function moveHomeProduct(productId, direction) {
    const index = state.homeIds.indexOf(productId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= state.homeIds.length) return;
    const [item] = state.homeIds.splice(index, 1);
    state.homeIds.splice(nextIndex, 0, item);
    renderHomeProducts();
  }

  async function saveHomeProducts() {
    try {
      if (state.homeIds.length < 4) {
        showToast("No puedes mostrar menos de 4 productos en el inicio.", "error");
        return;
      }
      if (state.homeIds.length > 8) {
        showToast("No puedes mostrar mas de 8 productos en el inicio.", "error");
        return;
      }

      setButtonLoading(els.saveHomeBtn, true);
      await window.catalogDb.updateHomeProducts(state.homeIds);
      await refreshAfterMutation("Productos del inicio guardados.");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setButtonLoading(els.saveHomeBtn, false);
    }
  }

  async function seedProducts() {
    const ok = await confirmDialog({
      title: "Migrar productos locales",
      message: "Se migrarán los productos locales a Supabase, evitando duplicados por legacy_id.",
      confirmText: "Migrar",
    });
    if (!ok) return;

    try {
      setButtonLoading(els.seedBtn, true, "Migrando...");
      const result = await window.catalogDb.seedProductsFromLocalData();
      await refreshAfterMutation(`Migracion lista. Creados: ${result.created}. Omitidos: ${result.skipped}. Sabores: ${result.flavorsCreated}.`);
      if (result.errors?.length) {
        showToast(`Errores: ${result.errors.slice(0, 2).join(" | ")}`, "error");
      }
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setButtonLoading(els.seedBtn, false);
    }
  }

  function bindEvents() {
    els.navItems.forEach((button) => {
      button.addEventListener("click", () => setSection(button.dataset.adminSection));
    });

    document.querySelectorAll("[data-admin-section-jump]").forEach((button) => {
      button.addEventListener("click", () => setSection(button.dataset.adminSectionJump));
    });

    els.quickSearch?.addEventListener("input", () => {
      state.filters.query = els.quickSearch.value;
      state.visibleCount = PAGE_SIZE;
      renderProducts();
    });

    const bindProductFilter = (element, filterName, resetPage = true) => {
      const eventName = element?.tagName === "INPUT" ? "input" : "change";
      element?.addEventListener(eventName, () => {
        state.filters[filterName] = element.value;
        if (resetPage) state.visibleCount = PAGE_SIZE;
        renderProducts();
      });
    };

    bindProductFilter(els.categoryFilter, "category");
    bindProductFilter(els.availabilityFilter, "availability");
    bindProductFilter(els.homeFilter, "home");
    bindProductFilter(els.reviewFilter, "review");
    bindProductFilter(els.sortFilter, "sort", false);

    els.filterToggle?.addEventListener("click", () => setFilterPanelOpen(els.filterPanel.hidden));
    els.filterClose?.addEventListener("click", () => setFilterPanelOpen(false));
    els.filterBackdrop?.addEventListener("click", () => setFilterPanelOpen(false));
    els.filterApply?.addEventListener("click", () => setFilterPanelOpen(false));
    els.filterClear?.addEventListener("click", resetProductFilters);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setFilterPanelOpen(false);
    });
    window.addEventListener("resize", unlockFilterScrollIfNeeded);

    els.loadMoreBtn?.addEventListener("click", () => {
      state.visibleCount += PAGE_SIZE;
      renderProducts();
    });

    els.newProductBtn?.addEventListener("click", () => openProductDrawer());
    els.productForm?.addEventListener("submit", handleProductSubmit);
    els.deleteProductBtn?.addEventListener("click", deleteSelectedProduct);
    els.seedBtn?.addEventListener("click", seedProducts);
    els.saveHomeBtn?.addEventListener("click", saveHomeProducts);

    document.querySelectorAll("[data-close-product-drawer]").forEach((item) => {
      item.addEventListener("click", closeProductDrawer);
    });

    els.drawer?.addEventListener("keydown", handleDrawerKeydown);

    els.productForm?.elements.image_url.addEventListener("input", () => {
      els.imagePreview.src = els.productForm.elements.image_url.value || PLACEHOLDER_IMAGE;
    });

    els.productForm?.elements.price.addEventListener("input", updateDiscountHint);
    els.productForm?.elements.old_price.addEventListener("input", updateDiscountHint);

    els.productForm?.elements.image_file.addEventListener("change", () => {
      const file = els.productForm.elements.image_file.files?.[0];
      if (!file) return;
      // Revocar el object URL anterior antes de crear el siguiente (evita fuga).
      releaseImageObjectUrl();
      state.imageObjectUrl = URL.createObjectURL(file);
      els.imagePreview.src = state.imageObjectUrl;
    });

    els.logoutBtn?.addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
      showToast("Sesion cerrada correctamente.");
      window.setTimeout(() => { window.location.href = "index.html"; }, 500);
    });

    document.addEventListener("click", async (event) => {
      const dashboardReview = event.target.closest("[data-products-review]");
      if (dashboardReview) {
        state.filters.review = dashboardReview.dataset.productsReview;
        state.visibleCount = PAGE_SIZE;
        syncFilterControls();
        setSection("products");
        renderProducts();
        return;
      }

      const editButton = event.target.closest("[data-edit-product]");
      if (editButton) {
        openProductDrawer(editButton.dataset.editProduct);
        return;
      }

      const variantButton = event.target.closest("[data-manage-variants]");
      if (variantButton) {
        state.variantProductId = variantButton.dataset.manageVariants;
        setSection("variants");
        renderVariants();
        return;
      }

      const toggleButton = event.target.closest("[data-toggle-available]");
      if (toggleButton) {
        await toggleProductAvailability(toggleButton.dataset.toggleAvailable);
        return;
      }

      const toggleFlavorBtn = event.target.closest("[data-toggle-flavor]");
      if (toggleFlavorBtn) {
        await toggleFlavorAvailability(toggleFlavorBtn.dataset.toggleFlavor);
        return;
      }

      const removeOffer = event.target.closest("[data-remove-offer]");
      if (removeOffer) {
        await removeProductOffer(removeOffer.dataset.removeOffer);
        return;
      }

      const editPrice = event.target.closest("[data-edit-price]");
      if (editPrice) {
        startPriceEdit(editPrice.dataset.editPrice, editPrice);
        return;
      }

      const savePrice = event.target.closest("[data-save-price]");
      if (savePrice) {
        await savePriceEdit(savePrice.dataset.savePrice, savePrice.closest(".admin-price-editor"));
        return;
      }

      const addHome = event.target.closest("[data-home-add]");
      if (addHome) {
        if (state.homeIds.length >= 8) {
          showToast("No puedes mostrar mas de 8 productos en el inicio.", "error");
          return;
        }
        state.homeIds.push(addHome.dataset.homeAdd);
        renderAll();
        return;
      }

      const removeHome = event.target.closest("[data-home-remove]");
      if (removeHome) {
        if (state.homeIds.length <= 4) {
          showToast("No puedes mostrar menos de 4 productos en el inicio.", "error");
          return;
        }
        state.homeIds = state.homeIds.filter((id) => id !== removeHome.dataset.homeRemove);
        renderAll();
        return;
      }

      const homeUp = event.target.closest("[data-home-up]");
      if (homeUp) {
        moveHomeProduct(homeUp.dataset.homeUp, -1);
        return;
      }

      const homeDown = event.target.closest("[data-home-down]");
      if (homeDown) {
        moveHomeProduct(homeDown.dataset.homeDown, 1);
        return;
      }

      const addVariantButton = event.target.closest("#addVariantBtn");
      if (addVariantButton) {
        await addVariant();
        return;
      }

      const flavorRow = event.target.closest("[data-flavor-id]");
      if (flavorRow && event.target.closest("[data-save-flavor]")) {
        try {
          await saveFlavor(flavorRow.dataset.flavorId, flavorRow);
          renderVariants();
        } catch (error) {
          showToast(error.message, "error");
        }
        return;
      }

      if (flavorRow && event.target.closest("[data-delete-flavor]")) {
        const ok = await confirmDialog({
          title: "Eliminar sabor",
          message: "Se eliminará este sabor del producto.",
          confirmText: "Eliminar",
          danger: true,
        });
        if (!ok) return;
        try {
          await window.catalogDb.deleteFlavor(flavorRow.dataset.flavorId);
          await refreshAfterMutation("Sabor eliminado.");
        } catch (error) {
          showToast(error.message, "error");
        }
      }
    });

    els.variantProductSelect?.addEventListener("change", () => {
      state.variantProductId = els.variantProductSelect.value;
      renderVariants();
    });
  }

  async function init() {
    cacheElements();

    try {
      const allowed = await protectAdminPage();
      if (!allowed) return;

      bindEvents();
      setGate("Cargando productos...");
      await loadData();
      renderAll();
      setSection("dashboard");
    } catch (error) {
      const message = window.javyAuth?.getFriendlyAuthError?.(error) || error.message;
      setGate(message, true);
      showToast?.(message, "error");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
