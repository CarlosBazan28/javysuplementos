/* ============================================================================
   Badge de "N visitas" del hero de la home. Muestra get_visit_count() de
   Supabase (ver record_visit()/get_visit_count() y js/include-nav.js, que es
   quien registra la visita en sí). El elemento arranca oculto en el HTML y
   solo se muestra si el RPC devuelve un número real: nunca un placeholder
   inventado ("0", "1,234") mientras carga, y nunca un mensaje de error feo si
   falla — simplemente se queda oculto.
   ============================================================================ */
(async function () {
  const el = document.getElementById("heroVisits");
  const countEl = el?.querySelector(".hero__visits-count");
  const labelEl = el?.querySelector(".hero__visits-label");
  if (!el || !countEl || !labelEl || !window.supabaseClient) return;

  const { data, error } = await window.supabaseClient.rpc("get_visit_count");
  if (error || data === null || data === undefined) {
    console.warn("No se pudo cargar el contador de visitas:", error?.message);
    return;
  }

  const count = Number(data);
  countEl.textContent = count.toLocaleString("es-PA");
  labelEl.textContent = count === 1 ? "visita" : "visitas";

  el.hidden = false;
  // Un frame antes de animar: si se agrega la clase en el mismo tick que se
  // quita `hidden`, el navegador puede colapsar el estado inicial y el
  // fundido no se ve (empieza ya en opacity:1).
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add("hero__visits--in"));
  });
})();
