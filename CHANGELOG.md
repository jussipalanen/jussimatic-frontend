# Changelog

All notable changes to this project will be documented in this file.

## [0.6.0] - 2026-03-14

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
