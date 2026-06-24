---
name: "source-command-revisar-cambios"
description: "Revisión paralela de diseño y lógica de los cambios actuales"
---

# source-command-revisar-cambios

Use this skill when the user asks to run the migrated source command `revisar-cambios`.

## Command Template

Revisa los cambios actuales del proyecto lanzando DOS subagentes EN PARALELO
(en un solo mensaje, para que corran a la vez):

1. Subagente **disenador** → audita diseño, CSS y responsive (3 breakpoints).
2. Subagente **logica** → audita JS, funcionalidad y seguridad (escapeHTML, etc.).

Dales como contexto el resultado de `git diff` (o, si no hay cambios sin
commitear, los últimos commits de la rama). Cuando ambos terminen:

- Consolida los hallazgos en UNA lista priorizada: **Crítico / Recomendado / Opcional**.
- Cada hallazgo con `archivo:línea` y una propuesta concreta de arreglo.
- Pregúntame cuáles aplico antes de tocar nada.
