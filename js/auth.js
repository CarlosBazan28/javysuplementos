(function () {
  function hasSupabase() {
    return Boolean(window.supabaseClient);
  }

  function normalizeText(value = "") {
    return value.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function isValidEmail(value = "") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function getFriendlyAuthError(error) {
    const message = normalizeText(error?.message || "");

    if (message.includes("invalid login credentials") || message.includes("invalid credentials")) {
      return "Credenciales incorrectas. Revisa el correo y la contraseña.";
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

    if (message.includes("exclusive-admin-access")) {
      return "El acceso es exclusivo para administración.";
    }

    return error?.message || "No se pudo iniciar sesión. Intenta nuevamente.";
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

  async function requireAdminSession() {
    if (!hasSupabase()) {
      throw new Error("Supabase no está disponible. Revisa el CDN o la conexión.");
    }

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;

    const session = data?.session || null;
    if (!session?.user?.id) return { session: null, profile: null };

    const profile = await getAdminProfile(session.user.id);
    if (!profile) {
      await supabaseClient.auth.signOut();
      return { session: null, profile: null };
    }

    return { session, profile };
  }

  // Suscribe un callback que se dispara cuando la sesión se pierde (logout en otra
  // pestaña, token vencido/revocado). Ignora INITIAL_SESSION para no redirigir al
  // cargar. Devuelve una función para cancelar la suscripción.
  function watchSession(onSignedOut) {
    if (!hasSupabase()) return () => {};
    const { data } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (event !== "INITIAL_SESSION" && !session)) {
        onSignedOut();
      }
    });
    return () => data?.subscription?.unsubscribe();
  }

  window.javyAuth = {
    hasSupabase,
    isValidEmail,
    getAdminProfile,
    getCurrentAdminSession,
    requireAdminSession,
    watchSession,
    getFriendlyAuthError,
  };
})();
