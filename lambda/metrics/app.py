"""Métricas del tablero. Única fuente de los conteos del dashboard (la API solo reenvía)."""
import os
from datetime import datetime, timezone

import boto3

STATUSES = ("PENDIENTE", "EN_CURSO", "HECHO")
TABLE = os.environ.get("NOTES_TABLE", "Notes")
ENDPOINT = os.environ.get("DYNAMODB_ENDPOINT") or None
REGION = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION") or "us-east-1"

ddb = boto3.client("dynamodb", endpoint_url=ENDPOINT, region_name=REGION)


def handler(event, context):  # el evento se ignora a propósito
    counts = {s: 0 for s in STATUSES}
    total = 0
    # "status" es palabra reservada en DynamoDB -> alias #s
    params = {
        "TableName": TABLE,
        "ProjectionExpression": "#s",
        "ExpressionAttributeNames": {"#s": "status"},
    }
    while True:
        page = ddb.scan(**params)
        for item in page.get("Items", []):
            total += 1
            status = item.get("status", {}).get("S")
            if status in counts:
                counts[status] += 1
        start_key = page.get("LastEvaluatedKey")
        if not start_key:
            break
        params["ExclusiveStartKey"] = start_key

    return {
        "total": total,
        "byStatus": counts,
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
