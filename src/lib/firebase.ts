
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getRemoteConfig } from 'firebase/remote-config';

const firebaseConfig = {
  apiKey: "AIzaSyBe1wU8Q-415auhlXf9k7ZXefvLX9TPOF0",
  authDomain: "mkenya-skilled.firebaseapp.com",
  databaseURL: "https://mkenya-skilled-default-rtdb.firebaseio.com",
  projectId: "mkenya-skilled",
  storageBucket: "mkenya-skilled.firebasestorage.app",
  messagingSenderId: "971829599240",
  appId: "1:971829599240:web:743a5618282680bb9dc5bd"
};


const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);
let remoteConfig: any = null;

if (typeof window !== 'undefined') {
    remoteConfig = getRemoteConfig(app);
    remoteConfig.settings.minimumFetchIntervalMillis = 3600000;
    remoteConfig.defaultConfig = {
        "hero_title": "Unlock Your Potential.",
        "hero_subtitle": "Quality, affordable courses designed for the Kenyan market."
    };
}


export { app, auth, db, storage, remoteConfig };
