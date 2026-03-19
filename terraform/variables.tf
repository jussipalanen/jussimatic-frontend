variable "project_id" {
  description = "GCP project ID"
  type        = string
  default     = "client-jussimatic"
}

variable "region" {
  description = "GCP region for all resources"
  type        = string
  default     = "europe-north1"
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "jussimatic-frontend-production"
}

variable "image_repository" {
  description = "Artifact Registry repository name"
  type        = string
  default     = "jussimatic-frontend"
}

# ─── Runtime environment variables ───────────────────────────────────────────
# These are passed to the Cloud Run service at deploy time.
# Sensitive values (Google Client ID, AI bot API key) are stored in Secret Manager.

variable "vite_jussimatic_backend_api_base_url" {
  description = "Node.js AI chat backend base URL"
  type        = string
  default     = ""
}

variable "vite_jussilog_backend_api_base_url" {
  description = "Laravel auth & resume backend base URL"
  type        = string
  default     = ""
}

variable "vite_jussilog_backend_storage_base_url" {
  description = "Laravel storage base URL (for images, etc.)"
  type        = string
  default     = ""
}

variable "vite_jussi_aibot_api_url" {
  description = "Python AI CV review backend base URL"
  type        = string
  default     = ""
}

variable "vite_cv_endpoint" {
  description = "Public resume endpoint for the CV page (may contain auth tokens in query params)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "vite_app_title" {
  description = "App title shown in browser tab and search results"
  type        = string
  default     = "Jussimatic - Portfolio by Jussi Alanen"
}

variable "vite_app_description" {
  description = "App description for search results and social sharing"
  type        = string
  default     = "Jussimatic is the main portfolio by Jussi Alanen, including project references and live demos."
}
