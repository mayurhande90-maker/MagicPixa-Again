
// FIX: Use named imports for firebase/app for compatibility with Firebase v9 modular SDK.
// This also corrects the import for `FirebaseApp` to be consistent with other type imports.
import { initializeApp, FirebaseApp } from "firebase/app";
// FIX: Changed import path to 'firebase/auth/browser' to ensure the browser-specific version of the auth module is used, resolving export errors.
import { 
  getAuth, 
  Auth, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from "firebase/auth/browser";
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
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
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

const EMAIL_FOR_SIGN_IN = 'emailForSignIn';

export const sendAuthLink = async (email: string): Promise<void> => {
  if (!auth) throw new Error("Firebase Auth is not initialized.");
  const actionCodeSettings = {
    url: window.location.href,
    handleCodeInApp: true,
  };

  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  window.localStorage.setItem(EMAIL_FOR_SIGN_IN, email);
};

export const completeSignInWithLink = async (): Promise<boolean> => {
    if (!auth) throw new Error("Firebase Auth is not initialized.");
    
    if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem(EMAIL_FOR_SIGN_IN);
        if (!email) {
            email = window.prompt('Please provide your email for confirmation');
            if (!email) {
                return false;
            }
        }
        
        try {
            await signInWithEmailLink(auth, email, window.location.href);
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


/**
 * Signs in the user with Google and ensures their profile is created in Firestore.
 * @returns A promise that resolves on successful sign-in.
 */
export const signInWithGoogle = async (): Promise<void> => {
    if (!auth) throw new Error("Firebase Auth is not initialized.");
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        // This function will either get the existing profile or create a new one with 10 credits.
        await getOrCreateUserProfile(user.uid, user.displayName, user.email);
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
  const userProfile = await getOrCreateUserProfile(uid, auth?.currentUser?.displayName, auth?.currentUser?.email);
  
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
export const addCredits = async (uid: string, amount: number): Promise<DocumentData> => {
  if (!db) throw new Error("Firestore is not initialized.");
  
  // First, ensure the profile exists and is up-to-date
  const userProfile = await getOrCreateUserProfile(uid, auth?.currentUser?.displayName, auth?.currentUser?.email);
  
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    credits: increment(amount),
  });

  return { ...userProfile, credits: userProfile.credits + amount };
};

export { app, auth };