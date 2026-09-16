# Portal de equipo con tablero de notas — prueba técnica

Lee esto antes de tocar código. Fuente de verdad de requisitos: `docs/SPEC.md` (IDs R-xx).
Arquitectura y decisiones: `docs/ARCHITECTURE.md`. Contrato HTTP: `docs/API_CONTRACT.md`.
Plan y presupuesto de tiempo: `docs/PLAN.md`. Registro de horas: `TIMELOG.md`.

## Stack (decidido, no cambiar sin ADR nuevo en ARCHITECTURE.md)
- API: Java 21 + Spring Boot 3, Spring Security (JWT), AWS SDK v2 (DynamoDB Enhanced Client, Lambda).
- Persistencia: DynamoDB (local: `amazon/dynamodb-local` con volumen; AWS: tablas on-demand).
- Métricas: AWS Lambda en Python 3.12 (local: imagen base de Lambda con Runtime Interface Emulator).
- Frontend: React 19 + Bun (gestor de paquetes y bundler: `bun install`, `bun run build`).
  Local: el `dist/` lo sirve nginx, que proxya `/api` a la API.
- IaC: AWS SAM (`infra/template.yaml`) + scripts `scripts/deploy.sh` y `scripts/destroy.sh`.

## Estructura objetivo
```
api/                 Spring Boot (Dockerfile incluido)
lambda/metrics/      app.py, requirements.txt, Dockerfile (RIE local)
frontend/            package.json, bun.lock, index.html, src/ (login, board, dashboard, admin);
                     nginx.conf; Dockerfile (bun build + nginx)
infra/template.yaml  SAM/CloudFormation
scripts/             deploy.sh, destroy.sh, smoke.sh, check-structure.sh
docker-compose.yml   dynamodb, metrics, api, web
```

## Comandos
- `make up` / `make down` / `make logs` / `make reset` (reset borra datos: pedir confirmación al humano)
- `make smoke` → prueba E2E contra localhost (requiere `curl` y `jq`)
- `make persist` → verifica que notas sobreviven `down` + `up`
- `make check` → estructura de entrega, README y TIMELOG
- `make lambda` → invoca la Lambda local directamente
- `make validate` → `sam validate --lint` (no despliega)

## Invariantes (no negociables)
1. Todo endpoint bajo `/api` excepto `/api/health` y `/api/auth/login` exige JWT válido.
2. En CADA request autenticado se recarga el usuario desde DynamoDB: si está inactivo o
   `tokenVersion` no coincide con el claim `tv` → 401. Así un usuario desactivado queda fuera al instante.
3. Siempre debe quedar ≥1 administrador activo. Validarlo al desactivar Y al cambiar rol → 409 `LAST_ADMIN`.
4. Endpoints `/api/users/**` solo rol ADMIN (403 para USER).
5. Nunca devolver `passwordHash`. Contraseñas con BCrypt. Email normalizado a minúsculas y único (409).
6. Estados de nota: exactamente `PENDIENTE`, `EN_CURSO`, `HECHO`.
7. Las métricas del dashboard SIEMPRE salen de la Lambda. La API solo la invoca y reenvía (`source: "lambda"`).
   Prohibido calcular conteos en Java como "fallback".
8. Cualquier usuario activo puede crear/editar/mover/eliminar cualquier nota.
9. La ejecución local no depende de cuenta AWS (credenciales dummy `local/local`).

## Reglas de trabajo
- Trabaja UNA fase de `docs/PLAN.md` a la vez. Al terminar: `make smoke` (si aplica), `make check`,
  actualiza la casilla de la fase y propón un commit `feat(fase-N): ...`. No avances sin que el humano lo diga.
- Fuera de alcance (no implementar): tableros múltiples, columnas, asignación, fechas, comentarios, adjuntos,
  notificaciones, historial, tiempo real, apps móviles, dominio propio, servicios AWS extra
  (nada de API Gateway, RDS, Cognito, ECR salvo ADR).
- NO ejecutar `sam deploy`, `aws ... create/delete/put`, `scripts/deploy.sh`, `scripts/destroy.sh`
  ni `docker compose down -v`. Un hook lo bloquea; si hace falta, pídele al humano que lo corra.
- Si un requisito es ambiguo, anota la interpretación en `docs/ARCHITECTURE.md` (sección Decisiones) y sigue.
- Todo lo que quede pendiente va a la sección "Limitaciones y pendientes" del README, no se esconde.
- Código simple > código elegante. Presupuesto total: 8 h efectivas.
