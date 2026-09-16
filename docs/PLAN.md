# Plan por fases (presupuesto: 480 min)

Regla: una fase por sesión de Claude Code (`/fase N`). Cada fase cierra con su DoD verificado, TIMELOG actualizado y commit.
Si una fase se pasa 50% de su presupuesto: parar, recortar alcance y anotarlo en pendientes.

- [x] **F0 — Esqueleto (30 min)** · R21 R23
  Estructura de carpetas, `docker-compose.yml` operativo, Spring Boot con `/api/health`, Dockerfiles de api/web/metrics,
  frontend React+Bun mínimo (`bun install` + `bun run build` dentro del Dockerfile) servido por nginx con proxy `/api`,
  `.gitignore`, `.env.example`.
  DoD: `make up` levanta los 4 servicios; `curl localhost:3000/api/health` → ok; `make lambda` responde (aunque sea stub).

- [x] **F1 — Auth y usuarios (90 min)** · R01–R11
  Config DynamoDB (endpoint opcional), creación de tablas local, seed demo, BCrypt, JWT con `tv`, filtro que recarga
  usuario, manejo de errores uniforme, endpoints auth y users, regla último admin.
  DoD: secciones auth/users/inactivo/último admin de `make smoke` en verde.

- [x] **F2 — Notas API (45 min)** · R13 R14 R16 R17(API) R18
  CRUD + PATCH posición, validaciones.
  DoD: sección notas de `make smoke` en verde; `make persist` en verde.

- [x] **F3 — Lambda de métricas (45 min)** · R19 R20 R22
  `app.py` con scan paginado, cliente en la API con modos `http` y `sdk`, `GET /api/metrics`.
  DoD: sección métricas de `make smoke` en verde (incluye coherencia con `GET /api/notes`).

- [x] **F4 — Frontend base y admin (60 min)** · R01–R07 R10
  Login, guardado de token, `src/api.js` con manejo global de 401, rutas protegidas según rol (`react-router`),
  pantalla de usuarios (tabla, crear, editar, activar/desactivar, mensajes de error de la API).
  DoD: flujo manual con ambas cuentas demo; USER no ve Administración ni puede entrar por URL.

- [x] **F5 — Tablero (75 min)** · R12–R18
  Lienzo, componente `<Note>`, crear, edición inline + Guardar, eliminar, drag con Pointer Events y guardado al soltar.
  Seguir "Detalle de UX" de SPEC.md.
  DoD: crear/editar/mover/eliminar, recargar y reiniciar compose (`make down && make up`) y todo sigue igual.

- [x] **F6 — Dashboard (15 min)** · R19 R20
  Tarjetas total + por estado, botón Recargar, indicar que viene de Lambda.
  DoD: cambiar estados en el tablero, recargar dashboard y cuadran.

- [x] **F7 — IaC AWS (60 min)** · R24–R26
  `infra/template.yaml` según checklist de ARCHITECTURE.md, `scripts/deploy.sh`, `scripts/destroy.sh`,
  `samconfig.toml.example`, workflow opcional para publicar la imagen de la API en GHCR.
  DoD: `make validate` sin errores. El deploy real lo decide y lo ejecuta el humano.

- [x] **F8 — Entrega (45 min)** · R27–R30
  README completo, revisión con el subagente `revisor-requisitos`, grabar video con `docs/VIDEO_SCRIPT.md`,
  tag `entrega-v1`.
  DoD: `make check` en verde y todos los R-xx en ✅ o listados en pendientes.

Colchón: 15 min.

## Riesgos conocidos
- Boilerplate de Spring Security + DynamoDB Enhanced Client es lo que más come tiempo en F1. Si pasa de 120 min,
  simplificar: filtro JWT propio sin abstracciones extra, mapeo manual con `Map<String, AttributeValue>` si el
  Enhanced Client da guerra.
- El `bun install` + `bun run build` del frontend alarga el primer `make up`: copiar `package.json`/`bun.lock`
  en una capa aparte para que Docker cachee las dependencias.
- DynamoDB Local con volumen puede fallar por permisos → `user: root` en compose (ya incluido).
- Si no se despliega en AWS, decirlo explícitamente en el README; el template igual debe validar.
