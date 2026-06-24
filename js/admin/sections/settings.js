/* ============================================================================
   Sección Ajustes: estado informativo de los servicios de la tienda.
   ============================================================================ */
import { state, families } from "../state.js";
import { esc } from "../helpers.js";
import { setView } from "../view.js";

export function renderSettings() {
  // JAVY_WHATSAPP_NUMBER es un global lexical de js/whatsapp-config.js (script clásico).
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
