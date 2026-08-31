/* ============================================================================
   PÁGINAS DE CATEGORÍA — /categoria/<slug>/

   Las cards ya vienen escritas en el HTML por scripts/generate-pages.mjs (eso
   es lo que indexa Google y lee el scraper de WhatsApp, que no ejecuta JS).
   Este archivo solo les engancha el comportamiento de cotizar, para que la card
   de una categoría se comporte igual que la del catálogo completo.

   El producto sale de dos lados, en este orden:

     1. catalogDb, que es la misma fuente del catálogo y trae los sabores.
     2. Los data-* de la card, si la base no responde. Alcanza para cotizar
        (sin elegir sabor), así el botón nunca queda muerto por estar offline.
   ============================================================================ */
(function () {
  "use strict";

  function setAddButtonState(button, added) {
    if (!button) return;
    button.classList.toggle("is-added", added);
    button.textContent = added ? "✓ En cotización" : "Agregar a cotización";
  }

  // Igual que syncAddButton() del catálogo, pero sin selector de sabor: la card
  // marca "en cotización" si hay CUALQUIER variante de este producto agregada.
  function syncCard(card, product) {
    const button = card.querySelector(".product-card__btn--buy");
    if (!button) return;
    const added = window.consultation?.getAddedFlavors?.(product.id)?.length || 0;
    const inQuote = added > 0 || !!window.consultation?.hasItem?.(product.id, "");
    setAddButtonState(button, inQuote);
  }

  // Producto de respaldo, armado con lo que la propia card trae en el HTML.
  function productoDeLaCard(card) {
    const d = card.dataset;
    return {
      id: d.productId,
      legacy_id: d.legacyId || d.productId,
      name: d.name || "",
      brand: d.brand || "",
      category: d.category || "",
      price: Number(d.price || 0),
      presentation: d.presentation || "",
      image: d.image || "img/icons/logo.png",
      flavors: [],
    };
  }

  async function init() {
    const cards = Array.from(document.querySelectorAll(".product-card[data-product-id]"));
    if (!cards.length) return;

    let products = [];
    try {
      products = (await window.catalogDb?.getProductsWithFlavors?.()) || [];
    } catch (error) {
      // Se sigue con los data-* de la card: cotizar no depende de la red.
      console.warn("[categoria] catálogo no disponible, uso los datos de la página:", error);
    }

    // La página se genera con el uuid de Supabase, pero el respaldo local usa
    // legacy_id: se indexa por los dos para que el match no dependa de cuál vino.
    const porId = new Map();
    for (const p of products) {
      if (p.id != null) porId.set(String(p.id), p);
      if (p.legacy_id != null) porId.set(String(p.legacy_id), p);
    }

    const enganchadas = [];

    for (const card of cards) {
      const d = card.dataset;
      const product = porId.get(d.productId) || porId.get(d.legacyId) || productoDeLaCard(card);

      card.querySelector(".product-card__btn--buy")?.addEventListener("click", () => {
        window.consultation?.openAddModal?.(product);
      });
      card.querySelector(".product-card__btn--quote")?.addEventListener("click", () => {
        window.consultation?.askAvailability?.(product, {});
      });

      syncCard(card, product);
      enganchadas.push([card, product]);
    }

    // Agregar o quitar desde el panel de cotización tiene que verse en la card.
    document.addEventListener("consultation:change", () => {
      for (const [card, product] of enganchadas) syncCard(card, product);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
