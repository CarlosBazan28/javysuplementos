/* ============================================================================
   Aparición de secciones al hacer scroll (ver css/components/reveal.css).

   Por qué marca el <html> con .js-reveal en vez de dejar el estado oculto en el
   CSS a secas: si el CSS escondiera los elementos por su cuenta y este script
   no llegara a correr (error de red, JS desactivado, navegador viejo sin
   IntersectionObserver), la página quedaría con secciones invisibles y sin
   nada que las devuelva. Marcando desde acá, esconder solo pasa cuando ya
   sabemos que hay quien revele.

   Se ejecuta antes de pintar (el script va con defer, o sea después del parse
   del HTML pero antes de DOMContentLoaded), así que no hay parpadeo.
   ============================================================================ */
(function () {
  "use strict";

  var soporta = "IntersectionObserver" in window;
  var movimientoReducido = window.matchMedia
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Sin soporte o con movimiento reducido no se esconde nada: la clase nunca
  // se agrega y el CSS de reveal queda inerte.
  if (!soporta || movimientoReducido) return;

  document.documentElement.classList.add("js-reveal");

  function activar() {
    var objetivos = document.querySelectorAll(".reveal");
    if (!objetivos.length) return;

    var observer = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add("is-visible");
        // Una sola vez: al volver a subir no se re-anima (marearía) y además
        // deja de costar trabajo al observer.
        observer.unobserve(entrada.target);
      });
    }, {
      threshold: 0.15,
      // El -80px de abajo hace que dispare un poco ANTES de que el borde
      // superior toque el viewport: así el elemento ya está entrando animado
      // cuando el ojo llega, en vez de arrancar tarde.
      rootMargin: "0px 0px -80px 0px"
    });

    objetivos.forEach(function (el) {
      // Lo que ya está en pantalla al cargar (por deep link con #hash, o por
      // recarga a media página) se muestra sin animar: animar algo que el
      // usuario YA está mirando se ve como un glitch.
      var caja = el.getBoundingClientRect();
      if (caja.top < window.innerHeight && caja.bottom > 0) {
        el.classList.add("is-visible");
        return;
      }
      observer.observe(el);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", activar);
  } else {
    activar();
  }
})();
