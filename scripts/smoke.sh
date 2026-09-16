#!/usr/bin/env bash
# Prueba E2E contra el entorno local. Uso: ./scripts/smoke.sh [--persist]
# Variables: BASE (default http://localhost:3000/api), LAMBDA_URL
set -uo pipefail
cd "$(dirname "$0")/.."
BASE="${BASE:-http://localhost:3000/api}"
LAMBDA_URL="${LAMBDA_URL:-http://localhost:9001/2015-03-31/functions/function/invocations}"
ADMIN_EMAIL=admin@demo.local; ADMIN_PASS='Admin123!'
USER_EMAIL=usuario@demo.local; USER_PASS='Usuario123!'
PASS=0; FAIL=0
command -v jq >/dev/null || { echo "Falta jq"; exit 2; }

ok()   { PASS=$((PASS+1)); printf '  \033[32m✔\033[0m %s\n' "$1"; }
bad()  { FAIL=$((FAIL+1)); printf '  \033[31m✘\033[0m %s\n' "$1"; }
sec()  { printf '\n\033[1m%s\033[0m\n' "$1"; }
# req METHOD PATH [TOKEN] [BODY] -> deja $CODE y $BODY
req() {
  local m=$1 p=$2 t=${3:-} d=${4:-} out
  local args=(-s -o /tmp/smoke_body -w '%{http_code}' -X "$m" -H 'Content-Type: application/json')
  [ -n "$t" ] && args+=(-H "Authorization: Bearer $t")
  [ -n "$d" ] && args+=(-d "$d")
  CODE=$(curl "${args[@]}" "$BASE$p"); BODY=$(cat /tmp/smoke_body)
}
expect() { # expect CODE_ESPERADO "descripción [Rxx]"
  if [ "$CODE" = "$1" ]; then ok "$2"; else bad "$2 → esperado $1, obtuvo $CODE: ${BODY:0:200}"; fi
}
login() { req POST /auth/login "" "{\"email\":\"$1\",\"password\":\"$2\"}"; echo "$BODY" | jq -r '.token // empty'; }
metrics() { req GET /metrics "$1"; echo "$BODY"; }

# ---------- modo persistencia ----------
if [ "${1:-}" = "--persist" ]; then
  sec "Persistencia [R18]"
  A=$(login $ADMIN_EMAIL "$ADMIN_PASS")
  req POST /notes "$A" '{"title":"persist","text":"sobrevive","status":"EN_CURSO","x":123,"y":456}'
  expect 201 "crear nota de persistencia"; NID=$(echo "$BODY" | jq -r .id)
  echo "  reiniciando entorno (down sin -v)…"
  docker compose down >/dev/null 2>&1 && docker compose up -d >/dev/null 2>&1
  for i in $(seq 1 60); do curl -fs "$BASE/health" >/dev/null && break; sleep 2; done
  A=$(login $ADMIN_EMAIL "$ADMIN_PASS")
  req GET /notes "$A"
  N=$(echo "$BODY" | jq --arg id "$NID" '.[] | select(.id==$id)')
  [ "$(echo "$N" | jq -r '"\(.title)|\(.text)|\(.status)|\(.x)|\(.y)"')" = "persist|sobrevive|EN_CURSO|123|456" ] \
    && ok "nota intacta tras reinicio [R18]" || bad "nota alterada o perdida tras reinicio: $N"
  req DELETE "/notes/$NID" "$A"; expect 204 "limpieza"
  echo; echo "OK=$PASS FAIL=$FAIL"; [ $FAIL -eq 0 ]; exit
fi

TS=$(date +%s)

sec "Salud y acceso [R01 R02]"
req GET /health; expect 200 "health"
req GET /notes; expect 401 "notas sin token → 401 [R02]"
req GET /metrics; expect 401 "métricas sin token → 401 [R02]"
req GET /users; expect 401 "usuarios sin token → 401 [R02]"
req POST /auth/login "" "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"mala\"}"; expect 401 "login con clave errada → 401 [R01]"
A=$(login $ADMIN_EMAIL "$ADMIN_PASS"); [ -n "$A" ] && ok "login admin demo [R10]" || bad "login admin demo [R10]"
U=$(login $USER_EMAIL "$USER_PASS");  [ -n "$U" ] && ok "login usuario demo [R10]" || bad "login usuario demo [R10]"
req GET /auth/me "$A"; expect 200 "me"
[ "$(echo "$BODY" | jq -r .role)" = ADMIN ] && ok "rol admin correcto" || bad "rol admin: $BODY"
echo "$BODY" | jq -e 'has("passwordHash")|not' >/dev/null && ok "no expone passwordHash" || bad "expone passwordHash"

sec "Roles [R03 R04]"
req GET /users "$U"; expect 403 "USER no lista usuarios [R04]"
req POST /users "$U" '{"name":"x","email":"x@x.co","password":"12345678","role":"ADMIN"}'; expect 403 "USER no crea usuarios [R04]"
req GET /users "$A"; expect 200 "ADMIN lista usuarios [R03 R05]"
echo "$BODY" | jq -e 'all(.[]; has("id") and has("name") and has("email") and has("role") and has("active"))' >/dev/null \
  && ok "campos de usuario [R07]" || bad "campos de usuario incompletos [R07]"
req GET /notes "$U"; expect 200 "USER usa tablero [R04]"
req GET /metrics "$U"; expect 200 "USER usa dashboard [R04]"

sec "Gestión de usuarios [R05 R06 R08 R11]"
NEW_EMAIL="smoke-$TS@demo.local"
req POST /users "$A" "{\"name\":\"Smoke $TS\",\"email\":\"$NEW_EMAIL\",\"password\":\"Smoke1234\",\"role\":\"USER\"}"
expect 201 "crear usuario [R05]"; NEW_ID=$(echo "$BODY" | jq -r .id)
req POST /users "$A" "{\"name\":\"Dup\",\"email\":\"${NEW_EMAIL^^}\",\"password\":\"Smoke1234\",\"role\":\"USER\"}"
expect 409 "email duplicado (sin importar mayúsculas) → 409"
req POST /users "$A" '{"name":"","email":"no-es-email","password":"1","role":"JEFE"}'; expect 400 "validación → 400"
N=$(login "$NEW_EMAIL" Smoke1234); [ -n "$N" ] && ok "usuario creado inicia sesión [R11]" || bad "usuario creado no inicia sesión [R11]"
req PUT "/users/$NEW_ID" "$A" "{\"name\":\"Smoke Editado\",\"email\":\"$NEW_EMAIL\",\"role\":\"ADMIN\"}"
expect 200 "editar nombre y rol [R05]"
[ "$(echo "$BODY" | jq -r '.name+"|"+.role')" = "Smoke Editado|ADMIN" ] && ok "cambios aplicados" || bad "cambios no aplicados: $BODY"
req PUT "/users/$NEW_ID" "$A" "{\"name\":\"Smoke Editado\",\"email\":\"$NEW_EMAIL\",\"role\":\"USER\"}"; expect 200 "volver a USER"
req GET /notes "$N"; expect 200 "sesión del nuevo usuario operativa"
req PATCH "/users/$NEW_ID/status" "$A" '{"active":false}'; expect 200 "desactivar [R06]"
req GET /notes "$N"; expect 401 "sesión abierta de inactivo queda fuera [R08]"
req POST /auth/login "" "{\"email\":\"$NEW_EMAIL\",\"password\":\"Smoke1234\"}"; expect 401 "inactivo no inicia sesión [R08]"
req PATCH "/users/$NEW_ID/status" "$A" '{"active":true}'; expect 200 "reactivar [R06]"
N=$(login "$NEW_EMAIL" Smoke1234); [ -n "$N" ] && ok "reactivado inicia sesión [R06]" || bad "reactivado no inicia sesión"

sec "Último administrador [R09]"
req GET /users "$A"
ACTIVE_ADMINS=$(echo "$BODY" | jq '[.[] | select(.role=="ADMIN" and .active)] | length')
ADMIN_ID=$(echo "$BODY" | jq -r --arg e $ADMIN_EMAIL '.[] | select(.email==$e) | .id')
if [ "$ACTIVE_ADMINS" = 1 ]; then
  req PATCH "/users/$ADMIN_ID/status" "$A" '{"active":false}'; expect 409 "no se desactiva el último admin [R09]"
  req PUT "/users/$ADMIN_ID" "$A" "{\"name\":\"Admin Demo\",\"email\":\"$ADMIN_EMAIL\",\"role\":\"USER\"}"
  expect 409 "no se degrada el último admin [R09]"
  req GET /auth/me "$A"; expect 200 "admin sigue operativo"
else
  bad "hay $ACTIVE_ADMINS admins activos; deja solo admin@demo.local activo para probar R09"
fi

sec "Notas [R13 R14 R16 R17]"
req GET /metrics "$A"; M0="$BODY"
req POST /notes "$N" '{"title":"Smoke","text":"hola","status":"PENDIENTE","x":10,"y":20}'
expect 201 "crear nota (usuario recién creado) [R13]"; NOTE=$(echo "$BODY" | jq -r .id)
echo "$BODY" | jq -e 'has("title") and has("text") and has("status") and has("x") and has("y")' >/dev/null \
  && ok "campos de nota [R14]" || bad "campos de nota incompletos [R14]"
req POST /notes "$U" '{"title":"","text":"","status":"OTRO","x":-1,"y":0}'; expect 400 "validación de nota"
req PUT "/notes/$NOTE" "$U" '{"title":"Smoke edit","text":"editado por otro","status":"HECHO"}'
expect 200 "otro usuario edita la nota [R13]"
req PATCH "/notes/$NOTE/position" "$U" '{"x":640,"y":380}'; expect 200 "mover nota [R17]"
req GET /notes "$A"
[ "$(echo "$BODY" | jq -r --arg id "$NOTE" '.[]|select(.id==$id)|"\(.title)|\(.text)|\(.status)|\(.x)|\(.y)"')" = "Smoke edit|editado por otro|HECHO|640|380" ] \
  && ok "contenido, estado y posición guardados [R14 R17]" || bad "nota no refleja cambios"

sec "Métricas vía Lambda [R19 R20 R22]"
req GET /metrics "$A"; expect 200 "GET /metrics"; M1="$BODY"
[ "$(echo "$M1" | jq -r .source)" = lambda ] && ok "source = lambda [R20]" || bad "source != lambda [R20]"
[ $(( $(echo "$M1" | jq .total) - $(echo "$M0" | jq .total) )) = 1 ] && ok "total +1 [R19]" || bad "total no subió en 1"
[ $(( $(echo "$M1" | jq .byStatus.HECHO) - $(echo "$M0" | jq .byStatus.HECHO) )) = 1 ] && ok "HECHO +1 [R19]" || bad "HECHO no subió en 1"
req GET /notes "$A"; T=$(echo "$BODY" | jq length)
[ "$(echo "$M1" | jq .total)" = "$T" ] && ok "total coincide con el tablero [R19]" || bad "total $(echo "$M1"|jq .total) vs tablero $T"
[ "$(echo "$M1" | jq '.byStatus.PENDIENTE + .byStatus.EN_CURSO + .byStatus.HECHO')" = "$(echo "$M1" | jq .total)" ] \
  && ok "distribución suma el total [R19]" || bad "distribución no suma el total"
L=$(curl -s -XPOST "$LAMBDA_URL" -d '{}')
[ "$(echo "$L" | jq .total 2>/dev/null)" = "$T" ] && ok "invocación directa de la Lambda local [R22]" || bad "Lambda local: $L"

sec "Eliminar [R16]"
req DELETE "/notes/$NOTE" "$U"; expect 204 "eliminar nota"
req DELETE "/notes/$NOTE" "$U"; expect 404 "eliminar de nuevo → 404"
req GET /metrics "$A"; [ "$(echo "$BODY" | jq .total)" = "$(echo "$M0" | jq .total)" ] && ok "métricas vuelven al valor inicial" || bad "métricas no volvieron"

sec "Logout [R01]"
req POST /auth/logout "$N"; expect 204 "logout"
req GET /notes "$N"; expect 401 "token inválido tras logout [R01]"
req PATCH "/users/$NEW_ID/status" "$A" '{"active":false}'; expect 200 "limpieza: desactivar usuario de prueba"

echo; echo "OK=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ]
