# Varban Academy internal testing strategy

## Purpose

This is the first-party quality gate for the application. Tests must be deterministic, isolated from production data, and useful as regression protection—not snapshots that merely repeat implementation details.

## Test layers

1. **Unit tests** — pure utilities, schema validation, formatting, role and permission decisions, payment signature/reference logic, data mappers.
2. **Service integration tests** — Supabase browser/server/admin clients mocked at the network boundary; verify queries, ownership filters, role checks, error propagation, and writes.
3. **Route and server-action tests** — request validation, authentication, authorization, rate limits, safe response bodies, idempotency, and failure handling.
4. **Component and page tests** — render states, accessible interactions, navigation, empty/loading/error states, and role-specific visibility.
5. **Database security tests** — inspect every migration for RLS enablement, policies, grants, SECURITY DEFINER search paths, and service-role-only operations. Add disposable-database tests where credentials are available.
6. **End-to-end smoke tests** — run against a dedicated staging project and test accounts only. Never point automated destructive tests at production.

## Required coverage domains

- Authentication: sign-up, sign-in, sign-out, session restoration, email confirmation/OTP, password reset, expired sessions.
- Authorization: learner, organization member, organization admin, admin, super admin, expired temporary admin, cross-tenant access denial.
- Learning: catalog visibility, course detail, enrollment, lesson progress, assignments, exams, grading, certificates.
- Organization: creation, invitations, acceptance, membership lifecycle, tenant isolation, member limits.
- Administration: CRUD, approvals, audit events, role changes, settings, notifications, moderation.
- Commerce: course pricing, payment initialization, signature validation, server-side verification, amount/currency/reference matching, idempotent fulfillment, refunds/failure states.
- Platform services: uploads, signed URLs, API keys, quotas, rate limits, messaging, forms, referrals, search, AI-provider error handling.
- Public experience: metadata, canonical URLs, sitemap/robots, responsive navigation, accessibility, empty/error states.
- Operations: migrations, build, typecheck, CI test discovery, secrets hygiene, and safe error messages.

## Test isolation rules

- Use fabricated records and fake credentials only.
- Mock external HTTP calls and Supabase at the boundary for unit/integration tests.
- Live provider tests must be explicitly opt-in and use sandbox credentials.
- Database integration tests must use a disposable database/project with a resettable schema.
- No test may print access tokens, service-role keys, payment secrets, OTPs, or private provider payloads.
- Tests must assert both allowed and denied behavior for every authorization boundary.
- Do not claim an external service, migration, deployment, email, payment, or browser flow was tested unless the corresponding environment was actually exercised.

## Current first-party suites

- `src/lib/utils.test.ts`: shared utility behavior.
- `src/lib/supabase/config.test.ts`: public Supabase configuration and fail-closed behavior.
- `src/lib/paystack.test.ts`: payment reference and webhook signature safeguards.
- `src/app/api/courses/route.test.ts`: API-key validation, hashing, rate-limit denial, response mapping, and safe errors.
- Existing page, component, catalog, branding, and migration regression tests remain part of the same Jest run.

## Completion criteria

A domain is not considered fully covered merely because a route exists or a source-code string matches. Each critical user journey needs positive, negative, boundary, and failure-path tests. RLS and payment fulfillment require disposable-database/provider sandbox validation before production sign-off.
