#!/bin/sh
# scripts/get-cloud-run-env.sh
#
# Fetches the current environment variables from the live Cloud Run service.
#
# Usage:
#   scripts/get-cloud-run-env.sh              # prints KEY=VALUE pairs
#   scripts/get-cloud-run-env.sh --yaml       # prints raw YAML
#   scripts/get-cloud-run-env.sh --json       # prints raw JSON

set -e

# ── Configuration ────────────────────────────────────────────────────────────
SERVICE="jussimatic-frontend-production"
REGION="europe-north1"
# ─────────────────────────────────────────────────────────────────────────────

if ! command -v gcloud >/dev/null 2>&1; then
  echo "ERROR: gcloud CLI not found. Install it from https://cloud.google.com/sdk/docs/install"
  exit 1
fi

FORMAT="${1:-}"

echo "Service : $SERVICE"
echo "Region  : $REGION"
echo ""

case "$FORMAT" in
  --yaml)
    gcloud run services describe "$SERVICE" \
      --region "$REGION" \
      --format="yaml(spec.template.spec.containers[0].env)"
    ;;
  --json)
    gcloud run services describe "$SERVICE" \
      --region "$REGION" \
      --format="json(spec.template.spec.containers[0].env)"
    ;;
  *)
    # Default: clean KEY=VALUE pairs, one per line
    if command -v jq >/dev/null 2>&1; then
      gcloud run services describe "$SERVICE" \
        --region "$REGION" \
        --format=json \
      | jq -r '.spec.template.spec.containers[0].env[] | "\(.name)=\(.value // "")"' \
      | sort
    else
      # Fallback without jq — uses gcloud's built-in export format
      gcloud run services describe "$SERVICE" \
        --region "$REGION" \
        --format="value[separator='\n'](spec.template.spec.containers[0].env)" \
      | sed 's/^{name=\(.*\),value=\(.*\)}$/\1=\2/' \
      | sort
    fi
    ;;
esac
