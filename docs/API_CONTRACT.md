# Contrato HTTP (`/api`)

Errores: `{"error": {"code": "STRING", "message": "texto"}}`. Auth: `Authorization: Bearer <jwt>`.
UserDto: `{id, name, email, role, active}` — nunca `passwordHash`.
Sin token o token inválido/revocado/usuario inactivo → 401 `UNAUTHORIZED`.

## Salud y auth
| Método | Ruta | Rol | Body | Respuesta |
|---|---|---|---|---|
| GET | /api/health | — | — | 200 `{"status":"ok"}` |
| POST | /api/auth/login | — | `{email, password}` | 200 `{token, user}` · 401 `INVALID_CREDENTIALS` (también si inactivo) |
| POST | /api/auth/logout | auth | — | 204 (incrementa tokenVersion) |
| GET | /api/auth/me | auth | — | 200 UserDto |

## Usuarios (solo ADMIN; USER → 403 `FORBIDDEN`)
| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| GET | /api/users | — | 200 `[UserDto]` |
| POST | /api/users | `{name, email, password, role}` | 201 UserDto · 409 `EMAIL_TAKEN` · 400 `VALIDATION` |
| PUT | /api/users/{id} | `{name, email, role, password?}` | 200 · 404 · 409 `EMAIL_TAKEN` · 409 `LAST_ADMIN` |
| PATCH | /api/users/{id}/status | `{active}` | 200 · 404 · 409 `LAST_ADMIN` |

Validación: name 1–100, email válido (se guarda en minúsculas), password ≥ 8 al crear (opcional al editar), role ∈ {ADMIN, USER}.

## Notas (cualquier usuario activo)
NoteDto: `{id, title, text, status, x, y, createdAt, updatedAt}`
| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| GET | /api/notes | — | 200 `[NoteDto]` |
| POST | /api/notes | `{title, text, status?, x, y}` | 201 (status por defecto `PENDIENTE`) |
| PUT | /api/notes/{id} | `{title, text, status}` | 200 · 404 · 400 |
| PATCH | /api/notes/{id}/position | `{x, y}` | 200 · 404 · 400 (x, y ≥ 0) |
| DELETE | /api/notes/{id} | — | 204 · 404 |

Validación: title 1–120, text 0–2000, status ∈ {PENDIENTE, EN_CURSO, HECHO}.

## Métricas
| Método | Ruta | Respuesta |
|---|---|---|
| GET | /api/metrics | 200 `{total, byStatus:{PENDIENTE, EN_CURSO, HECHO}, generatedAt, source:"lambda"}` · 502 `METRICS_UNAVAILABLE` |

Payload de la Lambda (el evento se ignora): `{total, byStatus, generatedAt}`; las tres claves de estado
siempre presentes. Scan paginado con `ProjectionExpression: "#s"` (status es palabra reservada).

## Cuentas demo
| Rol | Email | Contraseña |
|---|---|---|
| ADMIN | admin@demo.local | Admin123! |
| USER | usuario@demo.local | Usuario123! |
