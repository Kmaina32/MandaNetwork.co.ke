
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { add } from 'date-fns';
import { randomBytes } from 'crypto';

admin.initializeApp();

const db = admin.database();

// This function triggers whenever a new user is created in Firebase Authentication.
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
    const { uid, email, displayName, metadata } = user;
    const creationTime = metadata.creationTime;

    const userRef = db.ref(`/users/${uid}`);

    // Generate a unique affiliate ID
    const affiliateId = randomBytes(4).toString('hex');

    // This function now only creates the basic user record.
    // Complex logic like organization creation or invitation handling is
    // managed on the client-side during the signup process for better reliability.
    try {
        await userRef.set({
            email: email,
            displayName: displayName || 'New User',
            createdAt: creationTime,
            affiliateId: affiliateId,
        });
        console.log(`Successfully created user record for ${uid} with affiliate ID ${affiliateId}`);
    } catch (error) {
        console.error(`Failed to create user record for ${uid}:`, error);
    }
});
