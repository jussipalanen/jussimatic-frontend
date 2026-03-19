# Jussimatic

A React + TypeScript portfolio application showcasing real-world integrations with multiple backend services. Features a fully functional e-commerce demo, AI-powered chat and CV review, resume and invoice management, live job listings, and a CV page — all in one SPA.

[![CI](https://github.com/jussipalanen/jussimatic-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/jussipalanen/jussimatic-frontend/actions/workflows/ci.yml)

## Features

- 🛒 **E-commerce Demo**: Product browsing, cart, checkout, and order management integrated with a Laravel PHP backend. Role-based access for admin, vendor, and customer roles.
- 🤖 **AI-Powered Chat**: Real-time conversational interface powered by a Node.js backend.
- 🧠 **AI CV Review**: Upload a CV and receive AI-generated feedback via a Python backend service.
- 📄 **Resume Builder Demo**: Create and export resumes (PDF/HTML) without an account. Choose language, template, and theme; fill in all sections; export directly from the browser.
- 🧾 **Invoice Builder Demo**: Create, preview, and export invoices to PDF/HTML without an account. Supports due dates, multiple statuses (paid, unpaid, overdue), and multi-language output.
- 💼 **Browse Jobs Demo**: Search and browse job listings sourced from an external API with filtering and pagination.
- 👤 **Resume Management**: Authenticated users can create, edit, duplicate, and manage multiple resumes from their profile (`/profile/resumes`). One resume can be set as primary.
- 🗂️ **Invoice Management**: Authenticated users can view and manage their own invoices at `/profile/invoices`. Admins can create, edit, and manage all invoices in the admin panel.
- ✏️ **Edit Profile**: Logged-in users can edit their profile details and change their password from the NavBar user menu on any page.
- 🌍 **Multi-language Support**: Full internationalization (i18n) with English and Finnish throughout the UI.
- 📱 **Responsive Design**: Mobile-first responsive layout with Tailwind CSS. The Projects & Demos picker opens as a bottom-sheet on mobile and a centred modal on desktop, with list and grid view modes.
- 🔐 **Authentication**: Login, registration, forgot/reset password, and Google OAuth support.

## Technology Stack

- ⚛️ **Frontend**: React 19, TypeScript, Vite 7
- 🎨 **Styling**: Tailwind CSS 4
- 🧪 **Testing**: Vitest + Testing Library
- 🔌 **Backend Integration**:
  - 🐘 Laravel PHP — e-commerce, authentication, resume storage ([API docs](https://backend-laravel.dev.jussialanen.com/api/docs))
  - 🟢 Node.js — AI chat
  - 🐍 Python — AI CV review

## Requirements

- Node.js >= 20 (use `nvm use` to switch automatically via `.nvmrc`)

## Development

This project includes a `dev` script to simplify common development tasks.

### Usage

```bash
./dev [COMMAND]
```

### Available Commands

<details>
<summary><strong>Local & Docker</strong></summary>

| Command | Description |
|---|---|
| `./dev` | Start local development server (default) |
| `./dev local` | Start local development server without Docker |
| `./dev up` | Start Docker Compose development environment |
| `./dev rebuild` | Rebuild and restart Docker Compose (detached, force-recreate) |
| `./dev down` | Stop Docker Compose |
| `./dev logs` | Show Docker Compose logs |
| `./dev build` | Build Docker image |
| `./dev restart` | Restart Docker Compose |

</details>

<details>
<summary><strong>Deployment & Cloud</strong></summary>

| Command | Description |
|---|---|
| `./dev deploy [env-file]` | Submit a Cloud Build using variables from `.env.production`. Pass a custom env file as the second argument. `TAG_NAME` must be set in the env file or exported. |
| `./dev get-env [--yaml\|--json]` | Print env vars of the live Cloud Run revision |
| `./dev set-env [env-file]` | Update Cloud Run revision env vars from `.env.production` without rebuilding |
| `./dev secrets [env-file] [KEY]` | Sync secrets to GCP Secret Manager from `.env.production`. Optionally pass a custom env file and/or a single key to sync. |

</details>

### Examples

```bash
# Start local development server
./dev

# Start with Docker Compose
./dev up

# Rebuild containers with latest changes
./dev rebuild

# View logs
./dev logs

# Deploy a tagged release to Cloud Run
TAG_NAME=v1.0.0 ./dev deploy

# Update only env vars on the live service (no rebuild)
./dev set-env

# Sync a single secret to Secret Manager
./dev secrets .env.production VITE_GOOGLE_CLIENT_ID
```

## Scripts

<details>
<summary><strong>npm scripts</strong></summary>

| Command | Description |
|---|---|
| `npm run dev` | Start local development server |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm test` | Run tests (single pass) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run preview` | Preview production build locally |

</details>

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs three parallel jobs on every push and pull request to `main` and `dev-*` branches:

- **ESLint** — `npm run lint`
- **Tests** — `npm test`
- **Build** — `npm run build`

## Environment Variables

<details>
<summary><strong>All variables</strong></summary>

Copy `.env.example` to `.env.local` and set the values for your environment:

```dotenv
# Node.js AI chat backend
VITE_JUSSIMATIC_BACKEND_API_BASE_URL=https://your-api-url-here

# Laravel auth & resume backend
VITE_JUSSILOG_BACKEND_API_BASE_URL=http://localhost:8000/api/
VITE_JUSSILOG_BACKEND_STORAGE_BASE_URL=http://localhost:8000/storage/

# Title shown in e-commerce navigation
VITE_ECOMMERCE_MAIN_TITLE=Ecommerce Demo

# Google OAuth client ID
VITE_GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com

# Python AI CV review backend
VITE_JUSSI_AIBOT_API_URL=https://your-aibot-url-here

# API key for the AI CV review backend
VITE_JUSSI_AIBOT_API_KEY=your-api-key-here

# App title shown in browser tab and search results (optional, has default)
VITE_APP_TITLE=Jussimatic - Portfolio by Jussi Alanen

# App description shown in search results and social sharing (optional, has default)
VITE_APP_DESCRIPTION=...

# CV page data endpoint
VITE_CV_ENDPOINT=https://your-cv-endpoint-here
```

> **Note:** `VITE_GOOGLE_CLIENT_ID` and `VITE_JUSSI_AIBOT_API_KEY` are injected at build time from GCP Secret Manager and do not need to be set locally for production builds.

</details>

## Infrastructure

The GCP infrastructure is managed with Terraform under `terraform/`.

### Resources

| Resource | Name |
|---|---|
| Artifact Registry | `jussimatic-frontend` |
| Cloud Run | `jussimatic-frontend-production` |
| Secret Manager | `JUSSIMATIC_FRONTEND_VITE_GOOGLE_CLIENT_ID` |
| Secret Manager | `JUSSIMATIC_FRONTEND_VITE_JUSSI_AIBOT_API_KEY` |
| Region | `europe-north1` |
| Project | `client-jussimatic` |

### Getting started with Terraform

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

After `apply`, populate the secrets (one-time):

```bash
echo -n "your-google-client-id" | gcloud secrets versions add JUSSIMATIC_FRONTEND_VITE_GOOGLE_CLIENT_ID --data-file=-
echo -n "your-api-key"          | gcloud secrets versions add JUSSIMATIC_FRONTEND_VITE_JUSSI_AIBOT_API_KEY --data-file=-
```

Or use the `dev` script to sync from `.env.production`:

```bash
./dev secrets
```

### Deployment flow

1. Push a Git tag (e.g. `v1.0.0`) — Cloud Build triggers automatically, or run `./dev deploy`.
2. Cloud Build uses Kaniko to build and push the Docker image to Artifact Registry.
3. Cloud Build deploys the new image to the Cloud Run service.
4. To update env vars without a rebuild: `./dev set-env`.

## Cleanup

To tear down local development environments:

```bash
# Stop Docker Compose and remove containers
./dev down

# Remove Docker Compose containers, volumes, and networks
docker compose down --volumes --remove-orphans

# Remove local build artifacts
rm -rf dist

# Remove node_modules and reinstall from scratch
rm -rf node_modules && npm install
```

To destroy the GCP infrastructure (irreversible — use with care):

```bash
cd terraform
terraform destroy
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.
