/* ============================================================================
   MODO DEL SITIO — interruptor global del sitio público.

   Tres modos:

     "abierto"       El sitio funciona normal.
     "solo-lectura"  Se puede ver el catálogo y las fichas, pero NO se puede
                     cotizar: se ocultan los botones de "Agregar a cotización",
                     "Consultar disponibilidad", el panel de cotización y su
                     acceso en el nav. Sirve para tener el catálogo a la vista
                     mientras se actualizan precios o fichas.
     "cerrado"       Toda página pública redirige a /construccion.html antes de
                     pintar nada. Nadie ve el catálogo.

   ▸ Para cambiar de modo: la constante MODO, acá abajo. Es la única línea.

   IMPORTANTE — el modo SOLO aplica en producción (javysuplementos.com).
   En los previews de Vercel (ramas de desarrollo) y en localhost el sitio
   está siempre abierto, así se puede trabajar sin que estorbe. Por eso no
   hace falta que la rama de desarrollo y main tengan valores distintos.

   ▸ Para probar un modo donde sea (incluido producción), agregá a la URL:
       ?modo=cerrado   ?modo=solo-lectura   ?modo=abierto
     Queda guardado mientras dure la pestaña. `?ver=javy` sigue funcionando
     como atajo de "abierto".

   Este archivo se carga SIN defer y lo más arriba posible del <head> para que
   el bloqueo ocurra antes de que se pinte la página.
   ============================================================================ */
(function () {
  "use strict";

  /* ↓↓↓ EL INTERRUPTOR ↓↓↓ */
  var MODO = "cerrado";
  /* ↑↑↑ "abierto" | "solo-lectura" | "cerrado" ↑↑↑ */

  var PRODUCCION = ["javysuplementos.com", "www.javysuplementos.com"];
  var PAGINA_CERRADO = "/construccion.html";
  var CSS_SOLO_LECTURA = "/css/modo-solo-lectura.css?v=1";
  var CLAVE = "javy-modo";

  // Páginas que nunca se bloquean (la propia página de aviso y el panel admin).
  var LIBRES = ["/construccion.html", "/login.html", "/admin.html", "/404.html"];

  // Todo lo que dispara una cotización, en cualquier página.
  var COTIZAR =
    ".product-card__btn--buy, .product-card__btn--quote, [data-add-cta]," +
    " .pdp__cta, #consultationBtn, .cart-btn, .consultation-panel__send";

  function overrideDeLaUrl() {
    try {
      var m = /[?&]modo=([a-z-]+)/.exec(window.location.search);
      if (m) {
        window.sessionStorage.setItem(CLAVE, m[1]);
        return m[1];
      }
      if (window.location.search.indexOf("ver=javy") !== -1) {
        window.sessionStorage.setItem(CLAVE, "abierto");
        return "abierto";
      }
      return window.sessionStorage.getItem(CLAVE);
    } catch (e) {
      return null; // sessionStorage bloqueado: se usa el modo configurado.
    }
  }

  var enProduccion = PRODUCCION.indexOf(window.location.hostname) !== -1;
  var modo = overrideDeLaUrl() || (enProduccion ? MODO : "abierto");

  if (modo === "abierto") return;

  var ruta = window.location.pathname;
  for (var i = 0; i < LIBRES.length; i++) {
    if (ruta === LIBRES[i]) return;
  }

  if (modo === "cerrado") {
    window.location.replace(PAGINA_CERRADO);
    return;
  }

  if (modo !== "solo-lectura") return;

  /* ------------------------------ solo lectura ----------------------------- */

  document.documentElement.setAttribute("data-modo", "solo-lectura");

  var hoja = document.createElement("link");
  hoja.rel = "stylesheet";
  hoja.href = CSS_SOLO_LECTURA;
  document.head.appendChild(hoja);

  // Cinturón y tirantes: si la hoja no cargara, el click igual no cotiza.
  document.addEventListener(
    "click",
    function (evento) {
      var destino = evento.target;
      if (destino && destino.closest && destino.closest(COTIZAR)) {
        evento.preventDefault();
        evento.stopPropagation();
      }
    },
    true
  );

  document.addEventListener("DOMContentLoaded", function () {
    if (!document.querySelector(".modo-aviso")) {
      var aviso = document.createElement("div");
      aviso.className = "modo-aviso";
      aviso.setAttribute("role", "status");
      aviso.textContent =
        "Estamos actualizando precios y fichas. Podés ver el catálogo, " +
        "pero las cotizaciones están pausadas.";
      document.body.insertBefore(aviso, document.body.firstChild);
    }

    // El copy del catálogo invita a cotizar; en este modo no se puede.
    var bajada = document.querySelector(".catalog-hero__text");
    if (bajada) {
      bajada.textContent =
        "Busca por nombre, marca u objetivo y mirá los precios de referencia. " +
        "Las cotizaciones están pausadas mientras actualizamos el catálogo.";
    }
  });
})();
