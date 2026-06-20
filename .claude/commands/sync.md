---
description: Sincroniza la rama claude (pull seguro + push) sin tocar main
---

Sincroniza mi trabajo en la rama `claude` de forma segura.

1. Verifica en qué rama estoy: `git branch --show-current`.
   - Si NO es `claude`, avísame antes de hacer nada.
2. `git status` para ver si hay cambios sin commitear.
   - Si los hay, pregúntame si los commiteo (con un mensaje claro y descriptivo)
     o los dejo pendientes.
3. `git pull origin claude` para traer lo último del remoto.
   - Si hay conflictos, explícamelos en lenguaje simple antes de resolver.
4. Si hay commits para subir, `git push origin claude`.
5. **NUNCA** hagas push a `main`. Regla del proyecto: a producción solo se llega
   por Pull Request `claude → main` aprobado por el dueño.
