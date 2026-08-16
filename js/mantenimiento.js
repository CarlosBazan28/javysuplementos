/* ============================================================================
   MODO MANTENIMIENTO — interruptor global del sitio público.

   Cuando ACTIVO es true, cualquier página pública redirige a /construccion.html
   antes de pintar nada: el visitante no ve el catálogo ni puede armar una
   cotización.

   ▸ Para APAGAR el aviso y reabrir el sitio: poné ACTIVO en false (una línea).
   ▸ Para revisar el sitio real estando en mantenimiento: entrá una vez a
     https://javysuplementos.com/?ver=javy  (queda habilitado toda la pestaña).

   Este archivo se carga SIN defer y lo más arriba posible del <head> para que
   el bloqueo ocurra antes de que se cargue el resto de la página.
   ============================================================================ */
(function () {
  "use strict";

  /* ↓↓↓ EL INTERRUPTOR ↓↓↓ */
  var ACTIVO = true;
  /* ↑↑↑ poné false para reabrir el sitio ↑↑↑ */

  if (!ACTIVO) return;

  var PAGINA = "/construccion.html";
  var PARAM = "ver";
  var TOKEN = "javy";
  var CLAVE = "javy-ver-sitio";

  // Páginas que nunca se bloquean (la propia página de aviso y el panel admin).
  var LIBRES = ["/construccion.html", "/login.html", "/admin.html", "/404.html"];

  var ruta = window.location.pathname;
  for (var i = 0; i < LIBRES.length; i++) {
    if (ruta === LIBRES[i]) return;
  }

  try {
    if (window.location.search.indexOf(PARAM + "=" + TOKEN) !== -1) {
      window.sessionStorage.setItem(CLAVE, "1");
    }
    if (window.sessionStorage.getItem(CLAVE) === "1") return;
  } catch (e) {
    // sessionStorage bloqueado (modo privado, cookies off): se aplica el bloqueo.
  }

  window.location.replace(PAGINA);
})();
