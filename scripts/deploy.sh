#!/usr/bin/env bash
# Despliegue completo en AWS: stack (SAM) + frontend (S3 + invalidacion de CloudFront).
# Requisitos: AWS CLI v2, SAM CLI, credenciales con permisos CFN/IAM/EC2/S3/CloudFront/Lambda/DynamoDB,
# y la imagen de la API publicada en un registro publico (parametro ApiImage).
#
# Uso:
#   ./scripts/deploy.sh                      # usa infra/samconfig.toml si existe, si no --guided
#   STACK=portal ./scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

STACK="${STACK:-portal-equipo}"
REGION="${AWS_REGION:-us-east-1}"

command -v sam >/dev/null || { echo "Falta SAM CLI"; exit 2; }
command -v aws >/dev/null || { echo "Falta AWS CLI v2"; exit 2; }

echo "==> 1/4 Build del stack"
sam build --use-container -t infra/template.yaml   # --use-container: no exige python3.12 en la maquina

echo "==> 2/4 Deploy del stack ($STACK en $REGION)"
if [ -f infra/samconfig.toml ]; then
  sam deploy --stack-name "$STACK" --region "$REGION" --config-file "$PWD/infra/samconfig.toml" \
    --capabilities CAPABILITY_IAM --no-fail-on-empty-changeset
else
  echo "    (sin infra/samconfig.toml: modo guiado, te pedira ApiImage y JwtSecret)"
  sam deploy --guided --stack-name "$STACK" --region "$REGION" \
    --capabilities CAPABILITY_IAM --no-fail-on-empty-changeset
fi

outputs() {
  aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}
BUCKET=$(outputs FrontendBucket)
DIST=$(outputs DistributionId)
URL=$(outputs CloudFrontUrl)

echo "==> 3/4 Build del frontend (React + Bun) y subida a s3://$BUCKET"
if command -v bun >/dev/null; then
  (cd frontend && bun install --frozen-lockfile && bun run build)
else
  docker run --rm -v "$PWD/frontend":/app -w /app oven/bun:1 sh -c "bun install && bun run build"
fi
aws s3 sync frontend/dist/ "s3://$BUCKET/" --delete

echo "==> 4/4 Invalidando la cache de CloudFront"
aws cloudfront create-invalidation --distribution-id "$DIST" --paths "/*" >/dev/null

echo
echo "Listo: $URL"
echo "La primera carga puede tardar un par de minutos mientras EC2 baja la imagen de la API."
