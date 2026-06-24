/* ============================================================================
   Sección Productos: barra de búsqueda + filtros (familia + estado) y la
   tabla/cards con acciones por fila.
   ============================================================================ */
import { state, families, catById } from "../state.js";
import { $, esc, ico, imgTag, peso, hasOffer, isAvailable, isMissingImage, stockTone, wireImageFallbacks } from "../helpers.js";
import { setView } from "../view.js";
import { bindEditClicks } from "../shell.js";
import { confirmModal, toast } from "../ui.js";
import { reloadProducts } from "../data.js";
import { openProductDrawer } from "../drawers/product-drawer.js";

const STATUS_FILTERS = [
  ["all", "Todos"], ["home", "En inicio"], ["offers", "En oferta"], ["out", "Agotados"], ["noimg", "Sin imagen"],
];

// El producto pertenece a la familia si su categoría ES la familia o un tipo (hijo) de ella.
function matchesFamily(p) {
  const fam = state.productFamily;
  if (fam === "all") return true;
  const cat = catById(p.category_id);
  return !!cat && (cat.id === fam || cat.parent_id === fam);
}

function filteredProducts() {
  const f = state.productFilter;
  const q = state.search;
  return state.products.filter((p) => {
    const byFilter =
      f === "home" ? p.show_on_home :
      f === "offers" ? hasOffer(p) :
      f === "out" ? !isAvailable(p) :
      f === "noimg" ? isMissingImage(p) : true;
    const byQ = !q || (`${p.name} ${p.brand || ""} ${p.category || ""}`).toLowerCase().includes(q);
    return byFilter && byQ && matchesFamily(p);
  });
}

const hasActiveFilters = () =>
  state.productFilter !== "all" || state.productFamily !== "all" || !!state.search;

const countLabel = (list) => `${list.length} ${list.length === 1 ? "producto" : "productos"}`;

const pill = (p) => { const [tone, label] = stockTone(p); return `<span class="ad-pill ad-pill--${tone}">${label}</span>`; };
const priceCell = (p) => `<span class="ad-price">${hasOffer(p) ? `<s>${esc(peso(p.old_price))}</s>` : ""}${esc(peso(p.price))}</span>`;

// Tabla (desktop) + cards (móvil) o estado vacío. Es lo único que se re-renderiza al teclear.
function resultsHTML(list) {
  if (list.length === 0) {
    return `<div class="ad-empty"><span class="ad-empty__icon">${ico("search")}</span><h3>Sin resultados</h3><p>No hay productos que coincidan. Probá con otra búsqueda o tocá “Limpiar”.</p></div>`;
  }
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

  return `<div class="ad-table-wrap"><table class="ad-table">
      <thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Sabores</th><th>Estado</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table></div>
     <div class="ad-prod-cards">${cards}</div>`;
}

export function renderProducts() {
  const list = filteredProducts();
  const famOptions = [{ id: "all", name: "Todas las familias" }, ...families()];
  const famSel = state.productFamily;
  const famLabel = (famOptions.find((o) => o.id === famSel) || famOptions[0]).name;
  const famMenu = famOptions.map((o) =>
    `<button type="button" role="option" class="ad-dd__opt${o.id === famSel ? " is-active" : ""}" data-fam="${esc(o.id)}" aria-selected="${o.id === famSel}">${esc(o.name)}</button>`).join("");

  setView(`
    <div class="ad-panel">
      <div class="ad-filterbar">
        <div class="ad-filterbar__row">
          <div class="ad-search">
            ${ico("search")}
            <input type="search" data-search placeholder="Buscar producto" aria-label="Buscar producto" value="${esc(state.search)}" />
          </div>
          <div class="ad-dd ad-filterbar__family" data-family-dd>
            <button class="ad-dd__btn" type="button" data-dd-toggle aria-haspopup="listbox" aria-expanded="false" aria-label="Filtrar por familia">
              <span class="ad-dd__value">${esc(famLabel)}</span>
              <span class="ad-dd__chev">${ico("arrow-down")}</span>
            </button>
            <div class="ad-dd__menu" role="listbox" hidden>${famMenu}</div>
          </div>
        </div>
        <div class="ad-filterbar__row ad-filterbar__row--chips">
          <div class="ad-toolbar__filters">
            ${STATUS_FILTERS.map(([k, label]) => `<button class="ad-chip${state.productFilter === k ? " is-active" : ""}" type="button" data-filter="${k}">${esc(label)}</button>`).join("")}
          </div>
          <div class="ad-filterbar__meta">
            <button class="ad-link-btn" type="button" data-clear ${hasActiveFilters() ? "" : "hidden"}>${ico("x")}Limpiar</button>
            <span class="ad-result-count" data-count>${countLabel(list)}</span>
          </div>
        </div>
      </div>
      <div data-results>${resultsHTML(list)}</div>
    </div>`);

  const view = $("#adminView");

  // Búsqueda: actualización PARCIAL (solo resultados) para no perder el foco al teclear.
  const searchInput = view.querySelector("[data-search]");
  searchInput.addEventListener("input", () => {
    state.search = searchInput.value.trim().toLowerCase();
    const topbar = $("#adminSearch");
    if (topbar) topbar.value = searchInput.value; // mantener en sync con la búsqueda global
    updateResults(view);
  });

  // Familia: dropdown propio (no el <select> nativo que ocupa toda la pantalla).
  wireFamilyDropdown(view);

  // Estado: re-render completo (no hay foco de tecleo que preservar).
  view.querySelectorAll("[data-filter]").forEach((b) => b.addEventListener("click", () => {
    state.productFilter = b.getAttribute("data-filter");
    renderProducts();
  }));
  view.querySelector("[data-clear]").addEventListener("click", () => {
    state.productFilter = "all"; state.productFamily = "all"; state.search = "";
    const topbar = $("#adminSearch");
    if (topbar) topbar.value = "";
    renderProducts();
  });

  wireRowActions(view);
}

// Re-renderiza solo la lista de resultados + conteo + visibilidad de "Limpiar".
function updateResults(view) {
  const list = filteredProducts();
  const results = view.querySelector("[data-results]");
  results.innerHTML = resultsHTML(list);
  wireImageFallbacks(results);
  if (window.javyIcons) window.javyIcons.enhance(results);
  const count = view.querySelector("[data-count]");
  if (count) count.textContent = countLabel(list);
  const clear = view.querySelector("[data-clear]");
  if (clear) clear.hidden = !hasActiveFilters();
  wireRowActions(view);
}

// Dropdown propio de Familia: panel anclado bajo el botón, con clic-fuera y Escape.
function wireFamilyDropdown(view) {
  const dd = view.querySelector("[data-family-dd]");
  if (!dd) return;
  const btn = dd.querySelector("[data-dd-toggle]");
  const menu = dd.querySelector("[role='listbox']");
  let onDoc = null;
  const onKey = (e) => { if (e.key === "Escape") close(); };

  function close() {
    dd.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
    menu.hidden = true;
    if (onDoc) { document.removeEventListener("click", onDoc); onDoc = null; }
    document.removeEventListener("keydown", onKey);
  }
  function open() {
    dd.classList.add("is-open");
    btn.setAttribute("aria-expanded", "true");
    menu.hidden = false;
    onDoc = (e) => { if (!e.target.closest("[data-family-dd]")) close(); };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
  }

  btn.addEventListener("click", (e) => {
    e.stopPropagation(); // evita que el clic-fuera recién montado lo cierre
    dd.classList.contains("is-open") ? close() : open();
  });
  menu.querySelectorAll("[data-fam]").forEach((opt) => opt.addEventListener("click", () => {
    state.productFamily = opt.getAttribute("data-fam");
    close();
    renderProducts();
  }));
}

function wireRowActions(view) {
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
