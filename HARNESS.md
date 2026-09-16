# Cómo usar este harness

1. Copia el contenido de esta carpeta a la raíz del repo nuevo, `git init`, primer commit.
2. Anota fecha/hora de recepción del enunciado en `TIMELOG.md`.
3. Abre Claude Code en la raíz. Flujo:
   - `/fase 0` … `/fase 8` en orden (una por sesión o con `/clear` entre fases)
   - `/tiempo F1 09:00 10:30 nota` al cerrar cada bloque
   - `/verificar` cuando algo huela raro
   - `/revisar` después de F3, F5 y antes de entregar
   - `/entrega` al final
4. Requisitos en tu máquina: Docker, make, curl, jq. Para F7: SAM CLI (solo `validate`).

Qué hace cada pieza:
- `CLAUDE.md` — contexto permanente, stack, invariantes y reglas.
- `docs/SPEC.md` — enunciado convertido en requisitos R01–R30 con método de verificación.
- `docs/API_CONTRACT.md` — contrato que el smoke test da por hecho; si cambias el contrato, cambia el test.
- `docs/ARCHITECTURE.md` — decisiones, modelo de datos, variables y checklist del template SAM.
- `docs/PLAN.md` — 9 fases con presupuesto (480 min) y DoD.
- `scripts/smoke.sh` — E2E con curl: auth, roles, usuarios, inactivos, último admin, notas, Lambda, logout. `--persist` reinicia compose y valida persistencia.
- `scripts/check-structure.sh` — archivos de entrega, recursos del template, secciones del README, total del TIMELOG.
- `.claude/hooks/guard-bash.sh` — bloquea deploys, escrituras en AWS, borrado de volúmenes y force push.
- `.claude/agents/revisor-requisitos.md` — auditor de solo lectura con las trampas típicas de esta prueba.

Mueve `HARNESS.md` y `docs/README_TEMPLATE.md` fuera del entregable o déjalos; no estorban.
