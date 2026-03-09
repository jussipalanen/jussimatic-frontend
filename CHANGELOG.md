# Changelog

All notable changes to this project will be documented in this file.

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
