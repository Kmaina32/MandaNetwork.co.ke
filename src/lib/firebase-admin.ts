import * as admin from 'firebase-admin';

let adminApp: admin.app.App | undefined;

function getFirebaseAdminApp(): admin.app.App {
  if (adminApp) return adminApp;
  if (admin.apps.length > 0) {
    adminApp = admin.apps[0] as admin.app.App;
    return adminApp;
  }

  let serviceAccountJson: Record<string, string> = {};
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccountJson = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT must contain valid service-account JSON.');
    }
  }

  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || serviceAccountJson.private_key || '').replace(/\\n/g, '\n');
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID || serviceAccountJson.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    privateKey,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || serviceAccountJson.client_email,
  };

  if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
    throw new Error('Firebase Admin is unavailable: configure FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL.');
  }

  try {
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || process.env.databaseURL,
    });
    return adminApp;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error instanceof Error ? error.message : 'Unknown error');
    throw new Error('Could not initialize Firebase Admin SDK. Check the service account environment variables.');
  }
}

// Defer credential loading until a server request actually uses Admin SDK.
// This keeps Next.js route-module evaluation and build-time imports from failing
// when a deployment preview has not yet been provisioned with server credentials.
export const adminAuth = new Proxy({} as admin.auth.Auth, {
  get(_target, property) {
    const auth = getFirebaseAdminApp().auth();
    const value = Reflect.get(auth, property, auth);
    return typeof value === 'function' ? value.bind(auth) : value;
  },
});

export const adminDb = new Proxy({} as admin.database.Database, {
  get(_target, property) {
    const database = getFirebaseAdminApp().database();
    const value = Reflect.get(database, property, database);
    return typeof value === 'function' ? value.bind(database) : value;
  },
});
