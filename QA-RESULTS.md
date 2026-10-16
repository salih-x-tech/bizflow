# BizFlow QA results — updated 16 October 2026

Latest result: MongoDB connectivity was restored and the real database integration
suite passed **28 Node results with zero failures/skips**. Offline tests passed
**31 results**. These supersede the earlier connection-blocked attempts below.
Final live staff browser acceptance and explicitly deferred workflows remain
separate from the passing backend/integration results. Phase 17 is untouched.

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

## Latest verification attempt — 15 October 2026

- Baseline is now commit `e20ae06` (`test: add public API security checks and QA results`).
- The existing development server is running at `http://localhost:3000`. Starting a second development server on 3100 was refused by Next.js because the same project already has a running development server. The existing server was left running.
- `node --test tests/ui-backend.test.cjs`: 7 passed, 0 failed.
- `npx tsc --noEmit`: passed.
- Public API suite against port 3000: 47 passing results (45 endpoint cases and 2 parent tests), 0 failures. All 23 protected GET requests returned 401 and no-store; all 22 untrusted-origin mutations returned 403. The initial sandbox attempt was blocked with EACCES; the approved rerun outside the sandbox passed. No authenticated requests or business record mutations were made by this suite.
- Authenticated browser checks could not resume: the connected in-app browser continued to expose an internal connection-refused page for port 3100. Browser security denied access to that internal page. The user reported opening the port 3000 login form, but the tool's tab inventory still showed the stale error page. No bypass was attempted and none of the remaining owner/staff workflows were marked passed.
- The earlier MongoDB network failure was not rechecked by authenticated login in this attempt. The successful unauthenticated suite does not establish database connectivity.
- Remaining scope and the user's deferrals above still apply. No application code was changed in this verification attempt.

## Authenticated continuation — 15 October 2026

The user opened a working port 3000 tab and signed in as the existing owner. The browser blocker was resolved for that tab and the following checks were performed against the development database.

| Check | Observed result |
| --- | --- |
| Business creation and switching | Created **QA 2026-10-15 Isolation Workspace**, ID `6ad09f56db7c28916b84c9c9`, PKR. Both businesses appeared in the chooser; switching opened the correct workspace. |
| Business settings | Set business type to **QA isolation testing**, saved optional QA email/address, and verified persistence after reload. Cleared email/address, saved and reloaded; all optional contact fields were empty. No currency input was exposed. |
| Cross-business record scoping | The existing QA customer, product, order and invoice IDs each showed **Record unavailable** when opened under the new business ID. This tests record scoping for an owner of both businesses; it does not establish non-member rejection. |
| Pending cancellation | Created order `6ad09fe6db7c28916b84c9ce`, one QA unit at PKR 175.50; cancelled while Pending. Transition/edit controls disappeared; invoice lookup returned zero records; stock remained 8. |
| Threshold removal | Removed QA threshold, reloaded and observed **Not set** with stock 8. Restored threshold 2 and verified after reload. |
| Image assignment | Removed the QA product's assignment, saved, reloaded and observed zero assigned-image links. The existing image remained in the picker. Reassigned it, saved and reloaded successfully. No media was deleted. |
| Duplicate validation | Existing active QA category name was rejected with a field error; existing QA customer email was rejected with a field error. Both forms preserved input. |
| Customer filters | Email search isolated the QA customer; Archived returned no matching QA customer; Reset filters restored two Active customers and the Active dropdown value. |
| Product filters | Combined QA name/category ID returned one Active product; Archived returned none; Clear filters restored the two Active products. |
| Category/order filters | QA category name isolated one record, Archived returned none, reset restored Active controls/results. QA customer + Cancelled order filters isolated the two QA orders then present; reset restored all orders and All status. |
| Mobile order table | At viewport 375, document/client content width was 360. Table container width 285, content width 373, overflow-x auto; keyboard ArrowRight changed horizontal scrollLeft. No page-wide overflow was observed. |
| Concurrent stock check | Created two Pending QA orders, `6ad0a1acdb7c28916b84c9d7` and `6ad0a1bddb7c28916b84c9d9`, each 5 units at PKR 175.50 against stock 8. Submitted completion confirmations together from two browser tabs. The latter completed; the former was rejected for insufficient stock. Stock was 3, the winner had exactly one Issued invoice and the rejected order had none. |
| Concurrency cleanup | Cancelled both disposable orders. Winning invoice `6ad0a1d0db7c28916b84c9dd`, PKR 877.50, became Voided. Rejected order still had no invoice. Final stock returned to 8, threshold 2. This is one observed concurrent two-order case, not a comprehensive load test or same-order replay test. |

### Fix found during this continuation

The shared filter form retained a stale Status selection after client-side **Clear filters**, although server results reset correctly. Added a key derived from field/query values so uncontrolled inputs remount when URL filters change. Browser regression checks confirmed Products and Categories reset to Active and Orders reset to All. TypeScript and ESLint for the changed component passed.

New proof screenshots: `qa-business-settings.jpg`, `qa-cross-business-rejected.jpg`, `qa-media-reassigned.jpg`, `qa-orders-mobile.jpg`, and `qa-concurrent-stock-rejection.jpg` in the existing visualization directory. QA records and image are retained; stock and threshold are restored as described above.

Further checks in the same continuation:

- QA inventory search plus low-stock=false returned the one QA product at stock 8/threshold 2; low-stock=true returned no records. Clear filters restored both products, Active product status, and All low-stock status.
- Product adjustment history showed seven total records, including exactly one new deduction 8 → 3 (−5) and one reversal 3 → 8 (+5) for the concurrent completion/cancellation case.
- At 375px, the product form and archive confirmation had document/content width 360. The dialog initially focused Go back; Escape dismissed it and restored focus to Archive product. No archive was submitted. Full keyboard focus-cycle behaviour was not conclusively established in this check.
- Owner logout completed. Navigating directly to the protected Orders URL afterwards redirected to `/login` with the login form. This confirms logged-out page protection; it does not test replay of a copied/revoked session token or natural session expiry.
- The viewport override was reset and the browser was left on port 3000 login for the user's existing staff-account handoff. No staff password was requested in chat.

Remaining acceptance scope now includes staff restrictions and revocation, non-member cross-business access, same-order repeated transition requests/session-token replay or expiry, and any broader concurrency/load coverage. Email delivery/password changes and permanent media deletion remain deferred under the user's instructions. Owner workflow results above supersede the earlier list of outstanding owner checks.

The user reported staff sign-in during the handoff, but inspection of the connected browser still showed an empty login form. No staff identity/session could be verified in that tab, so staff tests have not been counted as completed. A follow-up requested the signed-in display name after completing login in the connected tab.

### New staff invitation requested by the user

The user then requested creating staff and supplied `codedreamer021@gmail.com`. After explicit confirmation of the exact business and Products-only grant, the owner invitation form was submitted once. The UI reported **Invitation saved and accepted by the email server** and displayed a Pending invitation for that email with **Manage Products** only, expiring 22 October 2026 at 09:56 UTC. No other permission was granted. Inbox delivery and acceptance are not yet verified; a Pending invitation is not an active staff membership.

The owner was logged out again and the browser handed over for the recipient to open the email, sign in/register, and accept. Credentials and invitation tokens were not requested in chat. Screenshot: `qa-staff-invitation-sent.jpg`. This explicit invitation request supersedes the earlier email-test deferral for this recipient/invitation only; password-reset email tests remain deferred.

### Staff screenshot evidence supplied by the user

The user supplied a screenshot showing **Code Dreamer** in **BizFlow Updated Test Shop**, with role **Staff** and navigation limited to **Overview, Products, Media**, plus **Add product** on the overview. This is user-supplied evidence of staff workspace access and the expected Products-only navigation. The connected automation browser still lists its port 3000 tab as Login; the photographed session is not available through that connection. Direct restricted-page/API rejection, Products/Media operations, non-member access to the new QA business, and permission revocation have therefore not been independently exercised in that staff session. Hidden navigation alone does not prove server-side authorization.

## Phase 15/16 continuation — 16 October 2026

The user requested continuing the remaining testing and explicitly leaving Phase 17 unchanged. Existing application data, staff grants, retained QA image and passwords were not changed in this continuation. No deployment or GitHub push was performed.

### Added automated coverage

- `npm test`: **30 passing Node results**, 0 failures, 0 skips. This includes the original seven service tests, security contracts, ten API-handler permission-denial subtests, invoice HTML escaping, cookie/origin/privacy checks, and four production-mode development-route guards. The count includes parent tests; it is not 30 independent browser workflows.
- The API-handler contracts execute real route handlers, authorization services and response serialization with controlled session/membership doubles. They do not claim real database or live staff-session verification.
- `tests/database-integration.test.cjs` is an explicitly opt-in real-MongoDB suite using a newly generated `bizflow_qa_<timestamp>_<random>` database. It guards the exact connection/database name, uses fixture credentials only in memory, disables email, and cleans up only its newly generated database. The services, models, indexes, transactions and API handlers are real; the framework cookie adapter and connection helper are adapted for the isolated test process.
- Prepared database cases cover two tenants/non-member rejection, minimal category lookup for product staff, forbidden staff APIs and self-escalation, permission changes with a still-valid session, invitation matching/reuse, duplicate/search boundaries, Pending cancellation, repeated transitions, internal invoice side effects without invoice permission, invoice/audit failure rollback, multi-item rollback, snapshot/print safety, same-order and competing-order concurrency, membership removal, and expired/revoked/disabled-user sessions.
- `TESTING.md` documents scope, commands, database isolation/cleanup and the distinction between contracts, integration, HTTP and browser evidence. Package scripts now expose default, public API and opt-in integration test commands. `UI-HANDOFF.md` links to current evidence rather than treating its historical verification snapshot as current.

### Actual verification results

| Check | Result |
| --- | --- |
| `npm test` | 30 passing results, 0 failures |
| `npx eslint .` | Passed; subsequent edits to test files also received targeted ESLint verification |
| `npm run build` | Passed outside the sandbox; initial sandbox build failed with EPERM creating Next output |
| `npx tsc --noEmit` | Passed after the successful build |
| Public HTTP suite against the built local server on port 3100 | 47 passing results: 45 endpoint cases plus 2 parent tests, 0 failures. Protected GET requests returned 401/no-store; untrusted-origin mutations returned 403. Sandbox transport failures were rerun outside the sandbox, with the local server also restarted outside it. |
| Real MongoDB integration | **Blocked before fixture creation.** Initial sandbox connection failed. Outside-sandbox attempts failed during server selection/connection timeout. After the user reported connectivity restored, a fresh retry still failed with `MongoNetworkTimeoutError` / connection timeout. No integration case ran, no test accounts/records were inserted and no database cleanup/drop was needed. Connection strings and credentials were withheld from diagnostics. |

The user explicitly authorized disposable accounts and records in a separate QA database, superseding the earlier prohibition on automatic account seeding **only for this isolated suite**. Execution remains blocked by connectivity, not authorization. The suite currently remains unverified against a live MongoDB instance; a default skipped run is not a pass.

### Phase status after this continuation

- **Phase 15 — Security & Isolation QA: in progress.** Contract-level permission checks pass, but real database/session revocation and isolation tests must execute successfully before sign-off.
- **Phase 16 — Integration & E2E Testing: in progress.** Existing owner browser evidence and public production-mode HTTP tests remain useful; the new database integration suite must pass and remaining live staff/browser acceptance gaps must be resolved. No Phase 15/16 acceptance checkboxes were marked complete.
- **Phase 17 — Production deployment: untouched**, as requested.

Live password-reset/email testing and permanent deletion of the retained media remain deferred. The earlier approved invitation/email evidence applies only to that invitation. No production configuration, security controls, credentials or Cloudinary resources were altered to work around the connection failure.

### Read-only connection diagnosis

After the user independently reproduced `MongooseServerSelectionError`, added
`scripts/check-mongodb.cjs`. Syntax, help output, and targeted ESLint passed. An
approved run outside the sandbox resolved three SRV nodes: two numbered node TCP
probes timed out; one TCP probe connected but its verified TLS probe timed out.
The final authenticated ping failed with server selection error. This points to
an unresolved network/TLS reachability problem before successful authentication;
it does not establish the exact cause or prove the credentials wrong. The script
created no records, hid connection details, and left certificate validation on.

The user's own run subsequently stopped earlier with `DNS SRV: ETIMEOUT`.
Added an explicit `--compare-dns` diagnostic mode to compare system, Cloudflare
and Google SRV lookups without changing DNS settings, logging credentials, or
attempting MongoDB login. Syntax/help/ESLint checks passed. The comparison mode
has been prepared for the user to run; no successful connection is claimed.

## Connectivity restored — real integration results

The user subsequently supplied a successful diagnostic: SRV resolved three nodes,
all TCP/TLS probes passed, and the authenticated MongoDB ping returned OK. The
previous database connection blocker was then resolved for the agent's run too.

### Initial connected run and test-loader correction

The first connected run executed real MongoDB cases and exposed two test-harness
failures: the VM loader omitted Node's `TextDecoder`, causing mutation route body
parsing to return 500 before authorization/service execution. Added the missing
Web API global and a regression test that accepts JSON and rejects malformed
JSON, invalid UTF-8 and bodies exceeding 16 KB. No application parser or
authorization was weakened or replaced.

Cleanup also established that the database user cannot run `dropDatabase`.
Recovered that exact test-created database
(`bizflow_qa_1792138085107_001e7a182e5e`) using a QA-name/fixture-identity guard:
**95 fixture documents removed; all collections verified empty**. Existing
application databases and resources were not targeted. Updated suite cleanup to
remove and verify fixture documents first and retain empty collections/indexes
when database removal is not authorized. No wider database grants were requested.

### Clean rerun

`BIZFLOW_RUN_DB_TESTS=1 npm run test:integration` completed against a fresh isolated
QA database: **28 passing Node results, 0 failures, 0 skips**, approximately 193.5
seconds. The count includes parent tests and ten permission-denial subtests.

Passed with real models/services/transactions and route handlers:

- Login email normalization, session hashing/revocation and wrong-password rejection.
- Invitation matching-email enforcement and single-use acceptance.
- Products-only product/media access and minimal active category lookup responses.
- Ten restricted read APIs, owner-only settings/category mutations and staff
  self-permission escalation rejection.
- Non-member cross-tenant rejection, cross-tenant customer/category references,
  and permission removal using the same still-valid account session.
- Literal search, duplicate tenant-scoped category/customer validation.
- Pending cancellation without stock/invoice effects and repeated cancellation rejection.
- Order staff completion/cancellation without invoice-management permission;
  exactly one deduction, invoice and reversal; repeated transitions rejected.
- Invoice-write failure and later audit-write failure each rolled back the real
  order/stock/invoice/adjustment changes. A later insufficient item also rolled
  back earlier deductions.
- Catalog changes preserved historical order/invoice prices; printable HTML
  escaped hostile customer text and returned a restrictive script policy.
- Concurrent completion of one order produced one invoice/deduction; competing
  five-unit orders against stock eight could not oversell.
- Staff removal denied business access while account authentication remained valid.
- Expired/revoked/disabled-user sessions could not authenticate; malformed tokens failed.

The clean run's after-hook removed all fixture documents and verified every
collection empty. It reported that the **empty QA database was retained** because
database removal was not permitted. No original business users, records, staff
grants, passwords or Cloudinary images were changed by these isolated runs.

`npm test` now passes **31 results**, including the parser regression. Targeted
ESLint for all changed test/helper/cleanup code passed. The earlier successful
production build, TypeScript check and 45 live public HTTP endpoint cases remain
the most recent checks for application code, which was not modified by the
loader/cleanup corrections.

### Remaining acceptance after the passing integration run

The previously blocked backend security/isolation/revocation/rollback/replay and
concurrency cases are now verified in the isolated suite. Phase 15's tested
backend security scope passes. Phase 16's database integration scope passes;
full browser acceptance still has the independently unverified staff-session
operations/page-denial checks and the previously inconclusive full keyboard
focus cycle. Live password-reset/email and retained-image deletion workflows
remain explicitly deferred, not silently passed. Natural elapsed session expiry
was represented by an expired persisted session timestamp, not a seven-day wait.
The integration cookie adapter is a test boundary; this run is not described as
a browser or full HTTP-server E2E run. No overall Phase 15/16 acceptance checkboxes
were changed. Phase 17 remains untouched.

### Live staff browser verification — 16 October 2026

Independently verified the connected browser after the user signed in as
**Code Dreamer**. The business chooser and workspace identify the membership as
**Staff** for **BizFlow Updated Test Shop**. Navigation contains only Overview,
Products and Media. The Products list and Media gallery load successfully.
Direct navigation to Customers shows “Customer access required”; Orders shows
“Access required”; Settings shows “Only the business owner can perform this
action.” These browser page-access checks pass using the actual staff session.
No records, permissions, passwords or images were changed during these checks.
Staff browser write operations and the full keyboard focus cycle have not been
verified by this session. Existing email/reset and image-deletion deferrals
remain; Phase 17 is untouched. The browser was left signed in at the overview.

### Staff writes, keyboard completion and account profiles — 16 October 2026

Using the connected Code Dreamer staff session, created product
`6ad1e6adf6a927b021df029c` as **QA 2026-10-16 Staff Product**, then saved it as
**QA 2026-10-16 Staff Product Updated** at PKR 42.50. Selected the existing QA
category through the restricted lookup, assigned retained QA image `ea710124`,
and verified the assignment survived product detail navigation and reload.
The product remains a clearly labelled QA record. No image was deleted.

The archive confirmation initially placed focus on the document body when
Tabbing past its final control. Added explicit boundary wrapping in the shared
confirmation component. Verified initial Go back focus, Tab to Confirm, Tab wrap
to Go back, Shift+Tab wrap to Confirm, Shift+Tab back to Go back, and Escape
closing/restoring focus to Archive product. Archive was never confirmed.

Added `/account`, linked from the chooser and workspace headers. It shows the
signed-in account's name, email, contact number, member-since date and initials,
with editable name, optional contact number and About you. Email stays read-only.
The profile API scopes reads/writes to the session identity, rejects unknown
fields, checks origin and rate-limits writes. Profile updates and account audit
metadata commit together; audit metadata contains field names rather than
contact values. No passwords, roles or memberships are editable through it.

Live profile acceptance passed: changed the name/contact/about to temporary QA
values, saved, reloaded and verified persistence, then restored **Code Dreamer**
and cleared both optional fields successfully. The email remained unchanged.
Mobile verification at 375px showed no horizontal document overflow. The viewport
was reset after the check.

Verification: `npm test` **32 passing Node results**; full ESLint and TypeScript
checks passed. Production build passed. Live public HTTP security suite:
**47 endpoint cases / 49 passing Node results**, including unauthenticated profile
GET and untrusted-origin profile PATCH. The first database attempt hit a network
timeout before fixtures; retry passed **29 Node results, zero failures/skips**
in about 171 seconds, including real profile persistence, session-only ownership,
protected-field rejection, optional clearing and account audit privacy. All
isolated fixture documents were removed and verified empty; the empty QA database
was retained because dropping databases is not permitted. The profile route's
subsequently added rate-limit call was checked in the offline route contract and
live save flow. A final title-only correction removes a duplicated BizFlow suffix.

The previously remaining staff create/edit/image-assignment and full keyboard
cycle checks now pass. Live password-reset/email workflows and permanent retained
image deletion remain explicitly deferred. Phase 17 is untouched; no deployment
or Git push was performed for this change.

Final build (including the title correction) passed. A subsequent page reload
briefly hit another MongoDB network timeout; diagnostic authenticated ping passed
and reloading recovered the profile without code or settings changes. Verified
Code Dreamer, unchanged email and cleared optional values on that final build.
The local app remains running at http://localhost:3100 with `/account` open.
Intermittent database connectivity remains an observed environment limitation.

### Deferred email/reset and image deletion follow-up — 16 October 2026

The user authorized live reset-email testing for codedreamer021@gmail.com and
reported receiving the message titled “Reset your BizFlow password.” The form
returned its generic confirmation; receipt is user-reported inbox evidence.
A production-mode localhost request initially failed. Tests were moved to the
local development server at port 3100, preserving the production HTTPS-link
requirement. No configuration file or production safeguard was changed.

The user reported completing reset/sign-in, but independent read-only verification
found no PASSWORD_RESET or subsequent LOGIN_SUCCEEDED event for that staff
account in the preceding 30 minutes. The connected browser still showed the QA
owner session. Actual password-change acceptance is therefore not marked passed;
the user must open the emailed reset link and privately enter/submit a password.
No reset token or password was read or persisted by the verification query.
The QA owner email uses example.com and cannot serve as an inbox-delivery test;
the user selected the Code Dreamer mailbox again.

Prepared a new disposable 48x48 teal WebP instead of deleting any existing image.
The first upload returned 500; reloading confirmed the gallery still contained
only the two original images. A second attempt returned 502 and server-side
classification identified a Cloudinary timeout. A read-only authenticated
Cloudinary ping then passed, so one further upload attempt was started. No
permanent deletion has been performed. Original retained image ea710124 and
existing image da474849 remain untouched. Deletion acceptance is still pending
until a disposable image can be uploaded and its exact deletion approved.

Cloudinary authenticated ping passed; the third upload succeeded. The newly
created disposable asset is `6ad25d9ace5951cc4f15e49a` (48x48 teal image). The user
explicitly confirmed the exact-image deletion test, including in-use rejection
and subsequent permanent removal after detachment. Assigned only this new image
additionally to labelled QA product `6ad1e6adf6a927b021df029c`; its original
retained-image assignment remains. No raw credential or reset link was requested.

#### Completed disposable-image deletion acceptance

The confirmed test passed. Attempting deletion while disposable image 4f15e49a
was assigned returned “Remove this image from all products before deleting it.”
Removed only that new image's assignment and saved the QA product; retained
image ea710124 stayed assigned. After confirmation, deletion completed and
returned to the gallery, which again contains only original images da474849 and
ea710124. An independent read-only Cloudinary lookup for the exact disposable
public ID returned **404**, confirming absence at the storage provider.
Screenshots record the in-use rejection and final gallery. No existing image was
deleted. The QA product's image assignments were restored to their prior state.

Current remaining acceptance: actual password reset and subsequent login for
codedreamer021@gmail.com still need the user's private credential-entry step.
Email receipt was confirmed by the user, but no completed reset audit was found
in the check performed this turn. Do not describe password-change acceptance as
passed until the success/new-login evidence is available. No passwords were
changed by the agent. Phase 17 remains untouched. The app is running locally in
development mode on port 3100 for the localhost recovery link.

Follow-up after the user reported completion: a fresh read-only check for Code
Dreamer's account found no PASSWORD_RESET audit event at any timestamp and thus
no subsequent login or old-session revocation evidence. Reset acceptance remains
unverified despite the user's completion report. No credential or token was read.
The next scheduled project phase is Phase 17 production deployment; the earlier
instruction to leave it untouched remains in effect until the user asks to begin.
