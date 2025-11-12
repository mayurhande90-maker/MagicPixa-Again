// FIX: The build process was failing because it could not resolve scoped Firebase packages like '@firebase/auth'.
// Changed imports to the standard Firebase v9+ modular format (e.g., 'firebase/auth') which Vite can resolve from the installed 'firebase' package.
// FIX: Switched to using the compat library for app initialization to resolve module errors. This is a robust way to handle potential version conflicts or build tool issues without a full rewrite.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

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
// DEFINITIVE FIX: Switched the Firestore instance to use the 'compat' API to match the app initialization and eliminate library conflicts.
let db: firebase.firestore.Firestore | null = null;

if (isConfigValid) {
  try {
    // FIX: Use the compat `initializeApp` which is more resilient to environment issues.
    app = firebase.apps.length === 0 ? firebase.initializeApp(firebaseConfig) : firebase.app();
    // FIX: Used compat `firebase.auth()` instead of modular `getAuth(app)`.
    auth = firebase.auth();
    // DEFINITIVE FIX: Get the Firestore instance using the stable 'compat' API.
    db = firebase.firestore();
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
  // DEFINITIVE FIX: Switched to 'compat' API for document reference and retrieval.
  const userRef = db.collection("users").doc(uid);
  const docSnap = await userRef.get();

  if (docSnap.exists) {
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
      signUpDate: firebase.firestore.FieldValue.serverTimestamp(),
    };
    // DEFINITIVE FIX: Used 'compat' set method.
    await userRef.set(newUserProfile);
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
    // DEFINITIVE FIX: Switched to 'compat' API for document reference and update.
    const userRef = db.collection("users").doc(uid);
    await userRef.set(data, { merge: true });
};

/**
 * DEFINITIVE FIX: Atomically deducts credits using a more robust transaction pattern.
 * This version completes the transaction writes first, then re-fetches the user data.
 * This avoids potential issues with returning values from inside a transaction handler
 * and makes the function more resilient.
 * @param uid The user's unique ID.
 * @param amount The number of credits to deduct.
 * @param feature The name of the feature used.
 * @returns The updated user profile data after deduction.
 */
export const deductCredits = async (uid: string, amount: number, feature: string) => {
  if (!db) throw new Error("Firestore is not initialized.");

  const userRef = db.collection("users").doc(uid);
  const newTransactionRef = db.collection(`users/${uid}/transactions`).doc();

  try {
    // Run the transaction to perform writes.
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new Error("User profile does not exist.");
      }

      const userProfile = userDoc.data();
      if (!userProfile) {
        throw new Error("User profile data is missing.");
      }

      const currentCredits = userProfile.credits;
      if (typeof currentCredits !== 'number' || isNaN(currentCredits)) {
        console.error(`Data validation failed: User ${uid} has a non-numeric credit balance.`, userProfile);
        throw new Error("A data error occurred. Could not process your request.");
      }

      if (currentCredits < amount) {
        throw new Error("Insufficient credits.");
      }

      // Perform writes
      transaction.update(userRef, {
        credits: firebase.firestore.FieldValue.increment(-amount),
      });

      transaction.set(newTransactionRef, {
        feature,
        cost: amount,
        date: firebase.firestore.FieldValue.serverTimestamp(),
      });
    });

    // After the transaction succeeds, fetch the latest user profile data.
    const updatedDoc = await userRef.get();
    if (!updatedDoc.exists) {
      throw new Error("Failed to retrieve updated user profile after deduction.");
    }
    return updatedDoc.data();

  } catch (error) {
    console.error("Credit deduction transaction failed:", error);
    if (error instanceof Error && (error.message.includes("Insufficient credits") || error.message.includes("data error") || error.message.includes("does not exist"))) {
      throw error; // Re-throw specific, known errors to be displayed in the UI.
    }
    // For all other more obscure transaction failures, throw the generic message.
    throw new Error("An error occurred while processing your request. Please try again.");
  }
};


/**
 * DEFINITIVE FIX: Atomically adds purchased credits using a corrected and robust transaction pattern.
 * Like the `deductCredits` function, this now creates the new transaction document reference *before*
 * the transaction begins to prevent failures. It also includes a read operation to ensure the user exists
 * before attempting to add credits, making the entire process more resilient.
 * @param uid The user's unique ID.
 * @param packName The name of the purchased credit pack.
 * @param creditsToAdd The number of credits to add.
 * @param amountPaid The amount in INR paid for the pack.
 * @returns The updated user profile.
 */
export const purchaseTopUp = async (uid: string, packName: string, creditsToAdd: number, amountPaid: number) => {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const userRef = db.collection("users").doc(uid);
    // Create the reference for the new transaction log document *before* starting the transaction.
    const newTransactionRef = db.collection(`users/${uid}/transactions`).doc();
    
    await db.runTransaction(async (transaction) => {
      // 1. READ phase: Ensure the user exists before proceeding.
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
          throw new Error("Cannot add credits to a user that does not exist.");
      }

      // 2. WRITE phase
      // Update the user's credit and total credits acquired.
      transaction.update(userRef, {
        credits: firebase.firestore.FieldValue.increment(creditsToAdd),
        totalCreditsAcquired: firebase.firestore.FieldValue.increment(creditsToAdd),
      });

      // Log the purchase using the pre-created reference.
      transaction.set(newTransactionRef, {
        feature: `Purchased: ${packName}`,
        cost: amountPaid,
        creditChange: `+${creditsToAdd}`,
        date: firebase.firestore.FieldValue.serverTimestamp(),
      });
    });
  
    // After the transaction, fetch the latest user profile data to ensure the
    // UI gets the freshest state.
    const updatedDoc = await userRef.get();
    if (!updatedDoc.exists) {
        throw new Error("Failed to retrieve updated user profile after purchase.");
    }
    return updatedDoc.data();
};


export const getCreditHistory = async (uid: string): Promise<any[]> => {
    if (!db) throw new Error("Firestore is not initialized.");
    // DEFINITIVE FIX: Switched to 'compat' API for collection query.
    const transactionsRef = db.collection("users").doc(uid).collection("transactions");
    const q = transactionsRef.orderBy("date", "desc").limit(20);
    const querySnapshot = await q.get();
    const history: any[] = [];
    querySnapshot.forEach((doc) => {
        history.push({ id: doc.id, ...doc.data() });
    });
    return history;
};

export { app, auth };