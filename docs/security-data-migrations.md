# Security data migrations

## Historical public portfolio cleanup

Older `publicProfiles` records may contain contact details. After deploying the matching database rules, run this one-time cleanup from a trusted workstation:

1. Set `FIREBASE_SERVICE_ACCOUNT_JSON` to a Firebase service-account JSON value and `FIREBASE_DATABASE_URL` to the academy Realtime Database URL. Never commit the key.
2. Run `node scripts/sanitize-public-profiles.cjs`.
3. Review the scanned/sanitized/removed counts and spot-check public profiles in Firebase Console.
4. Unset the credential after the run.

The script removes records not explicitly marked public and rewrites public records using a strict allowlist. It does not read or modify private user records.

## Certificate verification

New awards create a minimal `publicCertificates/{certificateId}` record. Public verification reads only that record; only active administrators may write it. Certificates issued before this change need a backfill before they can be verified using the new path. The former full-users scan is intentionally removed.

## Organization access

Collection reads are limited to active platform administrators or owner-filtered queries. Individual organization records are readable by the owner, an active platform administrator, or a user whose own `organizationId` matches that organization.
