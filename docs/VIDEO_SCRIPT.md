# Guion del video (≤ 8 min)

| t | Qué mostrar | R |
|---|---|---|
| 0:00–0:45 | Repo, estructura de carpetas, diagrama de arquitectura (local y AWS), hash del commit | R29 |
| 0:45–1:15 | `make up`, servicios arriba, `make lambda` | R21 R22 |
| 1:15–1:45 | Intentar entrar a `/board` sin sesión → login. Login con usuario inválido | R02 R01 |
| 1:45–3:00 | Login como admin: menú completo. Crear usuario, editarlo, cambiar rol, desactivar. Intentar desactivar al único admin → error | R03 R05 R06 R09 |
| 3:00–3:30 | En otra ventana (incógnito) sesión del usuario creado; desactivarlo desde admin; su siguiente acción lo saca | R08 |
| 3:30–4:00 | Reactivar, login con la contraseña fijada al crearlo; como USER no ve Administración ni entra por URL | R04 R11 |
| 4:00–5:30 | Tablero: crear nota, editar título/texto/estado + Guardar, arrastrar varias, eliminar una | R12–R17 |
| 5:30–6:15 | F5 en el navegador; `make down && make up`; todo en su sitio | R18 |
| 6:15–6:50 | Dashboard: cifras, cambiar un estado en el tablero, recargar dashboard | R19 R20 |
| 6:50–7:40 | `infra/template.yaml`, `deploy.sh`, `destroy.sh` (y URL de AWS si se desplegó) | R24 R25 |
| 7:40–8:00 | Tiempo empleado y pendientes | R30 |
