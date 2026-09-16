---
description: Ejecuta una fase del plan (uso: /fase 1)
argument-hint: <número de fase>
---
Vas a ejecutar la fase F$ARGUMENTS de `docs/PLAN.md`.

1. Lee `CLAUDE.md`, la fase F$ARGUMENTS en `docs/PLAN.md` y los IDs R-xx que cubre en `docs/SPEC.md`.
   Consulta `docs/API_CONTRACT.md` y `docs/ARCHITECTURE.md` según aplique.
2. Antes de escribir código, dame un plan corto (archivos a crear/modificar, máx. 10 líneas) y el riesgo principal.
   Luego ejecútalo sin esperar confirmación, salvo que el plan contradiga CLAUDE.md.
3. Implementa solo lo de esta fase. Nada de fases futuras ni extras fuera de alcance.
4. Verifica el DoD de la fase: `make up` y las secciones relevantes de `make smoke` (y `make persist` si aplica).
   Si algo falla, corrígelo y vuelve a verificar. Máximo 3 ciclos; si sigue fallando, para y explícame el bloqueo.
5. Marca la casilla de la fase en `docs/PLAN.md`.
6. Cierra con: qué quedó, qué R-xx cubre, resultado de las pruebas (conteo OK/FAIL), desviaciones del contrato
   (idealmente ninguna) y el mensaje de commit sugerido `feat(fase-$ARGUMENTS): ...`.
   Recuérdame registrar el tiempo con /tiempo. No hagas commit tú.
