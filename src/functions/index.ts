
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

    try {
        // We only set the data that is immediately available and essential.
        // The `referredBy` field will be set client-side during the signup flow.
        await userRef.set({
            uid: uid, // Add the UID to the user record
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
