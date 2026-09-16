# Requisitos trazables

Cada ID se referencia en commits, en el smoke test y en el informe del revisor.
Verificación: S = `scripts/smoke.sh`, C = `scripts/check-structure.sh`, M = manual/video.

## Acceso y usuarios
| ID | Requisito | Verif. |
|----|-----------|--------|
| R01 | Iniciar y cerrar sesión | S |
| R02 | Dashboard, tablero y admin solo para autenticados (API 401; frontend redirige a login) | S + M |
| R03 | ADMIN: tablero + dashboard + administración de usuarios | S + M |
| R04 | USER: tablero + dashboard, sin administración (API 403, UI oculta el menú) | S + M |
| R05 | Listar, crear y editar usuarios; asignar rol | S |
| R06 | Desactivar y reactivar usuarios | S |
| R07 | Usuario = nombre, email, rol, estado activo/inactivo | S |
| R08 | Inactivo no puede entrar NI seguir usando una sesión abierta | S |
| R09 | Siempre ≥1 admin activo (al desactivar y al degradar) | S |
| R10 | Cuentas demo de ambos roles, cargadas automáticamente y documentadas | S + C |
| R11 | README explica cómo entra un usuario creado desde la app (el admin fija la contraseña al crearlo) | C |

## Tablero
| ID | Requisito | Verif. |
|----|-----------|--------|
| R12 | Único tablero compartido, lienzo libre con post-its, sin columnas | M |
| R13 | Todo usuario activo crea, edita, mueve y elimina cualquier nota | S |
| R14 | Nota = título, texto, estado (Pendiente/En curso/Hecho), posición | S |
| R15 | Edición inline de título, texto y estado sobre la nota, confirmada con botón Guardar | M |
| R16 | Eliminar nota | S + M |
| R17 | Drag & drop con ratón; al soltar se guarda la posición sola | S (PATCH) + M |
| R18 | Contenido, estado y posición persisten al recargar y al reiniciar el entorno sin borrar volúmenes | S --persist |

## Dashboard
| ID | Requisito | Verif. |
|----|-----------|--------|
| R19 | Total de notas y distribución por estado, coherente con el tablero (se actualiza al recargar) | S |
| R20 | Cálculo y entrega mediante ≥1 AWS Lambda | S |

## Local y AWS
| ID | Requisito | Verif. |
|----|-----------|--------|
| R21 | Docker Compose + Dockerfiles; todo corre en local | C + S |
| R22 | Lambda ejecutable en local con mecanismo documentado | S |
| R23 | Local sin cuenta AWS, sin despliegue remoto, sin pago | C |
| R24 | IaC SAM/CloudFormation: EC2 (API en Docker), Lambda, S3 + CloudFront | C |
| R25 | Scripts de despliegue (AWS CLI + SAM) y de retirada | C |
| R26 | Parámetros y requisitos de despliegue documentados; la config AWS corresponde al proyecto | C + revisor |

## Entrega
| ID | Requisito | Verif. |
|----|-----------|--------|
| R27 | README: requisitos, arranque, cuentas demo, uso, persistencia, despliegue, retirada, arquitectura, tiempo, pendientes | C |
| R28 | Video ≤ 8 min que cubra `docs/VIDEO_SCRIPT.md` | M |
| R29 | Versión identificada (hash de commit o archivo) | M |
| R30 | Tiempo empleado ≤ 8 h y declarado | C |

## Detalle de UX del tablero (R12–R17)
- Lienzo de tamaño fijo (p. ej. 3000×2000 px) dentro de un contenedor con scroll; posiciones en px relativas al lienzo.
- Drag con Pointer Events (`pointerdown/move/up` + `setPointerCapture`), solo desde la barra superior de la nota
  para no pelear con los inputs. Clamp a los límites del lienzo.
- En `pointerup`, si la posición cambió → `PATCH /position`. Si falla: revertir y mostrar error.
- Mover NO guarda ediciones pendientes de título/texto/estado (endpoints separados, a propósito).
- Indicador de "cambios sin guardar"; Guardar deshabilitado si no hay cambios.
- Color según estado. La nota enfocada/arrastrada pasa al frente (z-index solo en cliente).
- "Nueva nota" aparece dentro del viewport visible del lienzo.
- Eliminar pide confirmación.
- Ante cualquier 401: limpiar token y mandar a login (R08 del lado del frontend).
