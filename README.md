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

- `up` — Start Docker Compose development environment
- `rebuild` — Rebuild and restart Docker Compose (detached, force-recreate)
- `down` — Stop Docker Compose
- `logs` — Show Docker Compose logs
- `build` — Build Docker image
- `restart` — Restart Docker Compose
- `local` — Start local development server without Docker (default)

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
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local development server |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm test` | Run tests (single pass) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run preview` | Preview production build locally |

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs three parallel jobs on every push and pull request to `main` and `dev-*` branches:

- **ESLint** — `npm run lint`
- **Tests** — `npm test`
- **Build** — `npm run build`

## Environment Variables

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

# CV page data endpoint
VITE_CV_ENDPOINT=https://your-cv-endpoint-here
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

