# ─── Artifact Registry ───────────────────────────────────────────────────────

resource "google_artifact_registry_repository" "frontend" {
  project       = var.project_id
  location      = var.region
  repository_id = var.image_repository
  format        = "DOCKER"
  description   = "Docker images for jussimatic-frontend"

  depends_on = [google_project_service.apis]
}
