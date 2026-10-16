# Phase 14 UI handoff

Historical implementation handoff: the verification status below predates the
authenticated QA runs. See [QA-RESULTS.md](QA-RESULTS.md) for current observed
results and [TESTING.md](TESTING.md) for repeatable test commands and test scope.

Reviewed on 14 October 2026. Changes remain uncommitted for review; nothing was pushed or deployed. The three pre-existing customer detail/edit/status files were preserved and completed.

## Implemented browser workflows

All paths below are relative to `/businesses/[businessId]` unless stated otherwise.

| Area | Browser interface |
| --- | --- |
| Account access | Existing login/register/logout retained; `/forgot-password`, `/reset-password`, and `/staff-invitations/accept` added. Invitation context survives login/register navigation. Invalid links and expired sessions have explicit feedback. |
| Account profile | `/account` shows name, email, contact number, join date and initials. Name/contact/about edits use session-scoped validation and transactional account audit. My profile links appear in the chooser and workspace header. |
| Workspace | Existing business selection/creation retained. Overview shortcuts and dashboard links respect permissions. `/settings` is owner-only; currency is displayed as immutable. |
| Staff | `/staff` lists membership/invitation lifecycle states, creates invitations, edits approved permissions, confirms membership removal and invitation revocation, and shows the backend's exact email-delivery outcome. |
| Customers | Existing list/search/filter/page/create retained. Detail editing, optional-field clearing, archive confirmation, restore, and paginated purchase history completed. |
| Categories | `/categories`, `/categories/new`, and `/categories/[categoryId]`: search, status filters, pagination, creation, editing, archive/restore, field validation and conflict feedback. |
| Products | `/products`, `/products/new`, and `/products/[productId]`: search, category/status filters, pagination, creation, editing, archive/restore, active category selection, and image assignment/removal. Prices use business currency; stock remains in Inventory. |
| Inventory | `/inventory`, `/inventory/[productId]`, and `/inventory/history`: stock filters, manual adjustments with reason, threshold changes/removal, and paginated adjustment history. Order forms use restricted stock lookups. |
| Orders | `/orders`, `/orders/new`, and `/orders/[orderId]`: status/customer filtering, pagination, searchable customer/product selection, Pending editing, snapshots/totals, and confirmed completion/cancellation through existing transactional APIs. |
| Invoices | `/invoices` and `/invoices/[invoiceId]`: filters, pagination, immutable business/customer/item snapshots, Issued/Voided distinction, and the authorized HTML print endpoint. No manual generation/editing UI. |
| Reports | `/reports`: sales, inventory turnover, and order activity; UTC date-range filters, supported pagination, genuine service data and explicit calculation/date bases. |
| Media | `/media` and `/media/[mediaId]`: validated JPEG/PNG/WebP upload up to 5 MiB, paginated gallery, details, assignment via products, confirmed deletion, referenced-image errors, and pending-deletion retry. |
| Audit | `/audit-logs`: owner-only read-only business events, action/entity/date filters, pagination, actor IDs and readable metadata. Account-scope events remain excluded. |

Shared UI includes accessible native modal confirmations, permission checks on protected pages, form preservation after failures, inline field errors, status announcements, loading skeletons, error/not-found states, bounded table scrolling, and paginated lookup pickers. Glass styles use restrained blur with an opaque fallback and existing reduced-motion handling.

## Backend and build changes

- Added `src/services/auth/forgot-password.service.ts` and `src/app/api/auth/forgot-password/route.ts`. Requests validate and normalize email, enforce global/per-email rate limits, store only a token hash with a 30-minute lifetime, create the account audit event in the token transaction, and send the reset link by the existing email service. Per-account storage/delivery failures retain the generic response. Existing single-use reset/session-revocation logic remains in use.
- Added `src/services/customer/purchase-history.service.ts`. It authorizes full customer access before reading only that customer's business-scoped order snapshots, with 20-row pagination. It does not grant general order-management access.
- Media reads expose lifecycle status. `includeDeleting=true` lets the authorized gallery show pending deletion; default media lookups continue excluding it. Product reference locking and deletion transactions are unchanged.
- `npm run build` uses the locally documented `next build --webpack` option. Default Turbopack repeatedly failed to start its CSS worker both inside and outside the sandbox. No dependencies or framework versions changed.

## Verification results

| Check | Result |
| --- | --- |
| `npm run build` | Passed with the Webpack build script; all new routes compiled. Existing Geist font download required running outside the sandbox. |
| `npx tsc --noEmit` | Passed after the final production build. |
| `npx eslint .` | Passed without errors or warnings. |
| `git diff --check` | Passed. Git printed only LF-to-CRLF normalization notices. |
| `node --test tests/ui-backend.test.cjs` | 7 passed, 0 failed. |

The isolated tests cover reset hashing/expiry/account-audit transaction usage, generic absent-account and delivery/storage-failure responses, no email after an audit failure, authorization and tenant filters for purchase history, customer optional-field clearing, and permission/scoping/default exclusion for pending media. They use dependency doubles and do not constitute live database transaction or E2E tests.

Browser checks performed against a production server: desktop login rendering; login-to-recovery and login-to-registration navigation; required recovery-email validation; invalid/missing reset and invitation links; unauthenticated business-creation redirect; and login/registration layouts at a requested 375-pixel viewport, with no horizontal page overflow. Existing registration field labels/types/autocomplete were inspected. The login attempt preserved input and displayed the generic invalid-credentials error.

The alternate test port was initially rejected by the existing trusted-origin protection. The test server was restarted with a matching `APP_URL` for that process only; no environment files or origin-validation code were changed. Verification servers were stopped before production builds.

## Remaining verification and phase status

The provided existing account returned **Invalid email or password**. The database was not confirmed as a development database. No business-record mutations, account creation, password changes, invitation emails, or uploads were performed during browser verification.

Authenticated business selection/creation, customer/catalog lifecycle, inventory operations, order transactions, invoice print rendering, media operations, staff/invitation acceptance, report/audit rendering, logout, and owner/staff restrictions remain unverified in a live browser. Authenticated desktop/mobile layouts and email link delivery/expiry/reuse still require an identified development database and working existing owner/staff test accounts.

There are no intentionally nonfunctional module placeholders in the added UI. PDF export remains optional; HTML printing is connected. Phase 14 implementation is ready for review, but its acceptance is **not signed off** because authenticated workflow verification is blocked. Phase 15 security/isolation QA can begin with that limitation recorded; it must not treat the seven isolated tests as proof of live tenant isolation or transaction atomicity.

## Changed-file summary and suggested commit

- App Router pages: account recovery/invitation acceptance; customer detail/history; category/product/inventory/order/invoice/media/report/staff/settings/audit modules; root/workspace loading and error states.
- Components: authentication context, customer edit/status controls, shared forms/dialogs/tables/pagination/lookup pickers, catalog and Pending-order forms.
- Services/API: forgot-password request, customer history, media lifecycle reads.
- Supporting files: `src/lib/workspace-page.tsx`, media validation, global styles, `package.json`, this handoff and `tests/ui-backend.test.cjs`.

Suggested commit message: `feat: complete BizFlow Phase 14 UI workflows`

For local verification, ensure `APP_URL` matches the server origin. Run `npm run build`, `npm run start`, and `node --test tests/ui-backend.test.cjs`. If the development server encounters the same Turbopack worker failure, use `npm run dev -- --webpack`.
