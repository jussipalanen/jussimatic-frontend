# Changelog

All notable changes to this project will be documented in this file.

## [0.6.6] - 2026-03-15

### Changed
- **Landing page profile photo — WebP conversion**: `face_ja.jpg` (JPEG) converted to `profile_image.webp` at 264×264 px using `cwebp`, reducing image weight. The file is now served from `public/` as the static path `/profile_image.webp`, avoiding the Vite asset pipeline for the image.
- **`index.html` — preload hint**: Added `<link rel="preload" as="image" type="image/webp" href="/profile_image.webp" />` to `<head>` so the browser begins fetching the profile photo as early as possible, improving Largest Contentful Paint (LCP).
- **`ShootingStars` — skip on touch devices**: Component detects touch-only devices via `window.matchMedia('(hover: none) and (pointer: coarse)')` at module load time and returns `null`, avoiding creating any DOM nodes on phones and tablets.
- **`NavActions` — low-end device detection**: `isLowEndDevice()` heuristic checks `navigator.hardwareConcurrency` (≤2 cores) and `navigator.deviceMemory` (≤2 GB) on first visit. Animated background is automatically disabled on low-end devices; the preference is persisted to `localStorage` so it survives page reloads. Users can still toggle it manually.
- **`App.css` — mobile animation budget**: Touch/coarse-pointer media query (`hover: none` + `pointer: coarse`) freezes star layers 1 & 3 (only the mid-speed layer 2 keeps drifting), hides all shooting stars and starlight flares, snaps the coin orbit to its final state, and stops the coin-shine sweep — cutting GPU paint work on mobile significantly.

## [0.6.5] - 2026-03-15

### Added
- **`src/demos.ts` — centralised demos registry**: New `DEMOS` array with typed `Demo` and `DemoBadge` interfaces. Each entry carries `id`, `path`, `labelKey` (i18n key), `iconColor`, `iconPath` (SVG `d` attribute), and `badges[]`. Marked with a comment for future replacement by an API call, keeping the shape stable for that migration.
- **Projects & Demos modal on Landing page**: The "Projects / Demos" hero button now opens a full-screen modal (bottom-sheet on mobile, centred dialog on tablet/desktop) instead of a positioned dropdown. Features:
  - Backdrop click closes the modal.
  - **List / Grid view toggle** in the modal header — list shows full badge rows, grid uses 2-col (mobile) / 3-col (sm+) cards with icon box, name, and up to 2 badges + overflow count.
  - Dedicated X close button with `cursor-pointer`.
  - Mobile-friendly: slides up from the bottom edge (`rounded-t-2xl`), `max-h-[90vh]`, reduced horizontal padding (`px-4 sm:px-6`).

### Changed
- **`NavActions` — demos driven by `DEMOS`**: Both the desktop dropdown and the mobile slide-down panel now import and iterate over `DEMOS` instead of repeating per-demo JSX. No visual change.
- **`LandingView` — demos driven by `DEMOS`**: Modal body iterates over `DEMOS` for both list and grid views.
- **Mobile menu close fix (`NavActions`)**: The global `mousedown` handler no longer unconditionally closes the mobile panel on every click. Added `mobileMenuRef` and `mobileMenuButtonRef`; the panel only closes when the click target is outside both, matching the pattern used for the desktop dropdowns. Removed the now-redundant `e.stopPropagation()` from the panel and toggle button.
- **`DemoHeader` — "Jussimatic" title is now a link**: Replaced the non-interactive `<span>` with a `<button>` that calls `navigate('/')`, matching `NavBar`. Added `cursor-pointer` and `hover:text-blue-400` styles.
- **`NavBar` — added `cursor-pointer`** to the "Jussimatic" title button.

## [0.6.4] - 2026-03-15

### Added
- **Invoice `due_date` field**: All invoice forms (Invoice Builder demo, Admin Invoices create/edit, My Invoices view) now include a Due Date field. The value is passed in the API payload for both `createInvoice` and `updateInvoice` calls.
- **New invoice statuses — `unpaid` and `overdue`**: Added to the fallback/default status option arrays in `InvoiceToolView` and `AdminInvoicesView`. Color-coded with orange (`unpaid`) and rose/dark-red (`overdue`) across all `StatusBadge` components and the HTML export inline CSS.
- **`due_date` on `Invoice` interface** (`invoicesApi.ts`): Added `due_date: string | null` to `Invoice`, `due_date?: string | null` to `UpdateInvoiceData` and `CreateInvoiceData`, and `due_date?: string` to `InvoiceExportPayload`.
- **i18n keys** (EN + FI) for due date and new statuses:
  - `invoices.fieldDueDate`, `invoices.due` — Due Date label and display prefix.
  - `adminInvoices.labelDueDate`, `adminInvoices.labelDueDateEdit` — view-mode and edit-form labels.
  - `adminInvoices.cardUnpaid`, `adminInvoices.cardOverdue` — card meta labels.
  - `adminInvoices.labelUnpaid`, `adminInvoices.labelOverdue` — section labels.

### Changed
- **`AdminInvoicesView`**: Edit and create modal forms include a Due Date date-input after the Status selector. The view-mode detail panel displays `due_date` alongside `issued_at` / `paid_at`. HTML export CSS extended with `.status-unpaid` and `.status-overdue` rules.
- **`InvoiceToolView`**: Due Date date-input added to the Invoice Info section (alongside Status and Language).
- **`MyInvoicesView`**: Invoice list cards and the detail modal now display `due_date` when set.

## [0.6.3] - 2026-03-14

### Added
- **CV page** (`/cv`): New `CVView` component fetches and renders a full résumé from `VITE_CV_ENDPOINT`. Displays photo, contact info, summary, work experience, education, skills (with proficiency dots), projects, certifications, languages, awards, and recommendations.
- **`VITE_CV_ENDPOINT` build variable**: Added `ARG`/`ENV` in `Dockerfile`, `--build-arg` in `cloudbuild.yaml` Kaniko step, `--set-env-vars` in Cloud Run deploy step, and `_VITE_CV_ENDPOINT` substitution.
- **`PROFICIENCY_LEVELS` shared constant** (`src/constants.ts`): Single source of truth for the 1–5 skill/language proficiency mapping, used by `CVView` dots and both resume form dropdowns.

### Fixed
- **CV photo base URL**: `resolvePhoto()` helper prepends `VITE_JUSSILOG_BACKEND_STORAGE_BASE_URL` to relative photo paths returned by the API.
- **Proficiency dot indicator**: Corrected level mapping — `basic` → 2, `intermediate` → 3, `advanced` → 4 (was 2 and 3 respectively). Added missing `basic` key.
- **Kaniko shell quoting**: `--build-arg=VITE_CV_ENDPOINT` is now quoted (`"VITE_CV_ENDPOINT=$_VITE_CV_ENDPOINT"`) to prevent the `&` in query-string URLs from being interpreted as a shell background operator, which previously caused the image push to silently fail.

### Changed
- Skill and language proficiency dropdowns in `ResumeFormView` and `ResumeToolView` now display a numeric prefix, e.g. **"3 - Intermediate"**, sourced from the shared `PROFICIENCY_LEVELS` map.


### Added
- **CI pipeline** (`.github/workflows/ci.yml`): Three parallel jobs — `ESLint`, `Tests`, and `Build` — run on every push and pull request to `main` and `dev-*` branches using Node 20 (from `.nvmrc`).
- **Vitest test setup**: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, and `jsdom` added. `src/test/setup.ts` configures jest-dom matchers. `src/test/smoke.test.ts` provides a baseline passing test.
- **`.nvmrc`**: Pinned to Node `20` to match Dockerfile and CI.
- **`engines` field** in `package.json`: Declares `"node": ">=20"` to document the runtime requirement.
- **`npm run lint:fix` script**: Runs `eslint . --fix` for auto-fixable lint errors.
- **`npm run test:watch` script**: Runs Vitest in interactive watch mode for local development.

### Fixed
- **ESLint `structuredClone` ConfigError**: Added a `globalThis.structuredClone` polyfill in `eslint.config.js` so ESLint 9 runs on Node < 17 locally.
- **`@typescript-eslint/no-unused-vars`**: Configured to ignore `_`-prefixed variables, arguments, destructured bindings, and caught errors.
- **`react-hooks/set-state-in-effect`**: Downgraded to `warn` to avoid blocking builds for intentional synchronous state updates inside effects.
- **`no-useless-escape`** in `UserEditModal.tsx` (regex) and `i18n.ts` (string literals).
- **`@typescript-eslint/no-explicit-any`** in `chatApi.ts` (`[key: string]: any` → `unknown`), `MyProfileView.tsx` (`useState<any>` → `useState<UserSummary | null>`), and `ProductsView.tsx` (`productData: any` → typed as `CreateProductData & {...}`).
- **Unused destructured variables** in `ProductsView.tsx`: `featured_image` and `images` renamed to `featured_image: _` and `images: _`.
- **TypeScript build errors** in `MyProfileView.tsx`: replaced narrow `User` type with `UserSummary` (from `usersApi.ts`); added explicit return type to `getUser()`; fixed `getUserField` to return `string`; used `?? 0` fallback for `userId` prop.
- **`UserSummary` interface** (`usersApi.ts`): Added missing `is_admin?: boolean` and `user?: UserSummary` fields. Added `tax_code` and `tax_rate` to `CreateProductData` and `UpdateProductData` in `productsApi.ts`.

### Maintenance
- Upgraded all devDependencies to latest compatible versions during clean reinstall (`rm -rf node_modules package-lock.json && npm install`).

---

### Added
- **Animated space background — shooting stars**: Five shooting stars originate from randomised positions along the top-left edges of the viewport and sweep diagonally across the sky (upper-left → lower-right). Each star has a long blue-white gradient tail with a `drop-shadow` atmospheric glow, a radial-gradient leading tip with a four-layer `box-shadow` corona, and smooth fade-in / fade-out keyframes. Scoped exclusively to `LandingView`.
- **Animated space background — starlight flares**: Three occasional large star-burst flares pulse in and out at staggered long intervals using multi-layer `box-shadow` with cross-spike offsets.
- **User Edit Modal — full i18n**: All labels, buttons, validation messages, and aria-labels in the user edit / password change modal are now driven by `i18n.ts` translation keys (`userEdit.*`), supporting English and Finnish. Password validation errors include parameterised messages (`{min}`, `{max}`). Language switches reactively without page reload.
- **Edit Profile in NavBar**: The previously disabled "Settings (TBA)" entry in the global NavBar user-account dropdown is replaced by a live "Edit Profile" button that opens `UserEditModal` directly (no role select, refreshes display name on save). Works on every page using `NavBar`.
- i18n keys added: `landing.editProfile` (EN/FI), `userEdit.*` section with 48 keys (EN/FI).

### Changed
- Shooting star animation corrected: transform order is now `rotate(28deg) translateX(dist)` so the star travels along its own rotated axis instead of sliding horizontally. Angle changed from `−35deg` to `+28deg` (clockwise `\` shape) to match the natural upper-left → lower-right meteor direction.
- Shooting star visual quality improved: tail widths increased to 230–390 px, 7-stop gradient, `filter: drop-shadow` glow, radial-gradient tip with four `box-shadow` layers.

## [0.5.0] - 2026-03-13
### Added
- Resume Builder demo: theme and template dropdowns populated dynamically from `/api/resumes/export/options`.
- Resume Builder demo and Resume Management: language dropdown populated dynamically from `/api/resumes/export/options`.
- Resume language, theme, and template are now required fields with translated validation messages (EN/FI) in both the demo builder and authenticated resume editor.
- Resume language field marked with `*` required indicator in both resume views.
- Dependabot configuration (`.github/dependabot.yml`) for automated npm dependency updates (weekly, max 10 PRs).

### Changed
- `getExportOptions` now accepts an optional `lang` parameter and appends `?lang=` to the request URL.
- Template field appears before Theme field in both the Resume Builder and Resume Form views.
- Copying a resume always sets `is_primary: false` on the copy to preserve the uniqueness of the primary resume.
- NavBar: "Resume Builder" label uses i18n translation key; "Resumes" and "Login" labels translated.
- NavBar user account menu reads name and email from the nested `user` object returned by `/api/me`.
- Landing view hero no longer shows the "My Profile" button for authenticated users.

### Fixed
- Registration success response no longer exposes the raw API JSON (including auth token) in the UI.
- NavBar user display name and email now resolve correctly from the nested `/api/me` response shape.

### Security
- Removed `<pre>{JSON.stringify(registerResponse)}</pre>` block from `AuthModal` that leaked the auth token to the DOM after successful registration.

### Maintenance
- Ran `npm update`: 66 packages updated, 0 vulnerabilities.

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
