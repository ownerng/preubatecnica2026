#!/usr/bin/env bash
# Recordatorio no bloqueante al cerrar un turno si hubo cambios de código y el TIMELOG no se tocó hoy.
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0
changed=$(git status --porcelain -- api frontend lambda infra scripts 2>/dev/null | wc -l)
today=$(date +%F)
if [ "$changed" -gt 0 ] && ! grep -q "$today" TIMELOG.md 2>/dev/null; then
  echo "Recordatorio: hay cambios sin registrar hoy en TIMELOG.md (usa /tiempo)." >&2
fi
exit 0
