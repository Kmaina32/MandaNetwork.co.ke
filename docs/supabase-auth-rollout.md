# Supabase Auth configuration and verification

## Authentication architecture

Supabase Auth is the sole identity provider for Varban Academy. The application uses `@supabase/ssr` browser/server clients and middleware-managed cookies. Server actions and API routes validate access tokens with Supabase Auth and derive the caller identity from the verified user.

Supabase PostgreSQL, Storage and Realtime are the application data services. Firebase Auth, Firebase Realtime Database, Firebase Storage and Firebase Admin are not part of the active application architecture. No Firebase legacy data is imported or transferred.

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

Enable email confirmation for email/password sign-ups. Configure Google OAuth in Supabase Auth and set the Google OAuth authorized redirect URI to:

```text
https://irsirrzyvcsxtyonnhwv.supabase.co/auth/v1/callback
```

The application redirects Google and email confirmation flows to `/auth/callback`, which exchanges the PKCE code and writes secure session cookies.

## Password security

Enable leaked-password protection in the Supabase Dashboard under Authentication → Password Security. This project-level Auth setting is managed outside SQL migrations. Verify that the setting is enabled before production launch.

## Server configuration

The browser uses only:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Privileged server operations may require `SUPABASE_SERVICE_ROLE_KEY`. Keep it server-only; never expose it through a `NEXT_PUBLIC_*` variable. Payment-provider credentials are also server-only and must be stored in the deployment platform's encrypted environment settings.

## Administrator authorization

Application authorization is backed by the `user_roles` table and database RLS policies. Do not use user-editable `user_metadata` for role decisions. Grant or revoke administrator access through the approved administrator-management workflow and verify the resulting `user_roles` row.

## Verification checklist

- Email signup, confirmation, login, logout and password recovery.
- Google OAuth sign-in and callback.
- User profile creation and updates.
- Organization invitation acceptance and organization-scoped access.
- Free-course enrollment and rejection of direct paid-course enrollment.
- Paystack and M-Pesa sandbox verification, duplicate callbacks and atomic fulfillment.
- Storage upload/download policies for learners and administrators.
- Admin role changes and server-side authorization.
- Supabase Security, Performance and Health Advisors.
- Production and Preview deployments after required provider credentials have been securely configured.

Do not treat a successful build or deployment as proof that provider credentials, callbacks or Auth project settings are complete.
