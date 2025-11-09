
import * as admin from 'firebase-admin';

let adminApp: admin.app.App;

function getFirebaseAdminApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0] as admin.app.App;
  }

  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountString) {
    throw new Error('Firebase service account key is missing. Set the FIREBASE_SERVICE_ACCOUNT environment variable.');
  }

  try {
    // The service account can be a base64 encoded string.
    const isBase64 = !serviceAccountString.trim().startsWith('{');
    const decodedServiceAccount = isBase64
      ? Buffer.from(serviceAccountString, 'base64').toString('utf-8')
      : serviceAccountString;
      
    const serviceAccount = JSON.parse(decodedServiceAccount);
    
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });
    return adminApp;
  } catch (error: any) {
    console.error("Failed to parse Firebase service account JSON.", error.message);
    throw new Error("Could not initialize Firebase Admin SDK. Service account JSON is malformed.");
  }
}

function initializeAdminServices() {
    const app = getFirebaseAdminApp();
    return {
        adminAuth: app.auth(),
        adminDb: app.database(),
    };
}

const { adminAuth, adminDb } = initializeAdminServices();

export { adminAuth, adminDb };
