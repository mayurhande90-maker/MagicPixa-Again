// FIX: Corrected Firebase imports to use the v9+ modular syntax. `initializeApp` and `FirebaseApp` are now named exports from 'firebase/app'.
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp, 
  increment,
  Timestamp,
  Firestore
} from "firebase/firestore";

// Your web app's Firebase configuration
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

// --- Firestore Helper Functions ---

/**
 * Creates a new user profile document in Firestore upon sign-up.
 * @param uid - The user's unique ID from Firebase Auth.
 * @param name - The user's display name.
 * @param email - The user's email address.
 */
export const createUserProfile = async (uid: string, name: string, email: string | null): Promise<void> => {
  if (!db) throw new Error("Firestore is not initialized.");
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, {
    uid,
    name,
    email,
    credits: 10,
    signUpDate: serverTimestamp(),
    lastCreditRenewal: serverTimestamp(),
  });
};

/**
 * Fetches a user's profile from Firestore.
 * @param uid - The user's unique ID.
 * @returns The user's profile data.
 */
export const getUserProfile = async (uid: string) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const userRef = doc(db, "users", uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
        return docSnap.data();
    } else {
        // This case might happen if a user exists in Auth but not Firestore.
        // We can create a profile for them, but for now, we'll throw an error.
        console.error("No such user profile in Firestore!");
        throw new Error("User profile not found.");
    }
};

/**
 * Checks if a user's credits need to be renewed and updates them if so.
 * @param uid - The user's unique ID.
 * @param lastRenewal - The Timestamp of the last credit renewal.
 * @returns A boolean indicating if a renewal occurred.
 */
export const renewCreditsIfNeeded = async (uid: string, lastRenewal: Timestamp): Promise<boolean> => {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const lastRenewalDate = lastRenewal.toDate();
    const oneMonthLater = new Date(lastRenewalDate.getFullYear(), lastRenewalDate.getMonth() + 1, lastRenewalDate.getDate());

    if (new Date() >= oneMonthLater) {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
            credits: 10,
            lastCreditRenewal: serverTimestamp(),
        });
        console.log(`Credits renewed for user ${uid}`);
        return true;
    }
    return false;
};

/**
 * Atomically deducts a specified amount of credits from a user's account.
 * @param uid - The user's unique ID.
 * @param amount - The number of credits to deduct.
 */
export const deductCredits = async (uid: string, amount: number): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
        credits: increment(-amount),
    });
};


export { app, auth };