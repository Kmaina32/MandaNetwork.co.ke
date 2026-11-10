![Varban Academy](/public/logo.png)
# Varban Academy — Security Overview

## Platform architecture
Varban Academy is a Next.js 15 / TypeScript application using Supabase Auth, PostgreSQL, Storage and Realtime. Server-side privileged database operations use the Supabase service-role client and must never expose its key to browser code. Genkit routes AI workloads through the configured model providers.

Some legacy source modules retain historical names such as `firebase-service.ts`; their current implementations use Supabase. They are compatibility names only, not Firebase SDK clients.

## Identity and authorization
- Supabase Auth is the sole application identity provider.
- Authorization is derived from the database-backed `user_roles` table and RLS policies, not user-editable profile metadata.
- Every exposed public-schema table must have RLS enabled and policies matching the actual ownership/role model.
- Never expose Supabase service-role or secret keys through `NEXT_PUBLIC_*` variables.
- Server routes must verify the caller's Supabase access token and derive the user ID from the verified session.
- Sensitive writes, including paid-course enrollment, must be performed only after server-side validation.

## Payments and enrollment
- Paystack checkout uses server-generated references and server-side transaction verification.
- A webhook is a notification, not proof of payment; the server independently verifies the transaction with Paystack.
- Verified payment fulfillment is performed atomically in PostgreSQL and is idempotent under concurrent callbacks.
- M-Pesa callback payloads are not trusted as proof of settlement. The server queries Daraja and compares the result with the stored transaction before fulfillment.
- Self-service enrollment is restricted to published zero-price courses. Paid course access requires verified payment fulfillment.
- Do not enable live payment traffic until provider credentials are configured securely and end-to-end sandbox reconciliation has passed.

## Server-only configuration
Required server-side secrets are configured in the deployment platform, not committed to this repository. Examples include:
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYSTACK_SECRET_KEY`
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_PASSKEY`

Never commit service-role keys, provider secrets, private keys or full service-account JSON. Public Supabase URL and publishable key may be used by the browser.

## Auth security settings
Enable Supabase Auth leaked-password protection in the Supabase Dashboard under Authentication password security. This setting is managed by the Supabase project configuration and is not changed by an application migration. Confirm it is enabled before production launch.

## CI and release requirements
- Run TypeScript checks, unit tests, database migration tests and a production build on each pull request.
- Review every server action and API route for authentication, role authorization, input validation and abuse controls.
- Run payment provider sandbox tests, including duplicate and concurrent callback delivery.
- Re-run Supabase Security, Performance and Health Advisors after applying database migrations.
- Do not treat a READY deployment as evidence that external payment credentials or provider callbacks are configured correctly.

## Incident response
If a Supabase service-role key or payment credential is exposed, revoke and rotate it in the provider console, replace it in the deployment platform, redeploy, and review authentication, database and payment logs for unauthorized activity.
