#!/usr/bin/env bash
# Bloquea comandos que gastan plata en AWS o destruyen datos. Exit 2 = bloqueado (stderr llega a Claude).
input=$(cat)
if command -v jq >/dev/null; then cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')
elif command -v python3 >/dev/null; then cmd=$(printf '%s' "$input" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("tool_input",{}).get("command",""))')
else echo "guard-bash: instala jq o python3" >&2; exit 2; fi
block() { echo "BLOQUEADO por el harness: $1. Pídele al humano que lo ejecute él mismo si de verdad hace falta." >&2; exit 2; }

echo "$cmd" | grep -qE '\bsam +(deploy|delete|sync)\b'                && block "operación SAM contra AWS"
echo "$cmd" | grep -qE 'scripts/(deploy|destroy)\.sh'                 && block "script de despliegue/retirada"
echo "$cmd" | grep -qE '\baws +[a-z0-9-]+ +(create|delete|put|update|run|terminate|s3 +(rm|rb|sync|cp|mv))' && block "escritura en AWS"
echo "$cmd" | grep -qE '\baws +s3 +(rm|rb|sync|cp|mv)\b'              && block "escritura en S3"
echo "$cmd" | grep -qE 'docker( |-)compose .*down.*(-v|--volumes)'     && block "borrado de volúmenes (datos persistentes)"
echo "$cmd" | grep -qE 'docker +volume +(rm|prune)|docker +system +prune' && block "borrado de volúmenes/imágenes"
echo "$cmd" | grep -qE 'git +push.*(--force|-f\b)'                    && block "force push"
echo "$cmd" | grep -qE 'git +(reset +--hard|clean +-[a-z]*f)'         && block "descarte de cambios locales"
exit 0
