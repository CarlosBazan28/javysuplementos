/* ============================================================================
   Sección Sabores: chips-input por producto, guardado inmediato en Supabase.
   ============================================================================ */
import { state } from "../state.js";
import { $, $$, esc, imgTag } from "../helpers.js";
import { setView } from "../view.js";
import { chipTag, bindChips, toast } from "../ui.js";

export function renderVariants() {
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
