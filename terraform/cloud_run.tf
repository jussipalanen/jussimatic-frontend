# ─── Cloud Run ───────────────────────────────────────────────────────────────

resource "google_cloud_run_v2_service" "frontend" {
  project  = var.project_id
  name     = var.service_name
  location = var.region

  template {
    service_account = google_service_account.cloud_run.email

    containers {
      # Image is updated by Cloud Build on each tag push.
      # Set to "latest" as a placeholder — Terraform manages infra, not releases.
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.image_repository}/${var.image_repository}:latest"

      ports {
        container_port = 8080
      }

      env {
        name  = "VITE_JUSSIMATIC_BACKEND_API_BASE_URL"
        value = var.vite_jussimatic_backend_api_base_url
      }
      env {
        name  = "VITE_JUSSILOG_BACKEND_API_BASE_URL"
        value = var.vite_jussilog_backend_api_base_url
      }
      env {
        name  = "VITE_JUSSILOG_BACKEND_STORAGE_BASE_URL"
        value = var.vite_jussilog_backend_storage_base_url
      }
      env {
        name  = "VITE_JUSSILOG_BACKEND_DOCS_URL"
        value = var.vite_jussilog_backend_docs_url
      }
      env {
        name  = "VITE_JUSSI_AIBOT_API_URL"
        value = var.vite_jussi_aibot_api_url
      }
      env {
        name  = "VITE_CV_ENDPOINT"
        value = var.vite_cv_endpoint
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }
  }

  depends_on = [
    google_project_service.apis,
    google_artifact_registry_repository.frontend,
  ]
}

# Allow unauthenticated (public) access
resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
