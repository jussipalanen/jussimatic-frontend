output "cloud_run_url" {
  description = "Public URL of the Cloud Run service"
  value       = google_cloud_run_v2_service.frontend.uri
}

output "artifact_registry_repository" {
  description = "Full Artifact Registry repository path"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${var.image_repository}"
}

output "cloud_run_service_account" {
  description = "Cloud Run runtime service account email"
  value       = google_service_account.cloud_run.email
}

output "secret_google_client_id" {
  description = "Secret Manager resource name for the Google Client ID secret"
  value       = google_secret_manager_secret.google_client_id.name
}

output "secret_aibot_api_key" {
  description = "Secret Manager resource name for the AI bot API key secret"
  value       = google_secret_manager_secret.aibot_api_key.name
}
