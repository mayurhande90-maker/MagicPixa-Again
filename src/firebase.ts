// FIX: Refactored to use Firebase v12 (modular) syntax to match the installed package version.
// This resolves the build error caused by incorrect v8 compat imports.
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithRedirect, 
    setPersistence, 
    browserLocalPersistence,
    Auth
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    getDoc, 
    updateDoc, 
    serverTimestamp, 
    setDoc, 
    increment,
    Timestamp,
    Firestore,
    DocumentData
} from 'firebase/firestore';


// DEFINITIVE FIX: Use `import.meta.env` for all Vite-exposed variables.
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

// DEFINITIVE FIX: Unified all configuration checks to use the Vite-standard `import.meta.env`
// with the `VITE_` prefix, including the Gemini API key. This is the root fix.
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

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isConfigValid) {
  try {
    // FIX: Updated to Firebase v9+ modular initialization syntax.
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
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
    // FIX: Updated to Firebase v9+ modular syntax.
    const provider = new GoogleAuthProvider();
    try {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithRedirect(auth, provider);
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
  // FIX: Updated to Firebase v9+ modular syntax.
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
          // FIX: Updated to Firebase v9+ modular syntax.
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
      // FIX: Updated to Firebase v9+ modular syntax.
      signUpDate: serverTimestamp(),
      lastCreditRenewal: serverTimestamp(),
    };
    // FIX: Updated to Firebase v9+ modular syntax.
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
    // FIX: Updated to Firebase v9+ modular syntax.
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
export const deductCredits = async (uid: string, amount: number): Promise<DocumentData> => {
  if (!db || !auth) throw new Error("Firestore is not initialized.");
  
  // First, ensure the profile exists and is up-to-date
  const userProfile = await getOrCreateUserProfile(uid, auth.currentUser?.displayName, auth.currentUser?.email);
  
  if (userProfile.credits < amount) {
    throw new Error("Insufficient credits.");
  }

  // FIX: Updated to Firebase v9+ modular syntax.
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
export const addCredits = async (uid: string, amount: number): Promise<DocumentData> => {
  if (!db || !auth) throw new Error("Firestore is not initialized.");
  
  // Ensure the user profile exists.
  const userProfile = await getOrCreateUserProfile(uid, auth.currentUser?.displayName, auth.currentUser?.email);

  // FIX: Updated to Firebase v9+ modular syntax.
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    credits: increment(amount),
  });

  // Return the new profile state
  return { ...userProfile, credits: userProfile.credits + amount };
};

export { app, auth };
// Minor change for commit.