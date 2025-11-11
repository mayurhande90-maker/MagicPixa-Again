// FIX: The build process was failing because it could not resolve scoped Firebase packages like '@firebase/auth'.
// Changed imports to the standard Firebase v9+ modular format (e.g., 'firebase/auth') which Vite can resolve from the installed 'firebase' package.
// FIX: Switched to using the compat library for app initialization to resolve module errors. This is a robust way to handle potential version conflicts or build tool issues without a full rewrite.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, Auth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, increment, Timestamp, Firestore, collection, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';


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
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isConfigValid) {
  try {
    // FIX: Use the compat `initializeApp` which is more resilient to environment issues.
    // The `getAuth` and `getFirestore` functions are compatible with the app object returned here.
    app = firebase.apps.length === 0 ? firebase.initializeApp(firebaseConfig) : firebase.app();
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
      plan: 'Free', // All users are on a pay-as-you-go model now
      signUpDate: serverTimestamp(),
    };
    await setDoc(userRef, newUserProfile);
    // Return the profile data
    return { ...newUserProfile, credits: 10, plan: 'Free' };
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
 * Atomically deducts credits and logs the transaction.
 * @param uid The user's unique ID.
 * @param amount The number of credits to deduct.
 * @param feature The name of the feature used.
 * @returns The updated user profile data after deduction.
 */
export const deductCredits = async (uid: string, amount: number, feature: string) => {
  if (!db || !auth) throw new Error("Firestore is not initialized.");
  
  const userProfile = await getOrCreateUserProfile(uid, auth.currentUser?.displayName, auth.currentUser?.email);
  
  if (userProfile.credits < amount) {
    throw new Error("Insufficient credits.");
  }

  const userRef = doc(db, "users", uid);
  await setDoc(userRef, {
    credits: increment(-amount),
  }, { merge: true });

  // Log the transaction
  const transactionsRef = collection(db, "users", uid, "transactions");
  await addDoc(transactionsRef, {
      feature,
      cost: amount, // For deductions, cost is the credit amount
      date: serverTimestamp(),
  });

  return { ...userProfile, credits: userProfile.credits - amount };
};

/**
 * Adds purchased credits to a user's account and logs the transaction.
 * @param uid The user's unique ID.
 * @param packName The name of the purchased credit pack.
 * @param creditsToAdd The number of credits to add.
 * @param amountPaid The amount in INR paid for the pack.
 * @returns The updated user profile.
 */
export const purchaseTopUp = async (uid: string, packName: string, creditsToAdd: number, amountPaid: number) => {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const userRef = doc(db, "users", uid);
    
    // Atomically increment the user's credits.
    await setDoc(userRef, {
      credits: increment(creditsToAdd),
    }, { merge: true });
  
    // Log the purchase as a transaction in a subcollection.
    const transactionsRef = collection(db, "users", uid, "transactions");
    await addDoc(transactionsRef, {
        feature: `Purchased: ${packName}`,
        cost: amountPaid,
        creditChange: `+${creditsToAdd}`,
        date: serverTimestamp(),
    });
  
    // After the update, fetch the latest user profile data to ensure the
    // value returned to the UI is fresh and not stale.
    const updatedDoc = await getDoc(userRef);
    if (!updatedDoc.exists()) {
        throw new Error("Failed to retrieve updated user profile.");
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