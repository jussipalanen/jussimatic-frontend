# Jussimatic

A React + TypeScript portfolio application showcasing real-world integrations with multiple backend services. Features a fully functional e-commerce demo, AI-powered chat and CV review, and a complete resume management system — all in one SPA.

## Features

- 🛒 **E-commerce Demo**: Product browsing, cart, checkout, and order management integrated with a Laravel PHP backend. Role-based access for admin, vendor, and customer roles.
- 🤖 **AI-Powered Chat**: Real-time conversational interface powered by a Node.js backend.
- 🧠 **AI CV Review**: Upload a CV and receive AI-generated feedback via a Python backend service.
- 📄 **Resume Builder Demo**: Create and export resumes (PDF/HTML) without an account. Choose language, template, and theme; fill in all sections; export directly from the browser.
- 👤 **Resume Management**: Authenticated users can create, edit, duplicate, and manage multiple resumes from their profile (`/profile/resumes`). One resume can be set as primary.
- ✏️ **Edit Profile**: Logged-in users can edit their profile details and change their password from the NavBar user menu on any page.
- 🌍 **Multi-language Support**: Full internationalization (i18n) with English and Finnish throughout the UI.
- 📱 **Responsive Design**: Mobile-first responsive layout with Tailwind CSS.
- 🔐 **Authentication**: Login, registration, forgot/reset password, and Google OAuth support.

## Technology Stack

- ⚛️ **Frontend**: React 18, TypeScript, Vite
- 🎨 **Styling**: Tailwind CSS
- 🔌 **Backend Integration**:
  - 🐘 Laravel PHP — e-commerce, authentication, resume storage
  - 🟢 Node.js — AI chat
  - 🐍 Python — AI CV review

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
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

