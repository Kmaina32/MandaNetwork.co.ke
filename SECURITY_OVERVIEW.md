![Varban Academy](/public/logo.png)
# Varban Academy — Security Overview

## 1. Platform architecture

Varban Academy is a Next.js 15 / TypeScript application using Firebase Authentication, Firebase Realtime Database, Firebase Storage, Firebase Admin SDK, and Genkit with Google Gemini. It provides student, organization, and administrator experiences.

## 2. Identity and authorization

- Firebase Authentication is the source of user identity.
- Production builds must never enable the local development authentication bypass. The client bypass is now restricted to non-production builds.
- Privileged server operations must verify Firebase ID tokens and derive the acting UID from the verified token. Never trust a UID, role, price, or payment state supplied only by the browser.
- Firebase Realtime Database rules are the client-side authorization boundary. Server-side Admin SDK calls bypass those rules and must perform their own authorization checks.
- Admin and organization roles are privileged data. Client rules protect administrator flags and subscription entitlements from self-service edits.
- Sensitive server actions such as awarding hackathon points and contacting learners verify the caller's Firebase ID token and required role on the server.
- Public contact submissions are validated and rate-limited before server-side persistence.

## 3. Payments and enrollment

- Paystack checkout initiation verifies the signed-in user, loads the item price from the trusted database, and stores a pending transaction against a unique server-generated reference.
- An STK push acceptance is not a completed payment. The client waits for the stored transaction to reach the completed state.
- API keys are stored as SHA-256 hashes, shown only once at creation, and checked with constant-time comparison. Legacy plaintext keys are migrated to hashes on authenticated key-list access or first use.
- The public courses API enforces a per-user daily request ceiling and records usage through the Admin SDK.
- The Paystack callback is treated as a notification, not proof of payment. The server independently verifies the transaction with Paystack and compares the reference, amount, currency, and customer email before granting course access.
- Enrollment and the completed transaction record are written together.
- Paystack is the only payment provider exposed in the customer checkout UI. Card and mobile-money options are presented only by Paystack-hosted checkout; the application does not collect or store card details.

## 4. Server credentials and configuration

The Firebase Admin SDK uses server-only environment variables:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Paystack credentials are server-only:
- `MPESA_ENVIRONMENT`
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_PASSKEY`
- `MPESA_TILL_NUMBER`
- `MPESA_CALLBACK_URL`

Do not commit service-account JSON, private keys, payment credentials, or provider secrets. Public Firebase web configuration values are not service-account secrets; database authorization must be enforced by Firebase rules.

Firebase Admin initialization is lazy so a Next.js build can evaluate route modules without server credentials. Any runtime route that uses the Admin SDK still requires the server environment variables to be configured.

## 5. CI and workflow security

- GitHub Actions must pass model output through environment variables and quote shell arguments. Do not interpolate untrusted model output directly into shell commands.
- AI summaries are untrusted text and must never be executed as commands.
- Dependency and build checks should run on pull requests before merge.

## 6. Remaining audit work and deployment requirements

This is an evolving security record, not a certification or guarantee of security. The following require continued verification before production payment traffic:
- Review every exported server action and Genkit flow for caller authentication, role authorization, input validation, and abuse/rate limits.
- Review organization-scoped access for conversations, invitations, live sessions, and media signaling.
- Run Firebase Emulator tests against the deployed Realtime Database rules, including role escalation, cross-user reads/writes, and payment/enrollment cases.
- Confirm the Paystack secret key, webhook secret, callback URL, and Firebase Admin environment variables are configured in every Vercel environment that needs them.
- Start with Paystack test keys and test webhook events. Switch to live keys only after the Paystack merchant account is fully verified and the webhook endpoint is configured.
- Run dependency scanning, TypeScript checks, unit tests, and a production build before merging.

## 7. Incident response

If a service-account private key or payment credential is exposed, revoke and rotate it in the provider console, replace the corresponding Vercel environment variable in all affected environments, and redeploy. Review Firebase Authentication, database, and payment logs for unauthorized activity.
