---
description: Convertir imágenes PNG pesadas a WebP optimizado y actualizar referencias
argument-hint: [ruta de imagen opcional]
---

Optimiza imágenes del proyecto a WebP (convención del proyecto: preferir WebP).

1. Si te di una ruta ($ARGUMENTS), trabaja esa imagen. Si no, busca las pesadas:
   `find img -name "*.png" -size +500k`
2. Para cada imagen, convierte a WebP con buena calidad/peso:
   `cwebp -q 82 entrada.png -o salida.webp`
   - Si `cwebp` no está instalado, avísame y te doy una alternativa (Squoosh web
     o `npx @squoosh/cli`).
3. Actualiza TODAS las referencias de esa imagen (`.png` → `.webp`) en HTML, JS y
   `js/product-data.js`. Usa Grep para encontrarlas todas.
4. Muéstrame el ahorro de tamaño (antes → después, en KB y %).
5. **No borres el PNG original** hasta que yo confirme que el WebP se ve bien.
