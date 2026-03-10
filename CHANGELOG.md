# Changelog

All notable changes to this project will be documented in this file.

## [0.4.0] - 2026-03-10
### Added
- Google OAuth login integration in auth modal using Google Identity Services.
- Full EN/FI internationalisation (i18n) across all views: Landing, Chat, AI CV Review, Ecommerce, Products, and Auth modal (login, register, forgot password).
- Language selector in landing navigation and ecommerce header (desktop + mobile); language preference persisted to localStorage.
- Auth modal responds to language changes in real time via custom window event.
- AI CV Review tool — upload a CV (PDF/DOC/DOCX/TXT) for instant AI-powered strengths, weaknesses, and rating feedback powered by a Python backend service.
- "Projects / Demos" dropdown on the landing page replacing three separate buttons, with per-project technology badges (TypeScript, PHP, Laravel, Blade, MySQL, Python, Node.js, JSON, AI, API integration, Ecommerce).
- Unique visitor counter on landing page (today and all-time).
- User delete action in admin users view.
- Favicon set: ICO, PNG 16×16/32×32, Apple Touch Icon, Android Chrome 192×192/512×512, and web manifest.
- SEO meta tags: `<title>` and `<meta name="description">` driven by `VITE_APP_TITLE` / `VITE_APP_DESCRIPTION` environment variables, wired through Dockerfile and Cloud Build pipeline.
- OG meta tags (`og:title`, `og:description`, `og:type`) in `index.html`.

### Changed
- "AI Chat (Portfolio)" renamed to "CV Chat".
- "AI CV Reviewer" renamed to "CV Review tool" across UI, i18n, constants, and build config.
- Landing page title updated to "Hi, I'm Jussi Alanen" with a two-line descriptive subtitle.
- Footer copyright updated to "Jussimatic (Jussi Alanen)".
- Browse Jobs view title updated to "Browse Jobs" / "Selaa työpaikkoja".
- Refactored module directory structure: ecommerce, browse-jobs, chat, and AI CV Review features each live under `src/demo/<feature>/`.
- Google sign-in button now uses the container's actual width so it renders correctly on narrow mobile screens.

### Fixed
- Auth modal is now scrollable on small screens — the overlay scrolls so the full form is always reachable on short viewports.

## [0.3.0] - 2026-03-09
### Added
- Reset password page with token and email support from reset-link query params.
- Frontend password reset API payload support for `email` in addition to token and new password fields.
- Mobile hamburger menu for ecommerce navigation with role-based links and auth actions.

### Fixed
- Landing view CTA actions now scale and stack correctly on small screens.
- Chat view header, message bubbles, tips dropdown, and input actions now behave correctly on mobile layouts.
- Login and register modal forms now submit with Enter.

## [0.2.0] - 2026-03-08
### Added
- My Profile view with editable user details.
- Reusable user edit modal shared across profile and admin users.
- Password strength validation (4-30 chars, upper/lower/number/special) in user edit flows.
- Password visibility toggles on all password fields.
- Forgot password flow in auth modal with lost-password API call.
- Product create/update payload now includes user_id from /me.
- Role-based product management controls (create/edit/delete restricted to admin/vendor).

### Fixed
- Login payload always sends username field for email or username.
- Profile role dropdown now reflects current role from roles array.
- Product manage modals/actions are blocked for non-logged users and customers.
