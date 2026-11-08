# Varban Academy Supabase integration

Supabase is connected as the new Postgres and Storage platform. This integration deliberately does not copy Firebase users, records, or files.

## Active
- Supabase project and application schema are provisioned with row-level security.
- The application has browser/server Supabase clients and published catalog query helpers.
- Vercel has the Supabase project URL and publishable key in development, preview, and production.
- GET /api/health/supabase verifies Data API connectivity without returning data or credentials.

## Kept on Firebase
Firebase Auth, Realtime Database, and Storage remain active for existing accounts, courses, enrollments, profiles, admin settings, and uploaded files. No production cutover or data transfer has happened.

## Next integration stage
Build Firebase-token-verified server routes for Supabase writes and private storage, connect admin publishing screens, and test user/role access. Do not expose a Supabase secret key in browser code or bypass RLS. Existing Firebase records will not appear in Supabase until separately entered or transferred.
