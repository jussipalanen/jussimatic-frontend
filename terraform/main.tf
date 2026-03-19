terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }

  # Uncomment and configure when using a remote state bucket:
  # backend "gcs" {
  #   bucket = "client-jussimatic-tfstate"
  #   prefix = "jussimatic-frontend"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ─── Enable required APIs ────────────────────────────────────────────────────

resource "google_project_service" "apis" {
  for_each = toset([
    "artifactregistry.googleapis.com",
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "secretmanager.googleapis.com",
    "iam.googleapis.com",
  ])

  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}
