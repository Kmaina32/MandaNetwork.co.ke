# Varban Academy Supabase integration

Supabase is the target identity, database, and storage platform. The migration is staged so existing Firebase-backed users and services are not broken before their replacements are verified.

## Active Supabase foundation

- Supabase project and application schema are provisioned with row-level security.
- Browser/server Supabase clients and published catalog query helpers are present.
- Vercel has the Supabase project URL and publishable key in development, preview, and production.
- `GET /api/health/supabase` verifies Data API connectivity without returning data or credentials.
- The Auth cutover foundation adds server-managed `user_roles`, scoped `organization_members`, and a server-only `legacy_identity_links` mapping.

## Identity cutover sequence

1. **Identity foundation** — deploy role, organization membership, and legacy identity-link tables.
2. **Verified account linking** — require a successful Firebase sign-in and a fresh Supabase sign-up/sign-in before linking identities. Never infer a link from matching email addresses alone.
3. **Auth application cutover** — migrate the shared auth provider, login, signup, password reset, verification, OAuth, server route guards, and tests to Supabase Auth. Use Supabase UUIDs for all new user foreign keys.
4. **Data migration** — migrate profile, organization, enrollment, assignment, and other user-owned data using the verified identity-link table. Preserve Firebase IDs as source references during reconciliation.
5. **Service replacement** — replace Realtime Database, Storage, Functions, and Admin SDK call sites one domain at a time; verify parity, RLS, and rollback before removing each Firebase dependency.
6. **Retirement** — remove Firebase packages, configuration, rules, functions, and deployment scripts only after all call sites and production data have moved.

## Transition safeguards

- Firebase remains available during the transition. Removing its SDK before replacing all call sites would break existing authentication and legacy data access.
- Do not migrate passwords by copying Firebase credentials or link accounts by matching email alone.
- Privileged roles and organization membership writes are server-controlled; browser clients cannot assign roles or create memberships.
- Never expose Supabase secret/service-role keys to browser code.
- The foundation migration is additive. It does not delete, overwrite, or transfer production user data.
