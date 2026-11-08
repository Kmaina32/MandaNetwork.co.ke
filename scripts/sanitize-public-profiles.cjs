#!/usr/bin/env node
/**
 * One-time historical publicProfiles cleanup.
 * Required env: FIREBASE_SERVICE_ACCOUNT_JSON and FIREBASE_DATABASE_URL.
 * Run from a trusted workstation: node scripts/sanitize-public-profiles.cjs
 */
const admin = require('firebase-admin');

async function main() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const databaseURL = process.env.FIREBASE_DATABASE_URL;
  if (!raw || !databaseURL) throw new Error('Set FIREBASE_SERVICE_ACCOUNT_JSON and FIREBASE_DATABASE_URL.');
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)), databaseURL });
  const profilesRef = admin.database().ref('publicProfiles');
  const snapshot = await profilesRef.once('value');
  const profiles = snapshot.val() || {};
  const updates = {};
  let sanitized = 0, removed = 0, directoryEntries = 0;

  const pick = (value, keys) => {
    if (!value || typeof value !== 'object') return undefined;
    const result = {};
    for (const key of keys) if (value[key] !== undefined && value[key] !== null) result[key] = value[key];
    return result;
  };
  const list = (value, keys) => Array.isArray(value) ? value.map(item => pick(item, keys)).filter(Boolean) : [];

  const usersSnapshot = await db.ref('users').once('value');
  const users = usersSnapshot.val() || {};
  for (const [uid, user] of Object.entries(users)) {
    let email = user && user.email;
    if (!email) {
      try { email = (await admin.auth().getUser(uid)).email; } catch (_) { email = null; }
    }
    if (email) {
      updates[`userDirectory/${uid}`] = { uid, email: String(email).trim(), organizationId: user.organizationId || null };
      directoryEntries++;
    }
  }

  for (const [uid, profile] of Object.entries(profiles)) {
    const portfolio = profile && profile.portfolio;
    if (!portfolio || portfolio.public !== true) { updates[uid] = null; removed++; continue; }
    updates[uid] = {
      uid,
      displayName: typeof profile.displayName === 'string' ? profile.displayName : '',
      photoURL: typeof profile.photoURL === 'string' ? profile.photoURL : '',
      portfolio: {
        public: true,
        aboutMe: typeof portfolio.aboutMe === 'string' ? portfolio.aboutMe : '',
        socialLinks: pick(portfolio.socialLinks, ['github', 'gitlab', 'bitbucket']) || {},
        projects: list(portfolio.projects, ['id','title','description','imageUrl','liveUrl','sourceUrl','technologies']),
        workExperience: list(portfolio.workExperience, ['id','jobTitle','companyName','startDate','endDate','description']),
        education: list(portfolio.education, ['id','institution','degree','fieldOfStudy','graduationYear']),
      },
    };
    sanitized++;
  }
  if (Object.keys(updates).length) await db.ref().update(updates);
  console.log(JSON.stringify({ scannedProfiles:Object.keys(profiles).length, sanitized, removed, directoryEntries }, null, 2));
  await admin.app().delete();
}
main().catch(error => { console.error('Migration failed:', error); process.exitCode = 1; });
