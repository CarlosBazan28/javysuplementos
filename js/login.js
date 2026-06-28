(function () {
  const activeSessionView = document.getElementById("loginActiveSession");
  const formWrap = document.getElementById("loginFormWrap");
  const form = document.getElementById("loginForm");
  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");
  const emailError = document.getElementById("loginEmailError");
  const passwordError = document.getElementById("loginPasswordError");
  const generalError = document.getElementById("loginError");
  const submitButton = document.getElementById("loginSubmit");
  const submitText = submitButton?.querySelector("[data-login-text]");
  const signOutButton = document.getElementById("loginSignOut");
  const signOutText = signOutButton?.querySelector("[data-signout-text]");

  function showForm(message = "") {
    activeSessionView.hidden = true;
    formWrap.hidden = false;
    signOutButton.disabled = false;
    if (signOutText) signOutText.textContent = "Cerrar sesión";
    setGeneralError(message);
    submitButton.classList.remove("is-success", "is-loading");
    submitButton.disabled = false;
    if (submitText) submitText.textContent = "Iniciar sesión";
    emailInput.focus();
  }

  function showActiveSession() {
    activeSessionView.hidden = false;
    formWrap.hidden = true;
    signOutButton.disabled = false;
    if (signOutText) signOutText.textContent = "Cerrar sesión";
  }

  function setGeneralError(message = "") {
    generalError.textContent = message;
    generalError.hidden = !message;
  }

  function setFieldError(input, target, message = "") {
    target.textContent = message;
    input.setAttribute("aria-invalid", message ? "true" : "false");
  }

  function clearErrors() {
    setGeneralError("");
    setFieldError(emailInput, emailError, "");
    setFieldError(passwordInput, passwordError, "");
  }

  function setLoading(state, text = "Validando acceso...") {
    submitButton.disabled = state;
    submitButton.classList.toggle("is-loading", state);
    if (submitText) submitText.textContent = state ? text : "Iniciar sesión";
  }

  function setSuccessLoading() {
    submitButton.disabled = true;
    submitButton.classList.remove("is-loading");
    submitButton.classList.add("is-success");
    if (submitText) submitText.textContent = "Acceso validado";
  }

  function validateForm() {
    clearErrors();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    let valid = true;

    if (!email) {
      setFieldError(emailInput, emailError, "Escribe tu correo electrónico.");
      valid = false;
    } else if (!window.javyAuth.isValidEmail(email)) {
      setFieldError(emailInput, emailError, "Escribe un correo electrónico válido.");
      valid = false;
    }

    if (!password) {
      setFieldError(passwordInput, passwordError, "Escribe tu contraseña.");
      valid = false;
    }

    return valid;
  }

  async function checkExistingSession() {
    if (!window.javyAuth?.hasSupabase?.()) {
      showForm("Supabase no está disponible. Revisa la conexión o el CDN.");
      return;
    }

    try {
      const { data, error } = await supabaseClient.auth.getSession();
      if (error) throw error;

      const session = data?.session || null;
      if (!session?.user?.id) {
        showForm();
        return;
      }

      const profile = await window.javyAuth.getAdminProfile(session.user.id);
      if (profile) {
        showActiveSession();
        return;
      }

      showForm("El acceso es exclusivo para administración.");
    } catch (error) {
      showForm(window.javyAuth.getFriendlyAuthError(error));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validateForm()) return;

    if (!window.javyAuth?.hasSupabase?.()) {
      setGeneralError("Supabase no está disponible. Revisa la conexión o el CDN.");
      return;
    }

    try {
      setLoading(true);

      // Turnstile: si el widget cargó, mandamos el token. La validación real la hace
      // Supabase (Auth → captcha). Si el script no cargó, no bloqueamos el login para no
      // dejar al admin afuera; el captcha se vuelve obligatorio cuando se activa en Supabase.
      let captchaToken = "";
      try { captchaToken = window.turnstile?.getResponse?.() || ""; } catch (_) {}

      const credentials = {
        email: emailInput.value.trim(),
        password: passwordInput.value,
      };
      if (captchaToken) credentials.options = { captchaToken };

      const { data, error } = await supabaseClient.auth.signInWithPassword(credentials);

      if (error) throw error;

      const profile = await window.javyAuth.getAdminProfile(data?.user?.id);
      if (!profile) {
        await supabaseClient.auth.signOut();
        throw new Error("exclusive-admin-access");
      }

      setSuccessLoading();
      window.setTimeout(() => {
        window.location.href = "admin.html";
      }, 900);
    } catch (error) {
      // Un token de Turnstile es de un solo uso: reiniciamos el widget para el reintento.
      try { window.turnstile?.reset?.(); } catch (_) {}
      setGeneralError(window.javyAuth.getFriendlyAuthError(error));
      setLoading(false);
      passwordInput.value = "";
      passwordInput.focus();
    }
  }

  async function handleSignOut() {
    try {
      signOutButton.disabled = true;
      if (signOutText) signOutText.textContent = "Cerrando sesión...";
      await supabaseClient.auth.signOut();
      emailInput.value = "";
      passwordInput.value = "";
      clearErrors();
      showForm();
    } catch (error) {
      signOutButton.disabled = false;
      if (signOutText) signOutText.textContent = "Cerrar sesión";
      showForm(window.javyAuth.getFriendlyAuthError(error));
    }
  }

  form?.addEventListener("submit", handleSubmit);
  signOutButton?.addEventListener("click", handleSignOut);
  emailInput?.addEventListener("input", () => setFieldError(emailInput, emailError, ""));
  passwordInput?.addEventListener("input", () => setFieldError(passwordInput, passwordError, ""));

  document.addEventListener("DOMContentLoaded", () => {
    showForm();
    checkExistingSession();
  });
})();
