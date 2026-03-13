#!/bin/bash

set -e

PROJECT_ID="client-jussimatic"
PREFIX="LARAVEL_BACKEND"
ENV_FILE=".env.production"

# ─── KEYS TO SYNC (full sync) ─────────────────────────────────────────────────
# Only real secrets belong here — not plain config values like URLs or usernames.
SECRET_KEYS=(
  "APP_KEY"
  "DB_PASSWORD"
  "GCS_ACCESS_KEY_ID"
  "GCS_SECRET_ACCESS_KEY"
  "MAIL_PASSWORD"
  "GOOGLE_CLIENT_ID"
  "UPDATE_USER_ROLE_SECRET"
  "ROLE_UPDATE_KEY"
  "MAIL_USERNAME"
  "MAIL_FROM_ADDRESS"
)
# ──────────────────────────────────────────────────────────────────────────────

# Usage:
#   ./update-secret-manager.sh                  — sync all keys from .env.production
#   ./update-secret-manager.sh KEY              — sync single key from .env.production
#   ./update-secret-manager.sh KEY "value"      — set single key to an explicit value

SINGLE_KEY="${1:-}"
SINGLE_VALUE="${2:-}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ $ENV_FILE not found"
  exit 1
fi

# Parse a value from .env file for a given key
get_env_value() {
  local key="$1"
  local value

  # Match KEY=VALUE or KEY="VALUE" or KEY='VALUE', ignore comments
  value=$(grep -E "^${key}=" "$ENV_FILE" | head -1 | sed "s/^${key}=//")

  # Strip surrounding quotes if present
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"

  echo "$value"
}

upsert_secret() {
  local key="$1"
  local secret_value="$2"
  local secret_name="${PREFIX}_${key}"

  if [[ -z "$secret_value" ]]; then
    echo "⚠️  Skipping  $secret_name  (empty value)"
    return
  fi

  if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &>/dev/null; then
    echo "↻  Updating  $secret_name"
    echo -n "$secret_value" | gcloud secrets versions add "$secret_name" \
      --data-file=- \
      --project="$PROJECT_ID"
  else
    echo "✚  Creating  $secret_name"
    echo -n "$secret_value" | gcloud secrets create "$secret_name" \
      --data-file=- \
      --project="$PROJECT_ID" \
      --replication-policy=automatic
  fi
}

# ── Single key mode ───────────────────────────────────────────────────────────
if [[ -n "$SINGLE_KEY" ]]; then
  if [[ -n "$SINGLE_VALUE" ]]; then
    echo "🔑 Setting $SINGLE_KEY from explicit value"
    upsert_secret "$SINGLE_KEY" "$SINGLE_VALUE"
  else
    echo "📄 Reading $SINGLE_KEY from $ENV_FILE"
    upsert_secret "$SINGLE_KEY" "$(get_env_value "$SINGLE_KEY")"
  fi
  echo ""
  echo "✅ Done."
  exit 0
fi

# ── Full sync mode ────────────────────────────────────────────────────────────
echo "📄 Reading from $ENV_FILE"
echo ""

for key in "${SECRET_KEYS[@]}"; do
  upsert_secret "$key" "$(get_env_value "$key")"
done

echo ""
echo "✅ Done. Grant Cloud Run SA access if not already done:"
echo "   gcloud projects add-iam-policy-binding $PROJECT_ID \\"
echo "     --member='serviceAccount:61766311353-compute@developer.gserviceaccount.com' \\"
echo "     --role='roles/secretmanager.secretAccessor'"
