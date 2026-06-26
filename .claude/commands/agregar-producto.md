---
description: Agregar un producto nuevo manteniendo Supabase y product-data.js sincronizados
argument-hint: [nombre y datos del producto]
---

Vas a ayudarme a agregar un producto nuevo: $ARGUMENTS

Contexto importante (deuda técnica conocida): los productos viven en DOS lugares
y deben quedar sincronizados:
- **Supabase** (fuente principal: tablas `products` y `product_flavors`)
- **js/product-data.js** (fallback local que usa el sitio si Supabase no responde)

Pasos:
1. Pídeme los datos que falten: nombre, marca, categoría, precio, presentación,
   imagen, sabores (con disponibilidad de cada uno), beneficios[], descripcion[],
   uso[]. **No inventes datos**: si falta algo, pregúntame.
2. Mira otros productos en `js/product-data.js` y genera el objeto nuevo con el
   MISMO formato. Usa un `id`/slug consistente con los existentes.
3. Dame el `INSERT` de SQL para Supabase según `supabase/schema.sql`
   (producto + sus sabores).
4. Si hay imagen nueva, recuérdame guardarla en `img/products/` en **WebP**.
5. Al terminar, resúmeme qué cambió y recuérdame correr `/ver-sitio` para verlo.
