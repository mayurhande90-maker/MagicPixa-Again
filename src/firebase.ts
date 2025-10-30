// FIX: Manually define types for import.meta.env as a workaround for issue where vite/client types are not being found by TypeScript.
interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// FIX: Switched to Firebase compat imports to resolve module resolution errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { DocumentData } from "firebase/firestore";

// FIX: Use Vite's standard import.meta.env for environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const checkConfigValue = (value: string | undefined): boolean => {
    return !!value && value !== 'undefined';
};

// FIX: Use Vite's standard import.meta.env for environment variables
const allConfigKeys = {
    "API_KEY (for Gemini)": import.meta.env.VITE_API_KEY,
    "FIREBASE_API_KEY": firebaseConfig.apiKey,
    "FIREBASE_AUTH_DOMAIN": firebaseConfig.authDomain,
    "FIREBASE_PROJECT_ID": firebaseConfig.projectId,
    "FIREBASE_STORAGE_BUCKET": firebaseConfig.storageBucket,
    "FIREBASE_MESSAGING_SENDER_ID": firebaseConfig.messagingSenderId,
    "FIREBASE_APP_ID": firebaseConfig.appId
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

const EMAIL_FOR_SIGN_IN = 'emailForSignIn';

export const sendAuthLink = async (email: string): Promise<void> => {
  if (!auth) throw new Error("Firebase Auth is not initialized.");
  // Construct a clean URL by combining origin and pathname. This ensures the user is
  // redirected to the exact page they initiated the sign-in from, which is more
  // robust for apps hosted in a subdirectory.
  const continueUrl = `${window.location.origin}${window.location.pathname}`;

  const actionCodeSettings = {
    url: continueUrl,
    handleCodeInApp: true,
  };

  // FIX: Switched to compat method on the auth instance.
  await auth.sendSignInLinkToEmail(email, actionCodeSettings);
  window.localStorage.setItem(EMAIL_FOR_SIGN_IN, email);
};

export const completeSignInWithLink = async (): Promise<boolean> => {
    if (!auth) throw new Error("Firebase Auth is not initialized.");
    
    // FIX: Switched to compat method on the auth instance.
    if (auth.isSignInWithEmailLink(window.location.href)) {
        let email = window.localStorage.getItem(EMAIL_FOR_SIGN_IN);
        if (!email) {
            email = window.prompt('Please provide your email for confirmation');
            if (!email) {
                return false;
            }
        }
        
        try {
            // FIX: Switched to compat method on the auth instance.
            await auth.signInWithEmailLink(email, window.location.href);
            window.localStorage.removeItem(EMAIL_FOR_SIGN_IN);
            return true;
        } catch (error) {
            console.error("Error signing in with email link:", error);
            window.localStorage.removeItem(EMAIL_FOR_SIGN_IN);
            return false;
        }
    }
    return false;
};

export const signUpWithEmailPassword = async (email: string, password: string): Promise<void> => {
    if (!auth) throw new Error("Firebase Auth is not initialized.");
    try {
        const result = await auth.createUserWithEmailAndPassword(email, password);
        const user = result.user;
        await getOrCreateUserProfile(user!.uid, 'New User', user!.email);
    } catch (error) {
        console.error("Error signing up:", error);
        throw error;
    }
};

export const signInWithEmailPassword = async (email: string, password: string): Promise<void> => {
    if (!auth) throw new Error("Firebase Auth is not initialized.");
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        console.error("Error signing in:", error);
        throw error;
    }
};

export const sendPasswordReset = async (email: string): Promise<void> => {
    if (!auth) throw new Error("Firebase Auth is not initialized.");
    try {
        await auth.sendPasswordResetEmail(email);
    } catch (error) {
        console.error("Error sending password reset email:", error);
        throw error;
    }
};


/**
 * Signs in the user with Google and ensures their profile is created in Firestore.
 * @returns A promise that resolves on successful sign-in.
 */
export const signInWithGoogle = async (): Promise<void> => {
    if (!auth) throw new Error("Firebase Auth is not initialized.");
    // FIX: Switched to compat syntax for GoogleAuthProvider.
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        // FIX: Switched to compat method on the auth instance.
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        // This function will either get the existing profile or create a new one with 10 credits.
        await getOrCreateUserProfile(user!.uid, user!.displayName, user!.email);
    } catch (error) {
        console.error("Error during Google Sign-In:", error);
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
  
  // First, ensure the profile exists and is up-to-date
  const userProfile = await getOrCreateUserProfile(uid, auth?.currentUser?.displayName, auth?.currentUser?.email);
  
  // FIX: Switched to compat syntax for document reference.
  const userRef = db.collection("users").doc(uid);
  // FIX: Switched to compat syntax for updating a document and increment.
  await userRef.update({
    credits: firebase.firestore.FieldValue.increment(amount),
  });

  return { ...userProfile, credits: userProfile.credits + amount };
};

export { app, auth };