// FIX: The build process was failing because it could not resolve scoped Firebase packages like '@firebase/auth'.
// Changed imports to the standard Firebase v9+ modular format (e.g., 'firebase/auth') which Vite can resolve from the installed 'firebase' package.
// FIX: Switched to a namespace import to resolve module resolution issues with named exports from 'firebase/app'.
import * as firebaseApp from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, Auth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp, increment, Timestamp, Firestore } from 'firebase/firestore';


// DEFINITIVE FIX: Use `import.meta.env` for all Vite-exposed variables.
const projectId = (import.meta as any).env.VITE_FIREBASE_PROJECT_ID;

// SELF-HEALING CONFIG: The authDomain was consistently misconfigured by the user.
// To fix this permanently, we now derive the authDomain directly from the projectId,
// which is the standard Firebase convention and bypasses the faulty environment variable.
const derivedAuthDomain = projectId ? `${projectId}.firebaseapp.com` : (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN;

// Export the config object so other parts of the app can inspect it for diagnostics.
export const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
  authDomain: derivedAuthDomain,
  projectId: projectId,
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID
};

const checkConfigValue = (value: string | undefined): boolean => {
    return !!value && value !== 'undefined';
};

// DEFINITIVE FIX: All keys, including the Gemini API key, must use the VITE_ prefix
// and be accessed via import.meta.env in a Vite application.
const allConfigKeys = {
    "VITE_API_KEY": (import.meta as any).env.VITE_API_KEY,
    "VITE_FIREBASE_API_KEY": (import.meta as any).env.VITE_FIREBASE_API_KEY,
    "VITE_FIREBASE_AUTH_DOMAIN": (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
    "VITE_FIREBASE_PROJECT_ID": (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
    "VITE_FIREBASE_STORAGE_BUCKET": (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET,
    "VITE_FIREBASE_MESSAGING_SENDER_ID": (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    "VITE_FIREBASE_APP_ID": (import.meta as any).env.VITE_FIREBASE_APP_ID
};

const missingKeys = Object.entries(allConfigKeys)
    .filter(([_, value]) => !checkConfigValue(value as string | undefined))
    .map(([key, _]) => key);

export const isConfigValid = missingKeys.length === 0;

export const getMissingConfigKeys = (): string[] => missingKeys;

let app;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isConfigValid) {
  try {
    // FIX: Use namespace import to access firebase app functions.
    app = firebaseApp.getApps().length === 0 ? firebaseApp.initializeApp(firebaseConfig) : firebaseApp.getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error("Error initializing Firebase:", error);
  }
} else {
  console.error("Configuration is missing or incomplete. Please check your environment variables. Missing:", missingKeys.join(', '));
}

/**
 * Signs in the user with Google using a popup window.
 * This method is more self-contained than redirect and provides immediate feedback.
 * @returns A promise that resolves with the user's credentials on success.
 */
export const signInWithGoogle = async () => {
    if (!auth) throw new Error("Firebase Auth is not initialized.");
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        return result;
    } catch (error) {
        console.error("Error during Google Sign-In with Popup:", error);
        throw error; // Re-throw to be caught by the calling function in App.tsx
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
export const getOrCreateUserProfile = async (uid: string, name?: string | null, email?: string | null) => {
  if (!db) throw new Error("Firestore is not initialized.");
  const userRef = doc(db, "users", uid);
  const docSnap = await getDoc(userRef);

  if (docSnap.exists()) {
    // Profile exists, check for credit renewal
    const userData = docSnap.data();
    const lastRenewal = userData.lastCreditRenewal as Timestamp;
    if (lastRenewal) {
        const lastRenewalDate = lastRenewal.toDate();
        const oneMonthLater = new Date(lastRenewalDate.getFullYear(), lastRenewalDate.getMonth() + 1, lastRenewalDate.getDate());

        if (new Date() >= oneMonthLater) {
          await updateDoc(userRef, {
            credits: 10,
            lastCreditRenewal: serverTimestamp(),
          });
          console.log(`Credits renewed for user ${uid}`);
          return { ...userData, credits: 10 };
        }
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
      signUpDate: serverTimestamp(),
      lastCreditRenewal: serverTimestamp(),
    };
    await setDoc(userRef, newUserProfile);
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
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, data);
};

/**
 * Atomically deducts credits. It will create the user profile if it doesn't exist.
 * This is now the primary function for any action that costs credits.
 * @param uid The user's unique ID.
 * @param amount The number of credits to deduct.
 * @returns The updated user profile data after deduction.
 */
export const deductCredits = async (uid: string, amount: number) => {
  if (!db || !auth) throw new Error("Firestore is not initialized.");
  
  // First, ensure the profile exists and is up-to-date
  const userProfile = await getOrCreateUserProfile(uid, auth.currentUser?.displayName, auth.currentUser?.email);
  
  if (userProfile.credits < amount) {
    throw new Error("Insufficient credits.");
  }

  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    credits: increment(-amount),
  });

  return { ...userProfile, credits: userProfile.credits - amount };
};

/**
 * Atomically adds credits to a user's account.
 * @param uid The user's unique ID.
 * @param amount The number of credits to add.
 * @returns The updated user profile data after addition.
 */
export const addCredits = async (uid: string, amount: number) => {
  if (!db || !auth) throw new Error("Firestore is not initialized.");
  
  // Ensure the user profile exists.
  const userProfile = await getOrCreateUserProfile(uid, auth.currentUser?.displayName, auth.currentUser?.email);

  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    credits: increment(amount),
  });

  // Return the new profile state
  return { ...userProfile, credits: userProfile.credits + amount };
};

export { app, auth };