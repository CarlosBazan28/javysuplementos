// ============================================================================
// Edge Function `admin-users` — crear, eliminar y resetear contraseñas de los
// usuarios del panel.
//
// Por qué existe: la API de Supabase Auth para administrar usuarios exige la
// service_role key, que NUNCA puede vivir en el navegador (el sitio es
// estático y cualquiera vería el JS). Esta función es la única pieza de
// servidor del proyecto: recibe la petición, verifica contra la base de datos
// que quien llama sea Admin, y recién ahí usa la llave secreta.
//
// Desplegar:  supabase functions deploy admin-users
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya vienen inyectadas por Supabase.
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ROLES = ["admin", "editor", "viewer"];
const MIN_PASSWORD = 8;

// Solo el sitio propio puede llamar a esta función desde el navegador.
const ORIGIN_OK = [
  /^https:\/\/(www\.)?javysuplementos\.com$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

function cors(origin: string | null) {
  const allowed = origin && ORIGIN_OK.some((re) => re.test(origin)) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json" },
  });
}

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405, origin);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader) return json({ error: "Falta la sesión." }, 401, origin);

  // --- 1. ¿Quién llama? Se resuelve contra la BD, nunca contra el body. ---
  const asCaller = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await asCaller.auth.getUser();
  const caller = userData?.user;
  if (userError || !caller) return json({ error: "Sesión inválida." }, 401, origin);

  const { data: canManage, error: rpcError } = await asCaller.rpc("can_manage_users");
  if (rpcError) return json({ error: "No se pudo verificar el permiso." }, 500, origin);
  if (canManage !== true) {
    return json({ error: "Solo un Admin puede gestionar usuarios." }, 403, origin);
  }

  // --- 2. Ya verificado: se puede usar la llave con privilegios. ---
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Petición malformada." }, 400, origin);
  }
  const action = String(body.action || "");

  const log = async (summary: string, extra: Record<string, unknown> = {}) => {
    await admin.from("activity_log").insert({
      actor_email: caller.email,
      entity_type: "admin",
      summary,
      ...extra,
    });
  };

  try {
    if (action === "create") return await create(body, { admin, caller, origin, log });
    if (action === "delete") return await remove(body, { admin, caller, origin, log });
    if (action === "set_password") return await setPassword(body, { admin, origin, log });
    return json({ error: "Acción desconocida." }, 400, origin);
  } catch (e) {
    console.error(action, e);
    return json({ error: (e as Error).message || "Error inesperado." }, 500, origin);
  }
});

/* -------------------------------------------------------------------------- */
/* Acciones                                                                    */
/* -------------------------------------------------------------------------- */

// deno-lint-ignore no-explicit-any
type Ctx = { admin: any; caller?: any; origin: string | null; log: (s: string, e?: Record<string, unknown>) => Promise<void> };

async function create(body: Record<string, unknown>, { admin, caller, origin, log }: Ctx) {
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const role = String(body.role || "viewer");
  const displayName = String(body.display_name || "").trim() || email.split("@")[0];

  if (!isEmail(email)) return json({ error: "El correo no es válido." }, 400, origin);
  if (password.length < MIN_PASSWORD) {
    return json({ error: `La contraseña necesita al menos ${MIN_PASSWORD} caracteres.` }, 400, origin);
  }
  if (!ROLES.includes(role)) return json({ error: "Rol desconocido." }, 400, origin);

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // lo crea un Admin: no hay correo de confirmación que esperar
  });
  if (createError) {
    const msg = /already|registered|exists/i.test(createError.message)
      ? "Ya existe un usuario con ese correo."
      : createError.message;
    return json({ error: msg }, 400, origin);
  }

  const { data: profile, error: profileError } = await admin
    .from("admin_profiles")
    .insert({
      user_id: created.user.id,
      email,
      display_name: displayName,
      role,
      is_active: true,
      created_by: caller.email,
    })
    .select("id, user_id, email, display_name, role, is_active, created_at")
    .single();

  if (profileError) {
    // Sin perfil, el usuario de Auth quedaría huérfano (existe pero no puede
    // entrar y nadie lo ve en el panel). Se revierte.
    await admin.auth.admin.deleteUser(created.user.id);
    return json({ error: "No se pudo crear el perfil: " + profileError.message }, 500, origin);
  }

  await log(`creó el usuario ${email} con rol ${role}`, {
    action: "create",
    entity_id: created.user.id,
    entity_name: email,
    new_value: role,
  });

  return json({ profile }, 200, origin);
}

async function remove(body: Record<string, unknown>, { admin, caller, origin, log }: Ctx) {
  const id = String(body.id || "");
  if (!id) return json({ error: "Falta el usuario a eliminar." }, 400, origin);

  const { data: profile, error } = await admin
    .from("admin_profiles")
    .select("id, user_id, email, role, is_active")
    .eq("id", id)
    .maybeSingle();
  if (error) return json({ error: error.message }, 500, origin);
  if (!profile) return json({ error: "Ese usuario ya no existe." }, 404, origin);

  if (profile.user_id === caller.id) {
    return json({ error: "No puedes eliminar tu propio usuario." }, 400, origin);
  }

  if (profile.role === "admin" && profile.is_active) {
    const { count } = await admin
      .from("admin_profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("is_active", true);
    if ((count || 0) <= 1) {
      return json({ error: "Es el último Admin activo. Asigna el rol Admin a otra persona antes de eliminarlo." }, 400, origin);
    }
  }

  // El FK admin_profiles.user_id → auth.users tiene ON DELETE CASCADE, así que
  // borrar el usuario de Auth se lleva también su perfil.
  const { error: deleteError } = await admin.auth.admin.deleteUser(profile.user_id);
  if (deleteError) return json({ error: deleteError.message }, 500, origin);

  await log(`eliminó el usuario ${profile.email || "(sin email)"}`, {
    action: "delete",
    entity_id: profile.user_id,
    entity_name: profile.email,
  });

  return json({ ok: true }, 200, origin);
}

async function setPassword(body: Record<string, unknown>, { admin, origin, log }: Ctx) {
  const id = String(body.id || "");
  const password = String(body.password || "");
  if (!id) return json({ error: "Falta el usuario." }, 400, origin);
  if (password.length < MIN_PASSWORD) {
    return json({ error: `La contraseña necesita al menos ${MIN_PASSWORD} caracteres.` }, 400, origin);
  }

  const { data: profile, error } = await admin
    .from("admin_profiles")
    .select("user_id, email")
    .eq("id", id)
    .maybeSingle();
  if (error) return json({ error: error.message }, 500, origin);
  if (!profile) return json({ error: "Ese usuario ya no existe." }, 404, origin);

  const { error: updateError } = await admin.auth.admin.updateUserById(profile.user_id, { password });
  if (updateError) return json({ error: updateError.message }, 500, origin);

  await log(`reseteó la contraseña de ${profile.email || "(sin email)"}`, {
    action: "update",
    entity_id: profile.user_id,
    entity_name: profile.email,
    field: "contraseña",
  });

  return json({ ok: true }, 200, origin);
}
