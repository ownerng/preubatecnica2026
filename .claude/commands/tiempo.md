---
description: Registra tiempo en TIMELOG.md (uso: /tiempo F1 09:00 10:35 nota)
argument-hint: <fase> <inicio HH:MM> <fin HH:MM> [nota]
---
Agrega una fila a la tabla de `TIMELOG.md` con fecha de hoy y los datos: $ARGUMENTS
Calcula los minutos. Después muestra el total acumulado, lo que queda de los 480 min y lo que el plan
presupuestaba hasta la fase indicada. Si vamos más de 20% por encima, sugiere qué recortar concretamente.
