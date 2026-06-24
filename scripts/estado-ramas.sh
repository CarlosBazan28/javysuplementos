#!/usr/bin/env bash
# estado-ramas.sh — Muestra el estado de las ramas de desarrollo.
# Para cada rama (main, claude, codex) dice si está al día, por subir o por
# bajar respecto a origin, y cuánto está "detrás de main".
# Uso: bash scripts/estado-ramas.sh
set -u

RAMAS="main claude codex"
actual="$(git branch --show-current 2>/dev/null || true)"

echo "Actualizando referencias de origin…"
if ! git fetch --quiet origin 2>/dev/null; then
  echo "⚠️  No se pudo conectar con origin (¿sin internet?). Muestro lo último conocido."
fi
echo

printf "%-2s%-9s %-26s %s\n" "" "RAMA" "VS ORIGIN (tu copia)" "VS MAIN (producción)"
printf "%-2s%-9s %-26s %s\n" "" "----" "--------------------" "--------------------"

for r in $RAMAS; do
  marca="  "
  [ "$r" = "$actual" ] && marca="* "

  # ¿Existe la rama en origin?
  if ! git show-ref --verify --quiet "refs/remotes/origin/$r"; then
    printf "%s%-9s %s\n" "$marca" "$r" "(no existe en origin)"
    continue
  fi

  # Estado vs su propia remota.
  if git show-ref --verify --quiet "refs/heads/$r"; then
    counts="$(git rev-list --left-right --count "$r...origin/$r" 2>/dev/null || echo "0	0")"
    ahead="$(echo "$counts" | awk '{print $1}')"
    behind="$(echo "$counts" | awk '{print $2}')"
    if [ "${ahead:-0}" -eq 0 ] && [ "${behind:-0}" -eq 0 ]; then
      vs_origin="✅ al día"
    elif [ "${behind:-0}" -eq 0 ]; then
      vs_origin="⬆️  $ahead por subir"
    elif [ "${ahead:-0}" -eq 0 ]; then
      vs_origin="⬇️  $behind por bajar"
    else
      vs_origin="⚠️  $ahead subir / $behind bajar"
    fi
  else
    vs_origin="(solo en origin)"
  fi

  # Cuánto está detrás de main (commits de producción que esta rama aún no tiene).
  if [ "$r" = "main" ]; then
    vs_main="—"
  else
    detras="$(git rev-list --count "origin/$r..origin/main" 2>/dev/null || echo 0)"
    if [ "${detras:-0}" -eq 0 ]; then
      vs_main="✅ al día con main"
    else
      vs_main="🔀 $detras detrás de main"
    fi
  fi

  printf "%s%-9s %-26s %s\n" "$marca" "$r" "$vs_origin" "$vs_main"
done

echo
echo "* = rama en la que estás ahora"
