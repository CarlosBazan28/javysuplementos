// ============================================================================
// ai-fill — Edge Function (Deno) que rellena campos del producto con IA.
//
// Recibe { field, name, brand, presentation } desde el panel admin, valida que
// quien llama sea administrador, y le pide a Claude (con búsqueda web nativa)
// un texto basado en fuentes confiables. Si no encuentra información fiable del
// producto exacto (nombre + marca), NO inventa: responde { ok: false }.
//
// La clave de la IA vive SOLO como secreto de Supabase (ANTHROPIC_API_KEY),
// nunca en el repo ni en el navegador.
//
// Deploy:  supabase functions deploy ai-fill
// Secreto: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// El navegador está en otro origen (javysuplementos.com) que la función
// (*.supabase.co), así que necesitamos CORS. La seguridad real es el JWT de
// admin que se valida abajo, no el origen.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

// Reglas de contenido por campo (las que pidió el dueño).
const FIELD_RULES: Record<string, string> = {
  description_long:
    "Escribe la DESCRIPCIÓN LARGA: un texto claro de QUÉ es el producto y qué lo " +
    "hace especial o qué aporta. Solo hechos verificables del producto exacto. " +
    "Sin promesas médicas ni curativas. 2 a 4 oraciones, en un solo párrafo.",
  beneficios:
    "Escribe los BENEFICIOS: entre 3 y 5 bullets cortos, UNO POR LÍNEA (sin viñetas " +
    "ni guiones al inicio). Cada línea empieza con la ventaja y usa verbos como " +
    "\"Apoya\", \"Contribuye a\", \"Ayuda a\". Sin promesas médicas.",
  uso:
    "Escribe el MODO DE USO: pasos cortos, UNO POR LÍNEA (sin numeración ni guiones). " +
    "Usa la medida correcta según el formato del producto (polvo → \"scoop\"; " +
    "cápsula/tableta → \"cápsula(s)\"/\"tableta(s)\"; líquido → \"ml\"). " +
    "El ÚLTIMO paso debe ser exactamente: " +
    "\"Consulta la dosis indicada en la etiqueta del producto.\"",
};

async function callClaude(userPrompt: string): Promise<string> {
  const system =
    "Eres un asistente experto en suplementos deportivos para una tienda en Panamá. " +
    "Usa la herramienta de búsqueda web para encontrar información del producto EXACTO " +
    "(por nombre y marca) en el sitio del fabricante y fuentes reputadas. " +
    "Reglas de idioma: escribe en español neutro; usa el término \"servidas\" (NUNCA " +
    "\"servicios\" ni \"porciones\") para las dosis del envase. No inventes datos: si no " +
    "encuentras información confiable del producto exacto, indícalo. " +
    "Responde SIEMPRE con un único objeto JSON válido, sin markdown ni texto extra, con " +
    'esta forma: {"ok": true, "content": "..."} si encontraste información confiable, o ' +
    '{"ok": false} si no. En "content" va SOLO el texto pedido para el campo.';

  const messages: Array<{ role: string; content: unknown }> = [
    { role: "user", content: userPrompt },
  ];

  // La búsqueda web corre en un bucle server-side que puede pausar (pause_turn);
  // reanudamos reenviando el historial hasta un máximo de vueltas.
  for (let attempt = 0; attempt < 4; attempt++) {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-8",
        max_tokens: 1200,
        system,
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }],
        messages,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      throw new Error(`Anthropic ${resp.status}: ${detail.slice(0, 300)}`);
    }

    const data = await resp.json();

    if (data.stop_reason === "refusal") return JSON.stringify({ ok: false });

    if (data.stop_reason === "pause_turn") {
      // Reanudar: adjuntamos la respuesta del asistente y volvemos a pedir.
      messages.push({ role: "assistant", content: data.content });
      continue;
    }

    // Concatenamos los bloques de texto de la respuesta final.
    const text = (data.content || [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("")
      .trim();
    return text;
  }
  // Se agotaron las reanudaciones sin una respuesta final.
  return JSON.stringify({ ok: false });
}

// Extrae el objeto JSON de la respuesta del modelo (por si viene con texto
// alrededor o vallas de markdown).
function parseModelJson(text: string): { ok: boolean; content?: string } {
  let t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  try {
    const obj = JSON.parse(t);
    if (obj && obj.ok === true && typeof obj.content === "string" && obj.content.trim()) {
      return { ok: true, content: obj.content.trim() };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  if (!ANTHROPIC_API_KEY) return json({ error: "missing_api_key" }, 500);

  // ---- Autenticación: exige un admin real (mismo criterio que el panel) ----
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return json({ error: "unauthorized" }, 401);

  const { data: isAdmin, error: adminErr } = await supabase.rpc("is_admin");
  if (adminErr || isAdmin !== true) return json({ error: "forbidden" }, 403);

  // ---- Entrada ----
  let body: { field?: string; name?: string; brand?: string; presentation?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const field = String(body.field || "");
  const name = String(body.name || "").trim();
  const brand = String(body.brand || "").trim();
  const presentation = String(body.presentation || "").trim();

  const rule = FIELD_RULES[field];
  if (!rule) return json({ error: "invalid_field" }, 400);
  if (!name || !brand) return json({ ok: false }); // sin nombre+marca no se puede verificar

  const userPrompt =
    `Producto: ${name}\nMarca: ${brand}` +
    (presentation ? `\nPresentación: ${presentation}` : "") +
    `\n\n${rule}\n\nRecuerda: responde SOLO el objeto JSON indicado.`;

  try {
    const raw = await callClaude(userPrompt);
    const result = parseModelJson(raw);
    return json(result);
  } catch (e) {
    console.error("ai-fill error:", e instanceof Error ? e.message : e);
    return json({ error: "ai_failed" }, 502);
  }
});
