import { type FirebaseApp, type FirebaseOptions, getApps, initializeApp } from "firebase/app";
import { type Auth, getAuth } from "firebase/auth";
import {
  type Firestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

function requireBrowser(): void {
  if (typeof window !== "undefined") {
    return;
  }

  throw new Error("Firebase client SDK must be initialized in the browser.");
}

function readFirebaseConfig(): FirebaseOptions {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const missingKeys = Object.entries(config)
    .filter((entry) => !entry[1])
    .map((entry) => entry[0]);

  if (missingKeys.length > 0) {
    throw new Error(`Missing Firebase environment variables: ${missingKeys.join(", ")}`);
  }

  return config as FirebaseOptions;
}

export function getFirebaseApp(): FirebaseApp {
  requireBrowser();

  if (appInstance) {
    return appInstance;
  }

  const existingApps = getApps();
  const firstExisting = existingApps[0];
  if (firstExisting) {
    appInstance = firstExisting;
    return appInstance;
  }

  appInstance = initializeApp(readFirebaseConfig());
  return appInstance;
}

export function getFirebaseAuth(): Auth {
  if (authInstance) {
    return authInstance;
  }

  authInstance = getAuth(getFirebaseApp());
  return authInstance;
}

export function getFirebaseDb(): Firestore {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = initializeFirestore(getFirebaseApp(), {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  return dbInstance;
}
