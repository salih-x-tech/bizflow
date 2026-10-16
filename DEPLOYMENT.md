# BizFlow production deployment

Phase 17 started on 16 October 2026. This checklist records preparation, not a
completed deployment. See QA-RESULTS.md for actual verification and open gaps.

## 1. GitHub handoff

Review and push the profile, UI fixes, tests and QA notes to
`salih-x-tech/bizflow`. Commit only the blank `.env.example` template; local
environment files, credentials, uploaded fixtures and screenshots stay outside Git.
The last application checks passed: production build, TypeScript, ESLint,
32 offline Node test results, 29 database integration results and 47 public HTTP
endpoint cases. The live password-reset completion is still independently
unverified. Local MongoDB/Cloudinary requests have intermittently timed out.

## 2. Vercel project setup

Sign in to Vercel, import `salih-x-tech/bizflow`, and use the Next.js framework
preset with the repository root. The build command is `npm run build` (currently
`next build --webpack`); use the package-lock-based install and framework output
defaults. Check the available Node.js runtime against this installed Next.js
version before deploying. Review the target team, plan and repository access
before authorizing new access or any paid service.

## 3. Production configuration

Enter values privately in Vercel's environment settings, never in chat or Git.

| Variable | Purpose |
| --- | --- |
| `APP_URL` | Exact stable HTTPS production origin, without a path; used for origin checks and emailed links. |
| `MONGODB_URI` | Production MongoDB connection with transaction support. The application selects database `bizflow` explicitly; use a separate production cluster/user to isolate QA data. |
| `CLOUDINARY_CLOUD_NAME` | Intended production media cloud. |
| `CLOUDINARY_API_KEY` | Server-side media API key. |
| `CLOUDINARY_API_SECRET` | Server-side media secret. |
| `SMTP_HOST` | Transactional mail server. |
| `SMTP_PORT` | Provider's numeric SMTP port. |
| `SMTP_SECURE` | Explicit `true` for implicit TLS, or `false` for required STARTTLS; match the chosen port/provider. |
| `SMTP_USER` | Mail authentication account. |
| `SMTP_PASS` | Mail password or provider app password. |
| `EMAIL_FROM` | Sender address authorized by the provider. |

Do not prefix these server-only values with `NEXT_PUBLIC_`. Configure preview
deployments separately: the origin must match APP_URL, and previews must not
share production business data or send unexpected real emails. Confirm Atlas
network access for the hosting environment, least-privilege database credentials,
required collections/indexes and backup/recovery arrangements. Production dev
setup endpoints intentionally return 404; do not enable them to initialize data.

## 4. Deploy and verify

After reviewing the actual project/domain and configuration, deploy and inspect
the build. Confirm HTTPS, sign-in/out, protected APIs, staff restrictions,
tenant isolation, product/media flows, orders/stock/invoices and actual recovery
email links against designated production acceptance accounts. Production cookie
security must stay enabled. Record the deployed commit and URL, keep the prior
working deployment available for rollback, and verify again after changing the
domain or APP_URL. No live site has been published by this checklist.

Official references:
- [Import a Git repository](https://vercel.com/docs/git)
- [Project settings](https://vercel.com/docs/projects/managing-projects)
- [Supported Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
