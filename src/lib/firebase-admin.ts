
import * as admin from 'firebase-admin';

let adminApp: admin.app.App;

function getFirebaseAdminApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0] as admin.app.App;
  }
  
  // Use individual environment variables, which is more robust in different environments.
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  };

  if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
    throw new Error('Firebase service account credentials are not fully set. Please check FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL environment variables.');
  }

  try {
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });
    return adminApp;
  } catch (error: any) {
    console.error("Failed to initialize Firebase Admin SDK:", error.message);
    throw new Error("Could not initialize Firebase Admin SDK. Please check your service account credentials.");
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
