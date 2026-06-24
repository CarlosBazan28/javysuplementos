---
description: Muestra el estado de las ramas (al día / por subir / por bajar / detrás de main)
---

Muéstrame cómo están mis ramas de desarrollo.

1. Ejecuta el script de estado:

   ```bash
   bash scripts/estado-ramas.sh
   ```

2. Resume el resultado en lenguaje claro, sin jerga:
   - Qué rama tengo **al día**.
   - Qué rama tiene cambios **por subir** (commits locales sin pushear) → sugerir `/guardar`.
   - Qué rama tiene cambios **por bajar** (el remoto tiene cosas nuevas) → sugerir traerlas.
   - Qué rama está **detrás de `main`** (le faltan cambios ya en producción) y cuántos commits.
3. Si alguna rama está muy detrás de `main`, recuérdame que conviene actualizarla con
   `git merge origin/main` para que no se separe.
4. No hagas cambios: este comando **solo informa**.
