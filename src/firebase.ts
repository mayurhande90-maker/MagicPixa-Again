// FIX: Removed reference to "vite/client" as it was causing a "Cannot find type definition file" error. The underlying issue is likely a misconfigured tsconfig.json, which cannot be modified.

// FIX: Switched to Firebase compat imports to resolve module resolution errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { DocumentData } from "firebase/firestore";

// Use import.meta.env for Vite environment variables
// FIX: Cast `import.meta` to `any` to access `env` without TypeScript errors. This is a workaround for the missing Vite client types.
const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID
};

const checkConfigValue = (value: string | undefined): boolean => {
    return !!value && value !== 'undefined';
};

// Check the correct Vite variables and use keys that will clearly guide the user.
// FIX: Cast `import.meta` to `any` to access `env` without TypeScript errors. This is a workaround for the missing Vite client types.
const allConfigKeys = {
    "VITE_API_KEY (for Gemini)": (import.meta as any).env.VITE_API_KEY,
    "VITE_FIREBASE_API_KEY": firebaseConfig.apiKey,
    "VITE_FIREBASE_AUTH_DOMAIN": firebaseConfig.authDomain,
    "VITE_FIREBASE_PROJECT_ID": firebaseConfig.projectId,
    "VITE_FIREBASE_STORAGE_BUCKET": firebaseConfig.storageBucket,
    "VITE_FIREBASE_MESSAGING_SENDER_ID": firebaseConfig.messagingSenderId,
    "VITE_FIREBASE_APP_ID": firebaseConfig.appId
};

const missingKeys = Object.entries(allConfigKeys)
    .filter(([_, value]) => !checkConfigValue(value))
    .map(([key, _]) => key);

export const isConfigValid = missingKeys.length === 0;

export const getMissingConfigKeys = (): string[] => missingKeys;


// FIX: Changed types to match the v8 compat SDK.
let app: firebase.app.App | null = null;
let auth: firebase.auth.Auth | null = null;
let db: firebase.firestore.Firestore | null = null;

if (isConfigValid) {
  try {
    // FIX: Used compat initialization.
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
  } catch (error) {
    console.error("Error initializing Firebase:", error);
  }
} else {
  console.error("Configuration is missing or incomplete. Please check your environment variables. Missing:", missingKeys.join(', '));
}

/**
 * Signs in the user with Google using a redirect flow for better mobile compatibility.
 * @returns A promise that resolves on successful sign-in initiation.
 */
export const signInWithGoogle = async (): Promise<void> => {
    if (!auth) throw new Error("Firebase Auth is not initialized.");
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        // Set persistence to LOCAL to keep the user signed in for 30 days.
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        // FIX: Use `signInWithRedirect` instead of `signInWithPopup` for better mobile compatibility.
        // The authentication result will be handled by the `onAuthStateChanged` listener in App.tsx
        // when the user is redirected back to the application.
        await auth.signInWithRedirect(provider);
    } catch (error) {
        console.error("Error during Google Sign-In redirect initiation:", error);
        throw error;
    }
};

/**
 * Gets a user's profile from Firestore. If it doesn't exist, it creates one on-the-fly.
 * This "on-demand" creation is the core fix for the sign-up race condition.
 * It also handles the monthly credit renewal logic.
 * @param uid The user's unique ID from Firebase Auth.
 * @param name The user's display name (optional, used for creation).
 * @param email The user's email (optional, used for creation).
 * @returns The user's profile data.
 */
export const getOrCreateUserProfile = async (uid: string, name?: string | null, email?: string | null): Promise<DocumentData> => {
  if (!db) throw new Error("Firestore is not initialized.");
  // FIX: Switched to compat syntax for document reference.
  const userRef = db.collection("users").doc(uid);
  // FIX: Switched to compat syntax for getting a document.
  const docSnap = await userRef.get();

  if (docSnap.exists) {
    // Profile exists, check for credit renewal
    const userData = docSnap.data()!;
    // FIX: Use compat Timestamp type.
    const lastRenewal = userData.lastCreditRenewal as firebase.firestore.Timestamp;
    const lastRenewalDate = lastRenewal.toDate();
    const oneMonthLater = new Date(lastRenewalDate.getFullYear(), lastRenewalDate.getMonth() + 1, lastRenewalDate.getDate());

    if (new Date() >= oneMonthLater) {
      // FIX: Switched to compat syntax for updating a document and serverTimestamp.
      await userRef.update({
        credits: 10,
        lastCreditRenewal: firebase.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`Credits renewed for user ${uid}`);
      return { ...userData, credits: 10 };
    }
    return userData;
  } else {
    // Profile does not exist, create it now
    console.log(`Creating new user profile for UID: ${uid}`);
    const newUserProfile = {
      uid,
      name: name || 'New User',
      email: email || 'No Email',
      credits: 10,
      // FIX: Use compat serverTimestamp.
      signUpDate: firebase.firestore.FieldValue.serverTimestamp(),
      lastCreditRenewal: firebase.firestore.FieldValue.serverTimestamp(),
    };
    // FIX: Switched to compat syntax for setting a document.
    await userRef.set(newUserProfile);
    // Return the profile data (timestamps will be null until server processes them, which is fine)
    return { ...newUserProfile, credits: 10 };
  }
};

/**
 * Updates a user's profile information in Firestore.
 * @param uid The user's unique ID.
 * @param data An object containing the fields to update (e.g., { name: 'New Name' }).
 */
export const updateUserProfile = async (uid: string, data: { name: string }): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const userRef = db.collection("users").doc(uid);
    await userRef.update(data);
};

/**
 * Atomically deducts credits. It will create the user profile if it doesn't exist.
 * This is now the primary function for any action that costs credits.
 * @param uid The user's unique ID.
 * @param amount The number of credits to deduct.
 * @returns The updated user profile data after deduction.
 */
export const deductCredits = async (uid: string, amount: number): Promise<DocumentData> => {
  if (!db) throw new Error("Firestore is not initialized.");
  
  // First, ensure the profile exists and is up-to-date
  const userProfile = await getOrCreateUserProfile(uid, auth?.currentUser?.displayName, auth?.currentUser?.email);
  
  if (userProfile.credits < amount) {
    throw new Error("Insufficient credits.");
  }

  // FIX: Switched to compat syntax for document reference.
  const userRef = db.collection("users").doc(uid);
  // FIX: Switched to compat syntax for updating a document and increment.
  await userRef.update({
    credits: firebase.firestore.FieldValue.increment(-amount),
  });

  return { ...userProfile, credits: userProfile.credits - amount };
};

/**
 * Atomically adds credits to a user's account.
 * @param uid The user's unique ID.
 * @param amount The number of credits to add.
 * @returns The updated user profile data after addition.
 */
export const addCredits = async (uid: string, amount: number): Promise<DocumentData> => {
  if (!db) throw new Error("Firestore is not initialized.");
  
  // Ensure the user profile exists.
  const userProfile = await getOrCreateUserProfile(uid, auth?.currentUser?.displayName, auth?.currentUser?.email);

  // FIX: Switched to compat syntax for document reference.
  const userRef = db.collection("users").doc(uid);
  // FIX: Switched to compat syntax for updating a document and increment.
  await userRef.update({
    credits: firebase.firestore.FieldValue.increment(amount),
  });

  // Return the new profile state
  return { ...userProfile, credits: userProfile.credits + amount };
};

export { app, auth };
// Minor change for commit.