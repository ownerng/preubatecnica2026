.PHONY: up down logs reset smoke persist check lambda validate

up:        ; docker compose up -d --build
down:      ; docker compose down
logs:      ; docker compose logs -f --tail=100
reset:     ; @read -p "Esto BORRA los datos persistentes. ¿Seguro? [y/N] " a && [ "$$a" = y ] && docker compose down -v
smoke:     ; ./scripts/smoke.sh
persist:   ; ./scripts/smoke.sh --persist
check:     ; ./scripts/check-structure.sh
lambda:    ; curl -s -XPOST localhost:9001/2015-03-31/functions/function/invocations -d '{}' | jq .
validate:  ; sam validate --lint -t infra/template.yaml
