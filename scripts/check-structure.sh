#!/usr/bin/env bash
# Verifica que la entrega tenga lo que exige el enunciado. No ejecuta nada en la nube.
set -uo pipefail
cd "$(dirname "$0")/.."
PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); printf '  \033[32m✔\033[0m %s\n' "$1"; }
bad() { FAIL=$((FAIL+1)); printf '  \033[31m✘\033[0m %s\n' "$1"; }
has_file() { [ -f "$1" ] && ok "$1 ${2:-}" || bad "falta $1 ${2:-}"; }
has_text() { grep -qiE "$2" "$1" 2>/dev/null && ok "$1 contiene '$2' ${3:-}" || bad "$1 no contiene '$2' ${3:-}"; }

echo "Archivos [R21 R24 R25 R27]"
for f in docker-compose.yml api/Dockerfile frontend/Dockerfile lambda/metrics/Dockerfile lambda/metrics/app.py \
         infra/template.yaml scripts/deploy.sh scripts/destroy.sh README.md TIMELOG.md; do has_file "$f"; done
for f in scripts/deploy.sh scripts/destroy.sh scripts/smoke.sh; do [ -x "$f" ] && ok "$f ejecutable" || bad "$f no ejecutable"; done

echo "Plantilla AWS [R24]"
for r in 'AWS::Serverless::Function' 'AWS::EC2::Instance' 'AWS::S3::Bucket' 'AWS::CloudFront::Distribution' \
         'AWS::CloudFront::OriginAccessControl' 'AWS::DynamoDB::Table' 'AWS::IAM::InstanceProfile' 'lambda:InvokeFunction' \
         'python3\.12' 'docker'; do has_text infra/template.yaml "$r"; done

echo "Scripts de despliegue [R25]"
has_text scripts/deploy.sh 'sam (build|deploy)'
has_text scripts/deploy.sh 'aws s3 (sync|cp)'
has_text scripts/deploy.sh 'create-invalidation'
has_text scripts/destroy.sh 'sam delete|delete-stack'
has_text scripts/destroy.sh 's3 rm|s3 rb|delete-objects'

echo "Local sin AWS real [R23]"
if grep -qE 'amazonaws\.com' docker-compose.yml; then bad "docker-compose referencia endpoints reales de AWS"; else ok "compose sin endpoints AWS reales"; fi
has_text docker-compose.yml 'dynamodb-local'
has_text docker-compose.yml 'functions/function/invocations' "[R22]"

echo "README [R10 R11 R26 R27 R30]"
for s in 'requisitos' 'arranque' 'cuentas de demostraci' 'uso' 'persistencia' 'despliegue' 'retirada' \
         'arquitectura' 'tiempo empleado' 'limitaciones|pendientes' 'admin@demo\.local' 'usuario@demo\.local' \
         'ApiImage' 'JwtSecret' 'commit'; do has_text README.md "$s"; done
grep -qE '<hash>|<X h' README.md 2>/dev/null && bad "README aún tiene placeholders" || ok "README sin placeholders"

echo "Tiempo [R30]"
MIN=$(awk -F'|' 'NR>5 && $6 ~ /[0-9]/ {gsub(/ /,"",$6); s+=$6} END{print s+0}' TIMELOG.md)
if [ "$MIN" -eq 0 ]; then bad "TIMELOG vacío"
elif [ "$MIN" -le 480 ]; then ok "TIMELOG: $MIN min (≤ 480)"
else bad "TIMELOG: $MIN min (> 480)"; fi

echo "Higiene"
git ls-files 2>/dev/null | grep -qE '(^|/)\.env$' && bad ".env versionado" || ok ".env no versionado"
git ls-files 2>/dev/null | grep -qE 'samconfig\.toml$' && bad "samconfig.toml versionado (usar .example)" || ok "samconfig.toml no versionado"

echo; echo "OK=$PASS FAIL=$FAIL"; [ $FAIL -eq 0 ]
