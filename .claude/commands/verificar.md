---
description: Corre todas las verificaciones y mapea fallas a requisitos
---
1. `docker compose ps`; si algo no está arriba, `make up` y espera el healthcheck de la API.
2. Ejecuta `make smoke`, `make check` y, si existe `infra/template.yaml` y hay SAM CLI, `make validate`.
3. Reporta una tabla: R-xx | estado (✅/❌/➖ no verificable automáticamente) | evidencia.
4. Para cada ❌, causa probable y archivo a tocar. No arregles nada todavía: pregunta si procedo.
