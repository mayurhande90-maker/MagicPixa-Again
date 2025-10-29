

// FIX: Using scoped package imports for firebase. The error "has no exported member 'initializeApp'" is characteristic of using modular syntax with an older Firebase v9 beta version that required scoped imports like '@firebase/app'.
import { initializeApp, FirebaseApp } from "@firebase/app";
import { getAuth, Auth } from "@firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp, 
  increment,
  Timestamp,
  Firestore,
  DocumentData
} from "@firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

export const isFirebaseConfigValid =
  firebaseConfig.apiKey && firebaseConfig.apiKey !== 'undefined' &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.storageBucket &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigValid) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error("Error initializing Firebase:", error);
  }
} else {
  console.error("Firebase configuration is missing or incomplete. Please check your environment variables.");
}

/**
 * Gets a user's profile from Firestore. If it doesn't exist, it creates one on-the-fly.
 * This "on-demand" creation is the core fix for the sign-up race condition.
 * It also handles the monthly credit renewal logic.
 * @param uid The user's unique ID from Firebase Auth.
 * @param name The user's display name (optional, used for creation).
 * @param email The user's email (optional, used for creation).
 * @returns The user's profile data.
 */
export const getOrCreateUserProfile = async (uid: string, name?: string, email?: string | null): Promise<DocumentData> => {
  if (!db) throw new Error("Firestore is not initialized.");
  const userRef = doc(db, "users", uid);
  const docSnap = await getDoc(userRef);

  if (docSnap.exists()) {
    // Profile exists, check for credit renewal
    const userData = docSnap.data();
    const lastRenewal = userData.lastCreditRenewal as Timestamp;
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
 * Atomically deducts credits. It will create the user profile if it doesn't exist.
 * This is now the primary function for any action that costs credits.
 * @param uid The user's unique ID.
 * @param amount The number of credits to deduct.
 * @returns The updated user profile data after deduction.
 */
export const deductCredits = async (uid: string, amount: number): Promise<DocumentData> => {
  if (!db) throw new Error("Firestore is not initialized.");
  
  // First, ensure the profile exists and is up-to-date
  const userProfile = await getOrCreateUserProfile(uid, auth?.currentUser?.displayName || undefined, auth?.currentUser?.email);
  
  if (userProfile.credits < amount) {
    throw new Error("Insufficient credits.");
  }

  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    credits: increment(-amount),
  });

  return { ...userProfile, credits: userProfile.credits - amount };
};

export { app, auth };