---
description: Guarda tus cambios (commit + push) en tu rama de desarrollo, sin tocar main
---

Guarda mi trabajo en mi rama de desarrollo de forma segura.

1. Mira en qué rama estoy: `git branch --show-current`.
   - Si es `main`, **detente** y avísame: a producción solo se llega por Pull Request.
   - Si no es `claude` ni `codex`, avísame antes de continuar.
2. `git status` para ver si hay cambios sin commitear.
   - Si los hay, pídeme un mensaje de commit claro y descriptivo (o propónmelo tú).
3. Ejecuta el script que hace todo el flujo seguro (pull --ff-only, commit y push a la rama
   actual, bloqueando `main`):

   ```bash
   bash scripts/guardar.sh "<mensaje de commit>"
   ```

   - Si el `pull` falla por divergencia, explícame en lenguaje simple qué pasó antes de resolver.
4. **NUNCA** hagas push a `main`. Regla del proyecto: a producción solo se llega por Pull Request
   `claude → main` o `codex → main` aprobado por el dueño.

> Para ver cómo están todas las ramas (al día / por subir / por bajar), usa `/estado-ramas`.
