/* ============================================================================
   Render de la vista principal (#adminView) y pantalla de error de sección.
   ============================================================================ */
import { $, esc, ico, wireImageFallbacks } from "./helpers.js";

export function setView(html) {
  const view = $("#adminView");
  view.innerHTML = `<div class="ad-section">${html}</div>`;
  wireImageFallbacks(view);
  if (window.javyIcons) window.javyIcons.enhance(view);
  return view;
}

// Pinta un error legible dentro de #adminView (en vez de dejar la vista en blanco).
export function showViewError(error, where = "") {
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
