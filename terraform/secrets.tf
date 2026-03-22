# ─── Secret Manager ──────────────────────────────────────────────────────────
# Secrets are created here (empty). Set the actual values with:
#   ./dev secrets
# or manually:
#   gcloud secrets versions add <SECRET_NAME> --data-file=-

resource "google_secret_manager_secret" "google_client_id" {
  project   = var.project_id
  secret_id = "JUSSIMATIC_FRONTEND_VITE_GOOGLE_CLIENT_ID"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret" "aibot_api_key" {
  project   = var.project_id
  secret_id = "JUSSIMATIC_FRONTEND_VITE_JUSSI_AIBOT_AI_SECRET_KEY"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}
