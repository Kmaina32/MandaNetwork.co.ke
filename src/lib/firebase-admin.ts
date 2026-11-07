import * as admin from 'firebase-admin';

let adminApp: admin.app.App | undefined;

function getFirebaseAdminApp(): admin.app.App {
  if (adminApp) return adminApp;
  if (admin.apps.length > 0) {
    adminApp = admin.apps[0] as admin.app.App;
    return adminApp;
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  };

  if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
    throw new Error('Firebase Admin is unavailable: configure FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL.');
  }

  try {
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
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
