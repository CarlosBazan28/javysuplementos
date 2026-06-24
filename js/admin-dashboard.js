/* ============================================================================
   JAVY / P-BOOM ADMIN — controlador vanilla del panel rediseñado.
   Recrea el handoff (design_handoff_admin_panel) sobre el codebase real:
   shell + 8 secciones + drawer de producto + builder de combos + toasts,
   todo wireado a window.catalogDb (Supabase) con degradación elegante.
   ============================================================================ */
(function () {
  "use strict";

  const PLACEHOLDER = "img/products/product-placeholder.svg";
  const HOME_MAX = 8;
  const HOME_MIN = 4;
  const STALE_DAYS = 21;

  const GOAL_SUGGESTIONS = [
    "Ganar masa muscular", "Ganar peso", "Rendimiento", "Definición", "Recuperación", "Energía",
  ];

  const NAV = [
    { key: "dashboard", label: "Dashboard", icon: "layout-dashboard", primary: true,
      subtitle: "Resumen de la tienda y acciones pendientes" },
    { key: "products", label: "Productos", icon: "package", primary: true,
      subtitle: "Gestiona el catálogo, precios y disponibilidad" },
    { key: "variants", label: "Sabores", icon: "tags", primary: true,
      subtitle: "Sabores y variantes por producto" },
    { key: "home", label: "Inicio", icon: "home", primary: true,
      subtitle: "Productos destacados en el inicio" },
    { key: "categories", label: "Categorías", icon: "tags", primary: false,
      subtitle: "Familias y tipos del catálogo" },
    { key: "combos", label: "Combos", icon: "package", primary: false,
      subtitle: "Paquetes con precio especial" },
    { key: "access", label: "Accesos", icon: "log-in", primary: false,
      subtitle: "Administradores con acceso al panel" },
    { key: "settings", label: "Ajustes", icon: "settings", primary: false,
      subtitle: "Estado del sistema y configuración" },
  ];

  const state = {
    products: [],
    categories: [],
    combos: [],
    admins: [],
    userId: null,
    userEmail: null,
    active: "dashboard",
    productFilter: "all",
    search: "",
    combosSupported: true,
    categoriesSupported: true,
  };

  /* ----------------------------- helpers ----------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function esc(value) {
    // String(value ?? "") tolera null, undefined y números sin tirar
    // (un default de parámetro solo cubre undefined, no null).
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function ico(name) {
    return window.javyIcons ? window.javyIcons.get(name, "ad-ico") : "";
  }

  function peso(n) {
    const v = Number(n || 0);
    if (!(v > 0)) return "Consultar";
    return "$" + (Number.isInteger(v) ? v : v.toFixed(2).replace(/\.0+$/, ""));
  }

  function hasOffer(p) {
    const price = Number(p.price || 0);
    const old = Number(p.old_price || 0);
    return price > 0 && old > price;
  }
  function discountPct(p) {
    if (!hasOffer(p)) return 0;
    return Math.round((1 - Number(p.price) / Number(p.old_price)) * 100);
  }

  function daysSince(iso) {
    if (!iso) return Infinity;
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return Infinity;
    return Math.floor((Date.now() - then) / 86400000);
  }
  function agoLabel(iso) {
    const d = daysSince(iso);
    if (!Number.isFinite(d)) return "sin fecha";
    if (d <= 0) return "hoy";
    if (d === 1) return "hace 1 día";
    if (d < 7) return `hace ${d} días`;
    const w = Math.floor(d / 7);
    if (w === 1) return "hace 1 sem";
    if (w < 4) return `hace ${w} sem`;
    const m = Math.floor(d / 30);
    return m <= 1 ? "hace 1 mes" : `hace ${m} meses`;
  }

  function onImgErr(img) {
    img.onerror = null;
    img.src = PLACEHOLDER;
  }
  // attach the safe-fallback to every product image after a render
  function wireImageFallbacks(root) {
    $$("img[data-fallback]", root).forEach((img) => { img.onerror = () => onImgErr(img); });
  }

  function isAvailable(p) { return p.available !== false; }

  function stockTone(p) {
    if (!isAvailable(p)) return ["out", "Agotado"];
    return ["ok", "Disponible"];
  }

  /* category helpers (jerarquía Familia → Tipo) */
  const families = () => state.categories.filter((c) => !c.parent_id).sort(byOrder);
  const typesOf = (famId) => state.categories.filter((c) => c.parent_id === famId).sort(byOrder);
  const catById = (id) => state.categories.find((c) => c.id === id) || null;
  function byOrder(a, b) {
    const oa = a.sort_order ?? 100, ob = b.sort_order ?? 100;
    if (oa !== ob) return oa - ob;
    return (a.name || "").localeCompare(b.name || "", "es");
  }

  /* ----------------------------- toasts ----------------------------- */
  function toast({ tone = "ok", msg = "", sub = "" }) {
    const host = $("#adminToastHost");
    if (!host) return;
    const el = document.createElement("div");
    el.className = "ad-toast ad-toast--" + tone;
    const iconName = tone === "err" ? "x" : tone === "info" ? "package" : "save";
    el.innerHTML = `
      <span class="ad-toast__icon">${ico(iconName)}</span>
      <span class="ad-toast__msg">${esc(msg)}${sub ? `<small>${esc(sub)}</small>` : ""}</span>
      <button class="ad-toast__x" type="button" aria-label="Cerrar">${ico("x")}</button>`;
    const remove = () => { el.remove(); };
    el.querySelector(".ad-toast__x").addEventListener("click", remove);
    host.appendChild(el);
    setTimeout(remove, 3600);
  }

  /* --------------------------- confirm / prompt --------------------------- */
  function confirmModal({ title, body, confirmLabel = "Confirmar", danger = false }) {
    return new Promise((resolve) => {
      const host = $("#adminConfirmHost");
      const overlay = document.createElement("div");
      overlay.className = "ad-confirm-overlay";
      overlay.innerHTML = `
        <div class="ad-confirm" role="dialog" aria-modal="true">
          <h3>${esc(title)}</h3>
          ${body ? `<p>${esc(body)}</p>` : ""}
          <div class="ad-confirm__actions">
            <button class="ad-btn ad-btn--ghost" data-cancel type="button">Cancelar</button>
            <button class="ad-btn ${danger ? "ad-btn--danger" : "ad-btn--primary"}" data-ok type="button">${esc(confirmLabel)}</button>
          </div>
        </div>`;
      const close = (val) => { overlay.remove(); document.removeEventListener("keydown", onKey); resolve(val); };
      const onKey = (e) => { if (e.key === "Escape") close(false); };
      overlay.addEventListener("click", (e) => { if (e.target === overlay) close(false); });
      overlay.querySelector("[data-cancel]").addEventListener("click", () => close(false));
      overlay.querySelector("[data-ok]").addEventListener("click", () => close(true));
      document.addEventListener("keydown", onKey);
      host.appendChild(overlay);
      overlay.querySelector("[data-ok]").focus();
    });
  }

  function promptModal({ title, label = "", value = "", confirmLabel = "Guardar" }) {
    return new Promise((resolve) => {
      const host = $("#adminConfirmHost");
      const overlay = document.createElement("div");
      overlay.className = "ad-confirm-overlay";
      overlay.innerHTML = `
        <div class="ad-confirm" role="dialog" aria-modal="true">
          <h3>${esc(title)}</h3>
          <div class="ad-field">
            ${label ? `<label class="ad-field__label">${esc(label)}</label>` : ""}
            <input class="ad-input" data-input value="${esc(value)}" />
          </div>
          <div class="ad-confirm__actions">
            <button class="ad-btn ad-btn--ghost" data-cancel type="button">Cancelar</button>
            <button class="ad-btn ad-btn--primary" data-ok type="button">${esc(confirmLabel)}</button>
          </div>
        </div>`;
      const input = overlay.querySelector("[data-input]");
      const close = (val) => { overlay.remove(); document.removeEventListener("keydown", onKey); resolve(val); };
      const submit = () => { const v = input.value.trim(); close(v || null); };
      const onKey = (e) => {
        if (e.key === "Escape") close(null);
        if (e.key === "Enter") { e.preventDefault(); submit(); }
      };
      overlay.addEventListener("click", (e) => { if (e.target === overlay) close(null); });
      overlay.querySelector("[data-cancel]").addEventListener("click", () => close(null));
      overlay.querySelector("[data-ok]").addEventListener("click", submit);
      document.addEventListener("keydown", onKey);
      host.appendChild(overlay);
      input.focus();
      input.select();
    });
  }

  /* ----------------------------- boot / auth ----------------------------- */
  function setGate(msg) {
    const el = $("#adminGateMessage");
    if (el) el.textContent = msg;
  }

  async function boot() {
    if (!window.javyAuth || !window.javyAuth.hasSupabase()) {
      setGate("Supabase no está disponible. Revisa la conexión y recarga.");
      return;
    }
    try {
      const { session, profile } = await window.javyAuth.requireAdminSession();
      if (!session || !profile) {
        window.location.href = "login.html";
        return;
      }
      state.userId = session.user.id;
      state.userEmail = session.user.email || null;
      setGate("Cargando catálogo…");
      await loadAll();
      buildChrome();
      $("#adminGate").hidden = true;
      $("#adminShell").hidden = false;
      go("dashboard");
    } catch (error) {
      console.error(error);
      // El gate puede estar oculto si ya mostramos el shell; mostrar el error
      // donde se vea (la vista) además del gate.
      setGate("No se pudo validar el acceso: " + (error.message || error));
      if (!$("#adminShell").hidden) showViewError(error, "el panel");
    }
  }

  async function loadAll() {
    const db = window.catalogDb;
    const [products, categories, combos, admins] = await Promise.all([
      db.getProductsWithFlavors({ audit: true, cache: false }).catch((e) => { console.warn(e); return []; }),
      db.getAllCategories().catch(() => { state.categoriesSupported = false; return []; }),
      db.getCombos({ audit: true }).catch(() => { state.combosSupported = false; return []; }),
      db.getAdminProfiles().catch(() => []),
    ]);
    state.products = products || [];
    state.categories = categories || [];
    state.combos = combos || [];
    state.admins = admins || [];
  }

  async function reloadProducts() {
    state.products = await window.catalogDb.getProductsWithFlavors({ audit: true, cache: false }).catch(() => state.products);
  }

  /* ----------------------------- chrome (nav) ----------------------------- */
  function buildChrome() {
    const nav = $("#adminNav");
    const primary = NAV.filter((n) => n.primary);
    const secondary = NAV.filter((n) => !n.primary);

    nav.innerHTML =
      `<span class="ad-nav__group-label">Operación</span>` +
      primary.map(navItem).join("") +
      `<span class="ad-nav__group-label">Configuración</span>` +
      secondary.map(navItem).join("");

    // tab-bar móvil: 4 primarias + "Más"
    $("#adminTabbar").innerHTML =
      primary.map((n) => `
        <button class="ad-tab" type="button" data-go="${n.key}">
          ${ico(n.icon)}${esc(n.label)}
        </button>`).join("") +
      `<button class="ad-tab" type="button" data-sheet-open>${ico("menu")}Más</button>`;

    // sheet "Más"
    $("#adminSheetGrid").innerHTML =
      secondary.map(navItem).join("") +
      `<button class="ad-logout" type="button" data-logout style="grid-column:1 / -1;margin-top:4px">${ico("log-out")}Cerrar sesión</button>`;

    // listeners
    if (window.javyIcons) window.javyIcons.enhance(document);

    document.addEventListener("click", (e) => {
      const goBtn = e.target.closest("[data-go]");
      if (goBtn) { go(goBtn.getAttribute("data-go")); closeSheet(); return; }
      if (e.target.closest("[data-sheet-open]")) { openSheet(); return; }
      if (e.target.closest("[data-close-sheet]")) { closeSheet(); return; }
      if (e.target.closest("[data-logout]") || e.target.closest("#adminLogoutBtn")) { logout(); return; }
    });

    const search = $("#adminSearch");
    search.addEventListener("input", () => {
      state.search = search.value.trim().toLowerCase();
      if (state.active !== "products") go("products");
      else renderProducts();
    });
    $("#adminAddBtn").addEventListener("click", () => openProductDrawer(null));
  }

  function navItem(n) {
    return `<button class="ad-nav__item${state.active === n.key ? " is-active" : ""}" type="button" data-go="${n.key}">
      ${ico(n.icon)}<span class="ad-nav__text">${esc(n.label)}</span>
    </button>`;
  }

  function openSheet() { $("#adminSheet").classList.add("is-open"); }
  function closeSheet() { $("#adminSheet").classList.remove("is-open"); }

  async function logout() {
    try { await window.supabaseClient.auth.signOut(); } catch (_) {}
    window.location.href = "login.html";
  }

  /* ----------------------------- router ----------------------------- */
  function go(key) {
    const nav = NAV.find((n) => n.key === key) || NAV[0];
    state.active = nav.key;
    $("#adminTitle").textContent = nav.label;
    $("#adminSubtitle").textContent = nav.subtitle;
    $$(".ad-nav__item, .ad-tab").forEach((b) => {
      b.classList.toggle("is-active", b.getAttribute("data-go") === nav.key);
    });
    const renderers = {
      dashboard: renderDashboard, products: renderProducts, variants: renderVariants,
      home: renderHome, categories: renderCategories, combos: renderCombos,
      access: renderAccess, settings: renderSettings,
    };
    try {
      (renderers[nav.key] || renderDashboard)();
    } catch (error) {
      console.error("Error al renderizar la sección", nav.key, error);
      showViewError(error, nav.label);
    }
  }

  // Pinta un error legible dentro de #adminView (en vez de dejar la vista en blanco).
  function showViewError(error, where = "") {
    const view = $("#adminView");
    if (!view) return;
    view.innerHTML = `<div class="ad-section"><div class="ad-error">
      <h3>${ico("x")} No se pudo mostrar ${esc(where || "esta sección")}</h3>
      <p>${esc(error && error.message ? error.message : error)}</p>
      ${error && error.stack ? `<pre>${esc(error.stack)}</pre>` : ""}
      <button class="ad-btn ad-btn--ghost ad-btn--sm" type="button" onclick="location.reload()">Recargar</button>
    </div></div>`;
    if (window.javyIcons) window.javyIcons.enhance(view);
  }

  function setView(html) {
    const view = $("#adminView");
    view.innerHTML = `<div class="ad-section">${html}</div>`;
    wireImageFallbacks(view);
    if (window.javyIcons) window.javyIcons.enhance(view);
    return view;
  }

  const imgTag = (src, cls = "") =>
    `<img ${cls ? `class="${cls}" ` : ""}src="${esc(src || PLACEHOLDER)}" alt="" data-fallback loading="lazy" />`;

  /* ============================ DASHBOARD ============================ */
  function renderDashboard() {
    const p = state.products;
    const activeCount = p.filter(isAvailable).length;
    const homeList = p.filter((x) => x.show_on_home);
    const offers = p.filter(hasOffer);
    const out = p.filter((x) => !isAvailable(x));
    const stale = out.filter((x) => daysSince(x.updated_at) >= STALE_DAYS);

    const stats = [
      { key: "products", label: "Productos activos", value: activeCount, tone: "ok", icon: "layout-dashboard",
        delta: `${p.length} en total`, dir: "flat" },
      { key: "home", label: "En el inicio", value: homeList.length, tone: "blue", icon: "home",
        delta: `${homeList.length} / ${HOME_MAX}`, dir: homeList.length >= HOME_MIN ? "flat" : "down" },
      { key: "offers", label: "Ofertas activas", value: offers.length, tone: "blue", icon: "tags",
        delta: "con descuento", dir: "up" },
      { key: "out", label: "Agotados", value: out.length, tone: "bad", icon: "package",
        delta: out.length ? "requieren acción" : "todo disponible", dir: out.length ? "down" : "flat" },
    ];

    const statCard = (s) => {
      const dirIcon = s.dir === "up" ? "arrow-up" : s.dir === "down" ? "arrow-down" : "clock";
      return `<button class="ad-stat ad-stat--${s.tone} ad-stat--link" type="button" data-stat="${s.key}">
        <div class="ad-stat__top"><span class="ad-stat__label">${esc(s.label)}</span><span class="ad-stat__icon">${ico(s.icon)}</span></div>
        <div class="ad-stat__value">${s.value}</div>
        <span class="ad-stat__delta ad-delta--${s.dir}">${ico(dirIcon)}${esc(s.delta)}</span>
      </button>`;
    };

    const opsAgotados = out.slice().sort((a, b) => daysSince(b.updated_at) - daysSince(a.updated_at)).slice(0, 4);
    const opsOfertas = offers.slice(0, 4);
    const attention = out.length;

    const opsItem = (p2, right) => `
      <div class="ad-ops__item ad-ops__item--link" data-edit="${esc(p2.id)}">
        ${imgTag(p2.image)}
        <div class="ad-ops__info"><strong>${esc(p2.name)}</strong><small>${esc(p2.brand || p2.category || "—")} · ${esc(agoLabel(p2.updated_at))}</small></div>
        ${right}
      </div>`;

    const opsList = (arr, right, empty) =>
      arr.length ? arr.map((x) => opsItem(x, right(x))).join("") : `<p class="ad-ops__empty">${esc(empty)}</p>`;

    const recent = p.slice().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 6);

    setView(`
      <div class="ad-stats">${stats.map(statCard).join("")}</div>

      <div class="ad-panel">
        <div class="ad-ops__header">
          <h2>Centro de operaciones</h2>
          <span class="ad-ops__attention">${ico("package")}${attention} requieren acción</span>
        </div>
        <div class="ad-ops">
          <div class="ad-ops__panel ad-ops__panel--alert">
            <div class="ad-ops__panel-head"><h3>Agotados</h3><span class="ad-ops__count">${out.length}</span></div>
            <div class="ad-ops__list">${opsList(opsAgotados, () => `<button class="ad-btn ad-btn--ghost ad-btn--sm" type="button">Reactivar</button>`, "Nada agotado 🎉")}</div>
          </div>
          <div class="ad-ops__panel">
            <div class="ad-ops__panel-head"><h3>Ofertas activas</h3><span class="ad-ops__count">${offers.length}</span></div>
            <div class="ad-ops__list">${opsList(opsOfertas, (x) => `<span class="ad-ops__discount">-${discountPct(x)}%</span>`, "Sin ofertas activas.")}</div>
          </div>
          <div class="ad-ops__panel">
            <div class="ad-ops__panel-head"><h3>Agotado hace mucho</h3><span class="ad-ops__count">${stale.length}</span></div>
            <div class="ad-ops__list">${opsList(stale.slice(0, 4), () => `<button class="ad-btn ad-btn--ghost ad-btn--sm" type="button">Revisar</button>`, "Nada pendiente.")}</div>
          </div>
        </div>
      </div>

      <div class="ad-panel">
        <div class="ad-panel__head"><div><p class="ad-kicker">Catálogo</p><h2>Últimos agregados</h2></div></div>
        <div class="ad-recent">
          ${recent.map((p2) => `
            <div class="ad-recent__row">
              ${imgTag(p2.image)}
              <div class="ad-recent__info"><strong>${esc(p2.name)}</strong><small>${esc(p2.brand || "")}${p2.category ? " · " + esc(p2.category) : ""}</small></div>
              <span class="ad-price">${esc(peso(p2.price))}</span>
              <button class="ad-icon-btn" type="button" title="Editar" data-edit="${esc(p2.id)}">${ico("pencil")}</button>
            </div>`).join("") || `<p class="ad-ops__empty">Aún no hay productos.</p>`}
        </div>
      </div>
    `);

    const view = $("#adminView");
    view.querySelectorAll("[data-stat]").forEach((b) => b.addEventListener("click", () => {
      const k = b.getAttribute("data-stat");
      if (k === "home") return go("home");
      if (k === "offers") { state.productFilter = "offers"; return go("products"); }
      if (k === "out") { state.productFilter = "out"; return go("products"); }
      state.productFilter = "all"; go("products");
    }));
    bindEditClicks(view);
  }

  function bindEditClicks(root) {
    root.querySelectorAll("[data-edit]").forEach((el) => {
      const id = el.getAttribute("data-edit");
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const product = state.products.find((p) => String(p.id) === String(id));
        if (product) openProductDrawer(product);
      });
    });
  }

  /* ============================ PRODUCTS ============================ */
  function filteredProducts() {
    const f = state.productFilter;
    const q = state.search;
    return state.products.filter((p) => {
      const byFilter =
        f === "home" ? p.show_on_home :
        f === "offers" ? hasOffer(p) :
        f === "out" ? !isAvailable(p) : true;
      const byQ = !q || (`${p.name} ${p.brand || ""} ${p.category || ""}`).toLowerCase().includes(q);
      return byFilter && byQ;
    });
  }

  function renderProducts() {
    const filters = [["all", "Todos"], ["home", "En inicio"], ["offers", "En oferta"], ["out", "Agotados"]];
    const list = filteredProducts();

    const pill = (p) => { const [tone, label] = stockTone(p); return `<span class="ad-pill ad-pill--${tone}">${label}</span>`; };
    const priceCell = (p) => `<span class="ad-price">${hasOffer(p) ? `<s>${esc(peso(p.old_price))}</s>` : ""}${esc(peso(p.price))}</span>`;

    const rows = list.map((p) => `
      <tr>
        <td><div class="ad-cell-prod">${imgTag(p.image)}<div><strong>${esc(p.name)}</strong><small>${esc(p.brand || "—")}</small></div></div></td>
        <td><small style="color:var(--pb-muted)">${esc(p.category || "—")}</small></td>
        <td>${priceCell(p)}</td>
        <td><small style="color:var(--pb-muted)">${p.flavors.length} ${p.flavors.length === 1 ? "sabor" : "sabores"}</small></td>
        <td><div style="display:flex;gap:6px;flex-wrap:wrap">${pill(p)}${p.show_on_home ? `<span class="ad-pill ad-pill--home">Inicio</span>` : ""}</div></td>
        <td><div class="ad-row-actions">
          <button class="ad-icon-btn" type="button" title="Editar" data-edit="${esc(p.id)}">${ico("pencil")}</button>
          <button class="ad-icon-btn" type="button" title="Duplicar" data-dup="${esc(p.id)}">${ico("plus")}</button>
          <button class="ad-icon-btn ad-icon-btn--danger" type="button" title="Eliminar" data-del="${esc(p.id)}">${ico("trash")}</button>
        </div></td>
      </tr>`).join("");

    const cards = list.map((p) => `
      <div class="ad-prod-card">
        ${imgTag(p.image)}
        <div>
          <h3>${esc(p.name)}</h3>
          <p class="ad-meta">${esc(p.brand || "")}${p.category ? " · " + esc(p.category) : ""}</p>
          <div class="ad-card-tags">${pill(p)}${p.show_on_home ? `<span class="ad-pill ad-pill--home">Inicio</span>` : ""}<span class="ad-price" style="margin-left:auto">${hasOffer(p) ? `<s>${esc(peso(p.old_price))}</s>` : ""}${esc(peso(p.price))}</span></div>
        </div>
        <div class="ad-card-actions">
          <button class="ad-btn ad-btn--ghost ad-btn--sm" type="button" data-edit="${esc(p.id)}">Editar</button>
          <button class="ad-icon-btn" type="button" title="Duplicar" data-dup="${esc(p.id)}">${ico("plus")}</button>
          <button class="ad-icon-btn ad-icon-btn--danger" type="button" title="Eliminar" data-del="${esc(p.id)}">${ico("trash")}</button>
        </div>
      </div>`).join("");

    const body = list.length === 0
      ? `<div class="ad-empty"><span class="ad-empty__icon">${ico("search")}</span><h3>Sin resultados</h3><p>No hay productos que coincidan con el filtro o la búsqueda.</p></div>`
      : `<div class="ad-table-wrap"><table class="ad-table">
          <thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Sabores</th><th>Estado</th><th></th></tr></thead>
          <tbody>${rows}</tbody></table></div>
         <div class="ad-prod-cards">${cards}</div>`;

    setView(`
      <div class="ad-panel">
        <div class="ad-toolbar">
          <div class="ad-toolbar__filters">
            ${filters.map(([k, label]) => `<button class="ad-chip${state.productFilter === k ? " is-active" : ""}" type="button" data-filter="${k}">${esc(label)}</button>`).join("")}
          </div>
          <span class="ad-result-count">${list.length} ${list.length === 1 ? "producto" : "productos"}</span>
        </div>
        ${body}
      </div>`);

    const view = $("#adminView");
    view.querySelectorAll("[data-filter]").forEach((b) => b.addEventListener("click", () => {
      state.productFilter = b.getAttribute("data-filter");
      renderProducts();
    }));
    view.querySelectorAll("[data-dup]").forEach((b) => b.addEventListener("click", () => duplicateProduct(b.getAttribute("data-dup"))));
    view.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => deleteProductFlow(b.getAttribute("data-del"))));
    bindEditClicks(view);
  }

  async function duplicateProduct(id) {
    const p = state.products.find((x) => String(x.id) === String(id));
    if (!p) return;
    openProductDrawer({ ...p, id: null, name: `${p.name} (copia)`, show_on_home: false, home_order: null, flavors: p.flavors.map((f) => ({ name: f.name, available: f.available })), updated_at: null }, { duplicateOf: p.name });
  }

  async function deleteProductFlow(id) {
    const p = state.products.find((x) => String(x.id) === String(id));
    if (!p) return;
    const ok = await confirmModal({ title: "Eliminar producto", body: `Se eliminará “${p.name}” de forma permanente. Esta acción no se puede deshacer.`, confirmLabel: "Eliminar", danger: true });
    if (!ok) return;
    try {
      await window.catalogDb.deleteProduct(p.id);
      await reloadProducts();
      toast({ tone: "err", msg: "Producto eliminado", sub: p.name });
      renderProducts();
    } catch (e) { toast({ tone: "err", msg: "No se pudo eliminar", sub: e.message }); }
  }

  /* ============================ VARIANTS ============================ */
  function renderVariants() {
    const rows = state.products.map((p) => `
      <div class="ad-row" style="grid-template-columns:46px minmax(0,1fr);align-items:start" data-prod="${esc(p.id)}">
        ${imgTag(p.image, "ad-row__img")}
        <div class="ad-row__main" style="display:grid;gap:8px">
          <strong>${esc(p.name)}</strong>
          <div class="ad-chips-input" data-chips>
            ${p.flavors.map((f) => chipTag(f.name)).join("")}
            <input type="text" placeholder="Agregar sabor" aria-label="Agregar sabor a ${esc(p.name)}" />
          </div>
        </div>
      </div>`).join("");

    setView(`
      <div class="ad-section-intro">
        <div><p class="ad-kicker">Variantes</p><p>Agregá o quitá sabores de cada producto. Enter para confirmar cada uno; los cambios se guardan al instante.</p></div>
      </div>
      <div class="ad-panel">${rows || `<p class="ad-ops__empty">No hay productos.</p>`}</div>`);

    $$("[data-prod]", $("#adminView")).forEach((row) => {
      const productId = row.getAttribute("data-prod");
      bindChips(row.querySelector("[data-chips]"), {
        onAdd: (name) => syncFlavorAdd(productId, name),
        onRemove: (name) => syncFlavorRemove(productId, name),
      });
    });
  }

  function chipTag(name) {
    return `<span class="ad-chip-tag">${esc(name)}<button type="button" aria-label="Quitar ${esc(name)}" data-chip-remove>${ico("x")}</button></span>`;
  }

  // Reusable chips input behaviour. onAdd/onRemove receive the flavor name.
  function bindChips(container, { onAdd, onRemove }) {
    if (!container) return;
    const input = container.querySelector("input");
    const addFromInput = () => {
      const v = input.value.trim();
      input.value = "";
      if (!v) return;
      const existing = $$(".ad-chip-tag", container).map((c) => c.textContent.trim().toLowerCase());
      if (existing.includes(v.toLowerCase())) return;
      const chip = document.createElement("span");
      chip.className = "ad-chip-tag";
      chip.innerHTML = `${esc(v)}<button type="button" aria-label="Quitar ${esc(v)}" data-chip-remove>${ico("x")}</button>`;
      container.insertBefore(chip, input);
      if (window.javyIcons) window.javyIcons.enhance(chip);
      if (onAdd) onAdd(v);
    };
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addFromInput(); } });
    input.addEventListener("blur", addFromInput);
    container.addEventListener("click", (e) => {
      const rm = e.target.closest("[data-chip-remove]");
      if (!rm) return;
      const chip = rm.closest(".ad-chip-tag");
      const name = chip.textContent.trim();
      chip.remove();
      if (onRemove) onRemove(name);
    });
  }

  async function syncFlavorAdd(productId, name) {
    try {
      const created = await window.catalogDb.createFlavor(productId, { name, available: true });
      const p = state.products.find((x) => String(x.id) === String(productId));
      if (p) p.flavors.push({ id: created.id, name: created.name, available: created.available !== false });
      toast({ tone: "ok", msg: "Sabor agregado", sub: name });
    } catch (e) { toast({ tone: "err", msg: "No se pudo agregar el sabor", sub: e.message }); }
  }
  async function syncFlavorRemove(productId, name) {
    const p = state.products.find((x) => String(x.id) === String(productId));
    if (!p) return;
    const flavor = p.flavors.find((f) => f.name.toLowerCase() === name.toLowerCase());
    if (!flavor || !flavor.id) { if (p) p.flavors = p.flavors.filter((f) => f !== flavor); return; }
    try {
      await window.catalogDb.deleteFlavor(flavor.id);
      p.flavors = p.flavors.filter((f) => f.id !== flavor.id);
      toast({ tone: "info", msg: "Sabor quitado", sub: name });
    } catch (e) { toast({ tone: "err", msg: "No se pudo quitar el sabor", sub: e.message }); }
  }

  /* ============================ HOME (curación) ============================ */
  function renderHome() {
    let ids = state.products
      .filter((p) => p.show_on_home)
      .sort((a, b) => (a.home_order ?? 999) - (b.home_order ?? 999))
      .map((p) => p.id);

    const draw = () => {
      const items = ids.map((id) => state.products.find((p) => p.id === id)).filter(Boolean);
      const full = ids.length >= HOME_MAX;
      const emptySlots = Math.max(0, HOME_MIN - ids.length);
      const poolOptions = state.products
        .filter((p) => !ids.includes(p.id))
        .map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("");

      setView(`
        <div class="ad-section-intro">
          <div><p class="ad-kicker">Home</p><p>Curá los productos destacados que aparecen en la página principal. Ordená con las flechas. Entre ${HOME_MIN} y ${HOME_MAX} productos.</p></div>
          <span class="ad-counter${full ? " ad-counter--full" : ""}"><strong>${ids.length}</strong> / ${HOME_MAX} en el inicio</span>
        </div>
        <div class="ad-panel">
          <div class="ad-slots">
            ${items.map((p, i) => `
              <div class="ad-slot">
                <span class="ad-slot__order">${i + 1}</span>
                ${imgTag(p.image, "ad-slot__img")}
                <div class="ad-slot__main"><strong>${esc(p.name)}</strong><small>${esc(p.brand || "")} · ${esc(peso(p.price))}</small></div>
                <div class="ad-row__actions">
                  <button class="ad-icon-btn" type="button" title="Subir" data-move="${i}|-1" ${i === 0 ? "disabled" : ""}>${ico("arrow-up")}</button>
                  <button class="ad-icon-btn" type="button" title="Bajar" data-move="${i}|1" ${i === items.length - 1 ? "disabled" : ""}>${ico("arrow-down")}</button>
                  <button class="ad-icon-btn" type="button" title="Editar" data-edit="${esc(p.id)}">${ico("pencil")}</button>
                  <button class="ad-icon-btn ad-icon-btn--danger" type="button" title="Quitar del inicio" data-remove="${esc(p.id)}">${ico("x")}</button>
                </div>
              </div>`).join("")}
            ${Array.from({ length: emptySlots }).map((_, i) => `
              <div class="ad-slot ad-slot--empty"><span class="ad-slot__order">${ids.length + i + 1}</span><span>Espacio libre — agregá un producto destacado</span></div>`).join("")}
          </div>
          <div class="ad-field" style="margin-top:14px;max-width:420px">
            <label class="ad-field__label">Agregar producto al inicio</label>
            <div style="display:flex;gap:8px">
              <select class="ad-select" data-pool ${full ? "disabled" : ""}><option value="">Elegir…</option>${poolOptions}</select>
            </div>
            ${full ? `<span class="ad-field__help">Cupo lleno (${HOME_MAX}). Quitá uno para agregar otro.</span>` : ""}
          </div>
          <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">
            <button class="ad-btn ad-btn--primary" type="button" data-save-home>${ico("save")}Guardar inicio</button>
            <span class="ad-field__help" style="align-self:center">${ids.length < HOME_MIN ? `Necesitás al menos ${HOME_MIN} productos para guardar.` : "Listo para guardar."}</span>
          </div>
        </div>`);

      const view = $("#adminView");
      view.querySelectorAll("[data-move]").forEach((b) => b.addEventListener("click", () => {
        const [i, dir] = b.getAttribute("data-move").split("|").map(Number);
        const j = i + dir;
        if (j < 0 || j >= ids.length) return;
        [ids[i], ids[j]] = [ids[j], ids[i]];
        draw();
      }));
      view.querySelectorAll("[data-remove]").forEach((b) => b.addEventListener("click", () => {
        ids = ids.filter((id) => String(id) !== String(b.getAttribute("data-remove")));
        draw();
      }));
      const pool = view.querySelector("[data-pool]");
      if (pool) pool.addEventListener("change", () => {
        if (pool.value && ids.length < HOME_MAX) { ids.push(pool.value); draw(); }
      });
      view.querySelector("[data-save-home]").addEventListener("click", () => saveHome(ids));
      bindEditClicks(view);
    };

    draw();
  }

  async function saveHome(ids) {
    if (ids.length < HOME_MIN) { toast({ tone: "err", msg: `Elegí al menos ${HOME_MIN} productos.` }); return; }
    if (ids.length > HOME_MAX) { toast({ tone: "err", msg: `Máximo ${HOME_MAX} productos.` }); return; }
    try {
      await window.catalogDb.updateHomeProducts(ids);
      await reloadProducts();
      toast({ tone: "ok", msg: "Inicio actualizado", sub: `${ids.length} productos destacados` });
      renderHome();
    } catch (e) { toast({ tone: "err", msg: "No se pudo guardar el inicio", sub: e.message }); }
  }

  /* ============================ CATEGORIES ============================ */
  function renderCategories() {
    if (!state.categoriesSupported) {
      setView(emptyFeature("Categorías no disponibles", "Aplicá la migración de categorías (Familia → Tipo) en Supabase para gestionarlas aquí."));
      return;
    }
    const fams = families();
    const productCountFor = (cat) => {
      const childIds = typesOf(cat.id).map((t) => t.id);
      const ids = [cat.id, ...childIds];
      return state.products.filter((p) => ids.includes(p.category_id)).length;
    };

    const cards = fams.map((c, i) => `
      <div class="ad-cat${c.is_active === false ? " is-hidden" : ""}" data-cat="${esc(c.id)}">
        <div class="ad-cat__head">
          <div class="ad-cat__title"><strong>${esc(c.name)}</strong><small>${productCountFor(c)} productos</small></div>
          <div class="ad-row__actions">
            <button class="ad-icon-btn" type="button" title="Subir" data-cat-move="${i}|-1" ${i === 0 ? "disabled" : ""}>${ico("arrow-up")}</button>
            <button class="ad-icon-btn" type="button" title="Bajar" data-cat-move="${i}|1" ${i === fams.length - 1 ? "disabled" : ""}>${ico("arrow-down")}</button>
            <button class="ad-icon-btn" type="button" title="Renombrar" data-cat-rename="${esc(c.id)}">${ico("pencil")}</button>
            <button class="ad-icon-btn" type="button" title="${c.is_active === false ? "Mostrar" : "Ocultar"}" data-cat-hide="${esc(c.id)}">${ico("power")}</button>
            <button class="ad-icon-btn ad-icon-btn--danger" type="button" title="Eliminar familia" data-cat-del="${esc(c.id)}">${ico("trash")}</button>
          </div>
        </div>
        <div class="ad-cat__types">
          ${typesOf(c.id).map((t) => `<span class="ad-type-chip">${esc(t.name)}<button type="button" aria-label="Eliminar tipo ${esc(t.name)}" data-type-del="${esc(t.id)}">${ico("x")}</button></span>`).join("")}
          <button class="ad-type-chip ad-type-chip--add" type="button" data-type-add="${esc(c.id)}">${ico("plus")}Tipo</button>
        </div>
      </div>`).join("");

    setView(`
      <div class="ad-section-intro">
        <div><p class="ad-kicker">Catálogo</p><p>Familias del catálogo y sus tipos. Reordená con las flechas u ocultá una familia sin borrar sus productos.</p></div>
        <button class="ad-btn ad-btn--primary" type="button" data-fam-add>${ico("plus")}Nueva familia</button>
      </div>
      <div class="ad-panel">${cards || `<p class="ad-ops__empty">Todavía no hay familias. Creá la primera.</p>`}</div>`);

    const view = $("#adminView");
    view.querySelector("[data-fam-add]").addEventListener("click", addFamily);
    view.querySelectorAll("[data-cat-move]").forEach((b) => b.addEventListener("click", () => moveFamily(b.getAttribute("data-cat-move"))));
    view.querySelectorAll("[data-cat-rename]").forEach((b) => b.addEventListener("click", () => renameCategory(b.getAttribute("data-cat-rename"))));
    view.querySelectorAll("[data-cat-hide]").forEach((b) => b.addEventListener("click", () => toggleCategoryHidden(b.getAttribute("data-cat-hide"))));
    view.querySelectorAll("[data-cat-del]").forEach((b) => b.addEventListener("click", () => deleteFamily(b.getAttribute("data-cat-del"))));
    view.querySelectorAll("[data-type-add]").forEach((b) => b.addEventListener("click", () => addType(b.getAttribute("data-type-add"))));
    view.querySelectorAll("[data-type-del]").forEach((b) => b.addEventListener("click", () => deleteType(b.getAttribute("data-type-del"))));
  }

  async function addFamily() {
    const name = await promptModal({ title: "Nueva familia", label: "Nombre de la familia (ej. Proteínas)" });
    if (!name) return;
    try {
      const created = await window.catalogDb.createCategory({ name, parentId: null, sortOrder: families().length + 1 });
      state.categories.push(created);
      toast({ tone: "ok", msg: "Familia creada", sub: name });
      renderCategories();
    } catch (e) { toast({ tone: "err", msg: "No se pudo crear", sub: e.message }); }
  }
  async function addType(famId) {
    const name = await promptModal({ title: "Nuevo tipo", label: "Nombre del tipo (ej. Whey)" });
    if (!name) return;
    try {
      const created = await window.catalogDb.createCategory({ name, parentId: famId, sortOrder: typesOf(famId).length + 1 });
      state.categories.push(created);
      toast({ tone: "ok", msg: "Tipo creado", sub: name });
      renderCategories();
    } catch (e) { toast({ tone: "err", msg: "No se pudo crear", sub: e.message }); }
  }
  async function renameCategory(id) {
    const cat = catById(id);
    if (!cat) return;
    const name = await promptModal({ title: "Renombrar", label: "Nuevo nombre", value: cat.name });
    if (!name || name === cat.name) return;
    try {
      const updated = await window.catalogDb.updateCategory(id, { name });
      Object.assign(cat, updated);
      toast({ tone: "ok", msg: "Categoría renombrada", sub: name });
      renderCategories();
    } catch (e) { toast({ tone: "err", msg: "No se pudo renombrar", sub: e.message }); }
  }
  async function toggleCategoryHidden(id) {
    const cat = catById(id);
    if (!cat) return;
    try {
      const updated = await window.catalogDb.updateCategory(id, { is_active: cat.is_active === false });
      Object.assign(cat, updated);
      renderCategories();
    } catch (e) { toast({ tone: "err", msg: "No se pudo actualizar", sub: e.message }); }
  }
  async function moveFamily(spec) {
    const [i, dir] = spec.split("|").map(Number);
    const fams = families();
    const j = i + dir;
    if (j < 0 || j >= fams.length) return;
    const a = fams[i], b = fams[j];
    try {
      const ao = a.sort_order ?? (i + 1), bo = b.sort_order ?? (j + 1);
      const [ua, ub] = await Promise.all([
        window.catalogDb.updateCategory(a.id, { sort_order: bo }),
        window.catalogDb.updateCategory(b.id, { sort_order: ao }),
      ]);
      Object.assign(a, ua); Object.assign(b, ub);
      renderCategories();
    } catch (e) { toast({ tone: "err", msg: "No se pudo reordenar", sub: e.message }); }
  }
  async function deleteFamily(id) {
    const cat = catById(id);
    if (!cat) return;
    const childIds = typesOf(id).map((t) => t.id);
    let count = 0;
    try { count = await window.catalogDb.getCategoryProductCount(id, childIds); } catch (_) {}
    if (count > 0) {
      await confirmModal({ title: "No se puede eliminar", body: `“${cat.name}” tiene ${count} producto(s) asignado(s). Reasignalos a otra categoría antes de eliminarla.`, confirmLabel: "Entendido" });
      return;
    }
    const ok = await confirmModal({ title: "Eliminar familia", body: `Se eliminará “${cat.name}” y sus tipos. Esta acción no se puede deshacer.`, confirmLabel: "Eliminar", danger: true });
    if (!ok) return;
    try {
      for (const t of childIds) await window.catalogDb.deleteCategory(t);
      await window.catalogDb.deleteCategory(id);
      state.categories = state.categories.filter((c) => c.id !== id && !childIds.includes(c.id));
      toast({ tone: "err", msg: "Familia eliminada", sub: cat.name });
      renderCategories();
    } catch (e) { toast({ tone: "err", msg: "No se pudo eliminar", sub: e.message }); }
  }
  async function deleteType(id) {
    const cat = catById(id);
    if (!cat) return;
    let count = 0;
    try { count = await window.catalogDb.getCategoryProductCount(id, []); } catch (_) {}
    if (count > 0) {
      await confirmModal({ title: "No se puede eliminar", body: `El tipo “${cat.name}” tiene ${count} producto(s). Reasignalos primero.`, confirmLabel: "Entendido" });
      return;
    }
    const ok = await confirmModal({ title: "Eliminar tipo", body: `Se eliminará el tipo “${cat.name}”.`, confirmLabel: "Eliminar", danger: true });
    if (!ok) return;
    try {
      await window.catalogDb.deleteCategory(id);
      state.categories = state.categories.filter((c) => c.id !== id);
      renderCategories();
    } catch (e) { toast({ tone: "err", msg: "No se pudo eliminar", sub: e.message }); }
  }

  /* ============================ COMBOS ============================ */
  function renderCombos() {
    if (!state.combosSupported) {
      setView(emptyFeature("Combos no disponibles", "Aplicá la migración de combos en Supabase para crear y gestionar paquetes."));
      return;
    }
    const listPriceOf = (c) => c.items.reduce((s, it) => {
      const p = state.products.find((x) => String(x.id) === String(it.product_id));
      return s + (p ? Number(p.price || 0) : 0) * (it.quantity || 1);
    }, 0);

    const cards = state.combos.map((c) => {
      const listPrice = listPriceOf(c);
      const save = Math.max(0, listPrice - Number(c.price || 0));
      return `
      <div class="ad-combo-card${c.is_active ? "" : " is-inactive"}" data-combo="${esc(c.id)}">
        <div class="ad-combo-card__head">
          <h3>${esc(c.name)}</h3>
          ${switchMarkup(c.is_active, "data-combo-active='" + esc(c.id) + "'")}
        </div>
        <div class="ad-combo-items">
          ${c.items.map((it) => `
            <div class="ad-combo-item">${imgTag(it.product_image)}<div><strong>${esc(it.product_name)}</strong>${it.flavor_name ? `<small>${esc(it.flavor_name)}</small>` : ""}</div><span class="ad-combo-item__qty">×${it.quantity || 1}</span></div>`).join("") || `<small style="color:var(--pb-muted)">Sin productos todavía</small>`}
        </div>
        <div class="ad-combo-card__price">
          <span class="ad-price">${esc(peso(c.price))}</span>
          ${listPrice > 0 ? `<s>${esc(peso(listPrice))}</s>` : ""}
          ${save > 0 ? `<span class="ad-pill ad-pill--ok ad-combo-card__save">Ahorro ${esc(peso(save))}</span>` : ""}
        </div>
        <div style="display:flex;gap:8px">
          <button class="ad-btn ad-btn--ghost ad-btn--sm ad-btn--block" type="button" data-combo-edit="${esc(c.id)}">${ico("pencil")}Editar</button>
          <button class="ad-icon-btn ad-icon-btn--danger" type="button" title="Eliminar" data-combo-del="${esc(c.id)}">${ico("trash")}</button>
        </div>
      </div>`;
    }).join("");

    setView(`
      <div class="ad-section-intro">
        <div><p class="ad-kicker">Paquetes</p><p>Combos de productos a precio especial. Cada combo muestra el ahorro frente al precio de lista.</p></div>
        <button class="ad-btn ad-btn--primary" type="button" data-combo-new>${ico("plus")}Crear combo</button>
      </div>
      ${state.combos.length ? `<div class="ad-combos-grid">${cards}</div>` : `<div class="ad-panel"><p class="ad-ops__empty">Aún no hay combos. Creá el primero.</p></div>`}`);

    const view = $("#adminView");
    view.querySelector("[data-combo-new]").addEventListener("click", () => openComboDrawer(null));
    view.querySelectorAll("[data-combo-edit]").forEach((b) => b.addEventListener("click", () => {
      const combo = state.combos.find((c) => String(c.id) === String(b.getAttribute("data-combo-edit")));
      if (combo) openComboDrawer(combo);
    }));
    view.querySelectorAll("[data-combo-del]").forEach((b) => b.addEventListener("click", () => deleteComboFlow(b.getAttribute("data-combo-del"))));
    view.querySelectorAll("[data-combo-active]").forEach((input) => input.addEventListener("change", () => toggleCombo(input.getAttribute("data-combo-active"), input.checked)));
  }

  async function toggleCombo(id, active) {
    try {
      const updated = await window.catalogDb.setComboActive(id, active);
      const combo = state.combos.find((c) => String(c.id) === String(id));
      if (combo) Object.assign(combo, updated);
      renderCombos();
    } catch (e) { toast({ tone: "err", msg: "No se pudo actualizar el combo", sub: e.message }); }
  }
  async function deleteComboFlow(id) {
    const combo = state.combos.find((c) => String(c.id) === String(id));
    if (!combo) return;
    const ok = await confirmModal({ title: "Eliminar combo", body: `Se eliminará “${combo.name}”.`, confirmLabel: "Eliminar", danger: true });
    if (!ok) return;
    try {
      await window.catalogDb.deleteCombo(id);
      state.combos = state.combos.filter((c) => String(c.id) !== String(id));
      toast({ tone: "err", msg: "Combo eliminado", sub: combo.name });
      renderCombos();
    } catch (e) { toast({ tone: "err", msg: "No se pudo eliminar", sub: e.message }); }
  }

  /* ============================ ACCESS ============================ */
  function renderAccess() {
    const initials = (s) => (s || "?").split(/[@.\s]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
    const rows = state.admins.map((a) => {
      const isSelf = a.user_id === state.userId;
      const label = a.email || "(sin email)";
      return `
      <div class="ad-row" style="${a.is_active ? "" : "opacity:.6"}">
        <span class="ad-row__avatar">${esc(initials(a.email))}</span>
        <div class="ad-row__main">
          <strong>${esc(label)}${isSelf ? ` <span class="ad-pill ad-pill--home" style="margin-left:6px">Tú</span>` : ""}</strong>
          <small>${esc(a.role || "admin")} · ${a.is_active ? "activo" : "inactivo"}</small>
        </div>
        <div class="ad-row__actions">
          ${isSelf ? `<span class="ad-pill ad-pill--ok">Acceso total</span>` : switchMarkup(a.is_active, "data-admin-toggle='" + esc(a.id) + "'")}
        </div>
      </div>`;
    }).join("");

    setView(`
      <div class="ad-section-intro">
        <div><p class="ad-kicker">Equipo</p><p>Administradores con acceso al panel. Desactivá un acceso sin borrarlo. Crear un admin nuevo se hace en Supabase (Auth + admin_profiles).</p></div>
      </div>
      <div class="ad-panel">${rows || `<p class="ad-ops__empty">No hay administradores registrados.</p>`}</div>`);

    $$("[data-admin-toggle]", $("#adminView")).forEach((input) => input.addEventListener("change", () => toggleAdmin(input.getAttribute("data-admin-toggle"), input.checked)));
  }

  async function toggleAdmin(id, active) {
    try {
      const updated = await window.catalogDb.setAdminProfileActive(id, active);
      const a = state.admins.find((x) => String(x.id) === String(id));
      if (a) Object.assign(a, updated);
      toast({ tone: "ok", msg: active ? "Acceso activado" : "Acceso desactivado", sub: updated.email || "" });
    } catch (e) { toast({ tone: "err", msg: "No se pudo actualizar", sub: e.message }); renderAccess(); }
  }

  /* ============================ SETTINGS ============================ */
  function renderSettings() {
    const wa = (typeof JAVY_WHATSAPP_NUMBER !== "undefined" && JAVY_WHATSAPP_NUMBER) || "—";
    const cards = [
      { label: "Base de datos", value: "Operativa", tone: "ok", hint: "Productos, categorías y combos en Supabase" },
      { label: "WhatsApp cotizaciones", value: wa !== "—" ? "Conectado" : "Sin configurar", tone: wa !== "—" ? "ok" : "warn", hint: `Número: +${esc(wa)}` },
      { label: "Almacenamiento de imágenes", value: "Activo", tone: "ok", hint: "Bucket product-images" },
      { label: "Catálogo", value: `${state.products.length} productos`, tone: "ok", hint: `${state.combos.length} combos · ${families().length} familias` },
    ];
    setView(`
      <div class="ad-section-intro">
        <div><p class="ad-kicker">Sistema</p><p>Estado de los servicios que mantienen la tienda en línea. Solo informativo.</p></div>
      </div>
      <div class="ad-status-grid">
        ${cards.map((s) => `
          <div class="ad-status">
            <div class="ad-status__top"><span class="ad-status__dot ad-status__dot--${s.tone}"></span><span class="ad-status__label">${esc(s.label)}</span></div>
            <span class="ad-status__value">${s.value}</span>
            <span class="ad-status__hint">${s.hint}</span>
          </div>`).join("")}
      </div>`);
  }

  function emptyFeature(title, body) {
    return `<div class="ad-panel"><div class="ad-empty"><span class="ad-empty__icon">${ico("package")}</span><h3>${esc(title)}</h3><p>${esc(body)}</p></div></div>`;
  }

  function switchMarkup(checked, attrs = "") {
    return `<label class="ad-switch"><input type="checkbox" ${checked ? "checked" : ""} ${attrs} /><span class="ad-switch__track"></span></label>`;
  }

  /* ============================ PRODUCT DRAWER ============================ */
  function openProductDrawer(product, opts = {}) {
    const isNew = !product || !product.id;
    const data = {
      id: product ? product.id : null,
      name: product ? product.name || "" : "",
      brand: product ? product.brand || "" : "",
      category_id: product ? product.category_id || "" : "",
      presentation: product ? product.presentation || "" : "",
      price: product && product.price ? String(product.price) : "",
      old_price: product && product.old_price ? String(product.old_price) : "",
      image: product ? (product.stored_image_url || product.image || "") : "",
      description_short: product ? product.description_short || "" : "",
      description_long: product ? product.description_long || "" : "",
      flavors: product ? (product.flavors || []).map((f) => f.name) : [],
      tags: product ? [...(product.tags || [])] : [],
      goals: product ? [...(product.goals || [])] : [],
      available: product ? product.available !== false : true,
      featured: product ? !!product.featured : false,
      home: product ? !!product.show_on_home : false,
      home_order: product && product.home_order ? String(product.home_order) : "",
      updated_at: product ? product.updated_at : null,
    };
    // cascada: familia/tipo desde category_id
    let famId = "", typeId = "";
    if (data.category_id) {
      const cat = catById(data.category_id);
      if (cat) {
        if (cat.parent_id) { typeId = cat.id; famId = cat.parent_id; }
        else { famId = cat.id; }
      }
    }
    const draftImageFile = { file: null, cleared: false };
    let touched = false;

    const host = $("#adminDrawerHost");
    const overlay = document.createElement("div");
    overlay.className = "ad-drawer-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    host.appendChild(overlay);

    const metaLine = (!isNew && product.updated_by)
      ? `${esc(product.brand || "")} · última edición por ${esc(product.updated_by)}`
      : (isNew ? (opts.duplicateOf ? `Copia de ${esc(opts.duplicateOf)}` : "Completá los datos esenciales") : esc(product.brand || "Editar producto"));

    function familyOptions() {
      return `<option value="">Elegir…</option>` + families().map((f) => `<option value="${esc(f.id)}"${f.id === famId ? " selected" : ""}>${esc(f.name)}</option>`).join("");
    }
    function typeOptions() {
      const ts = famId ? typesOf(famId) : [];
      return `<option value="">${famId ? "Elegir…" : "—"}</option>` + ts.map((t) => `<option value="${esc(t.id)}"${t.id === typeId ? " selected" : ""}>${esc(t.name)}</option>`).join("");
    }

    overlay.innerHTML = `
      <div class="ad-drawer__scrim" data-close></div>
      <div class="ad-drawer">
        <div class="ad-drawer__head">
          <div><h2>${isNew ? "Nuevo producto" : "Editar producto"}</h2><p data-meta>${metaLine}</p></div>
          <button class="ad-drawer__close" type="button" aria-label="Cerrar" data-close>${ico("x")}</button>
        </div>
        <div class="ad-drawer__body">
          ${collapse("1", "Información esencial", true, `
            ${field("Nombre del producto", true, `<input class="ad-input" data-f="name" value="${esc(data.name)}" placeholder="Ej. Isomorph 28 Whey Isolate" />`, "name")}
            ${field("Marca", false, `<input class="ad-input" data-f="brand" value="${esc(data.brand)}" placeholder="Ej. APS Nutrition" />`)}
            <div class="ad-field-row">
              ${field("Familia", true, `<select class="ad-select" data-f="family">${familyOptions()}</select>`, "family")}
              ${field("Tipo", false, `<select class="ad-select" data-f="type" ${famId ? "" : "disabled"}>${typeOptions()}</select>`)}
            </div>
            ${field("Presentación", false, `<input class="ad-input" data-f="presentation" value="${esc(data.presentation)}" placeholder="Ej. 5 lb · 300 g · 30 serv" />`)}
          `)}
          ${collapse("2", "Precio y oferta", false, `
            <div class="ad-field-row">
              ${field("Precio actual", true, affix(`<input class="ad-input" inputmode="decimal" data-f="price" value="${esc(data.price)}" placeholder="0.00" />`), "price")}
              ${field("Precio anterior", false, affix(`<input class="ad-input" inputmode="decimal" data-f="old_price" value="${esc(data.old_price)}" placeholder="0.00" />`), "old_price", "Para mostrar oferta")}
            </div>
            <span class="ad-pill ad-pill--home" data-offer-pill style="justify-self:start;display:none"></span>
          `)}
          ${collapse("3", "Imagen", false, `<div data-image-slot></div>`)}
          ${collapse("4", "Sabores / variantes", false, `
            ${field("Sabores disponibles", false, `<div class="ad-chips-input" data-flavors>${data.flavors.map(chipTag).join("")}<input type="text" placeholder="Ej. Chocolate" /></div>`, null, "Enter para agregar cada sabor")}
          `)}
          ${collapse("5", "Descripción y etiquetas", false, `
            ${field("Descripción corta", false, `<textarea class="ad-textarea" data-f="description_short" placeholder="Una línea que resuma el producto…">${esc(data.description_short)}</textarea>`)}
            ${field("Tags", false, `<div class="ad-chips-input" data-tags>${data.tags.map(chipTag).join("")}<input type="text" placeholder="Ej. Energía" /></div>`, null, "Palabras clave para búsqueda")}
            ${field("Objetivos", false, `<div style="display:flex;flex-wrap:wrap;gap:8px" data-goals>${GOAL_SUGGESTIONS.concat(data.goals.filter((g) => !GOAL_SUGGESTIONS.includes(g))).map((g) => `<button type="button" class="ad-chip-toggle${data.goals.includes(g) ? " is-active" : ""}" data-goal="${esc(g)}">${esc(g)}</button>`).join("")}</div>`)}
          `)}
          ${collapse("6", "Disponibilidad y visibilidad", true, `
            <div>
              ${switchRow("available", "Disponible", "Visible y cotizable en la tienda", data.available)}
              ${switchRow("featured", "Destacado", "Resalta el producto en su categoría", data.featured)}
              ${switchRow("home", "Mostrar en inicio", "Aparece entre los productos del home (máx. " + HOME_MAX + ")", data.home)}
            </div>
            <div data-home-order-slot>${data.home ? field("Orden en inicio", false, `<input class="ad-input" inputmode="numeric" data-f="home_order" value="${esc(data.home_order)}" placeholder="Ej. 1" style="max-width:120px" />`, null, "Posición entre los destacados del home") : ""}</div>
          `)}
        </div>
        <div class="ad-drawer__foot">
          <button class="ad-btn ad-btn--ghost" type="button" data-close>Cancelar</button>
          <button class="ad-btn ad-btn--primary" type="button" data-save>${ico("save")}${isNew ? "Crear producto" : "Guardar cambios"}</button>
        </div>
      </div>`;

    if (window.javyIcons) window.javyIcons.enhance(overlay);
    document.body.style.overflow = "hidden";

    const drawer = overlay.querySelector(".ad-drawer");
    const get = (sel) => overlay.querySelector(sel);
    const fEl = (name) => overlay.querySelector(`[data-f="${name}"]`);

    // collapse toggles
    overlay.querySelectorAll(".ad-collapse__head").forEach((head) => head.addEventListener("click", () => {
      head.parentElement.classList.toggle("is-open");
    }));

    // close handlers
    const close = () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      overlay.remove();
    };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    overlay.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));

    // cascade
    fEl("family").addEventListener("change", (e) => {
      famId = e.target.value; typeId = "";
      const typeSel = fEl("type");
      typeSel.innerHTML = typeOptions();
      typeSel.disabled = !famId;
      if (touched) validate();
    });
    fEl("type").addEventListener("change", (e) => { typeId = e.target.value; });

    // offer pill live
    const updateOfferPill = () => {
      const price = Number(fEl("price").value);
      const old = Number(fEl("old_price").value);
      const pill = get("[data-offer-pill]");
      if (price > 0 && old > price) {
        pill.style.display = "inline-flex";
        pill.textContent = `Oferta -${Math.round((1 - price / old) * 100)}%`;
      } else { pill.style.display = "none"; }
    };
    fEl("price").addEventListener("input", () => { updateOfferPill(); if (touched) validate(); });
    fEl("old_price").addEventListener("input", () => { updateOfferPill(); if (touched) validate(); });
    updateOfferPill();

    // image slot
    const imageSlot = get("[data-image-slot]");
    function renderImage() {
      const showSrc = draftImageFile.file ? URL.createObjectURL(draftImageFile.file)
        : (draftImageFile.cleared ? "" : data.image);
      if (showSrc) {
        imageSlot.innerHTML = `<div class="ad-drop ad-drop--filled"><div class="ad-drop__preview"><img src="${esc(showSrc)}" alt="" /><button type="button" class="ad-btn ad-btn--ghost ad-btn--sm ad-drop__change" data-img-change>${ico("upload")}Cambiar</button></div></div>
          <button type="button" class="ad-btn ad-btn--ghost ad-btn--sm" data-img-clear style="margin-top:8px">${ico("trash")}Quitar imagen</button>
          <input type="file" accept="image/*" data-img-input hidden />`;
      } else {
        imageSlot.innerHTML = `<label class="ad-drop">${ico("upload")}<strong>Subir imagen del producto</strong><small>PNG o WebP con fondo transparente · tocá para elegir</small><input type="file" accept="image/*" data-img-input hidden /></label>`;
      }
      if (window.javyIcons) window.javyIcons.enhance(imageSlot);
      const input = imageSlot.querySelector("[data-img-input]");
      input.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) { draftImageFile.file = file; draftImageFile.cleared = false; renderImage(); }
      });
      const changeBtn = imageSlot.querySelector("[data-img-change]");
      if (changeBtn) changeBtn.addEventListener("click", () => input.click());
      const clearBtn = imageSlot.querySelector("[data-img-clear]");
      if (clearBtn) clearBtn.addEventListener("click", async () => {
        const ok = await confirmModal({ title: "Quitar imagen", body: "La imagen se quitará al guardar. ¿Continuar?", confirmLabel: "Quitar" });
        if (!ok) return;
        draftImageFile.file = null; draftImageFile.cleared = true; renderImage();
      });
    }
    renderImage();

    // chips (flavors, tags)
    const flavorNames = [...data.flavors];
    const tagNames = [...data.tags];
    bindChips(get("[data-flavors]"), {
      onAdd: (n) => flavorNames.push(n),
      onRemove: (n) => { const i = flavorNames.findIndex((x) => x.toLowerCase() === n.toLowerCase()); if (i >= 0) flavorNames.splice(i, 1); },
    });
    bindChips(get("[data-tags]"), {
      onAdd: (n) => tagNames.push(n),
      onRemove: (n) => { const i = tagNames.findIndex((x) => x.toLowerCase() === n.toLowerCase()); if (i >= 0) tagNames.splice(i, 1); },
    });

    // goals toggles
    const goalSet = new Set(data.goals);
    get("[data-goals]").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-goal]");
      if (!btn) return;
      const g = btn.getAttribute("data-goal");
      if (goalSet.has(g)) { goalSet.delete(g); btn.classList.remove("is-active"); }
      else { goalSet.add(g); btn.classList.add("is-active"); }
    });

    // home switch reveals order field
    const homeSwitch = overlay.querySelector('[data-sw="home"]');
    homeSwitch.addEventListener("change", () => {
      const slot = get("[data-home-order-slot]");
      slot.innerHTML = homeSwitch.checked
        ? field("Orden en inicio", false, `<input class="ad-input" inputmode="numeric" data-f="home_order" value="${esc(data.home_order)}" placeholder="Ej. 1" style="max-width:120px" />`, null, "Posición entre los destacados del home")
        : "";
    });

    // validation
    function errors() {
      const price = fEl("price").value.trim();
      const old = fEl("old_price").value.trim();
      return {
        name: !fEl("name").value.trim() ? "El nombre es obligatorio" : "",
        family: !famId ? "Elegí una familia" : "",
        price: !price ? "El precio es obligatorio" : (isNaN(+price) || +price <= 0) ? "Precio inválido" : "",
        old_price: old && (isNaN(+old) || +old <= +price) ? "Debe ser mayor al precio actual" : "",
      };
    }
    function validate() {
      const errs = errors();
      ["name", "family", "price", "old_price"].forEach((k) => {
        const slot = overlay.querySelector(`[data-err="${k}"]`);
        const inputName = k === "family" ? "family" : k;
        const input = overlay.querySelector(`[data-f="${inputName}"]`);
        if (slot) slot.innerHTML = errs[k] ? `${ico("x")}${esc(errs[k])}` : "";
        if (input) input.classList.toggle(input.tagName === "SELECT" ? "ad-select--invalid" : "ad-input--invalid", !!errs[k]);
      });
      return Object.values(errs).every((v) => !v);
    }

    // save
    get("[data-save]").addEventListener("click", async () => {
      touched = true;
      if (!validate()) {
        // open the section with the first error
        toast({ tone: "err", msg: "Revisá los campos marcados" });
        return;
      }
      const saveBtn = get("[data-save]");
      saveBtn.disabled = true;
      saveBtn.textContent = "Guardando…";
      try {
        await saveProduct({
          isNew, data, famId, typeId, draftImageFile,
          values: {
            name: fEl("name").value.trim(),
            brand: fEl("brand").value.trim(),
            presentation: fEl("presentation").value.trim(),
            price: fEl("price").value.trim(),
            old_price: fEl("old_price").value.trim(),
            description_short: fEl("description_short").value.trim(),
            description_long: data.description_long,
            home_order: (overlay.querySelector('[data-f="home_order"]') || {}).value || "",
            available: overlay.querySelector('[data-sw="available"]').checked,
            featured: overlay.querySelector('[data-sw="featured"]').checked,
            home: overlay.querySelector('[data-sw="home"]').checked,
            flavors: flavorNames,
            tags: tagNames,
            goals: Array.from(goalSet),
          },
          originalFlavors: product ? (product.flavors || []) : [],
        });
        close();
      } catch (e) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `${ico("save")}${isNew ? "Crear producto" : "Guardar cambios"}`;
        if (window.javyIcons) window.javyIcons.enhance(saveBtn);
        if (e.code === "CONFLICT") {
          const force = await confirmModal({ title: "Otro admin editó esto", body: "Otro administrador modificó este producto mientras lo editabas. ¿Querés sobrescribir sus cambios con los tuyos?", confirmLabel: "Sobrescribir", danger: true });
          if (force) { data.updated_at = null; get("[data-save]").click(); }
        } else {
          toast({ tone: "err", msg: "No se pudo guardar", sub: e.message });
        }
      }
    });

    // focus first input
    setTimeout(() => { const f = fEl("name"); if (f) f.focus(); }, 30);
  }

  async function saveProduct(ctx) {
    const { isNew, data, famId, typeId, draftImageFile, values, originalFlavors } = ctx;
    const db = window.catalogDb;

    // imagen
    let imageUrl = data.image || "";
    let uploadedUrl = null;
    if (draftImageFile.file) {
      uploadedUrl = await db.uploadProductImage(draftImageFile.file);
      imageUrl = uploadedUrl;
    } else if (draftImageFile.cleared) {
      imageUrl = PLACEHOLDER;
    }

    // categoría: el tipo (hoja) si existe, si no la familia
    const leafId = typeId || famId || null;
    const leafCat = leafId ? catById(leafId) : null;

    const payload = {
      name: values.name,
      brand: values.brand,
      category: leafCat ? leafCat.name : (data.category || ""),
      category_id: leafId,
      price: values.price,
      old_price: values.old_price === "" ? null : values.old_price,
      presentation: values.presentation,
      image_url: imageUrl,
      description_short: values.description_short,
      description_long: values.description_long,
      available: values.available,
      is_available: values.available,
      featured: values.featured,
      is_featured: values.featured,
      show_on_home: values.home,
      home_order: values.home ? (values.home_order || null) : null,
      tags: values.tags,
      goals: values.goals,
    };

    let saved;
    try {
      if (isNew) {
        saved = await db.createProduct(payload);
      } else {
        saved = await db.updateProduct(data.id, payload, { expectedUpdatedAt: data.updated_at || undefined });
      }
    } catch (e) {
      if (uploadedUrl) await db.removeProductImage(uploadedUrl); // limpiar huérfana
      throw e;
    }

    // sincronizar sabores por nombre
    await syncFlavorsOnSave(saved.id, originalFlavors, values.flavors);

    await reloadProducts();
    toast({ tone: "ok", msg: isNew ? "Producto creado" : "Cambios guardados", sub: values.name });
    if (state.active === "products") renderProducts();
    else if (state.active === "dashboard") renderDashboard();
    else if (state.active === "home") renderHome();
    else if (state.active === "variants") renderVariants();
  }

  async function syncFlavorsOnSave(productId, originalFlavors, desiredNames) {
    const db = window.catalogDb;
    const norm = (s) => s.trim().toLowerCase();
    const desired = [...new Set(desiredNames.map((n) => n.trim()).filter(Boolean))];
    const desiredLower = desired.map(norm);
    const originalLower = originalFlavors.map((f) => norm(f.name));

    // borrar los que ya no están
    for (const f of originalFlavors) {
      if (f.id && !desiredLower.includes(norm(f.name))) {
        try { await db.deleteFlavor(f.id); } catch (_) {}
      }
    }
    // crear los nuevos
    for (const name of desired) {
      if (!originalLower.includes(norm(name))) {
        try { await db.createFlavor(productId, { name, available: true }); } catch (_) {}
      }
    }
  }

  /* ============================ COMBO DRAWER (builder) ============================ */
  function openComboDrawer(combo) {
    const isNew = !combo;
    const draft = {
      id: combo ? combo.id : null,
      name: combo ? combo.name : "",
      description: combo ? combo.description : "",
      price: combo && combo.price ? String(combo.price) : "",
      old_price: combo && combo.old_price ? String(combo.old_price) : "",
      image: combo ? (combo.image_url || "") : "",
      is_active: combo ? combo.is_active !== false : true,
      show_on_home: combo ? !!combo.show_on_home : false,
      rows: combo ? combo.items.map((it) => ({ product_id: String(it.product_id), flavor_id: it.flavor_id ? String(it.flavor_id) : "", quantity: it.quantity || 1 })) : [{ product_id: "", flavor_id: "", quantity: 1 }],
    };
    const draftImageFile = { file: null, cleared: false };

    const host = $("#adminDrawerHost");
    const overlay = document.createElement("div");
    overlay.className = "ad-drawer-overlay";
    host.appendChild(overlay);

    overlay.innerHTML = `
      <div class="ad-drawer__scrim" data-close></div>
      <div class="ad-drawer">
        <div class="ad-drawer__head">
          <div><h2>${isNew ? "Nuevo combo" : "Editar combo"}</h2><p>${combo && combo.updated_by ? "Última edición por " + esc(combo.updated_by) : "Paquete a precio especial"}</p></div>
          <button class="ad-drawer__close" type="button" aria-label="Cerrar" data-close>${ico("x")}</button>
        </div>
        <div class="ad-drawer__body">
          ${collapse("1", "Información", true, `
            ${field("Nombre del combo", true, `<input class="ad-input" data-c="name" value="${esc(draft.name)}" placeholder="Ej. Pack Volumen Limpio" />`, "cname")}
            ${field("Descripción", false, `<textarea class="ad-textarea" data-c="description" placeholder="Qué incluye y para quién es ideal">${esc(draft.description)}</textarea>`)}
          `)}
          ${collapse("2", "Productos del combo", true, `<div data-rows></div>
            <button class="ad-btn ad-btn--ghost ad-btn--sm" type="button" data-add-row style="justify-self:start;margin-top:4px">${ico("plus")}Agregar producto</button>
            <div class="ad-builder-summary">
              <div>
                <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
                  <span style="color:var(--pb-muted);font-size:.82rem">Precio de lista: <s data-list>$0</s></span>
                  <span class="ad-pill ad-pill--ok" data-save-pill style="display:none"></span>
                </div>
                <div style="width:160px;margin-top:8px">
                  ${field("Precio del combo", true, affix(`<input class="ad-input" inputmode="decimal" data-c="price" value="${esc(draft.price)}" placeholder="0.00" />`), "cprice")}
                </div>
              </div>
              <div class="ad-builder-summary__totals"><span class="ad-price" data-total>$0</span></div>
            </div>
          `)}
          ${collapse("3", "Imagen", false, `<div data-image-slot></div>`)}
          ${collapse("4", "Visibilidad", true, `
            ${switchRow("active", "Activo", "Visible en la web", draft.is_active)}
            ${switchRow("chome", "Mostrar en inicio", "Aparece en la home", draft.show_on_home)}
          `)}
        </div>
        <div class="ad-drawer__foot">
          <button class="ad-btn ad-btn--ghost" type="button" data-close>Cancelar</button>
          <button class="ad-btn ad-btn--primary" type="button" data-save>${ico("save")}${isNew ? "Crear combo" : "Guardar cambios"}</button>
        </div>
      </div>`;

    if (window.javyIcons) window.javyIcons.enhance(overlay);
    document.body.style.overflow = "hidden";

    const get = (sel) => overlay.querySelector(sel);
    overlay.querySelectorAll(".ad-collapse__head").forEach((head) => head.addEventListener("click", () => head.parentElement.classList.toggle("is-open")));

    const close = () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); overlay.remove(); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    overlay.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));

    const productById = (id) => state.products.find((p) => String(p.id) === String(id));

    function renderRows() {
      const container = get("[data-rows]");
      container.style.display = "grid";
      container.style.gap = "10px";
      container.innerHTML = draft.rows.map((r, i) => {
        const p = r.product_id ? productById(r.product_id) : null;
        const flavors = p ? p.flavors : [];
        return `
        <div class="ad-builder-row" data-row="${i}">
          <img src="${esc(p ? p.image : PLACEHOLDER)}" alt="" data-fallback style="opacity:${p ? 1 : 0.3}" />
          ${field(i === 0 ? "Producto" : "", false, `<select class="ad-select" data-rf="product"><option value="">Elegir producto…</option>${state.products.map((pp) => `<option value="${esc(pp.id)}"${String(pp.id) === String(r.product_id) ? " selected" : ""}>${esc(pp.name)}</option>`).join("")}</select>`)}
          ${field(i === 0 ? "Sabor" : "", false, `<select class="ad-select" data-rf="flavor" ${p ? "" : "disabled"}><option value="">${p ? "Elegir…" : "—"}</option>${flavors.map((fl) => `<option value="${esc(fl.id)}"${String(fl.id) === String(r.flavor_id) ? " selected" : ""}>${esc(fl.name)}</option>`).join("")}</select>`)}
          ${field(i === 0 ? "Cant." : "", false, `<input class="ad-input" inputmode="numeric" data-rf="qty" value="${esc(r.quantity)}" />`)}
          <button class="ad-icon-btn ad-icon-btn--danger" type="button" title="Quitar" data-rf="del" ${draft.rows.length === 1 ? "disabled" : ""}>${ico("trash")}</button>
        </div>`;
      }).join("");
      wireImageFallbacks(container);
      if (window.javyIcons) window.javyIcons.enhance(container);

      container.querySelectorAll("[data-row]").forEach((row) => {
        const i = Number(row.getAttribute("data-row"));
        row.querySelector('[data-rf="product"]').addEventListener("change", (e) => {
          draft.rows[i].product_id = e.target.value; draft.rows[i].flavor_id = ""; renderRows(); updateSummary();
        });
        const flavorSel = row.querySelector('[data-rf="flavor"]');
        if (flavorSel) flavorSel.addEventListener("change", (e) => { draft.rows[i].flavor_id = e.target.value; });
        row.querySelector('[data-rf="qty"]').addEventListener("input", (e) => { draft.rows[i].quantity = Math.max(1, parseInt(e.target.value, 10) || 1); updateSummary(); });
        const del = row.querySelector('[data-rf="del"]');
        del.addEventListener("click", () => { draft.rows.splice(i, 1); renderRows(); updateSummary(); });
      });
    }

    function listPrice() {
      return draft.rows.reduce((s, r) => { const p = productById(r.product_id); return s + (p ? Number(p.price || 0) : 0) * (r.quantity || 1); }, 0);
    }
    function updateSummary() {
      const lp = listPrice();
      const price = Number(get('[data-c="price"]').value) || 0;
      const save = draft.rows.filter((r) => r.product_id).length >= 2 ? Math.max(0, lp - price) : 0;
      get("[data-list]").textContent = peso(lp);
      get("[data-total]").textContent = peso(price);
      const pill = get("[data-save-pill]");
      if (save > 0) { pill.style.display = "inline-flex"; pill.textContent = `Ahorro ${peso(save)}`; }
      else { pill.style.display = "none"; }
    }

    get("[data-add-row]").addEventListener("click", () => { draft.rows.push({ product_id: "", flavor_id: "", quantity: 1 }); renderRows(); updateSummary(); });
    get('[data-c="price"]').addEventListener("input", updateSummary);
    renderRows();
    updateSummary();

    // image
    const imageSlot = get("[data-image-slot]");
    function renderImage() {
      const showSrc = draftImageFile.file ? URL.createObjectURL(draftImageFile.file) : (draftImageFile.cleared ? "" : draft.image);
      imageSlot.innerHTML = showSrc
        ? `<div class="ad-drop ad-drop--filled"><div class="ad-drop__preview"><img src="${esc(showSrc)}" alt="" /><button type="button" class="ad-btn ad-btn--ghost ad-btn--sm ad-drop__change" data-img-change>${ico("upload")}Cambiar</button></div></div><input type="file" accept="image/*" data-img-input hidden />`
        : `<label class="ad-drop">${ico("upload")}<strong>Subir imagen del combo</strong><small>PNG o WebP · tocá para elegir</small><input type="file" accept="image/*" data-img-input hidden /></label>`;
      if (window.javyIcons) window.javyIcons.enhance(imageSlot);
      const input = imageSlot.querySelector("[data-img-input]");
      input.addEventListener("change", (e) => { const f = e.target.files[0]; if (f) { draftImageFile.file = f; draftImageFile.cleared = false; renderImage(); } });
      const ch = imageSlot.querySelector("[data-img-change]");
      if (ch) ch.addEventListener("click", () => input.click());
    }
    renderImage();

    get("[data-save]").addEventListener("click", async () => {
      const name = get('[data-c="name"]').value.trim();
      const price = Number(get('[data-c="price"]').value);
      const validRows = draft.rows.filter((r) => r.product_id);
      const lp = listPrice();
      if (!name) { toast({ tone: "err", msg: "El nombre es obligatorio" }); return; }
      if (validRows.length < 2) { toast({ tone: "err", msg: "Agregá al menos 2 productos" }); return; }
      if (!(price > 0)) { toast({ tone: "err", msg: "Poné un precio válido" }); return; }
      if (price >= lp) { toast({ tone: "err", msg: "El precio del combo debe ser menor al de lista" }); return; }

      const saveBtn = get("[data-save]");
      saveBtn.disabled = true; saveBtn.textContent = "Guardando…";
      try {
        let imageUrl = draft.image || "";
        let uploaded = null;
        if (draftImageFile.file) { uploaded = await window.catalogDb.uploadProductImage(draftImageFile.file); imageUrl = uploaded; }
        const payload = {
          name,
          description: get('[data-c="description"]').value.trim(),
          price: get('[data-c="price"]').value.trim(),
          old_price: get('[data-c="old_price"]') ? get('[data-c="old_price"]').value.trim() : draft.old_price,
          image_url: imageUrl,
          is_active: overlay.querySelector('[data-sw="active"]').checked,
          show_on_home: overlay.querySelector('[data-sw="chome"]').checked,
        };
        let savedCombo;
        try {
          savedCombo = isNew ? await window.catalogDb.createCombo(payload) : await window.catalogDb.updateCombo(draft.id, payload);
        } catch (e) { if (uploaded) await window.catalogDb.removeProductImage(uploaded); throw e; }

        await window.catalogDb.saveComboItems(savedCombo.id, validRows.map((r) => ({ product_id: r.product_id, flavor_id: r.flavor_id || null, quantity: r.quantity || 1 })));
        state.combos = await window.catalogDb.getCombos({ audit: true }).catch(() => state.combos);
        toast({ tone: "ok", msg: isNew ? "Combo creado" : "Combo actualizado", sub: name });
        close();
        renderCombos();
      } catch (e) {
        saveBtn.disabled = false; saveBtn.innerHTML = `${ico("save")}${isNew ? "Crear combo" : "Guardar cambios"}`;
        if (window.javyIcons) window.javyIcons.enhance(saveBtn);
        toast({ tone: "err", msg: "No se pudo guardar el combo", sub: e.message });
      }
    });

    setTimeout(() => { const f = get('[data-c="name"]'); if (f) f.focus(); }, 30);
  }

  /* ----------------------------- form markup helpers ----------------------------- */
  function collapse(num, title, open, inner) {
    return `<div class="ad-collapse${open ? " is-open" : ""}">
      <button type="button" class="ad-collapse__head">
        <span class="ad-collapse__num">${num}</span><span class="ad-collapse__title">${esc(title)}</span>
        <span class="ad-collapse__chev">${ico("arrow-down")}</span>
      </button>
      <div class="ad-collapse__body">${inner}</div>
    </div>`;
  }
  function field(label, required, control, errKey, help) {
    return `<div class="ad-field">
      ${label ? `<label class="ad-field__label">${esc(label)}${required ? `<span class="ad-field__req" title="Obligatorio">*</span>` : ""}</label>` : ""}
      ${control}
      ${errKey ? `<span class="ad-field__error" data-err="${errKey === "cname" ? "cname" : errKey}"></span>` : ""}
      ${help ? `<span class="ad-field__help">${esc(help)}</span>` : ""}
    </div>`;
  }
  function affix(input) {
    return `<div class="ad-input-affix"><span class="ad-input-affix__sign">$</span>${input}</div>`;
  }
  function switchRow(key, label, hint, checked) {
    return `<label class="ad-switch ad-switch--row">
      <span class="ad-switch__body"><span class="ad-switch__label">${esc(label)}</span><span class="ad-switch__hint">${esc(hint)}</span></span>
      <input type="checkbox" data-sw="${key}" ${checked ? "checked" : ""} /><span class="ad-switch__track"></span>
    </label>`;
  }

  /* ----------------------------- start ----------------------------- */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
