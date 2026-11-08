# Varban Academy Supabase integration status

Supabase is provisioned as the new Postgres and Storage platform. This work intentionally does not transfer Firebase records or change the existing sign-in provider.

## Connected foundation
- Supabase project is active.
- The additive database schema and RLS policies are already provisioned.
- Private buckets exist for course materials and user files; the avatars bucket is public for reads.
- The application has a pinned Supabase JavaScript client, browser and server public clients, public catalog query helpers, and a no-store database health endpoint.
- Vercel uses the public project URL and publishable key. A publishable key is safe for browser use when RLS is correctly configured.

## Explicitly unchanged
- Firebase Auth remains the identity provider. Existing user accounts and sessions are not changed.
- Firebase Realtime Database remains the source for existing courses, programs, user records, enrollments, activity, and admin settings.
- Firebase Storage remains the source for existing uploaded assets.
- No Firebase data, users, or files have been imported, copied, deleted, or rewritten.
- No production cutover has been performed.

## How to verify
- GET /api/health/supabase checks that the application can reach the Supabase Data API without exposing keys or data.
- src/lib/supabase/catalog.ts provides RLS-protected reads for newly created published courses, programs, bootcamps, and blog posts.

## Remaining work before SupaֻǱ˞