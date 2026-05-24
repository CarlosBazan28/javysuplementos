(function () {
  const LOGIN_MODAL_ID = "adminLoginModal";
  const LOGIN_OPEN_SELECTOR = "[data-admin-login]";
  const ADMIN_PAGE = "admin.html";

  let modal;
  let form;
  let errorBox;
  let submitBtn;
  let emailInput;
  let passwordInput;
  let lastFocusedElement;

  function hasSupabase() {
    return Boolean(window.supabaseClient);
  }

  function normalizeText(value = "") {
    return value.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function getFriendlyAuthError(error) {
    const message = normalizeText(error?.message || "");

    if (message.includes("invalid login credentials") || message.includes("invalid credentials")) {
      return "Credenciales incorrectas. Revisa el correo y la contrasena.";
    }

    if (message.includes("email not confirmed") || message.includes("confirm")) {
      return "Este usuario existe, pero falta confirmarlo en Supabase Auth.";
    }

    if (message.includes("failed to fetch") || message.includes("network") || message.includes("fetch")) {
      return "No se pudo conectar con Supabase. Revisa internet e intenta de nuevo.";
    }

    if (message.includes("admin_profiles") || message.includes("schema cache")) {
      return "Falta ejecutar el schema.sql actualizado en Supabase para validar administradores.";
    }

    return error?.message || "No se pudo iniciar sesion. Intenta nuevamente.";
  }

  function setLoginError(message = "") {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.hidden = !message;
  }

  function setLoading(isLoading) {
    if (!submitBtn) return;
    submitBtn.disabled = isLoading;
    submitBtn.classList.toggle("is-loading", isLoading);
    submitBtn.querySelector("[data-login-btn-text]").textContent = isLoading ? "Validando..." : "Iniciar sesion";
  }

  async function getAdminProfile(userId) {
    if (!hasSupabase() || !userId) return null;

    const { data, error } = await supabaseClient
      .from("admin_profiles")
      .select("id, user_id, role, is_active")
      .eq("user_id", userId)
      .eq("role", "admin")
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  async function getCurrentAdminSession() {
    if (!hasSupabase()) return { session: null, profile: null };

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;

    const session = data?.session || null;
    if (!session?.user?.id) return { session: null, profile: null };

    const profile = await getAdminProfile(session.user.id);
    return { session, profile };
  }

  function closeLoginModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("auth-modal-open");
    setLoginError("");
    setLoading(false);
    lastFocusedElement?.focus?.();
  }

  function openLoginModal() {
    if (!modal) createLoginModal();
    lastFocusedElement = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("auth-modal-open");
    setLoginError("");
    requestAnimationFrame(() => emailInput?.focus());
  }

  async function handleAdminEntry(event) {
    event?.preventDefault?.();

    try {
      if (!hasSupabase()) {
        openLoginModal();
        setLoginError("Supabase no esta disponible. Revisa la conexion o el CDN.");
        return;
      }

      const { session, profile } = await getCurrentAdminSession();
      if (session && profile) {
        window.location.href = ADMIN_PAGE;
        return;
      }

      openLoginModal();
    } catch (error) {
      openLoginModal();
      setLoginError(getFriendlyAuthError(error));
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    setLoginError("");

    if (!email) {
      setLoginError("Escribe el correo del administrador.");
      emailInput.focus();
      return;
    }

    if (!password) {
      setLoginError("Escribe la contrasena.");
      passwordInput.focus();
      return;
    }

    if (!email.includes("@")) {
      setLoginError("El correo debe tener formato valido.");
      emailInput.focus();
      return;
    }

    if (!hasSupabase()) {
      setLoginError("Supabase no esta disponible. Revisa la conexion o el CDN.");
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const profile = await getAdminProfile(data?.user?.id);
      if (!profile) {
        await supabaseClient.auth.signOut();
        throw new Error("No tienes permisos de administrador.");
      }

      window.location.href = ADMIN_PAGE;
    } catch (error) {
      setLoginError(getFriendlyAuthError(error));
    } finally {
      setLoading(false);
    }
  }

  function createLoginModal() {
    if (document.getElementById(LOGIN_MODAL_ID)) {
      modal = document.getElementById(LOGIN_MODAL_ID);
      form = modal.querySelector("[data-admin-login-form]");
      errorBox = modal.querySelector("[data-admin-login-error]");
      submitBtn = modal.querySelector("[data-admin-login-submit]");
      emailInput = modal.querySelector("#adminLoginEmail");
      passwordInput = modal.querySelector("#adminLoginPassword");
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.id = LOGIN_MODAL_ID;
    wrapper.className = "auth-modal";
    wrapper.hidden = true;
    wrapper.innerHTML = `
      <div class="auth-modal__backdrop" data-admin-login-close></div>
      <section class="auth-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="adminLoginTitle">
        <button class="auth-modal__close" type="button" aria-label="Cerrar inicio de sesion" data-admin-login-close>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </button>
        <p class="auth-modal__eyebrow">Acceso privado</p>
        <h2 id="adminLoginTitle">Entrar al panel de Javy</h2>
        <p class="auth-modal__copy">Solo administradores registrados en Supabase pueden modificar productos, sabores e inicio.</p>
        <p class="auth-modal__error" data-admin-login-error hidden aria-live="polite"></p>
        <form class="auth-modal__form" data-admin-login-form novalidate>
          <label for="adminLoginEmail">Correo</label>
          <input id="adminLoginEmail" type="email" autocomplete="email" placeholder="admin@correo.com" required />
          <label for="adminLoginPassword">Contrasena</label>
          <input id="adminLoginPassword" type="password" autocomplete="current-password" placeholder="Tu contrasena" required />
          <button class="auth-modal__submit" type="submit" data-admin-login-submit>
            <span data-login-btn-text>Iniciar sesion</span>
            <span class="auth-modal__spinner" aria-hidden="true"></span>
          </button>
        </form>
      </section>
    `;

    document.body.appendChild(wrapper);
    modal = wrapper;
    form = modal.querySelector("[data-admin-login-form]");
    errorBox = modal.querySelector("[data-admin-login-error]");
    submitBtn = modal.querySelector("[data-admin-login-submit]");
    emailInput = modal.querySelector("#adminLoginEmail");
    passwordInput = modal.querySelector("#adminLoginPassword");

    form.addEventListener("submit", handleLoginSubmit);
    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-admin-login-close]")) closeLoginModal();
    });
  }

  function bindLoginButtons() {
    document.querySelectorAll(LOGIN_OPEN_SELECTOR).forEach((button) => {
      if (button.dataset.adminLoginBound === "true") return;
      button.dataset.adminLoginBound = "true";
      button.addEventListener("click", handleAdminEntry);
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal && !modal.hidden) closeLoginModal();
  });

  document.addEventListener("DOMContentLoaded", () => {
    createLoginModal();
    bindLoginButtons();
  });

  document.addEventListener("javy:nav-ready", bindLoginButtons);

  window.javyAuth = {
    openLoginModal,
    closeLoginModal,
    getAdminProfile,
    getCurrentAdminSession,
    getFriendlyAuthError,
  };
})();
