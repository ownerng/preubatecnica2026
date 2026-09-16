---
description: Checklist final de entrega
---
1. Genera o completa `README.md` siguiendo `docs/README_TEMPLATE.md`. Contenido real, sin relleno:
   comandos copiables, cuentas demo, cómo entra un usuario creado desde la app, cómo funciona la persistencia
   (volumen `dynamodb-data`, qué la borra), Lambda local (RIE y alternativa `sam local invoke`), parámetros de AWS
   (`ApiImage`, `JwtSecret`, `SeedDemo`, `InstanceType`, `KeyName`, `SshCidr`), requisitos y permisos de despliegue,
   costos aproximados y retirada. Tiempo total desde TIMELOG. Pendientes honestos.
2. `make check` hasta verde. `make smoke` y `make persist` en verde.
3. Ejecuta /revisar.
4. Muéstrame `git log --oneline` y dime el hash que debe ir en el README y el comando para el tag `entrega-v1`.
5. Recuérdame: grabar el video con `docs/VIDEO_SCRIPT.md` (≤ 8 min), verificar que el enlace sea público,
   y si desplegué en AWS, poner la URL de CloudFront y cómo entrar.
