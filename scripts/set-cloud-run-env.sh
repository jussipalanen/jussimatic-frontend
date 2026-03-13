#!/bin/sh
# scripts/set-cloud-run-env.sh
#
# Updates Google Cloud Run environment variables from .env.production
# without requiring a full image rebuild or redeployment.
#
# Usage:
#   scripts/set-cloud-run-env.sh              # reads .env.production
#   scripts/set-cloud-run-env.sh --dry-run    # prints the gcloud command only

set -e

# ── Configuration ────────────────────────────────────────────────────────────
SERVICE="jussimatic-frontend-production"
REGION="europe-north1"
ENV_FILE="${ENV_FILE:-.env.production}"
# ─────────────────────────────────────────────────────────────────────────────

DRY_RUN=0
if [ "$1" = "--dry-run" ]; then
  DRY_RUN=1
fi

# Validate prerequisites
if ! command -v gcloud >/dev/null 2>&1; then
  echo "ERROR: gcloud CLI not found. Install it from https://cloud.google.com/sdk/docs/install"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  cat <<EOF
ERROR: $ENV_FILE not found.

Create it from the template:
  cp .env.production.example .env.production
  # Fill in real values, then re-run this script.
EOF
  exit 1
fi

echo "Reading env vars from: $ENV_FILE"

# Parse .env.production — skip blank lines and comments
ENV_VARS=""
while IFS= read -r line || [ -n "$line" ]; do
  # Skip empty lines and comments
  case "$line" in
    ""|\#*) continue ;;
  esac

  # Must contain '='
  case "$line" in
    *=*) ;;
    *) continue ;;
  esac

  KEY="${line%%=*}"
  VALUE="${line#*=}"

  # Skip keys that still have REPLACE_WITH_ placeholders
  case "$VALUE" in
    REPLACE_WITH_*)
      echo "  SKIP (placeholder): $KEY"
      continue
      ;;
  esac

  # Escape commas in values (gcloud uses comma as delimiter)
  VALUE="$(printf '%s' "$VALUE" | sed 's/,/\\,/g')"

  if [ -z "$ENV_VARS" ]; then
    ENV_VARS="${KEY}=${VALUE}"
  else
    ENV_VARS="${ENV_VARS},${KEY}=${VALUE}"
  fi
done < "$ENV_FILE"

if [ -z "$ENV_VARS" ]; then
  echo "ERROR: No valid env vars found in $ENV_FILE"
  exit 1
fi

echo ""
echo "Service : $SERVICE"
echo "Region  : $REGION"
echo ""

if [ "$DRY_RUN" = "1" ]; then
  echo "── DRY RUN — command that would be executed ────────────────────────────────"
  echo "gcloud run services update $SERVICE \\"
  echo "  --region $REGION \\"
  echo "  --set-env-vars \"$ENV_VARS\""
  echo "────────────────────────────────────────────────────────────────────────────"
  exit 0
fi

echo "Updating Cloud Run env vars..."
gcloud run services update "$SERVICE" \
  --region "$REGION" \
  --set-env-vars "$ENV_VARS"

echo ""
echo "Done! Env vars updated on $SERVICE."
echo "Note: Cloud Run will create a new revision automatically."
