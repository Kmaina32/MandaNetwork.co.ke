# Supabase data and migration policy

Supabase is the sole application data platform for Varban Academy. New features and maintenance scripts must use Supabase Auth, PostgreSQL, Storage or Realtime as appropriate.

## Legacy Firebase data
No Firebase legacy data is to be imported or transferred as part of this transition. Do not run historical Firebase Admin scripts or connect to a legacy Firebase project to backfill data.

The former Firebase Admin cleanup and certificate-backfill scripts have been retired. Existing Supabase records remain the source of truth.

## Database changes
- Add schema changes as versioned SQL migrations under `supabase/migrations`.
- Enable RLS on exposed tables and write ownership- and role-scoped policies.
- Keep service-role operations server-only.
- Verify migrations against a disposable/test database and run Supabase Advisors after changes.
- Do not apply production migrations as a side effect of preparing a pull request; production rollout is a separate reviewed step.

## Payment fulfillment
Paid-course enrollments must only be created after independent provider verification. Payment status and enrollment writes should be performed in one database transaction, with duplicate callbacks treated idempotently.
