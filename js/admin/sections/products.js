/* ============================================================================
   Sección Productos: tabla/cards con filtros, búsqueda y acciones por fila.
   ============================================================================ */
import { state } from "../state.js";
import { $, esc, ico, imgTag, peso, hasOffer, isAvailable, isMissingImage, stockTone } from "../helpers.js";
import { setView } from "../view.js";
import { bindEditClicks } from "../shell.js";
import { confirmModal, toast } from "../ui.js";
import { reloadProducts } from "../data.js";
import { openProductDrawer } from "../drawers/product-drawer.js";

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
    return byFilter && byQ;
  });
}

export function renderProducts() {
  const filters = [["all", "Todos"], ["home", "En inicio"], ["offers", "En oferta"], ["out", "Agotados"], ["noimg", "Sin imagen"]];
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
