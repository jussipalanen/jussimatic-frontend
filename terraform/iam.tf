# ─── Service Accounts ────────────────────────────────────────────────────────

# Cloud Run runtime service account
resource "google_service_account" "cloud_run" {
  project      = var.project_id
  account_id   = "jussimatic-frontend-run"
  display_name = "Jussimatic Frontend — Cloud Run"
}

# ─── Cloud Build permissions ──────────────────────────────────────────────────
# The default Cloud Build SA needs rights to deploy Cloud Run and push to AR.

locals {
  # Default Cloud Build service account email
  cloudbuild_sa = "${data.google_project.project.number}@cloudbuild.gserviceaccount.com"
}

data "google_project" "project" {
  project_id = var.project_id
}

resource "google_project_iam_member" "cloudbuild_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${local.cloudbuild_sa}"
}

# Scoped to just the Cloud Run SA — prevents Cloud Build from impersonating
# any other service account that may exist in the project.
resource "google_service_account_iam_member" "cloudbuild_sa_user" {
  service_account_id = google_service_account.cloud_run.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${local.cloudbuild_sa}"
}

resource "google_project_iam_member" "cloudbuild_ar_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${local.cloudbuild_sa}"
}

# Allow Cloud Build SA to access secrets
resource "google_secret_manager_secret_iam_member" "cloudbuild_google_client_id" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.google_client_id.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.cloudbuild_sa}"
}

resource "google_secret_manager_secret_iam_member" "cloudbuild_aibot_api_key" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.aibot_api_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.cloudbuild_sa}"
}
