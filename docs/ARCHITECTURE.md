# Arquitectura y decisiones

## Local (docker compose)
```
navegador ─► web (nginx :3000) ─/api─► api (Spring Boot :8080) ─► dynamodb (local :8000, volumen)
                                           │
                                           └─HTTP al RIE─► metrics (Lambda Python, :9001) ─► dynamodb
```

## AWS (SAM)
```
navegador ─► CloudFront ─default─► S3 (frontend, privado, OAC)
                        └─/api/*─► EC2 (Docker: api, :80→8080) ─► DynamoDB (Users, Notes)
                                     │ rol IAM de instancia
                                     └─lambda:Invoke─► Lambda metrics ─► DynamoDB Notes (lectura)
```
El frontend (build estático de React) usa siempre la ruta relativa `/api`: mismo bundle en local (nginx)
y en AWS (S3 + CloudFront).
Sin CORS y sin contenido mixto (CloudFront termina HTTPS; el origen EC2 va por HTTP).

## Decisiones
- **D1 DynamoDB.** Lo leen EC2 y Lambda sin VPC, sin RDS ni costo fijo; tiene emulador oficial con
  persistencia en disco (`-sharedDb -dbPath`).
- **D2 Métricas vía API → Lambda.** El frontend llama `GET /api/metrics`; la API invoca la Lambda
  (`METRICS_MODE=http` en local contra el RIE; `METRICS_MODE=sdk` en AWS con `LambdaClient.invoke`).
  Sin API Gateway ni Function URL pública; la autorización vive en un solo lugar.
- **D3 Lambda local con Runtime Interface Emulator** (`public.ecr.aws/lambda/python:3.12`) dentro del compose.
  Alternativa documentada: `sam local invoke MetricsFunction` con `DYNAMODB_ENDPOINT`.
  El mismo `app.py` se despliega con SAM como zip.
- **D4 JWT + recarga del usuario en cada request.** Claim `tv` = tokenVersion. Logout incrementa tokenVersion
  → invalida el token (cierra sesión en todos los dispositivos; aceptado y documentado).
- **D5 Inicialización.** La API crea tablas si no existen cuando `CREATE_TABLES=true` (solo local) y siembra
  las cuentas demo si Users está vacía y `SEED_DEMO=true`. En AWS las tablas las crea CloudFormation.
- **D6 Imagen de la API en AWS.** EC2 hace `docker pull` del parámetro `ApiImage` (p. ej. GHCR público)
  para no sumar ECR. UserData instala Docker y corre `docker run -d --restart=always -p 80:8080 ...`.
- **D7 Unicidad de email** con GSI `email-index` consultado antes de escribir. Carrera teórica aceptada.
- **D8 Último admin** contado con scan (tabla pequeña), sin transacción. Carrera teórica aceptada.
- **D9 Frontend React + Bun.** Dockerfile multietapa: `oven/bun:1` corre `bun install --frozen-lockfile`
  y `bun run build`; nginx sirve el `dist/` resultante. SPA sin SSR: enrutado en cliente con `react-router`
  y fallback a `index.html`: `try_files` en nginx y, en CloudFront, una CloudFront Function de
  viewer-request asociada SOLO al comportamiento por defecto (con `CustomErrorResponses` los 403/404
  de `/api/*` también se convertirían en 200 con HTML).
  Estado en hooks (`useState`/`useEffect`), sin Redux ni librería de datos.

## Modelo de datos
**Users** — PK `id` (UUID); GSI `email-index` (PK `email`)
`id, name, email, passwordHash, role(ADMIN|USER), active, tokenVersion, createdAt, updatedAt`

**Notes** — PK `id` (UUID)
`id, title, text, status(PENDIENTE|EN_CURSO|HECHO), x, y, createdBy, createdAt, updatedAt`

## Variables de entorno de la API
| Variable | Local | AWS |
|---|---|---|
| DYNAMODB_ENDPOINT | http://dynamodb:8000 | vacía (endpoint real) |
| AWS_REGION | us-east-1 | región del stack |
| USERS_TABLE / NOTES_TABLE | Users / Notes | nombres del stack |
| CREATE_TABLES | true | false |
| SEED_DEMO | true | parámetro |
| JWT_SECRET | valor dev | parámetro NoEcho |
| JWT_TTL_MINUTES | 480 | 480 |
| METRICS_MODE | http | sdk |
| METRICS_URL | http://metrics:8080/2015-03-31/functions/function/invocations | — |
| METRICS_FUNCTION_NAME | — | nombre de la Lambda |

## Checklist de `infra/template.yaml`
- Parameters: `ApiImage`, `JwtSecret` (NoEcho), `SeedDemo`, `InstanceType` (t3.micro), `KeyName` y `SshCidr` opcionales,
  `LatestAmiId` tipo SSM (`/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64`).
- DynamoDB Users (+GSI) y Notes, `PAY_PER_REQUEST`.
- `AWS::Serverless::Function` Metrics: python3.12, `CodeUri: ../lambda/metrics`, `DynamoDBReadPolicy` sobre Notes, env `NOTES_TABLE`.
- EC2: SecurityGroup (80 desde el prefix list de CloudFront `com.amazonaws.global.cloudfront.origin-facing`),
  IAM Role + InstanceProfile (CRUD en ambas tablas + `lambda:InvokeFunction` sobre Metrics), Instance con UserData.
- S3 privado + `AWS::CloudFront::OriginAccessControl` + BucketPolicy para `cloudfront.amazonaws.com` con `AWS:SourceArn`.
- CloudFront: origen S3 por defecto (`DefaultRootObject: index.html` + `AWS::CloudFront::Function` de viewer-request
  que reescribe a `/index.html` las rutas sin extensión, asociada solo al comportamiento por defecto); origen EC2 (`PublicDnsName`, `http-only`)
  para `/api/*` con `CachingDisabled` + `AllViewerExceptHostHeader`, métodos GET/HEAD/OPTIONS/PUT/PATCH/POST/DELETE.
- Outputs: `CloudFrontUrl`, `FrontendBucket`, `DistributionId`, `ApiPublicDns`, `MetricsFunctionName`.
- `deploy.sh`: `sam build` → `sam deploy --guided` (o con `samconfig.toml`) → build del frontend
  (`docker run --rm -v "$PWD/frontend":/app -w /app oven/bun:1 sh -c "bun install && bun run build"`) →
  `aws s3 sync frontend/dist/ s3://...` → `aws cloudfront create-invalidation`. `destroy.sh`: vaciar bucket → `sam delete`.
- Requisitos de deploy a documentar: AWS CLI v2, SAM CLI, Bun (o Docker, que ya basta para el build del frontend), credenciales con permisos CFN/IAM/EC2/S3/CloudFront/Lambda/DynamoDB,
  imagen de la API publicada y accesible.
