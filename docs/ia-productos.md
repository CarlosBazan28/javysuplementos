# Llenar productos con IA (Fase 4)

En el formulario de producto del panel, los campos **Descripción larga**,
**Beneficios** y **Modo de uso** tienen un botón **"✨ Llenar con IA"**. Al
tocarlo, la IA busca información del producto (por **nombre + marca**, y la
**presentación** si está) en fuentes confiables y redacta el texto siguiendo las
reglas de la tienda. Si **no** encuentra información confiable del producto
exacto, **no inventa**: muestra un aviso en rojo en ese campo.

## Cómo está armado (seguro)

El sitio es estático: la clave de IA **no puede** vivir en el navegador (se
robaría). Por eso la llamada la hace una **Supabase Edge Function**
(`supabase/functions/ai-fill/`) del lado servidor:

1. El botón del panel llama a la función con `{ field, name, brand, presentation }`.
2. La función **valida que quien llama sea admin** (misma función `is_admin()`
   de la base de datos) — nadie sin sesión de administrador puede usarla.
3. Llama a **Claude (`claude-opus-4-8`) con búsqueda web nativa**, aplica las
   reglas por campo y devuelve `{ ok: true, content }` o `{ ok: false }`.
4. La **clave vive solo como secreto de Supabase**, nunca en el repo ni en el navegador.

Reglas que aplica la IA: descripción = qué es y qué aporta (sin promesas
médicas); beneficios = 3–5 bullets con "Apoya/Contribuye a/Ayuda a"; modo de uso
= pasos con la medida correcta (scoop/cápsula/ml) y último paso siempre "Consulta
la dosis indicada en la etiqueta del producto"; terminología **"servidas"** (no
"servicios").

## Puesta en marcha (una sola vez)

Necesitás el [CLI de Supabase](https://supabase.com/docs/guides/local-development)
y una **clave de API de Anthropic** (https://console.anthropic.com → API Keys).

```bash
# 1. Enlazar el proyecto (si no lo hiciste antes)
supabase link --project-ref fodwjfiyfmscklqsqrip

# 2. Guardar la clave como secreto (NO se sube al repo)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# 3. Desplegar la función
supabase functions deploy ai-fill
```

`SUPABASE_URL` y `SUPABASE_ANON_KEY` ya vienen inyectadas por Supabase en las
Edge Functions; no hay que configurarlas.

> **Alternativa sin CLI:** en el dashboard de Supabase → *Edge Functions* podés
> crear `ai-fill`, pegar `supabase/functions/ai-fill/index.ts`, y en *Settings →
> Edge Functions → Secrets* agregar `ANTHROPIC_API_KEY`.

## Costo

Cada "Llenar con IA" es una llamada corta con búsqueda web. Usa `claude-opus-4-8`
por calidad; si querés abaratar, se cambia el modelo en una sola línea de
`supabase/functions/ai-fill/index.ts` (ej. a un modelo más económico de Claude).

## Verificación

- En el panel, abrí un producto, escribí **nombre + marca** reales y tocá
  "✨ Llenar con IA" en Descripción: debe rellenarse con texto del producto.
- Probá con un nombre inventado: debe salir el aviso rojo "No se encontró
  información confiable…".
- Sin nombre o sin marca: avisa "Escribe primero el nombre y la marca del producto."
