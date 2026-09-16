#!/usr/bin/env bash
# Retirada de todo lo desplegado en AWS. Vacia el bucket del frontend y borra el stack.
# Uso: STACK=portal-equipo ./scripts/destroy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

STACK="${STACK:-portal-equipo}"
REGION="${AWS_REGION:-us-east-1}"

command -v aws >/dev/null || { echo "Falta AWS CLI v2"; exit 2; }
command -v sam >/dev/null || { echo "Falta SAM CLI"; exit 2; }

read -r -p "Esto BORRA el stack '$STACK' y sus datos (DynamoDB incluido). ¿Seguro? [y/N] " ans
[ "$ans" = y ] || { echo "Cancelado"; exit 0; }

BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendBucket'].OutputValue" --output text 2>/dev/null || true)

if [ -n "${BUCKET:-}" ] && [ "$BUCKET" != None ]; then
  echo "==> Vaciando s3://$BUCKET (CloudFormation no borra buckets con objetos)"
  aws s3 rm "s3://$BUCKET" --recursive || true
fi

echo "==> Borrando el stack"
sam delete --stack-name "$STACK" --region "$REGION" --no-prompts

echo "Listo. Revisa en la consola que no quede nada facturando."
