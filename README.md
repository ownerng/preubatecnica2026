# Portal de equipo con tablero de notas

Portal con login, tablero único de post-its compartido, dashboard de métricas calculadas por una
AWS Lambda y administración de usuarios. Todo corre en local con Docker Compose y se despliega en
AWS con SAM.

> Versión entregada: tag `entrega-v1` (ver archivo `VERSION`).
> El hash exacto del commit etiquetado: `git rev-parse entrega-v1`.
> Tiempo empleado: 1 h 25 min (detalle en `TIMELOG.md`).

## Requisitos
- Docker + Docker Compose v2 y `make`.
- `curl` y `jq` para las pruebas (`make smoke`).
- Para desplegar en AWS: AWS CLI v2, SAM CLI y credenciales con permisos sobre
  CloudFormation, IAM, EC2, S3, CloudFront, Lambda y DynamoDB.
- No hace falta cuenta de AWS para el entorno local: DynamoDB corre en `amazon/dynamodb-local` y las
  credenciales son `local/local`.
- No hace falta tener Java ni Bun instalados: la API y el frontend se compilan dentro de Docker.

## Arranque
```bash
make up        # levanta dynamodb, metrics (Lambda), api y web
```
Portal en <http://localhost:3000>. La primera vez tarda unos minutos (compila la API con Maven y el
frontend con Bun).

Otros comandos:
```bash
make logs      # logs de los 4 servicios
make down      # para el entorno SIN borrar datos
make reset     # para y BORRA el volumen de DynamoDB (pide confirmación)
make smoke     # prueba E2E completa contra localhost
make persist   # verifica que las notas sobreviven a down + up
make lambda    # invoca la Lambda local directamente
make check     # revisa la estructura de la entrega
make validate  # sam validate --lint (no despliega)
```

## Cuentas de demostración
Se crean solas la primera vez que arranca la API (solo si la tabla de usuarios está vacía).

| Rol | Email | Contraseña |
|---|---|---|
| ADMIN | admin@demo.local | `Admin123!` |
| USER | usuario@demo.local | `Usuario123!` |

## Uso
- **Login**: cualquier ruta protegida sin sesión redirige a `/login`.
- **Tablero** (`/board`): cualquier usuario activo crea, edita, mueve y elimina cualquier nota.
  La nota se edita en el sitio (título, texto y estado) y los cambios se confirman con **Guardar**;
  mientras haya cambios sin guardar aparece un punto rojo en la barra de la nota. Para mover, arrastra
  la nota por su barra superior: al soltarla se guarda la posición sola (`PATCH /api/notes/{id}/position`).
  Eliminar pide confirmación. Estados: Pendiente, En curso, Hecho.
- **Dashboard** (`/dashboard`): total de notas y distribución por estado, con botón **Recargar**.
  Las cifras las calcula siempre la Lambda (`source: "lambda"`); la API solo la invoca y reenvía.
- **Administración** (`/admin`, solo ADMIN): lista de usuarios, crear, editar (nombre, email, rol y
  contraseña opcional) y activar/desactivar. Un USER no ve el menú y, si entra por URL, vuelve al tablero
  (la API responde 403 de todas formas).

**Cómo entra un usuario creado desde la app**: el administrador lo crea en *Administración → Nuevo
usuario* indicando nombre, email, rol y **la contraseña que le asigna** (mínimo 8 caracteres). Esa es la
contraseña con la que el usuario entra en `/login`; después el admin puede cambiársela editando el
usuario (al cambiarla se cierran sus sesiones abiertas).

Reglas que la API impone siempre:
- Todo `/api` exige JWT salvo `/api/health` y `/api/auth/login`.
- En cada petición se recarga el usuario desde DynamoDB: si está inactivo o su `tokenVersion` no coincide
  con el token, responde 401. Un usuario desactivado queda fuera al instante, incluso con la sesión abierta.
- Siempre debe quedar al menos un administrador activo: desactivar o degradar al último devuelve
  409 `LAST_ADMIN`.
- El email se guarda en minúsculas y es único (409 `EMAIL_TAKEN`). Las contraseñas van con BCrypt y
  nunca se devuelve el hash.

## Persistencia
DynamoDB Local guarda en el volumen `dynamodb-data` (`-sharedDb -dbPath`). `make down` + `make up`
conserva usuarios y notas con su contenido, estado y posición; se comprueba con:
```bash
make persist
```
Solo `make reset` (o `docker compose down -v`) borra los datos.

## Lambda en local
El servicio `metrics` usa la imagen base oficial de Lambda para Python 3.12, que trae el
**Runtime Interface Emulator**. Es el mismo `lambda/metrics/app.py` que se despliega en AWS.
Invocación directa:
```bash
make lambda
# {"total": 3, "byStatus": {"PENDIENTE": 1, "EN_CURSO": 1, "HECHO": 1}, "generatedAt": "..."}
```
Alternativa documentada: `sam local invoke MetricsFunction -t infra/template.yaml` pasando
`DYNAMODB_ENDPOINT`.

## Pruebas
```bash
make smoke     # 51 comprobaciones: auth, roles, usuarios, inactivos, último admin, notas, métricas, logout
make persist   # persistencia tras reiniciar el entorno
make check     # estructura de la entrega, README y TIMELOG
```
El frontend se verificó a mano en el navegador con ambas cuentas demo (login, tablero con arrastre,
dashboard, administración y bloqueo de `/admin` para USER).

## Arquitectura
Local:
```
navegador ─► web (nginx :3000) ─/api─► api (Spring Boot :8080) ─► dynamodb (local :8000, volumen)
                                           │
                                           └─HTTP al RIE─► metrics (Lambda Python :9001) ─► dynamodb
```
AWS:
```
navegador ─► CloudFront ─default─► S3 (frontend React, privado, OAC)
                        └─/api/*─► EC2 (Docker: api, 80→8080) ─► DynamoDB (Users, Notes)
                                     │ rol IAM de instancia
                                     └─lambda:Invoke─► Lambda metrics ─► DynamoDB Notes (lectura)
```
- **API**: Java 21 + Spring Boot 3, Spring Security con JWT propio (claim `tv` = `tokenVersion`),
  AWS SDK v2 (DynamoDB Enhanced Client, Lambda).
- **Frontend**: React 19 compilado con Bun; el `dist/` lo sirve nginx en local y S3 + CloudFront en AWS.
  Siempre llama a la ruta relativa `/api`, así que no hay CORS ni contenido mixto.
- **Métricas**: Lambda en Python 3.12 con scan paginado sobre `Notes`.
- **Datos**: DynamoDB. `Users` (PK `id`, GSI `email-index`) y `Notes` (PK `id`).

Decisiones y detalle en `docs/ARCHITECTURE.md`; requisitos trazables en `docs/SPEC.md`; contrato HTTP
en `docs/API_CONTRACT.md`.

## Despliegue en AWS
IaC en `infra/template.yaml` (SAM/CloudFormation): tablas DynamoDB, Lambda de métricas, EC2 con la API
en Docker, S3 privado + CloudFront con Origin Access Control.

Antes de desplegar hay que **publicar la imagen de la API** en un registro accesible (por ejemplo GHCR
público):
```bash
docker build -t ghcr.io/USUARIO/portal-api:1.0.0 api/
docker push ghcr.io/USUARIO/portal-api:1.0.0
```

Parámetros del stack:

| Parámetro | Para qué | Ejemplo |
|---|---|---|
| `ApiImage` | Imagen Docker de la API que baja la instancia EC2 | `ghcr.io/USUARIO/portal-api:1.0.0` |
| `JwtSecret` | Secreto HS256 (NoEcho, mínimo 32 caracteres) | `una-cadena-larga-y-secreta-de-32+` |
| `SeedDemo` | Sembrar cuentas demo si `Users` está vacía | `true` |
| `InstanceType` | Tamaño de la instancia | `t3.micro` |
| `KeyName` / `SshCidr` | SSH opcional a la instancia | vacío = sin SSH |
| `CloudFrontPrefixListId` | Prefix list `com.amazonaws.global.cloudfront.origin-facing` de la región | `pl-3b927c52` (us-east-1) |
| `LatestAmiId` | AMI de Amazon Linux 2023 (parámetro SSM, no tocar) | valor por defecto |

Despliegue:
```bash
cp infra/samconfig.toml.example infra/samconfig.toml   # y edita los parámetros
./scripts/deploy.sh                                    # sam build + deploy, sube el frontend e invalida la caché
```
El script deja la URL de CloudFront por pantalla. La primera carga tarda un par de minutos mientras
EC2 instala Docker y baja la imagen.

## Retirada de recursos en AWS
```bash
./scripts/destroy.sh     # vacía el bucket del frontend y borra el stack (pide confirmación)
```
Borra también las tablas DynamoDB y sus datos.

## Tiempo empleado
1 h 25 min efectivos sobre un presupuesto de 8 h. Desglose por fases en `TIMELOG.md`.

## Limitaciones y pendientes
- **No se ha desplegado en AWS**: el template está escrito y validado con `cfn-lint` (sin errores), pero
  `make validate` (`sam validate --lint`) no se ha ejecutado porque SAM CLI no está instalado en la
  máquina de desarrollo. Tampoco se ha hecho `sam deploy`.
- **Video de la entrega (R28) pendiente de grabar**; el guion está en `docs/VIDEO_SCRIPT.md`.
- La entrega es un **commit único** con tag `entrega-v1`: no hay historial por fases porque el trabajo se
  versionó al terminar.
- `CloudFrontPrefixListId` trae el valor de us-east-1; en otra región hay que consultarlo con
  `aws ec2 describe-managed-prefix-lists`.
- El stack usa la VPC y las subredes **por defecto** de la cuenta: no crea red propia ni acepta un
  `SubnetId` como parámetro.
- `JwtSecret` viaja en el UserData de la instancia EC2 (aunque el parámetro sea `NoEcho`), así que es
  legible desde el metadata de la instancia. Para producción habría que leerlo de SSM Parameter Store o
  Secrets Manager al arrancar el contenedor.
- `scripts/smoke.sh` deja desactivado el usuario `smoke-*` que crea en cada ejecución: la tabla de
  usuarios los va acumulando.
- Sin tests unitarios: la verificación es el smoke E2E (`scripts/smoke.sh`, 51 comprobaciones) más la
  revisión manual del frontend en el navegador.
- Unicidad de email y "último administrador activo" se comprueban con lectura previa, sin transacción:
  hay una condición de carrera teórica con escrituras simultáneas (tabla pequeña, riesgo asumido).
- El logout incrementa `tokenVersion`, así que cierra la sesión en todos los dispositivos del usuario.
- El tablero no es en tiempo real: los cambios de otro usuario se ven al recargar.
- Fuera de alcance por el enunciado: tableros múltiples, columnas, asignación de notas, fechas,
  comentarios, adjuntos, notificaciones e historial.
