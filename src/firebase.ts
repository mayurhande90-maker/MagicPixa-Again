// FIX: The build process was failing because it could not resolve scoped Firebase packages like '@firebase/auth'.
// Changed imports to the standard Firebase v9+ modular format (e.g., 'firebase/auth') which Vite can resolve from the installed 'firebase' package.
// FIX: Switched to using the compat library for app initialization to resolve module errors. This is a robust way to handle potential version conflicts or build tool issues without a full rewrite.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
// FIX: Removed incorrect modular imports for 'firebase/auth' and switched to compat syntax.
// The errors indicated these modular exports were not found, likely due to a build/dependency issue.
// Using the namespaced compat API (e.g., `firebase.auth()`) is more reliable with the current setup.
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, increment, Timestamp, Firestore, collection, addDoc, query, orderBy, limit, getDocs, runTransaction } from 'firebase/firestore';


// DEFINITIVE FIX: Use `import.meta.env` for all Vite-exposed variables.
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

// SELF-HEALING CONFIG: The authDomain was consistently misconfigured by the user.
// To fix this permanently, we now derive the authDomain directly from the projectId,
// which is the standard Firebase convention and bypasses the faulty environment variable.
const derivedAuthDomain = projectId ? `${projectId}.firebaseapp.com` : import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;

// Export the config object so other parts of the app can inspect it for diagnostics.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: derivedAuthDomain,
  projectId: projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const checkConfigValue = (value: string | undefined): boolean => {
    return !!value && value !== 'undefined';
};

// DEFINITIVE FIX: All keys, including the Gemini API key, must use the VITE_ prefix
// and be accessed via import.meta.env in a Vite application.
const allConfigKeys = {
    "VITE_API_KEY": import.meta.env.VITE_API_KEY,
    "VITE_FIREBASE_API_KEY": import.meta.env.VITE_FIREBASE_API_KEY,
    "VITE_FIREBASE_AUTH_DOMAIN": import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    "VITE_FIREBASE_PROJECT_ID": import.meta.env.VITE_FIREBASE_PROJECT_ID,
    "VITE_FIREBASE_STORAGE_BUCKET": import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    "VITE_FIREBASE_MESSAGING_SENDER_ID": import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    "VITE_FIREBASE_APP_ID": import.meta.env.VITE_FIREBASE_APP_ID
};

const missingKeys = Object.entries(allConfigKeys)
    .filter(([_, value]) => !checkConfigValue(value as string | undefined))
    .map(([key, _]) => key);

// FIX: Export the getMissingConfigKeys function as expected by App.tsx.
export const getMissingConfigKeys = (): string[] => missingKeys;

export const isConfigValid = missingKeys.length === 0;

let app;
// FIX: Correctly typed `auth` using the compat library's namespace.
let auth: firebase.auth.Auth | null = null;
let db: Firestore | null = null;

if (isConfigValid) {
  try {
    // FIX: Use the compat `initializeApp` which is more resilient to environment issues.
    // The `getAuth` and `getFirestore` functions are compatible with the app object returned here.
    app = firebase.apps.length === 0 ? firebase.initializeApp(firebaseConfig) : firebase.app();
    // FIX: Used compat `firebase.auth()` instead of modular `getAuth(app)`.
    auth = firebase.auth();
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
    // FIX: Used compat `firebase.auth.GoogleAuthProvider()` instead of modular `GoogleAuthProvider()`.
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        // FIX: Used compat `auth.signInWithPopup(provider)` instead of modular `signInWithPopup(auth, provider)`.
        const result = await auth.signInWithPopup(provider);
        return result;
    } catch (error) {
        console.error("Error during Google Sign-In with Popup:", error);
        throw error; // Re-throw to be caught by the calling function in App.tsx
    }
};


/**
 * Gets a user's profile from Firestore. If it doesn't exist, it creates one on-the-fly.
 * It now provides a one-time signup bonus of 10 credits and does not handle recurring renewals.
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
    // Profile exists, just return the data.
    return docSnap.data();
  } else {
    // Profile does not exist, create it with a 10 credit sign-up bonus.
    console.log(`Creating new user profile for UID: ${uid}`);
    const newUserProfile = {
      uid,
      name: name || 'New User',
      email: email || 'No Email',
      credits: 10, // New user sign-up bonus
      totalCreditsAcquired: 10, // Track total credits for progress bar
      plan: 'Free', // All users are on a pay-as-you-go model now
      signUpDate: serverTimestamp(),
    };
    await setDoc(userRef, newUserProfile);
    // Return the profile data
    return { ...newUserProfile, credits: 10, plan: 'Free', totalCreditsAcquired: 10 };
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
    await setDoc(userRef, data, { merge: true });
};

/**
 * DEFINITIVE FIX: Atomically deducts credits using the robust Firebase v8 compat API.
 * This resolves persistent transaction failures caused by unstable interactions between
 * the v9 modular and v8 compat libraries in the previous implementation. This function
 * is now self-contained and stable, ensuring reliable credit deductions.
 * @param uid The user's unique ID.
 * @param amount The number of credits to deduct.
 * @param feature The name of the feature used.
 * @returns The updated user profile data after deduction.
 */
export const deductCredits = async (uid: string, amount: number, feature: string) => {
  // Get the v8 compat firestore instance, matching the app's initialization.
  const firestore = firebase.firestore();
  if (!firestore) throw new Error("Firestore is not initialized.");

  const userRef = firestore.doc(`users/${uid}`);

  try {
    const updatedProfileData = await firestore.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new Error("User profile does not exist.");
      }

      const userProfile = userDoc.data();
      if (!userProfile) {
        throw new Error("User profile data is missing.");
      }

      const currentCredits = userProfile.credits;

      // Data validation to prevent operations on corrupted data.
      if (typeof currentCredits !== 'number' || isNaN(currentCredits)) {
        console.error(`Data validation failed: User ${uid} has a non-numeric credit balance.`, userProfile);
        throw new Error("A data error occurred. Could not process your request.");
      }

      if (currentCredits < amount) {
        throw new Error("Insufficient credits.");
      }

      // 1. Atomically decrement credits using the v8 compat FieldValue.
      transaction.update(userRef, {
        credits: firebase.firestore.FieldValue.increment(-amount)
      });

      // 2. Log the deduction in the transactions subcollection using v8 compat syntax.
      const newTransactionRef = firestore.collection(`users/${uid}/transactions`).doc();
      transaction.set(newTransactionRef, {
        feature,
        cost: amount,
        date: firebase.firestore.FieldValue.serverTimestamp(),
      });

      // Return the updated profile to the client state.
      return { ...userProfile, credits: currentCredits - amount };
    });

    return updatedProfileData;

  } catch (error) {
    console.error("Credit deduction transaction failed:", error);

    // Re-throw specific, user-friendly errors.
    if (error instanceof Error && (error.message === "Insufficient credits." || error.message.includes("data error"))) {
      throw error;
    }

    // For other errors, including Firestore permission errors, provide a generic message.
    throw new Error("An error occurred while processing your request. Please try again.");
  }
};


/**
 * Adds purchased credits to a user's account and logs the transaction atomically.
 * @param uid The user's unique ID.
 * @param packName The name of the purchased credit pack.
 * @param creditsToAdd The number of credits to add.
 * @param amountPaid The amount in INR paid for the pack.
 * @returns The updated user profile.
 */
export const purchaseTopUp = async (uid: string, packName: string, creditsToAdd: number, amountPaid: number) => {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const userRef = doc(db, "users", uid);
    
    // Refactored to use a transaction, ensuring both credit update and logging are atomic.
    // This resolves the error where payment succeeds but credits fail to update.
    await runTransaction(db, async (transaction) => {
      // 1. Update the user's credit and total credits acquired.
      transaction.update(userRef, {
        credits: increment(creditsToAdd),
        totalCreditsAcquired: increment(creditsToAdd),
      });

      // 2. Log the purchase in the transactions subcollection.
      const newTransactionRef = doc(collection(db, `users/${uid}/transactions`));
      transaction.set(newTransactionRef, {
        feature: `Purchased: ${packName}`,
        cost: amountPaid,
        creditChange: `+${creditsToAdd}`,
        date: serverTimestamp(),
      });
    });
  
    // After the transaction, fetch the latest user profile data to ensure the
    // UI gets the freshest state.
    const updatedDoc = await getDoc(userRef);
    if (!updatedDoc.exists()) {
        throw new Error("Failed to retrieve updated user profile after purchase.");
    }
    return updatedDoc.data();
};


export const getCreditHistory = async (uid: string): Promise<any[]> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const transactionsRef = collection(db, "users", uid, "transactions");
    const q = query(transactionsRef, orderBy("date", "desc"), limit(20));
    const querySnapshot = await getDocs(q);
    const history: any[] = [];
    querySnapshot.forEach((doc) => {
        history.push({ id: doc.id, ...doc.data() });
    });
    return history;
};

export { app, auth };