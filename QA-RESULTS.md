# BizFlow QA results — updated 15 October 2026

Baseline: commit `137f7b7` on `main`. These are the first live API checks for the testing phase, not full Phase 14/15 acceptance.

## Completed

- Started the existing production build on `http://localhost:3100` with a matching trusted origin for this process only. No environment files changed.
- 23 protected GET endpoints returned HTTP 401 and `UNAUTHENTICATED` without a session, with `Cache-Control: no-store`. Coverage includes business profiles, customer/category/product collections and details, inventory/history, orders, invoices and print, dashboard, reports, media, staff/invitations, and audit history.
- 22 mutation endpoint cases returned HTTP 403 and `UNTRUSTED_ORIGIN` when sent an untrusted Origin, before business mutations. Coverage includes account endpoints, invitations, business creation/settings, customer/catalog/inventory/order/media/staff operations.
- Node reported 47 passing results: 45 endpoint subtests plus their two parent tests. No failures in the actual server run. The initial sandbox run could not connect to the server (`EACCES`); the same checks passed outside the sandbox.
- All seven existing isolated backend contract tests passed again.

The new reusable suite is `tests/public-api.test.cjs`. It requires an explicit server URL and makes no authenticated requests. Run the server separately with a matching `APP_URL`, then in PowerShell:

```powershell
$env:BIZFLOW_QA_BASE_URL = 'http://localhost:3100'
node --test tests/public-api.test.cjs
node --test tests/ui-backend.test.cjs
```

## Authenticated browser checks completed on 14 October

The user subsequently confirmed the development/test database and authorised clearly labelled QA records. The existing owner account signed in successfully. No test accounts were seeded, passwords changed, or invitation/reset emails sent.

| Workflow | Observed result |
| --- | --- |
| Customers | Creation, name editing, clearing optional phone/address/notes, archive, restore, and empty purchase history passed. Clearing persisted after reload. Archive dialog focused Cancel; Escape dismissed it and restored trigger focus. |
| Categories | Creation, name editing, description clearing, archive confirmation, and restoration passed. Restored category appeared in active product lookup. |
| Products | Creation at PKR 125.50; editing to PKR 150.25; description clearing; archive and restore passed. New inventory started at zero. |
| Manual stock | Increase +10 and decrease −2 produced stock 8. Decrease −11 was rejected while stock was 10; quantity input remained 11 after failure, and no adjustment was appended. Threshold 2 persisted after reload. |
| Pending order | Searchable customer/product selection and availability lookup passed. Nine units at PKR 150.25 produced PKR 1,352.25; completion was rejected against stock 8. Editing to three units recalculated total to PKR 450.75. |
| Completion and invoice | Completion produced a Completed order, removed edit controls, reduced stock 8 → 5, and exposed exactly one Issued invoice for PKR 450.75. Authorised printable HTML rendered business/customer/item snapshots and UTC timestamps. |
| Immutable prices | Updating the catalog price to PKR 175.50 after completion left both completed order and printable invoice at PKR 150.25 per unit and PKR 450.75 total. |
| Completed cancellation | Cancellation produced Cancelled status, removed transition controls, restored stock 5 → 8, and marked the same invoice Voided without changing its historical amounts. Inventory history showed one deduction and one reversal. |
| Purchase history | Customer history showed the Cancelled order, three units, saved PKR 150.25 unit price, and PKR 450.75 total. |
| Reports | The QA day showed zero issued sales after cancellation; inventory report reconciled opening 0, closing/current 8, manual increase 10, manual decrease 2, and reversal 3; order activity showed one current Cancelled order. UTC date filtering worked. |
| Audit | Business audit showed matching order, invoice, stock, and catalog events with metadata. Real pagination moved from page 1 to page 2 of 5. Action/entity/date filters isolated the QA order-completion event. |
| Media | A non-sensitive 64×64 QA PNG uploaded successfully, was processed to WebP, appeared in the gallery/detail/picker, and remained assigned to the QA product after reload. |
| Owner administration | Staff listing displayed current membership grants and Accepted/Revoked invitation states. Settings displayed immutable PKR and no currency input. These were read-only checks. |
| Dashboard | Genuine revenue/recent-order/low-stock data rendered; the Cancelled QA order appeared without adding revenue. At an explicitly verified 375-pixel viewport, document/content width was 360 pixels and mobile menu opened correctly. |

### QA records retained

All are in the existing development business `6abf193b812942e655675674`:

- Customer `6acf816219f8888fea710100`: **QA 2026-10-14 Customer Updated**, Active; optional phone/address/notes cleared.
- Category `6acf822419f8888fea710105`: **QA 2026-10-14 Category Updated**, Active.
- Product `6acf82ae19f8888fea71010a`: **QA 2026-10-14 Product Updated**, Active; current price PKR 175.50, stock 8, threshold 2.
- Order `6acf83d419f8888fea710117`: Cancelled; three units at saved PKR 150.25, total PKR 450.75.
- Invoice `6acf843919f8888fea71011c`: Voided, same immutable total.
- Media `6acf85f019f8888fea710124`: uploaded QA image, retained and assigned. The user explicitly requested **Keep the QA image**. No deletion attempts were performed.

Screenshots are outside the repository under the chat's writable visualization directory: customer restoration, insufficient stock, completed order, Issued/Voided print views, uploaded/assigned media, and verified mobile dashboard.

## Remaining tests and current setup

As of 15 October, owner workflow testing still needs: Pending cancellation without stock changes; duplicate-name/email feedback; remaining search/status/category filters; threshold removal; product media assignment removal/re-assignment; business creation/switching; settings mutation; mobile table overflow checks; logout/session expiry; and authenticated cross-business rejection.

Staff permission restrictions/revocation need an existing staff session. The user has offered to sign in as staff when the browser is handed over. Invitation/reset email-delivery tests are explicitly pending at the user's request. Media deletion/reference-conflict/pending-deletion tests are pending because the user requested that the image be kept.

The local QA server was restarted on 15 October with a matching process-only trusted origin. Browser control initially rejected inspection of a stale browser error page due to its internal URL protocol. The user was asked to reload the normal localhost login page; this is a browser-tool blocker, not an application failure.

The unauthenticated suite and observed owner workflows do not by themselves establish access control between two authenticated tenants, staff permission revocation, concurrent transaction safety, or complete Phase 14/15 acceptance. No acceptance checkboxes in PROJECT.md have been changed.
