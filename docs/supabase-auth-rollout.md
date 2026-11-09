# Supabase Auth rollout

## Authentication architecture

Supabase Auth is the primary identity provider for email/password sign-in, Google OAuth, email confirmation, password recovery and password changes. Next.js uses the `@supabase/ssr` browser/server clients and middleware-managed cookies. Server actions verify bearer tokens with Supabase Auth's `getUser(accessToken)`; they do not trust decoded JWT payloads.

Firebase Realtime Database remains a legacy application-data service during this migration. To avoid breaking its existing security rules, the application establishes a Firebase custom-token session after a valid Supabase session is confirmed:

1. The browser calls `POST /api/auth/firebase-token` with its same-origin Supabase cookie.
2. The route validates the Supabase session on the server.
3. It links an existing Firebase Auth user by the verified email, or provisions a Firebase identity using the Supabase UUID for new accounts.
4. It issues a Firebase custom token. The browser uses this token only for the retained Firebase Realtime Database client.
5. Server actions validate the Supabase access token and resolve the legacy Firebase UID server-side. A caller cannot submit or choose the UID.

Do not remove Firebase Auth SDK, Firebase Admin, or Firebase data rules until all remaining Firebase data services have been migrated to Supabase. Firebase Auth is now a compatibility session for Realtime Database access, not the primary login provider.

## Supabase project settings

Project: `irsirrzyvcsxtyonnhwv`

Set the Supabase Auth **Site URL** to:

```text
https://mandanetwork.co.ke
```

Add these redirect URLs to the Auth redirect allowlist:

```text
https://mandanetwork.co.ke/auth/callback
https://www.mandanetwork.co.ke/auth/callback
http://localhost:9002/auth/callback
https://mandanetwork.co.ke/auth/callback?next=/auth/reset-password
```

For each Vercel preview hostname used for testing, add its exact `/auth/callback` URL to the allowlist. Do not use a broad wildcard unless the preview-domain pattern is constrained to this project.

Enable email confirmation for email/password sign-ups. The Firebase bridge deliberately rejects sessions without a confirmed email. Configure the Google provider in Supabase Auth and set the Google OAuth authorized redirect URI to:

```text
https://irsirrzyvcsxtyonnhwv.supabase.co/auth/v1/callback
```

The application redirects Google and email confirmation flows to `/auth/callback`, which exchanges the PKCE code and writes the secure session cookies.

## Environment variables

Required public variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Retained Firebase data access also requires the existing Firebase client configuration and Firebase Admin service-account credentials. The Firebase Admin credentials must be configured for both Production and Preview if authentication is to be tested on Vercel preview deployments. Never expose Firebase Admin or Supabase secret/service-role keys through `NEXT_PUBLIC_` variables.

## First administrator

The Supabase Auth project currently has no users. After the intended first administrator creates an account and confirms the email, promote that exact account from the Supabase SQL Editor using its verified email address:

```sql
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
where lower(email) = lower('REPLACE_WITH_THE_VERIFIED_ADMIN_EMAIL');
```

Confirm that exactly one row was updated. Then sign out and sign in again so the new role is present in the session JWT. Use `role = 'super_admin'` only when the account needs the super-admin capability. Never put administrator flags in `user_metadata`, because users can edit that metadata themselves.

When a trusted admin role is present in `app_metadata`, the Firebase bridge synchronizes the protected legacy `isAdmin` / `isSuperAdmin` profile flags using Firebase Admin. Existing Firebase administrator profiles are also retained while accounts are linked by verified email.

## Data and account migration

The existing Supabase public tables were empty at the time this migration began. No Firebase Auth users or Firebase data have been deleted. Existing Firebase accounts can continue to reach their old learner data by signing up/signing in to Supabase with the same verified email address. New accounts receive a Firebase UID equal to their Supabase UUID for the retained Realtime Database layer.

Do not assume the Firebase UID and Supabase UUID are equal for existing accounts. Always use the server-side UID resolver when a server action accesses legacy Firebase data.

## Verification checklist before production cutover

- Email signup, confirmation, login, logout and password recovery.
- Google OAuth sign-in and callback.
- Existing Firebase account linking by verified email.
- New Firebase identity provisioning for a new Supabase user.
- Student profile creation, profile updates, presence and organization reads.
- Organization invitation acceptance and trial organization creation.
- Course enrollment, submissions, M-Pesa status, API keys and admin server actions.
- Admin app-metadata promotion and Firebase RTDB admin permissions.
- Supabase Storage upload permissions for the promoted administrator.
- Production and Preview environment variables and runtime logs.
