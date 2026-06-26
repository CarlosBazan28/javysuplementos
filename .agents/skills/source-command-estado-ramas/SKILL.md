---
name: "source-command-estado-ramas"
description: "Muestra el estado de las ramas (al día / por subir / por bajar / detrás de main)"
---

# source-command-estado-ramas

Use this skill when the user asks to run the migrated source command `estado-ramas`.

## Command Template

Muéstrame cómo están mis ramas de desarrollo.

1. Ejecuta el script de estado:

   ```bash
   bash scripts/estado-ramas.sh
   ```

2. Resume el resultado en lenguaje claro, sin jerga:
   - Qué rama está **al día**.
   - Qué rama tiene cambios **por subir** (commits locales sin pushear) → sugerir `guardar`.
   - Qué rama tiene cambios **por bajar** (el remoto tiene cosas nuevas) → sugerir traerlas.
   - Qué rama está **detrás de `main`** y cuántos commits.
3. No hagas cambios: este comando **solo informa**.
