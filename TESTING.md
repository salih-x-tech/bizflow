# BizFlow testing

Phase 17 (production deployment) follows the QA work recorded here; passing local
checks does not establish production readiness or a completed deployment.
See `QA-RESULTS.md` for observed browser results, evidence sources, and remaining
acceptance gaps. A skipped suite is not a passing integration test.

## Read-only connection diagnosis

```powershell
node scripts/check-mongodb.cjs
```

This loads the configured connection without printing its value, checks SRV DNS
where applicable, probes up to five node TCP/TLS connections, and performs an
authenticated ping. TLS certificate validation stays enabled. It creates no
records, disables automatic collection/index creation, and prints only numbered
nodes and safe error categories. `--help` performs no network or environment check.

If SRV DNS times out, `node scripts/check-mongodb.cjs --compare-dns` compares the
same SRV lookup using system DNS, Cloudflare (1.1.1.1) and Google (8.8.8.8).
It sends the cluster's DNS hostname to those resolvers but sends no credentials,
does not connect to MongoDB and does not change system or application DNS settings.

## Offline checks

```powershell
npm test
npx eslint .
npm run build
npx tsc --noEmit
git diff --check
```

The default tests use dependency doubles and require no environment files,
database, email provider, or Cloudinary connection. They cover service contracts,
authorization checks, origin enforcement, cookie configuration and error privacy.
The build should finish before the TypeScript check so generated route types are
available. Stop a conflicting development server if generated types conflict.

## Unauthenticated HTTP checks

Start the application with `APP_URL` matching its origin, then run:

```powershell
$env:BIZFLOW_QA_BASE_URL = 'http://localhost:3000'
npm run test:api
```

These tests send no credentials. They verify protected GET responses and
untrusted-origin rejection before mutations; they do not prove authenticated
tenant isolation or database connectivity.

## Real database integration (explicit opt-in)

Obtain permission to create disposable QA accounts before running this suite.
It loads the configured MongoDB connection through the normal Next environment
loader, without displaying its value, and connects to a fresh random database
named `bizflow_qa_<timestamp>_<random suffix>`. It never connects its models to the
application's `bizflow` database. MongoDB must support multi-document transactions
(replica set or a compatible Atlas cluster), and the configured database user
must be allowed to create this isolated database.

```powershell
$env:BIZFLOW_RUN_DB_TESTS = '1'
npm run test:integration
Remove-Item Env:BIZFLOW_RUN_DB_TESTS
```

Cleanup first removes and verifies all fixture documents in the suite's freshly
generated database, after checking its exact name and QA prefix. It then drops
the database when permitted. If database removal is not authorized, it retains
empty collections/indexes and reports that result without expanding access.
Existing application
businesses, users, records, images, passwords and permissions are untouched.
Fixture credentials and tokens exist only in memory; they are not written to
files or printed. Tests send no emails and make no Cloudinary requests.

For recovery of a known failed suite run only,
`node scripts/cleanup-qa-database.cjs <exact-generated-QA-database-name>` verifies
the QA name and expected fixture users/businesses, removes its documents, and
checks that every collection is empty. Never point cleanup at an application
database or an unrelated test run.

The suite executes real services, Mongoose models, indexes, transactions and API
route handlers. It replaces the framework cookie adapter with a test cookie jar
and the database connection helper with a guard for the isolated connection.
Injected invoice/audit failures exercise real MongoDB rollback. This is database
and route integration testing, not an HTTP-server or browser E2E suite.

Coverage includes invitation email matching/reuse, Products-only staff API
restrictions, non-member rejection, scoped references, permission updates with an
existing session, duplicate validation, literal search, cancellation, replay and
concurrent completion, rollback, immutable price snapshots, escaped invoice print
HTML, membership revocation and session expiry/revocation/disabled users.

## Browser acceptance

Account profiles are available at `/account` from My profile in the business
chooser and workspace header. Verify name/contact/about edits, persistence after
reload, clearing optional values, and mobile layout. The email address is
read-only. `/api/account/profile` derives identity only from the authenticated
session, returns explicit public profile fields, checks mutation origin and
rate limits writes. The isolated integration suite checks cross-account safety,
protected-field rejection, clearing and account-scope audit metadata.

Browser checks must use a connected, visible development session when account
handoff is needed. A screenshot provided by the user is recorded as screenshot
evidence and not described as an independently executed browser test.

Keep the retained QA Cloudinary image. The user subsequently authorized a new
disposable image deletion test, which passed (including in-use rejection and
provider-side absence). Reset email receipt was confirmed by the user; actual
password reset and subsequent login remain independently unverified. See the
latest QA results rather than treating earlier deferrals as current status.
Do not use a production database for mutations or fabricate acceptance results.
