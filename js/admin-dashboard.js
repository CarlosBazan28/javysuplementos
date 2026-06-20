(function () {
  const PAGE_SIZE = 24;
  const PLACEHOLDER_IMAGE = "img/products/product-placeholder.svg";

  const state = {
    products: [],
    categories: [],
    allCategories: [],
    combos: [],
    comboItems: [],
    selectedComboId: null,
    comboImageObjectUrl: null,
    adminProfiles: [],
    editingProductUpdatedAt: null,
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
      categoryManager: $("#adminCategoryManager"),
      homeList: $("#adminHomeList"),
      homePool: $("#adminHomePool"),
      saveHomeBtn: $("#adminSaveHomeBtn"),
      drawer: $("#productDrawer"),
      productForm: $("#adminProductForm"),
      productMetaLine: $("#productMetaLine"),
      comboMetaLine: $("#comboMetaLine"),
      drawerFlavors: $("#drawerFlavors"),
      combosList: $("#adminCombosList"),
      newComboBtn: $("#adminNewComboBtn"),
      comboDrawer: $("#comboDrawer"),
      comboForm: $("#adminComboForm"),
      comboDrawerTitle: $("#comboDrawerTitle"),
      comboImagePreview: $("#comboImagePreview"),
      comboItemsList: $("#comboItemsList"),
      comboFormMessage: $("#adminComboFormMessage"),
      deleteComboBtn: $("#adminDeleteComboBtn"),
      accessList: $("#adminAccessList"),
      drawerTitle: $("#productDrawerTitle"),
      imagePreview: $("#productImagePreview"),
      deleteProductBtn: $("#adminDeleteProductBtn"),
      duplicateProductBtn: $("#adminDuplicateProductBtn"),
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

  function formatEditMeta(entity) {
    if (!entity) return "";
    const who = entity.updated_by || entity.created_by;
    const when = entity.updated_at || entity.created_at;
    if (!who && !when) return "";
    let date = "";
    if (when) {
      const parsed = new Date(when);
      if (!Number.isNaN(parsed.getTime())) {
        date = parsed.toLocaleString("es-PA", { dateStyle: "medium", timeStyle: "short" });
      }
    }
    if (who && date) return `Última edición por ${who} · ${date}`;
    if (date) return `Última edición · ${date}`;
    return `Última edición por ${who}`;
  }

  function setMetaLine(el, entity) {
    if (!el) return;
    const text = formatEditMeta(entity);
    el.textContent = text;
    el.hidden = !text;
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

  // Modal con un input de texto. Devuelve Promise<string|null>.
  function promptDialog({ title, label = "Nombre", placeholder = "", confirmText = "Crear" }) {
    return new Promise((resolve) => {
      const lastFocused = document.activeElement;
      const overlay = document.createElement("div");
      overlay.className = "admin-confirm";
      overlay.innerHTML = `
        <div class="admin-confirm__backdrop" data-confirm-cancel></div>
        <div class="admin-confirm__panel" role="dialog" aria-modal="true" aria-labelledby="adminPromptTitle">
          <h3 id="adminPromptTitle">${escapeHTML(title)}</h3>
          <label class="admin-prompt__label">${escapeHTML(label)}
            <input type="text" data-prompt-input placeholder="${escapeHTML(placeholder)}" />
          </label>
          <div class="admin-confirm__actions">
            <button type="button" class="admin-secondary" data-confirm-cancel>Cancelar</button>
            <button type="button" class="admin-primary" data-confirm-ok>${escapeHTML(confirmText)}</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      const input = overlay.querySelector("[data-prompt-input]");
      input.focus();

      function close(result) {
        overlay.remove();
        document.removeEventListener("keydown", onKey, true);
        lastFocused?.focus?.({ preventScroll: true });
        resolve(result);
      }
      function submit() {
        const value = input.value.trim();
        if (!value) { input.focus(); return; }
        close(value);
      }
      function onKey(event) {
        if (event.key === "Escape") { event.preventDefault(); close(null); }
        else if (event.key === "Enter") { event.preventDefault(); submit(); }
      }
      overlay.addEventListener("click", (event) => {
        if (event.target.closest("[data-confirm-ok]")) submit();
        else if (event.target.closest("[data-confirm-cancel]")) close(null);
      });
      document.addEventListener("keydown", onKey, true);
    });
  }

  async function createCategoryInline(parentId) {
    const name = await promptDialog({
      title: parentId ? "Nuevo tipo" : "Nueva familia",
      label: parentId ? "Nombre del tipo" : "Nombre de la familia",
      confirmText: "Crear",
    });
    if (!name) return;
    try {
      const created = await window.catalogDb.createCategory({ name, parentId: parentId || null, sortOrder: nextCategorySort(parentId) });
      await reloadCategories();
      if (parentId) {
        els.productForm.elements.family.value = parentId;
        renderTypeOptions(parentId, created.id);
      } else {
        els.productForm.elements.family.value = created.id;
        renderTypeOptions(created.id, "");
      }
      showToast("Categoría creada.");
    } catch (error) {
      showToast(error.message, "error");
    }
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

    state.currentUserId = session.user.id;
    state.currentUserEmail = session.user.email || null;

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
    try {
      state.allCategories = await window.catalogDb.getAllCategories();
    } catch (error) {
      state.allCategories = state.categories;
    }
    try {
      state.combos = await window.catalogDb.getCombos({ audit: true });
    } catch (error) {
      state.combos = [];
    }
    try {
      state.adminProfiles = await window.catalogDb.getAdminProfiles();
    } catch (error) {
      state.adminProfiles = [];
    }
    state.products = await window.catalogDb.getProductsWithFlavors({ cache: false, fallback: false, audit: true });
    state.homeIds = state.products
      .filter((product) => product.show_on_home)
      .sort((a, b) => (a.home_order ?? 999) - (b.home_order ?? 999))
      .map((product) => product.id);

    if (!state.homeIds.length) {
      state.homeIds = state.products.filter((product) => product.featured).slice(0, 8).map((product) => product.id);
    }

    if (!state.variantProductId && state.products.length) state.variantProductId = state.products[0].id;
  }

  // Jerarquía de categorías: familia = sin parent_id; tipo = hijo de una familia.
  function getFamilies() {
    return state.categories.filter((category) => !category.parent_id);
  }
  function getTypesOf(familyId) {
    return state.categories.filter((category) => category.parent_id === familyId);
  }
  function getCategoryById(id) {
    return id ? state.categories.find((category) => category.id === id) : null;
  }

  function renderCategoryOptions() {
    // Filtro de productos del admin: por TEXTO real de las categorías presentes
    // (robusto antes y después de la migración).
    const presentCats = [...new Set(state.products.map((p) => p.category).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "es"));
    if (els.categoryFilter) {
      els.categoryFilter.innerHTML = [
        `<option value="all">Todas las categorias</option>`,
        ...presentCats.map((name) => `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`),
      ].join("");
      syncFilterControls();
    }

    // Select de FAMILIA en el drawer (el de TIPO se llena según la familia elegida).
    const familySelect = els.productForm?.elements.family;
    if (familySelect) {
      const current = familySelect.value;
      familySelect.innerHTML = [
        `<option value="">Selecciona familia</option>`,
        ...getFamilies().map((fam) => `<option value="${fam.id}">${escapeHTML(fam.name)}</option>`),
      ].join("");
      if (current) familySelect.value = current;
    }
  }

  function renderTypeOptions(familyId, selectedTypeId = "") {
    const typeSelect = els.productForm?.elements.type;
    if (!typeSelect) return;
    const types = familyId ? getTypesOf(familyId) : [];
    typeSelect.innerHTML = [
      `<option value="">General (toda la familia)</option>`,
      ...types.map((t) => `<option value="${t.id}"${t.id === selectedTypeId ? " selected" : ""}>${escapeHTML(t.name)}</option>`),
    ].join("");
    typeSelect.disabled = !familyId;
  }

  // Posiciona los selects familia/tipo a partir del category_id del producto.
  function setCategoryCascade(product) {
    const familySelect = els.productForm?.elements.family;
    if (!familySelect) return;
    const cat = product ? getCategoryById(product.category_id) : null;
    if (cat && cat.parent_id) {
      familySelect.value = cat.parent_id;
      renderTypeOptions(cat.parent_id, cat.id);
    } else if (cat) {
      familySelect.value = cat.id;
      renderTypeOptions(cat.id, "");
    } else {
      familySelect.value = "";
      renderTypeOptions(null);
    }
  }

  // ===== Gestión de categorías (pantalla dedicada) =====
  async function reloadCategories() {
    state.categories = await window.catalogDb.getCategories();
    try {
      state.allCategories = await window.catalogDb.getAllCategories();
    } catch (error) {
      state.allCategories = state.categories;
    }
    renderCategoryOptions();
    renderCategoryManager();
  }

  function categorySortList(list) {
    return [...list].sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99) || a.name.localeCompare(b.name, "es"));
  }

  function categoryActionsMarkup(cat, index, total) {
    return `
      <div class="admin-cat-actions">
        <button class="admin-chip-btn" type="button" data-cat-up="${cat.id}" ${index === 0 ? "disabled" : ""} aria-label="Subir">${icon("arrow-up", "")}</button>
        <button class="admin-chip-btn" type="button" data-cat-down="${cat.id}" ${index === total - 1 ? "disabled" : ""} aria-label="Bajar">${icon("arrow-down", "")}</button>
        <button class="admin-chip-btn" type="button" data-cat-rename="${cat.id}" aria-label="Renombrar">${icon("pencil", "")}</button>
        <button class="admin-chip-btn" type="button" data-cat-toggle="${cat.id}">${cat.is_active === false ? "Activar" : "Ocultar"}</button>
        <button class="admin-chip-btn" type="button" data-cat-delete="${cat.id}" aria-label="Eliminar">${icon("trash", "")}</button>
      </div>`;
  }

  function renderCategoryManager() {
    if (!els.categoryManager) return;
    const cats = state.allCategories?.length ? state.allCategories : state.categories;
    const families = categorySortList(cats.filter((c) => !c.parent_id));
    if (!families.length) {
      els.categoryManager.innerHTML = `<p class="admin-help-text">No hay categorías todavía. Crea la primera familia.</p>`;
      return;
    }
    els.categoryManager.innerHTML = families.map((fam, fi) => {
      const types = categorySortList(cats.filter((c) => c.parent_id === fam.id));
      return `
      <article class="admin-cat-family${fam.is_active === false ? " is-off" : ""}">
        <div class="admin-cat-row admin-cat-row--family">
          <strong>${escapeHTML(fam.name)}${fam.is_active === false ? " (oculta)" : ""}</strong>
          <div class="admin-cat-actions">
            <button class="admin-chip-btn" type="button" data-cat-up="${fam.id}" ${fi === 0 ? "disabled" : ""} aria-label="Subir">${icon("arrow-up", "")}</button>
            <button class="admin-chip-btn" type="button" data-cat-down="${fam.id}" ${fi === families.length - 1 ? "disabled" : ""} aria-label="Bajar">${icon("arrow-down", "")}</button>
            <button class="admin-chip-btn" type="button" data-cat-add-type="${fam.id}">${icon("plus")}Tipo</button>
            <button class="admin-chip-btn" type="button" data-cat-rename="${fam.id}">${icon("pencil")}Renombrar</button>
            <button class="admin-chip-btn" type="button" data-cat-toggle="${fam.id}">${fam.is_active === false ? "Activar" : "Ocultar"}</button>
            <button class="admin-chip-btn" type="button" data-cat-delete="${fam.id}" aria-label="Eliminar familia">${icon("trash", "")}</button>
          </div>
        </div>
        <div class="admin-cat-types">
          ${types.length ? types.map((t, ti) => `
            <div class="admin-cat-row admin-cat-type${t.is_active === false ? " is-off" : ""}">
              <span>${escapeHTML(t.name)}${t.is_active === false ? " (oculto)" : ""}</span>
              ${categoryActionsMarkup(t, ti, types.length)}
            </div>`).join("") : `<p class="admin-help-text admin-cat-empty">Sin tipos.</p>`}
        </div>
      </article>`;
    }).join("");
  }

  function nextCategorySort(parentId) {
    const siblings = (state.allCategories || []).filter((c) => (c.parent_id || null) === (parentId || null));
    return siblings.reduce((max, c) => Math.max(max, c.sort_order ?? 0), 0) + 1;
  }

  async function createCategoryFromManager(parentId) {
    const name = await promptDialog({
      title: parentId ? "Nuevo tipo" : "Nueva familia",
      label: parentId ? "Nombre del tipo" : "Nombre de la familia",
      confirmText: "Crear",
    });
    if (!name) return;
    try {
      await window.catalogDb.createCategory({ name, parentId: parentId || null, sortOrder: nextCategorySort(parentId) });
      await reloadCategories();
      showToast("Categoría creada.");
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function renameCategoryEntry(id) {
    const name = await promptDialog({ title: "Renombrar categoría", label: "Nuevo nombre", confirmText: "Guardar" });
    if (!name) return;
    try {
      await window.catalogDb.updateCategory(id, { name });
      await reloadCategories();
      showToast("Categoría actualizada.");
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function toggleCategoryActive(id) {
    const cat = (state.allCategories || []).find((c) => c.id === id);
    if (!cat) return;
    try {
      await window.catalogDb.updateCategory(id, { is_active: cat.is_active === false });
      await reloadCategories();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function deleteCategoryEntry(id) {
    const cats = state.allCategories || [];
    const cat = cats.find((c) => c.id === id);
    if (!cat) return;
    if (cats.some((c) => c.parent_id === id)) {
      showToast("Primero elimina o mueve los tipos de esta familia.", "error");
      return;
    }
    try {
      const count = await window.catalogDb.getCategoryProductCount(id, []);
      if (count > 0) {
        showToast(`No se puede borrar: ${count} producto(s) la usan. Reasígnalos primero.`, "error");
        return;
      }
      const ok = await confirmDialog({
        title: "Eliminar categoría",
        message: `Se eliminará "${cat.name}". Esta acción no se puede deshacer.`,
        confirmText: "Eliminar",
        danger: true,
      });
      if (!ok) return;
      await window.catalogDb.deleteCategory(id);
      await reloadCategories();
      showToast("Categoría eliminada.");
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function moveCategoryEntry(id, direction) {
    const cats = state.allCategories || [];
    const cat = cats.find((c) => c.id === id);
    if (!cat) return;
    const siblings = categorySortList(cats.filter((c) => (c.parent_id || null) === (cat.parent_id || null)));
    const index = siblings.findIndex((c) => c.id === id);
    const swapWith = siblings[index + direction];
    if (!swapWith) return;
    try {
      const a = cat.sort_order ?? index;
      const b = swapWith.sort_order ?? (index + direction);
      // Si empatan, separa para que el reordenamiento tenga efecto.
      const newA = a === b ? (direction < 0 ? b - 1 : b + 1) : b;
      await window.catalogDb.updateCategory(cat.id, { sort_order: newA });
      await window.catalogDb.updateCategory(swapWith.id, { sort_order: a });
      await reloadCategories();
    } catch (error) {
      showToast(error.message, "error");
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

  function flavorRowMarkup(flavor) {
    return `
      <article class="admin-variant-row" data-flavor-id="${flavor.id}">
        <input value="${escapeHTML(flavor.name)}" data-flavor-name aria-label="Nombre del sabor" placeholder="Nombre del sabor" />
        <div class="admin-variant-actions">
          <label class="admin-toggle">
            <input type="checkbox" ${flavor.available !== false ? "checked" : ""} data-flavor-available />
            Disponible
          </label>
          <button class="admin-chip-btn" type="button" data-save-flavor>${icon("save")}Guardar</button>
          <button class="admin-chip-btn" type="button" data-delete-flavor>${icon("trash")}Eliminar</button>
        </div>
      </article>`;
  }

  function flavorToolbarMarkup(idPrefix, addBtnId) {
    return `
      <div class="admin-variant-toolbar">
        <input id="${idPrefix}NameNew" placeholder="Ej: Chocolate" aria-label="Nombre del sabor nuevo" />
        <button class="admin-primary" type="button" id="${addBtnId}">${icon("plus")}Agregar</button>
      </div>`;
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
      ${flavorToolbarMarkup("variant", "addVariantBtn")}
      <div class="admin-variant-list">
        ${flavors.length ? flavors.map(flavorRowMarkup).join("") : `<p class="admin-help-text">Este producto no tiene sabores o variantes.</p>`}
      </div>
    `;
  }

  // Gestión de sabores DENTRO del drawer del producto (mismo patrón que la pestaña Sabores).
  function renderDrawerFlavors() {
    if (!els.drawerFlavors) return;
    const product = state.selectedProductId ? getProductById(state.selectedProductId) : null;
    if (!product) {
      els.drawerFlavors.innerHTML = `<p class="admin-help-text">Guarda el producto para poder agregar y gestionar sus sabores.</p>`;
      return;
    }
    const flavors = product.flavors || [];
    els.drawerFlavors.innerHTML = `
      ${flavorToolbarMarkup("drawerFlavor", "addDrawerFlavorBtn")}
      <div class="admin-variant-list">
        ${flavors.length ? flavors.map(flavorRowMarkup).join("") : `<p class="admin-help-text">Aún no hay sabores. Agrega el primero arriba.</p>`}
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

  // ===== Combos (admin) =====
  function getComboById(id) {
    return state.combos.find((combo) => combo.id === id);
  }

  function renderCombos() {
    if (!els.combosList) return;
    if (!state.combos.length) {
      els.combosList.innerHTML = `<p class="admin-help-text">Aún no hay combos. Crea el primero con "Nuevo combo".</p>`;
      return;
    }
    els.combosList.innerHTML = state.combos.map((combo) => `
      <article class="admin-combo-card${combo.is_active ? "" : " is-off"}">
        <img src="${escapeHTML(combo.image)}" alt="" />
        <div class="admin-combo-card__info">
          <strong>${escapeHTML(combo.name)}</strong>
          <small>${combo.items.length} producto(s) · ${formatPrice(combo.price)}${combo.show_on_home ? " · En inicio" : ""}</small>
        </div>
        <div class="admin-combo-card__actions">
          ${availabilitySwitch({ on: combo.is_active, attr: "data-toggle-combo", id: combo.id, onLabel: "Activo", offLabel: "Inactivo" })}
          <button class="admin-chip-btn" type="button" data-edit-combo="${combo.id}">${icon("pencil")}Editar</button>
        </div>
      </article>
    `).join("");
  }

  function renderComboProductSelect() {
    const select = $("#comboProductSelect");
    if (!select) return;
    select.innerHTML = state.products
      .slice()
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"))
      .map((p) => `<option value="${p.id}">${escapeHTML(p.name)}</option>`)
      .join("");
    renderComboFlavorSelect(select.value);
  }

  function renderComboFlavorSelect(productId) {
    const select = $("#comboFlavorSelect");
    if (!select) return;
    const product = getProductById(productId);
    const flavors = product?.flavors || [];
    select.innerHTML = [
      `<option value="">Sin sabor específico</option>`,
      ...flavors.map((f) => `<option value="${f.id}">${escapeHTML(f.name)}</option>`),
    ].join("");
    select.disabled = !flavors.length;
  }

  function renderComboItems() {
    if (!els.comboItemsList) return;
    if (!state.comboItems.length) {
      els.comboItemsList.innerHTML = `<p class="admin-help-text">Agrega productos al combo arriba.</p>`;
      return;
    }
    els.comboItemsList.innerHTML = state.comboItems.map((item, index) => `
      <div class="admin-combo-item">
        <span>${item.quantity} × ${escapeHTML(item.product_name)}${item.flavor_name ? ` <em>(${escapeHTML(item.flavor_name)})</em>` : ""}</span>
        <button class="admin-chip-btn" type="button" data-remove-combo-item="${index}" aria-label="Quitar">${icon("trash", "")}</button>
      </div>
    `).join("");
  }

  function addComboItem() {
    const productId = $("#comboProductSelect")?.value;
    const flavorId = $("#comboFlavorSelect")?.value || null;
    const qty = Math.max(1, parseInt($("#comboQtyInput")?.value, 10) || 1);
    const product = getProductById(productId);
    if (!product) {
      showToast("Selecciona un producto.", "error");
      return;
    }
    const flavor = (product.flavors || []).find((f) => f.id === flavorId);
    state.comboItems.push({
      product_id: productId,
      flavor_id: flavorId,
      quantity: qty,
      product_name: product.name,
      flavor_name: flavor?.name || null,
    });
    renderComboItems();
  }

  function removeComboItem(index) {
    state.comboItems.splice(Number(index), 1);
    renderComboItems();
  }

  function updateComboPriceHint() {
    const hint = els.comboForm?.querySelector("[data-combo-price-hint]");
    if (!hint) return;
    const price = Number(els.comboForm.elements.price.value);
    const oldPrice = Number(els.comboForm.elements.old_price.value);
    if (price > 0 && oldPrice > price) {
      hint.hidden = false;
      hint.textContent = `Ahorro: -${Math.round((1 - price / oldPrice) * 100)}%`;
    } else {
      hint.hidden = true;
      hint.textContent = "";
    }
  }

  function updateComboImageState() {
    const form = els.comboForm;
    if (!form) return;
    const stateEl = form.querySelector("[data-combo-image-state]");
    const clearBtn = form.querySelector("[data-combo-clear-image]");
    const pickLabel = form.querySelector("[data-combo-pick-label]");
    const file = form.elements.image_file.files?.[0];
    const url = form.elements.image_url.value.trim();
    const hasUrl = url && url !== PLACEHOLDER_IMAGE;
    if (file) {
      stateEl.textContent = "Nueva imagen"; stateEl.dataset.tone = "new"; pickLabel.textContent = "Cambiar imagen";
    } else if (hasUrl) {
      stateEl.textContent = "Imagen actual"; stateEl.dataset.tone = "current"; pickLabel.textContent = "Cambiar imagen";
    } else {
      stateEl.textContent = "Sin imagen"; stateEl.dataset.tone = "empty"; pickLabel.textContent = "Subir imagen";
    }
    clearBtn.hidden = !(file || hasUrl);
  }

  function releaseComboImageObjectUrl() {
    if (state.comboImageObjectUrl) {
      URL.revokeObjectURL(state.comboImageObjectUrl);
      state.comboImageObjectUrl = null;
    }
  }

  async function clearComboImage() {
    const ok = await confirmDialog({
      title: "Quitar imagen",
      message: "Se quitará la imagen del combo. El cambio se aplica al guardar.",
      confirmText: "Quitar",
      danger: true,
    });
    if (!ok) return;
    const form = els.comboForm;
    form.elements.image_file.value = "";
    form.elements.image_url.value = "";
    releaseComboImageObjectUrl();
    els.comboImagePreview.src = PLACEHOLDER_IMAGE;
    updateComboImageState();
  }

  function clearComboErrors() {
    els.comboForm.querySelectorAll("[data-field-error]").forEach((el) => {
      el.textContent = "";
      el.classList.remove("is-error");
    });
  }
  function setComboError(name, message) {
    const target = els.comboForm.querySelector(`[data-field-error="${name}"]`);
    if (target) { target.textContent = message; target.classList.add("is-error"); }
  }
  function setComboFormMessage(message = "", isError = false) {
    if (!els.comboFormMessage) return;
    els.comboFormMessage.textContent = message;
    els.comboFormMessage.classList.toggle("is-error", Boolean(isError));
  }

  function openComboDrawer(comboId = null) {
    state.comboLastFocused = document.activeElement;
    state.selectedComboId = comboId;
    const combo = comboId ? getComboById(comboId) : null;
    const form = els.comboForm;
    releaseComboImageObjectUrl();
    form.reset();
    clearComboErrors();
    setComboFormMessage("");
    els.comboDrawerTitle.textContent = combo ? "Editar combo" : "Nuevo combo";
    els.deleteComboBtn.hidden = !combo;
    setMetaLine(els.comboMetaLine, combo);
    els.comboImagePreview.src = combo ? combo.image : PLACEHOLDER_IMAGE;

    if (combo) {
      form.elements.name.value = combo.name || "";
      form.elements.description.value = combo.description || "";
      form.elements.price.value = combo.price ?? "";
      form.elements.old_price.value = combo.old_price ?? "";
      form.elements.image_url.value = combo.image_url || "";
      form.elements.is_active.checked = combo.is_active !== false;
      form.elements.show_on_home.checked = Boolean(combo.show_on_home);
      state.comboItems = combo.items.map((it) => ({ ...it }));
    } else {
      form.elements.is_active.checked = true;
      form.elements.show_on_home.checked = false;
      state.comboItems = [];
    }

    renderComboProductSelect();
    renderComboItems();
    updateComboPriceHint();
    updateComboImageState();
    els.comboDrawer.hidden = false;
    els.comboDrawer.setAttribute("aria-hidden", "false");
    form.elements.name.focus();
  }

  function closeComboDrawer() {
    els.comboDrawer.hidden = true;
    els.comboDrawer.setAttribute("aria-hidden", "true");
    state.selectedComboId = null;
    releaseComboImageObjectUrl();
    state.comboLastFocused?.focus?.({ preventScroll: true });
    state.comboLastFocused = null;
  }

  function handleComboDrawerKeydown(event) {
    if (event.key === "Escape") { event.preventDefault(); closeComboDrawer(); return; }
    if (event.key !== "Tab") return;
    const focusables = Array.from(
      els.comboDrawer.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])')
    ).filter((el) => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function validateComboForm(form) {
    clearComboErrors();
    let ok = true;
    if (!form.elements.name.value.trim()) { setComboError("combo_name", "El nombre es obligatorio."); ok = false; }
    const price = form.elements.price.value;
    if (price === "" || !Number.isFinite(Number(price)) || Number(price) < 0) { setComboError("combo_price", "Precio inválido."); ok = false; }
    if (!state.comboItems.length) { setComboError("combo_items", "Agrega al menos un producto."); ok = false; }
    return ok;
  }

  async function handleComboSubmit(event) {
    event.preventDefault();
    const form = els.comboForm;
    if (!validateComboForm(form)) { setComboFormMessage("Revisa los campos marcados.", true); return; }
    const submitBtn = form.querySelector("button[type='submit']");
    const imageFile = form.elements.image_file.files?.[0];
    let uploadedImageUrl = "";
    const data = {
      name: form.elements.name.value.trim(),
      description: form.elements.description.value.trim(),
      price: form.elements.price.value,
      old_price: form.elements.old_price.value,
      image_url: form.elements.image_url.value.trim(),
      is_active: form.elements.is_active.checked,
      show_on_home: form.elements.show_on_home.checked,
    };
    try {
      setButtonLoading(submitBtn, true);
      setComboFormMessage("Guardando combo...");
      if (imageFile) {
        uploadedImageUrl = await window.catalogDb.uploadProductImage(imageFile);
        data.image_url = uploadedImageUrl;
      }
      let comboId = state.selectedComboId;
      if (comboId) {
        await window.catalogDb.updateCombo(comboId, data);
      } else {
        const created = await window.catalogDb.createCombo(data);
        comboId = created.id;
      }
      await window.catalogDb.saveComboItems(comboId, state.comboItems);
      await refreshAfterMutation("Combo guardado correctamente.");
      closeComboDrawer();
    } catch (error) {
      if (uploadedImageUrl) await window.catalogDb.removeProductImage(uploadedImageUrl);
      setComboFormMessage(error.message, true);
      showToast("Error al guardar el combo.", "error");
    } finally {
      setButtonLoading(submitBtn, false);
    }
  }

  async function deleteSelectedCombo() {
    const combo = getComboById(state.selectedComboId);
    if (!combo) return;
    const ok = await confirmDialog({ title: "Eliminar combo", message: `Se eliminará "${combo.name}".`, confirmText: "Eliminar", danger: true });
    if (!ok) return;
    try {
      setButtonLoading(els.deleteComboBtn, true, "Eliminando...");
      await window.catalogDb.deleteCombo(combo.id);
      await refreshAfterMutation("Combo eliminado.");
      closeComboDrawer();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setButtonLoading(els.deleteComboBtn, false);
    }
  }

  async function toggleComboActive(comboId) {
    const combo = getComboById(comboId);
    if (!combo) return;
    try {
      await window.catalogDb.setComboActive(comboId, combo.is_active === false);
      await refreshAfterMutation("Combo actualizado.");
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  // ===== Accesos (admin_profiles) =====
  function renderAccess() {
    if (!els.accessList) return;
    const profiles = state.adminProfiles || [];
    if (!profiles.length) {
      els.accessList.innerHTML = `<p class="admin-help-text">No hay perfiles admin para mostrar (o no se pudieron cargar).</p>`;
      return;
    }
    els.accessList.innerHTML = profiles.map((p) => {
      const isMe = p.user_id === state.currentUserId || (p.email && p.email === state.currentUserEmail);
      const who = p.email || p.user_id;
      return `
        <div class="admin-access-row${p.is_active === false ? " is-off" : ""}">
          <div class="admin-access-row__info">
            <strong>${escapeHTML(who)}${isMe ? " (tú)" : ""}</strong>
            <small>${escapeHTML(p.role || "admin")} · ${p.is_active === false ? "inactivo" : "activo"}</small>
          </div>
          ${isMe
            ? `<span class="admin-help-text">No puedes desactivarte</span>`
            : availabilitySwitch({ on: p.is_active !== false, attr: "data-toggle-admin", id: p.id, onLabel: "Activo", offLabel: "Inactivo" })}
        </div>`;
    }).join("");
  }

  async function toggleAdminActive(id) {
    const profile = (state.adminProfiles || []).find((p) => p.id === id);
    if (!profile) return;
    if (profile.user_id === state.currentUserId) {
      showToast("No puedes desactivar tu propio acceso.", "error");
      return;
    }
    try {
      await window.catalogDb.setAdminProfileActive(id, profile.is_active === false);
      state.adminProfiles = await window.catalogDb.getAdminProfiles();
      renderAccess();
      showToast("Acceso actualizado.");
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  function renderAll() {
    renderCategoryOptions();
    renderDashboard();
    renderProducts();
    renderVariants();
    renderDrawerFlavors();
    renderHomeProducts();
    renderCategoryManager();
    renderCombos();
    renderAccess();
  }

  function setSection(section) {
    state.currentSection = section;
    const titles = {
      dashboard: "Dashboard",
      products: "Productos",
      variants: "Sabores y variantes",
      home: "Productos del inicio",
      categories: "Categorías",
      combos: "Combos",
      access: "Accesos",
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

    if (!data.category_id) {
      setFieldError("category", "Debes seleccionar una familia (y un tipo si aplica).");
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
    // El gestor de sabores del drawer opera sobre este producto.
    if (productId) state.variantProductId = productId;
    const product = productId ? getProductById(productId) : null;
    // Snapshot para el guard de edición concurrente.
    state.editingProductUpdatedAt = product?.updated_at || null;
    setMetaLine(els.productMetaLine, product);
    const form = els.productForm;

    releaseImageObjectUrl();
    form.reset();
    clearFieldErrors();
    setFormMessage("");
    els.drawerTitle.textContent = product ? "Editar producto" : "Agregar producto";
    els.deleteProductBtn.hidden = !product;
    els.duplicateProductBtn.hidden = !product;
    els.imagePreview.src = product ? productImage(product) : PLACEHOLDER_IMAGE;

    if (product) {
      form.elements.name.value = product.name || "";
      form.elements.brand.value = product.brand || "";
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

    setCategoryCascade(product);
    updateDiscountHint();
    updateImageState();
    renderDrawerFlavors();
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

  // Refleja el estado de la imagen: nueva (archivo elegido), actual (URL), o sin imagen.
  function updateImageState() {
    const form = els.productForm;
    if (!form) return;
    const stateEl = form.querySelector("[data-image-state]");
    const filenameEl = form.querySelector("[data-image-filename]");
    const clearBtn = form.querySelector("[data-clear-image]");
    const pickLabel = form.querySelector("[data-pick-image-label]");
    const file = form.elements.image_file.files?.[0];
    const url = form.elements.image_url.value.trim();
    const hasUrl = url && url !== PLACEHOLDER_IMAGE;

    if (file) {
      stateEl.textContent = "Nueva imagen";
      stateEl.dataset.tone = "new";
      filenameEl.hidden = false;
      filenameEl.textContent = file.name;
      pickLabel.textContent = "Cambiar imagen";
    } else if (hasUrl) {
      stateEl.textContent = "Imagen actual";
      stateEl.dataset.tone = "current";
      filenameEl.hidden = true;
      filenameEl.textContent = "";
      pickLabel.textContent = "Cambiar imagen";
    } else {
      stateEl.textContent = "Sin imagen";
      stateEl.dataset.tone = "empty";
      filenameEl.hidden = true;
      filenameEl.textContent = "";
      pickLabel.textContent = "Subir imagen";
    }
    clearBtn.hidden = !(file || hasUrl);
  }

  async function clearProductImage() {
    const ok = await confirmDialog({
      title: "Quitar imagen",
      message: "Se quitará la imagen de este producto. El cambio se aplica al guardar.",
      confirmText: "Quitar",
      danger: true,
    });
    if (!ok) return;
    const form = els.productForm;
    form.elements.image_file.value = "";
    form.elements.image_url.value = "";
    releaseImageObjectUrl();
    els.imagePreview.src = PLACEHOLDER_IMAGE;
    updateImageState();
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

  // Abre el drawer como producto NUEVO precargado con los datos de otro (sin id).
  // No copia posición de inicio ni "destacado" para evitar duplicar home_order.
  function duplicateProduct() {
    const source = getProductById(state.selectedProductId);
    if (!source) return;
    openProductDrawer(null);
    const form = els.productForm;
    form.elements.name.value = `${source.name || "Producto"} (copia)`;
    form.elements.brand.value = source.brand || "";
    form.elements.presentation.value = source.presentation || "";
    form.elements.description_short.value = source.description_short || "";
    form.elements.description_long.value = source.description_long || source.description || "";
    form.elements.price.value = source.price || "";
    form.elements.old_price.value = source.old_price || "";
    const storedImage = source.stored_image_url ?? source.image_url;
    form.elements.image_url.value = storedImage === PLACEHOLDER_IMAGE ? "" : storedImage || "";
    form.elements.label.value = source.label || "";
    form.elements.tags.value = listToInput(source.tags);
    form.elements.goals.value = listToInput(source.goals);
    form.elements.flavor_mode.value = getFlavorMode(source);
    form.elements.is_available.checked = source.available !== false;
    form.elements.is_featured.checked = false;
    form.elements.show_on_home.checked = false;
    form.elements.home_order.value = "";

    els.drawerTitle.textContent = "Duplicar producto";
    els.imagePreview.src = form.elements.image_url.value || PLACEHOLDER_IMAGE;
    setCategoryCascade(source);
    updateDiscountHint();
    updateImageState();
    form.elements.name.focus();
    form.elements.name.select();
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
    // category_id = tipo elegido, o la familia si no hay tipo. category (texto) = su nombre.
    const familyId = form.elements.family.value;
    const typeId = form.elements.type.value;
    const categoryId = typeId || familyId || null;
    const categoryName = getCategoryById(categoryId)?.name || "";
    return {
      name: form.elements.name.value.trim(),
      brand: form.elements.brand.value.trim(),
      category: categoryName,
      category_id: categoryId,
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

      const wasCreate = !state.selectedProductId;
      if (state.selectedProductId) {
        try {
          await window.catalogDb.updateProduct(state.selectedProductId, productData, {
            expectedUpdatedAt: state.editingProductUpdatedAt,
          });
        } catch (conflict) {
          if (conflict.code !== "CONFLICT") throw conflict;
          const overwrite = await confirmDialog({
            title: "Cambios en conflicto",
            message: "Otro admin modificó este producto mientras lo editabas. ¿Sobrescribir con tus cambios?",
            confirmText: "Sobrescribir",
            danger: true,
          });
          if (!overwrite) {
            if (uploadedImageUrl) await window.catalogDb.removeProductImage(uploadedImageUrl);
            await refreshAfterMutation("Se recargó el producto con los cambios recientes.");
            openProductDrawer(state.selectedProductId);
            return;
          }
          await window.catalogDb.updateProduct(state.selectedProductId, productData);
        }
      } else {
        const created = await window.catalogDb.createProduct(productData);
        state.selectedProductId = created.id;
      }

      const savedId = state.selectedProductId;
      await refreshAfterMutation(
        wasCreate ? "Producto creado. Ahora puedes agregar sus sabores." : "Producto guardado correctamente."
      );
      // Al crear, reabre el drawer en modo edición para gestionar sabores ya con id.
      if (wasCreate) {
        openProductDrawer(savedId);
      } else {
        closeProductDrawer();
      }
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
      available,
      is_available: available,
    });
    await refreshAfterMutation("Sabor actualizado.");
  }

  // Crea un sabor leyendo el toolbar identificado por idPrefix (variant | drawerFlavor).
  async function addFlavorFromInputs(idPrefix, productId) {
    const product = getProductById(productId);
    const nameInput = $(`#${idPrefix}NameNew`);
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
    els.duplicateProductBtn?.addEventListener("click", duplicateProduct);
    document.querySelector("[data-cat-add-family]")?.addEventListener("click", () => createCategoryFromManager(null));

    // Combos
    els.newComboBtn?.addEventListener("click", () => openComboDrawer());
    els.comboForm?.addEventListener("submit", handleComboSubmit);
    els.deleteComboBtn?.addEventListener("click", deleteSelectedCombo);
    els.comboDrawer?.addEventListener("keydown", handleComboDrawerKeydown);
    document.querySelectorAll("[data-close-combo-drawer]").forEach((item) => item.addEventListener("click", closeComboDrawer));
    els.comboForm?.querySelector("[data-combo-pick-image]")?.addEventListener("click", () => els.comboForm.elements.image_file.click());
    els.comboForm?.querySelector("[data-combo-clear-image]")?.addEventListener("click", clearComboImage);
    els.comboForm?.elements.image_file.addEventListener("change", () => {
      const file = els.comboForm.elements.image_file.files?.[0];
      if (!file) return;
      releaseComboImageObjectUrl();
      state.comboImageObjectUrl = URL.createObjectURL(file);
      els.comboImagePreview.src = state.comboImageObjectUrl;
      updateComboImageState();
    });
    els.comboForm?.elements.price.addEventListener("input", updateComboPriceHint);
    els.comboForm?.elements.old_price.addEventListener("input", updateComboPriceHint);
    $("#comboProductSelect")?.addEventListener("change", (event) => renderComboFlavorSelect(event.target.value));
    $("#comboAddItemBtn")?.addEventListener("click", addComboItem);
    els.seedBtn?.addEventListener("click", seedProducts);
    els.saveHomeBtn?.addEventListener("click", saveHomeProducts);

    document.querySelectorAll("[data-close-product-drawer]").forEach((item) => {
      item.addEventListener("click", closeProductDrawer);
    });

    els.drawer?.addEventListener("keydown", handleDrawerKeydown);

    els.productForm?.elements.price.addEventListener("input", updateDiscountHint);
    els.productForm?.elements.old_price.addEventListener("input", updateDiscountHint);

    els.productForm?.querySelector("[data-pick-image]")?.addEventListener("click", () => {
      els.productForm.elements.image_file.click();
    });
    els.productForm?.querySelector("[data-clear-image]")?.addEventListener("click", clearProductImage);

    els.productForm?.elements.family.addEventListener("change", () => {
      renderTypeOptions(els.productForm.elements.family.value);
    });
    els.productForm?.querySelector("[data-new-family]")?.addEventListener("click", () => createCategoryInline(null));
    els.productForm?.querySelector("[data-new-type]")?.addEventListener("click", () => {
      const familyId = els.productForm.elements.family.value;
      if (!familyId) {
        showToast("Primero elige una familia.", "error");
        return;
      }
      createCategoryInline(familyId);
    });

    els.productForm?.elements.image_file.addEventListener("change", () => {
      const file = els.productForm.elements.image_file.files?.[0];
      if (!file) return;
      // Revocar el object URL anterior antes de crear el siguiente (evita fuga).
      releaseImageObjectUrl();
      state.imageObjectUrl = URL.createObjectURL(file);
      els.imagePreview.src = state.imageObjectUrl;
      updateImageState();
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
        await addFlavorFromInputs("variant", state.variantProductId);
        return;
      }

      const addDrawerFlavorButton = event.target.closest("#addDrawerFlavorBtn");
      if (addDrawerFlavorButton) {
        await addFlavorFromInputs("drawerFlavor", state.selectedProductId);
        return;
      }

      const catAddType = event.target.closest("[data-cat-add-type]");
      if (catAddType) { await createCategoryFromManager(catAddType.dataset.catAddType); return; }
      const catRename = event.target.closest("[data-cat-rename]");
      if (catRename) { await renameCategoryEntry(catRename.dataset.catRename); return; }
      const catToggle = event.target.closest("[data-cat-toggle]");
      if (catToggle) { await toggleCategoryActive(catToggle.dataset.catToggle); return; }
      const catDelete = event.target.closest("[data-cat-delete]");
      if (catDelete) { await deleteCategoryEntry(catDelete.dataset.catDelete); return; }
      const catUp = event.target.closest("[data-cat-up]");
      if (catUp) { await moveCategoryEntry(catUp.dataset.catUp, -1); return; }
      const catDown = event.target.closest("[data-cat-down]");
      if (catDown) { await moveCategoryEntry(catDown.dataset.catDown, 1); return; }

      const editCombo = event.target.closest("[data-edit-combo]");
      if (editCombo) { openComboDrawer(editCombo.dataset.editCombo); return; }
      const toggleCombo = event.target.closest("[data-toggle-combo]");
      if (toggleCombo) { await toggleComboActive(toggleCombo.dataset.toggleCombo); return; }
      const removeComboItemBtn = event.target.closest("[data-remove-combo-item]");
      if (removeComboItemBtn) { removeComboItem(removeComboItemBtn.dataset.removeComboItem); return; }

      const toggleAdmin = event.target.closest("[data-toggle-admin]");
      if (toggleAdmin) { await toggleAdminActive(toggleAdmin.dataset.toggleAdmin); return; }

      const flavorRow = event.target.closest("[data-flavor-id]");
      if (flavorRow && event.target.closest("[data-save-flavor]")) {
        try {
          await saveFlavor(flavorRow.dataset.flavorId, flavorRow);
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
