# Supabase-first migration status

Varban Academy is being moved from Firebase Realtime Database / Firebase Auth / Firebase Storage to Supabase Postgres / Supabase Auth / Supabase Storage.

## Completed foundation
- Supabase project `irsirrzyvcsxtyonnhwv` is active in `ap-south-1`.
- Additive schema migration creates relational application tables for courses, programs, bootcamps, organizations, enrollments, assignments, submissions, blog posts, calendar events, notifications and activity logs.
- Existing `profiles` table is extended without dropping its existing user foreign key.
- RLS is enabled for every exposed application table. User-owned rows are scoped by `auth.uid()`; admin policies rely on trusted `app_metadata.role=admin`, never user-editable metadata.
- Storage buckets are provisioned for private course materials, user files and public avatars with owner/admin policies.
- Legacy IDs are retained as text where practical so records can be imported without losing Firebase keys.

## Important: migration is not yet a cutover
The current application still imports Firebase from `src/lib/firebase-service.ts`, `src/lib/firebase-server.ts` and `src/hooks/use-auth.tsx`. Do not remove Firebase credentials or data yet. The application must be migrated feature-by-feature, with dual-read or a controlled maintenance window for data transfer, before Firebase can be disabled.

## Remaining cutover work
1. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or publishable key) in Vercel and local environments. Never expose a service-role key in browser code.
2. Add pinned `@supabase/supabase-js` and `@supabase/ssr` dependencies and update the npm lockfile.
3. Implement browser/server Supabase clients and replace Firebase Auth with Supabase Auth, including OAuth callback, password reset, email verification and session refresh.
4. Migrate user profiles and all Firebase records to Postgres. Preserve user identity by mapping Firebase UIDs to Supabase Auth UUIDs; never assume the identifiers match.
5. Replace the Firebase service layer and server data loaders. Keep API contracts stable for existing pages while migrating.
6. Move Storage objects and rewrite stored URLs/paths; verify private signed URLs and public avatar access.
7. Test RLS with anon, normal student, organization owner and admin sessions; run typecheck, unit tests and production build.
8. Only after parity and reconciliation: remove Firebase SDK/Admin/functions, Firebase environment variables, rules and deployment hooks.

## Admin authorization
The RLS policies expect trusted Supabase Auth app metadata `role=admin`. Assign this only through a trusted server/admin operation using the service role key. Never allow a client profile update to grant itself admin access.
