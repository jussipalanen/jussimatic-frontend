# Changelog

All notable changes to this project will be documented in this file.

## [1.1.2] - 2026-03-22

### Added
- **AI chat — `[photo]` / `[image]` tag support**: The bot reply parser now converts `[photo]url[/photo]` and `[image]url[/image]` custom tags into `<img>` elements with `alt="Photo"` / `alt="Image"` respectively, allowing the AI backend to embed images inline in chat replies.

### Changed
- **AI chat — inline image styling**: Images inside bot replies now render with a portrait-friendly max size (200×240 px), `object-fit: cover`, rounded corners (`0.75rem`), a drop shadow, and a subtle border matching the dark bubble theme.
- **AI chat — image spacing**: Each inline image has `1.75rem` top and bottom margin, and image-only paragraphs are centre-aligned.

## [1.1.0] - 2026-03-22

### Added
- **JussiSpace project card**: New external demo entry in the Projects & Demos modal linking to the rental apartment and office space system (`jussispace-production.lab.jussialanen.com`). Opens in a new tab. Badges: Node.js, MySQL, AWS, API.
- **Demo subtitles**: All 7 project/demo cards now display a short translated description below the title in both English and Finnish. Subtitle keys added to `t.landing` in `i18n.ts` and a `subtitleKey` field added to the `Demo` interface in `demos.ts`.
- **`DemoSubtitleKey` type** (`src/demos.ts`): New union type for subtitle translation keys, parallel to `DemoLabelKey`.
- **External URL support for demos**: `externalUrl?: string` added to the `Demo` interface. Both list and grid views in the Projects & Demos modal and the navbar dropdown (desktop and mobile) now open external URLs in a new tab (`noopener,noreferrer`) instead of navigating internally.
- **Hard-coded chat suggestions**: `exampleQuestions` added to `t.chat` in `i18n.ts` for both EN and FI, replacing the API-fetched suggestions. Questions now reflect Jussi's actual skills, projects, experience, languages, and education.

### Changed
- **AI Chat endpoint** (`src/api/chatApi.ts`): Migrated from the Node.js backend to the Python AI service (`VITE_JUSSI_AIBOT_API_URL`). Request payload updated to `{ handler, message, language, history }` and response field changed from `response`/`answer` to `reply`.
- **AI Chat — conversation history**: `ChatView` now passes the full message history to `ask()`, enabling context-aware responses from the AI service.
- **AI CV Review auth** (`src/demo/ai-cv-review/api/cvReviewApi.ts`): Replaced `X-API-key` header with `Authorization: Bearer <key>` to match the Python service requirement.
- **Secret key renamed**: `VITE_JUSSI_AIBOT_API_KEY` → `VITE_JUSSI_AIBOT_AI_SECRET_KEY` across all files (source, `vite-env.d.ts`, `.env.example`, `Dockerfile`, `cloudbuild.yaml`, `scripts/update-secret-manager-frontend.sh`, `terraform/secrets.tf`). Now shares the same secret value as `JUSSI_AIBOT_AI_SECRET_KEY` used by other services.
- **Terraform secret name** (`terraform/secrets.tf`): Secret resource renamed to `JUSSIMATIC_FRONTEND_VITE_JUSSI_AIBOT_AI_SECRET_KEY`.

### Fixed
- **AI Chat — missing Authorization header**: Added `Authorization: Bearer` to `/ai/chat` requests, resolving 401 errors from the Python service.
- **AI CV Review — missing Authorization header**: Added `Authorization: Bearer` to `/ai/review` requests, resolving 401 errors.
- **Navbar external demo links**: JussiSpace and any future external demos now open correctly in a new tab from the navbar dropdown (`NavActions.tsx`) on both desktop and mobile.

## [0.9.0] - 2026-03-19

### Added
- **Terraform infrastructure** (`terraform/`): New directory managing all GCP resources — Artifact Registry repository, Cloud Run service, Secret Manager secrets (`VITE_GOOGLE_CLIENT_ID`, `VITE_JUSSI_AIBOT_API_KEY`), required API enablement, and IAM bindings for the Cloud Build and Cloud Run service accounts.
- **`terraform/.gitignore`**: Excludes state files (`*.tfstate`, `*.tfstate.*`), `.terraform/`, `.terraform.lock.hcl`, and `*.tfvars` from version control.
- **Resume Edit — PDF preview tab**: Auto-loads a PDF preview (via signed URL → blob) when the Preview tab is opened; no button click required.
- **Resume Edit — auto-save**: Form changes are debounced (1.5 s) and saved automatically while editing; a spinning/checkmark indicator shows save status.
- **Resume Edit — visual template & theme picker**: Replaces dropdowns with clickable buttons and colour swatches populated from `/api/resumes/export/options`.
- **Resume Edit — Set as Primary confirmation**: Clicking "Set as Primary" now shows an inline confirmation step before applying.
- **Resume Tool (demo) — PDF preview tab**: Auto-loads preview via `POST /api/resumes/preview/pdf` (no auth required).
- **Resume Tool (demo) — visual template & theme picker**: Same picker as the edit form, reads from export options endpoint.
- **Resume List — Set as Primary confirmation**: Same inline confirmation pattern as the edit form.

### Changed
- **Resume Edit — header layout**: Breadcrumb on its own row, action buttons on the row below for better readability and mobile friendliness.
- **Blog post — rich content rendering**: Improved paragraph spacing, detects plain text vs HTML, converts blank lines to visible spacing. Headings, blockquote, code blocks, inline code, links, lists, `hr`, and images all styled via `blog-content.css`.
- **Blog post styles extracted**: Scoped blog styles moved from inline to `blog-content.css`.
- **`RichTextEditor` — paragraph spacing**: Increased margins between paragraphs in the editor for better readability.
- **`RichTextEditor` styles extracted**: Inline `<style>` block moved to `rich-text-editor.css`.
- **README — Infrastructure section**: Documents Terraform resources, getting-started steps, and the full Cloud Build → Cloud Run deployment flow.
- **README — Cleanup section**: Docker teardown, build artifact removal, and `terraform destroy` instructions.
- **README — accordion sections**: "Local & Docker" commands, "Deployment & Cloud" commands, "npm scripts", and "Environment Variables" are now collapsible `<details>` blocks.
- **README — missing `dev` commands documented**: `deploy`, `get-env`, `set-env`, and `secrets` added with descriptions and examples.

### Fixed
- **Resume Edit — export dropdown z-index**: Dropdown was clipped behind other elements; fixed with `flex-wrap` and raised `z-index`.
- **Blog featured image "must be a file"**: Fixed `FormData` serialisation — existing image path is no longer re-sent on edit, preventing backend validation error.
- **Blog content `div` structure**: Corrected wrapper element structure for blog post content rendering.

### Security
- **Terraform IAM — `iam.serviceAccountUser` scoped**: Binding changed from project-wide (`google_project_iam_member`) to SA-scoped (`google_service_account_iam_member`), preventing Cloud Build from impersonating any service account in the project.
- **`vite_cv_endpoint` marked `sensitive`**: Variable flagged `sensitive = true` in Terraform since the CV endpoint URL may carry auth tokens in query parameters.

## [0.8.0] - 2026-03-17

### Added
- **`AdminHeader` component** (`src/demo/ecommerce/components/AdminHeader.tsx`): New standalone header for all admin views. Uses `NavActions` (language selector, user menu, projects dropdown) instead of the ecommerce-specific nav buttons. Displays `APP_NAME` as a clickable link to `/` and the page title as a breadcrumb.
- **`APP_NAME` constant** (`src/constants.ts`): Single source of truth for the application name "Jussimatic".
- **`getAllBlogs` API function** (`src/api/blogsApi.ts`): Authenticated call to `GET /api/admin/blogs` that returns all blogs regardless of visibility. Used by `AdminBlogsView` so the admin list shows both published and draft posts.
- **404 Not Found page** (`src/NotFoundView.tsx`): Rendered for any unmatched route via a catch-all `path="*"` in `App.tsx`. Includes a "Go to homepage" button. Fully translated (EN/FI).
- **Blog category admin view** (`/admin/blog-categories`): `BlogCategoriesView` rewritten to match the admin layout — uses `AdminHeader`, `bg-gray-900`, same auth error flow and list item style as other admin views.
- **Blog slug routing**: `getBlog()` now accepts `string | number`. `BlogsView` and `AdminBlogsView` navigate to `/blogs/${blog.slug ?? blog.id}`. `BlogView` passes the raw route param to support both numeric IDs and slugs.
- **i18n keys** (EN + FI):
  - `adminDashboard.permissionDenied` — translated permission error shown across all admin and order views instead of the hardcoded English string.
  - `notFound.heading`, `notFound.description`, `notFound.goHome` — 404 page strings.
  - `blog.blogNotFound` — shown in `BlogView` when the API returns 404 for a blog post.

### Changed
- **`AdminHeader` — app title clickable**: Clicking "Jussimatic" navigates to `/`.
- **Admin sub-view back buttons**: `AdminBlogsView`, `AdminUsersView`, `AdminInvoicesView`, `AdminOrdersView` back to `/admin`; `AdminDashboardView` back to `/`.
- **`AdminBlogsView`**: Now calls `getAllBlogs` (authenticated, `/api/admin/blogs`) instead of the public `getBlogs`, so draft/private posts are visible in the admin list.

### Fixed
- **`BlogCategoriesView` build error**: Removed reference to undefined i18n key `blogCategoriesDesc` that caused TypeScript build failure in CI.
- **`BlogCategoriesView` unused `navigate`**: Removed unused `useNavigate` import and variable.
- **`BlogFormModal` — featured image removal**: `featured_image` path now included in the update payload. `buildBlogFormData` sends the string path (or empty string) when no new file is provided, allowing the backend to clear the image on save.
- **`BlogFormModal` — `any` cast removed**: `(blog as any).slug` replaced with `blog.slug` since `slug` is already typed on the `Blog` interface.

## [0.7.0] - 2026-03-15

### Added
- **Resume JSON export** (`GET /api/resumes/{id}/export/json`): Authenticated users can now export any resume as a structured JSON file directly from the **ResumeEdit form** (Export dropdown → JSON), the **Resumes list view** (per-card Export dropdown → JSON), and the **public Resume Tool demo** (Export dropdown → JSON, serialised client-side from the current form state without any API call).
- **Resume JSON import — create new** (`POST /api/resumes/import/json`): An **Import JSON** button in the **Resumes list view** header opens a hidden file picker (`.json`). Uploading a file calls the new endpoint, creates a new resume, and navigates directly to its edit page.
- **Resume JSON import — update existing** (`POST /api/resumes/{id}/import/json`): An **Import JSON** button in the **ResumeEdit form** toolbar uploads a `.json` file to overwrite the current resume, then reloads the form with the returned data.
- **Resume Tool demo — JSON import**: The **Import JSON** button in the demo toolbar parses a `.json` file entirely in the browser (no API call) and populates the form. Supports the canonical export format (`{ version, exported_at, resume: {...} }`), Laravel-style `{ data: {...} }` wrappers, and plain objects.
- **`show_skill_levels` toggle** in **ResumeEdit → Skills section**: A pill toggle controls whether proficiency dot indicators are rendered for skills in the CV view and export. Off by default.
- **`show_language_levels` toggle** in **ResumeEdit → Languages section**: Same pill toggle for language proficiency dots. Off by default.
- **`CVView` — conditional proficiency dots**: `show_skill_levels` and `show_language_levels` flags from the resume API response now gate the `<ProficiencyDots>` component in the Skills and Languages sections respectively.
- **`resumesApi`** — new exported functions: `exportResumeJson`, `importResumeJson`, `createResumeFromJson`.
- **i18n keys** (EN + FI): `errImportResume`, `importJson`, `importing`, `importSuccess`, `showSkillLevelsLabel`, `showLanguageLevelsLabel`, `showLevelsOn`, `showLevelsOff`.

### Changed
- **`Resume` interface** (`resumesApi.ts`): Added optional `show_skill_levels?: boolean` and `show_language_levels?: boolean` fields (automatically included in `ResumePayload` via the existing `Omit` type).
- **`ResumeEdit` — Export dropdown**: Now contains three options — PDF, HTML, and JSON.
- **`ResumesView` — Export dropdown**: Now contains three options — PDF, HTML, and JSON.
- **`ResumeToolView` — Export dropdown**: Now contains three options — PDF, HTML, and JSON.
- **i18n labels** `showSkillLevelsLabel` / `showLanguageLevelsLabel` updated to clarify they affect both the CV view and exports: *"Show skill levels in CV & export"* / *"Näytä taitotasot CV:ssä ja viennissä"*.

## [0.6.8] - 2026-03-15

### Added
- **Shared `Pagination` component** (`src/components/Pagination.tsx`): Extracted a single reusable `<Pagination>` component used across the entire app. Accepts `currentPage`, `totalPages`, `onPageChange`, `pageNumbers` (supports `-1` as an ellipsis sentinel), and optional `previousLabel`/`nextLabel` props. Returns `null` when `totalPages <= 1`. All four previous inline pagination implementations replaced with this component.
- **`LanguageSelect` — `dropdownAlign` prop**: New optional `dropdownAlign: 'left' | 'right'` prop (default `'right'`) controls which edge of the trigger button the dropdown panel aligns to. Prevents the panel from overflowing off-screen when the trigger is near the left edge of the viewport (e.g. inside the mobile menu bottom bar).

### Changed
- **Browse Jobs — `JobCard` mobile layout**: Added `overflow-hidden` to the card wrapper and `break-words` to job title and organisation/category text so long strings wrap instead of overflowing on narrow screens. Job titles gain `line-clamp-2` (grid) / `line-clamp-3` (list) to cap runaway multi-line titles. Removed the previous ineffective JS word-count truncation (was set to 100 words, far too high to ever trigger).
- **Browse Jobs — `Pagination`**: Rebuilt to match the ecommerce `ProductsView` style — `rounded-lg border border-gray-700 px-3 py-1 text-sm` buttons, `«`/`»` symbols rendered only when a previous/next page exists (no disabled state), active page highlighted with `bg-blue-600 font-semibold`, container uses `flex flex-wrap` so buttons wrap naturally on mobile.
- **All pagination UI unified**: `AdminInvoicesView`, `ResumesView`, and `ProductsView` inline pagination blocks replaced with the new shared `<Pagination>` component, ensuring a consistent look and mobile behaviour across the whole app. `src/demo/browse-jobs/components/Pagination.tsx` retained as a thin re-export for backward compatibility.
- **`EcommerceHeader` — mobile top bar decluttered**: Language selector, Login, Register, and Logout buttons removed from the sticky mobile header bar. The top bar now shows only the title and the hamburger toggle button, preventing overflow on small screens.
- **`EcommerceHeader` — mobile dropdown bottom bar**: Language selector moved into the dropdown's bottom section alongside the auth buttons (Login + Register or Logout), keeping all secondary controls accessible without cluttering the header.
- **`EcommerceHeader` — mobile dropdown `overflow-hidden` removed**: The dropdown wrapper no longer has `overflow-hidden`, which was clipping the `LanguageSelect` panel before it could render outside the menu box.
- **`LanguageSelect` — mobile menu alignment**: The `LanguageSelect` inside the ecommerce mobile dropdown now uses `dropdownAlign="left"` so the language panel opens rightward from the button rather than off the left edge of the screen.
- **`NavActions` — animation toggle button redesigned**: The animated-background toggle is now a `w-8 h-8 rounded-lg border` icon-only button matching the style of other nav icon buttons. **ON state**: amber border + tint, filled gold star with a soft pulsing glow ring. **OFF state**: dim white border + ghost background, outline star with a diagonal slash. Label removed entirely.

### Fixed
- **`EcommerceHeader` — `LanguageSelect` dropdown clipped on mobile**: `overflow-hidden` on the mobile dropdown container was preventing the language option list from rendering outside its bounds; removed to allow the panel to float freely.
- **`LanguageSelect` — dropdown off-screen on small viewports**: When the trigger sits near the left edge (mobile menu), `right-0` alignment pushed the 144 px panel off-screen to the left. Fixed via the new `dropdownAlign` prop.

## [0.6.7] - 2026-03-15

### Added
- **`AdminOrdersView` — order language selector**: Edit order modal now includes an "Order language" (`lang`) dropdown (English / Finnish) per order. The selected language is sent in the `updateOrder` API payload, allowing admins to control the language of order confirmation emails/documents independently per order. Defaults to the current UI language when opening the modal.
- **`AdminOrdersView` — translated status badges**: Order status labels (`pending`, `processing`, `completed`, `cancelled`, `refunded`) are now resolved through `orderStatusOptions` and translated via i18n rather than rendered as raw strings. Status badges in both the order list cards and the order detail modal reflect the current UI language.
- **`AdminOrdersView` — auto-open first order**: The first order's detail modal is automatically opened on page load for quicker access.
- **`AdminDashboardView` — icon navigation cards**: Replaced the previous layout with a unified 3-column grid (`grid-cols-1 sm:grid-cols-3`) of large clickable icon cards for Orders (blue), Users (purple), and Invoices (green). Each card contains an icon, title, and description.
- **`AdminUsersView` — card-based user list**: Replaced the horizontal-scroll table with a card list layout. Each card shows an avatar with initials, full name, a "You" badge for the current user, a colour-coded role badge (purple = admin, blue = vendor, gray = customer), username / email / user ID, and Edit / Delete action buttons.
- **`NavActions` — Admin Dashboard shortcut**: A gear icon button linking to `/demo/ecommerce/admin` is now shown in the main site navigation bar for users with `admin` or `vendor` roles. Hidden on small screens (`hidden sm:flex`).
- **i18n keys** (EN + FI):
  - `adminOrders.labelOrderLang` — "Order language" / "Tilauksen kieli" label for the new lang selector.
  - `adminUsers.labelYou` — "You" / "Sinä" badge label for the current user in the users list.

### Changed
- **`AdminInvoicesView` — due date format**: Invoice `due_date` inputs changed from `type="date"` (YYYY-MM-DD) to `type="text"` with `placeholder="d.m.yyyy"`. Two helpers `toDateInputValue()` and `parseDisplayDateToISO()` convert between the Finnish `D.M.YYYY` display format and the ISO `YYYY-MM-DD` API format in both edit and create forms.
- **`ordersApi` — `lang` moved to request body**: `createOrder` second-argument `lang` query param removed; `lang` is now a body field in both `CreateOrderData` and `UpdateOrderData` interfaces. `CheckoutView` and `AdminOrdersView` updated accordingly.
- **`EcommerceHeader` — 2K monitor layout**: Container widened to `max-w-screen-2xl`; desktop nav button labels shifted to `2xl:inline` breakpoint to prevent overflow on wide viewports.
- **`EcommerceHeader` — mobile header bar**: Language selector and login/logout buttons moved directly into the sticky mobile header bar (visible on mobile, hidden on desktop), alongside the hamburger button. `LanguageSelect` removed from the bottom bar of the dropdown.
- **`EcommerceHeader` — desktop nav**: `LanguageSelect` repositioned to the leftmost slot of the desktop navigation bar.
- **`EcommerceHeader` — mobile dropdown**: Dropdown layout changed from a 2-column CSS grid to a single-column `flex-col` list for cleaner stacking on narrow screens.

### Fixed
- **`AdminUsersView` — `shrink-0` class**: Replaced `flex-shrink-0` (Tailwind v2 syntax) with `shrink-0` to resolve lint/build warnings.
- **`AdminOrdersView` — missing `</span>` tag**: Fixed unclosed `<span>` element in the order list status badge markup.
- **`AdminInvoicesView` — customer fields dropped from edit payload**: Structural bug where customer fields were omitted from the update payload during a refactor was corrected.
- **`EcommerceHeader` — stray `}` syntax error**: Removed extra `}` after a JSX comment (`{/* Products */}}`).
- **`adminUsers.labelYou` missing from i18n**: Added `labelYou` to both `en` and `fi` `adminUsers` translation objects, fixing a TypeScript build error (`TS2339`) surfaced in CI.

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
