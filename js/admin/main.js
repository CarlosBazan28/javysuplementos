/* ============================================================================
   JAVY / P-BOOM ADMIN — entry point (ES module).
   Valida sesión de admin, carga el catálogo y monta el shell.
   El controlador está dividido en módulos bajo js/admin/:
   config · state · helpers · ui · view · data · shell · sections/* · drawers/*
   ============================================================================ */
import { state } from "./state.js";
import { $ } from "./helpers.js";
import { setGate } from "./ui.js";
import { showViewError } from "./view.js";
import { loadAll } from "./data.js";
import { buildChrome, go } from "./shell.js";

async function boot() {
  if (!window.javyAuth || !window.javyAuth.hasSupabase()) {
    setGate("Supabase no está disponible. Revisa la conexión y recarga.");
    return;
  }
  try {
    const { session, profile } = await window.javyAuth.requireAdminSession();
    if (!session || !profile) {
      window.location.href = "login.html";
      return;
    }
    state.userId = session.user.id;
    state.userEmail = session.user.email || null;
    setGate("Cargando catálogo…");
    await loadAll();
    buildChrome();
    $("#adminGate").hidden = true;
    $("#adminShell").hidden = false;
    go("dashboard");
  } catch (error) {
    console.error(error);
    // El gate puede estar oculto si ya mostramos el shell; mostrar el error
    // donde se vea (la vista) además del gate.
    setGate("No se pudo validar el acceso: " + (error.message || error));
    if (!$("#adminShell").hidden) showViewError(error, "el panel");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
