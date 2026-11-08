#!/usr/bin/env node
/**
 * Backfill public verification records for certificates issued before the
 * publicCertificates node was introduced.
 *
 * Required env: FIREBASE_SERVICE_ACCOUNT_JSON and FIREBASE_DATABASE_URL.
 * Run from a trusted workstation: node scripts/backfill-public-certificates.cjs
 */
const admin = require('firebase-admin');

async function main() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const databaseURL = process.env.FIREBASE_DATABASE_URL;
  if (!raw || !databaseURL) throw new Error('Set FIREBASE_SERVICE_ACCOUNT_JSON and FIREBASE_DATABASE_URL.');
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)), databaseURL });
  const db = admin.database();
  const [usersSnapshot, coursesSnapshot, existingSnapshot] = await Promise.all([
    db.ref('users').once('value'),
    db.ref('courses').once('value'),
    db.ref('publicCertificates').once('value'),
  ]);
  const users = usersSnapshot.val() || {};
  const courses = coursesSnapshot.val() || {};
  const existing = existingSnapshot.val() || {};
  const updates = {};
  let issued = 0, skipped = 0;

  for (const [uid, user] of Object.entries(users)) {
    for (const [courseId, enrollment] of Object.entries(user.purchasedCourses || {})) {
      const certificateId = enrollment && enrollment.certificateId;
      const course = courses[courseId];
      if (!enrollment || enrollment.certificateAvailable !== true || !certificateId || !course) {
        skipped++;
        continue;
      }
      // Never overwrite an explicit revocation during a backfill.
      if (existing[certificateId] && existing[certificateId].status === 'revoked') {
        skipped++;
        continue;
      }
      updates[`publicCertificates/${certificateId}`] = {
        certificateId,
        studentName: typeof user.displayName === 'string' ? user.displayName : 'Student',
        studentPhotoURL: typeof user.photoURL === 'string' ? user.photoURL : '',
        courseId,
        courseTitle: typeof course.title === 'string' ? course.title : 'Course',
        issuedAt: enrollment.enrollmentDate || new Date().toISOString(),
        status: 'valid',
      };
      issued++;
    }
  }

  if (Object.keys(updates).length) await db.ref().update(updates);
  console.log(JSON.stringify({ scannedUsers:Object.keys(users).length, backfilled:issued, skipped }, null, 2));
  await admin.app().delete();
}
main().catch(error => { console.error('Certificate backfill failed:', error); process.exitCode = 1; });
