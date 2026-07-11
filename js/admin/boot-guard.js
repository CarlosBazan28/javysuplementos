/* ============================================================================
   Boot-guard del panel admin (script clásico, NO módulo — la CSP no permite
   scripts inline, por eso vive en un archivo propio).

   Carga el grafo de módulos ES (main.js + js/admin/**) con import() dinámico
   para tener un catch real: si CUALQUIER módulo falla (404, MIME text/html,
   export inexistente por mezcla de versiones en caché), el error se muestra
   en el gate con un botón "Reintentar" en vez de dejar el panel en negro.
   ============================================================================ */
(function () {
  "use strict";

  var WATCHDOG_MS = 20000;

  // El token de versión viaja en la URL de ESTE script (admin.html lo versiona
  // y scripts/bump-admin-version.mjs lo mantiene). Fallback: timestamp, que
  // fuerza una bajada fresca si no se pudo leer.
  function getVersion() {
    try {
      var src = document.currentScript && document.currentScript.src;
      var m = src && src.match(/[?&]v=([\w-]+)/);
      return (m && m[1]) || String(Date.now());
    } catch (_) {
      return String(Date.now());
    }
  }
  var VERSION = getVersion();

  // Solo textContent (nunca innerHTML): el detalle puede traer texto arbitrario.
  function showGateError(message, detail) {
    var msg = document.getElementById("adminGateMessage");
    var box = document.getElementById("adminGateError");
    var det = document.getElementById("adminGateErrorDetail");
    var loader = document.querySelector(".ad-gate__loader");
    if (msg) msg.textContent = message;
    if (det) det.textContent = detail ? String(detail) : "";
    if (loader) loader.hidden = true;
    if (box) box.hidden = false;
  }

  function bindRetry() {
    var btn = document.getElementById("adminGateRetry");
    if (!btn) return;
    btn.addEventListener("click", function () {
      // Recarga admin.html con cachebuster: el HTML es quien porta el token de
      // versión, así que bajarlo fresco baja también el grafo nuevo completo.
      window.location.replace(window.location.pathname + "?r=" + Date.now());
    });
  }

  // Guarda el último error pre-boot para mostrarlo como detalle del watchdog.
  window.addEventListener("error", function (e) {
    if (!window.__adminBooted) {
      window.__adminLastError = e.message || String(e.error || "");
    }
  });
  window.addEventListener("unhandledrejection", function (e) {
    if (!window.__adminBooted) {
      window.__adminLastError = (e.reason && e.reason.message) || String(e.reason || "");
    }
  });

  function start() {
    bindRetry();

    var watchdog = setTimeout(function () {
      if (window.__adminBooted) return;
      showGateError(
        "El panel está tardando demasiado en cargar. Puede ser tu conexión o una versión desactualizada en caché.",
        window.__adminLastError || ""
      );
    }, WATCHDOG_MS);

    import("./main.js?v=" + VERSION)
      .then(function () {
        clearTimeout(watchdog);
      })
      .catch(function (err) {
        clearTimeout(watchdog);
        console.error("[admin] fallo cargando el panel:", err);
        showGateError(
          "No se pudo cargar el panel. Suele resolverse recargando para bajar la versión más reciente.",
          err && err.message ? err.message : String(err)
        );
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
