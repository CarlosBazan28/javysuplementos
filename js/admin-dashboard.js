(function () {
  const PAGE_SIZE = 24;
  const PLACEHOLDER_IMAGE = "img/products/product-placeholder.svg";

  const state = {
    products: [],
    categories: [],
    currentSection: "dashboard",
    selectedProductId: null,
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
    if (!els.filterPanel || !els.filterToggle) return;
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

  function setFormMessage(message = "", isError = false) {
    if (!els.formMessage) return;
    els.formMessage.textContent = message;
    els.formMessage.classList.toggle("is-error", Boolean(isError));
  }

  function setButtonLoading(button, isLoading, loadingText = "Guardando...") {
    if (!button) return;
    if (isLoading) {
      button.dataset.originalText = button.textContent;
      button.textContent = loadingText;
      button.disabled = true;
      return;
    }
    button.textContent = button.dataset.originalText || button.textContent;
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
      ["No disponibles", unavailable, "Stock", "bad", "unavailable"],
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
        <button class="admin-chip-btn" type="button" data-edit-product="${product.id}">${icon("pencil")}Editar</button>
        <button class="admin-chip-btn" type="button" data-manage-variants="${product.id}">${icon("tags")}Sabores</button>
        <button class="admin-chip-btn" type="button" data-toggle-available="${product.id}">
          ${icon(product.available === false ? "power" : "pause")}
          ${product.available === false ? "Activar" : "Pausar"}
        </button>
      </div>
    `;
  }

  function productMobileActions(product) {
    return `
      <div class="admin-mobile-actions">
        <button class="admin-chip-btn admin-card-main-action" type="button" data-edit-product="${product.id}">${icon("pencil")}Editar</button>
        <div class="admin-card-secondary-actions">
          <button class="admin-chip-btn" type="button" data-manage-variants="${product.id}">${icon("tags")}Sabores</button>
          <button class="admin-chip-btn" type="button" data-toggle-available="${product.id}">
            ${icon(product.available === false ? "power" : "pause")}
            ${product.available === false ? "Activar" : "Pausar"}
          </button>
        </div>
      </div>
    `;
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
              <td>${formatPrice(product.price)}</td>
              <td><div class="admin-status-stack">${productStatus(product)}${productReviewBadges(product)}</div></td>
              <td><small>${flavorSummaryText(product)}</small></td>
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
          <p>${formatPrice(product.price)} - ${escapeHTML(product.category || "Otros")}</p>
          <div class="admin-card-meta">
            ${productStatus(product)}
            ${productReviewBadges(product)}
            ${flavorSummaryBadge(product)}
            ${state.homeIds.includes(product.id) ? '<span class="admin-status admin-status--ok">Inicio</span>' : ""}
          </div>
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
      form.elements.image_url.value = product.image_url === PLACEHOLDER_IMAGE ? "" : product.image_url || "";
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

    els.drawer.hidden = false;
    els.drawer.setAttribute("aria-hidden", "false");
    form.elements.name.focus();
  }

  function closeProductDrawer() {
    els.drawer.hidden = true;
    els.drawer.setAttribute("aria-hidden", "true");
    state.selectedProductId = null;
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

    try {
      setButtonLoading(submitBtn, true);
      setFormMessage("Guardando producto...");

      if (imageFile) {
        productData.image_url = await window.catalogDb.uploadProductImage(imageFile);
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
      setFormMessage(error.message, true);
      showToast("Error al guardar el producto.", "error");
    } finally {
      setButtonLoading(submitBtn, false);
    }
  }

  async function deleteSelectedProduct() {
    const product = getProductById(state.selectedProductId);
    if (!product) return;

    const ok = window.confirm(`Eliminar ${product.name}? Tambien se eliminaran sus sabores.`);
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
      await window.catalogDb.updateProduct(productId, {
        ...product,
        is_available: product.available === false,
        available: product.available === false,
      });
      await refreshAfterMutation("Disponibilidad actualizada.");
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
    const ok = window.confirm("Migrar productos locales a Supabase? Se evitaran duplicados usando legacy_id.");
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

    els.loadMoreBtn.addEventListener("click", () => {
      state.visibleCount += PAGE_SIZE;
      renderProducts();
    });

    els.newProductBtn?.addEventListener("click", () => openProductDrawer());
    els.productForm.addEventListener("submit", handleProductSubmit);
    els.deleteProductBtn.addEventListener("click", deleteSelectedProduct);
    els.seedBtn?.addEventListener("click", seedProducts);
    els.saveHomeBtn.addEventListener("click", saveHomeProducts);

    document.querySelectorAll("[data-close-product-drawer]").forEach((item) => {
      item.addEventListener("click", closeProductDrawer);
    });

    els.productForm.elements.image_url.addEventListener("input", () => {
      els.imagePreview.src = els.productForm.elements.image_url.value || PLACEHOLDER_IMAGE;
    });

    els.productForm.elements.image_file.addEventListener("change", () => {
      const file = els.productForm.elements.image_file.files?.[0];
      if (!file) return;
      els.imagePreview.src = URL.createObjectURL(file);
    });

    els.logoutBtn.addEventListener("click", async () => {
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
        const ok = window.confirm("Eliminar este sabor?");
        if (!ok) return;
        try {
          await window.catalogDb.deleteFlavor(flavorRow.dataset.flavorId);
          await refreshAfterMutation("Sabor eliminado.");
        } catch (error) {
          showToast(error.message, "error");
        }
      }
    });

    els.variantProductSelect.addEventListener("change", () => {
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
