
// FIX: The build process was failing because it could not resolve scoped Firebase packages like '@firebase/auth'.
// Changed imports to the standard Firebase v9+ modular format (e.g., 'firebase/auth') which Vite can resolve from the installed 'firebase' package.
// FIX: Switched to using the compat library for app initialization to resolve module errors. This is a robust way to handle potential version conflicts or build tool issues without a full rewrite.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
// FIX: Import AppConfig for use in getAppConfig function.
import { AppConfig, Purchase, User } from './types';

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
let storage: firebase.storage.Storage | null = null;

if (isConfigValid) {
  try {
    // FIX: Use the compat `initializeApp` which is more resilient to environment issues.
    app = firebase.apps.length === 0 ? firebase.initializeApp(firebaseConfig) : firebase.app();
    // FIX: Used compat `firebase.auth()` instead of modular `getAuth(app)`.
    auth = firebase.auth();
    // DEFINITIVE FIX: Get the Firestore instance using the stable 'compat' API.
    db = firebase.firestore();
    storage = firebase.storage();
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
    const userData = docSnap.data();
    
    // Self-heal: Add missing engagement fields if they don't exist
    if (userData) {
        let needsUpdate = false;
        const updatePayload: any = {};

        if (!userData.dailyMission) {
            updatePayload.dailyMission = {
                completedAt: new Date(0).toISOString(),
                nextUnlock: new Date(0).toISOString(),
                lastMissionId: null
            };
            needsUpdate = true;
        }
        if (userData.lifetimeGenerations === undefined) {
            updatePayload.lifetimeGenerations = 0;
            needsUpdate = true;
        }
        if (userData.lastAttendanceClaim === undefined) {
            updatePayload.lastAttendanceClaim = null;
            needsUpdate = true;
        }

        if (needsUpdate) {
             userRef.set(updatePayload, { merge: true }).catch(e => console.error("Failed to patch legacy user", e));
             return { ...userData, ...updatePayload };
        }
    }

    return userData;
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
      totalSpent: 0,
      lifetimeGenerations: 0, // Init generation count
      lastAttendanceClaim: null, // Init attendance
      // Initialize daily mission structure
      dailyMission: {
          completedAt: new Date(0).toISOString(), // Epoch start
          nextUnlock: new Date(0).toISOString(),
          lastMissionId: null
      }
    };
    // DEFINITIVE FIX: Used 'compat' set method.
    await userRef.set(newUserProfile);
    // Return the profile data
    return { ...newUserProfile, credits: 10, plan: 'Free', totalCreditsAcquired: 10, totalSpent: 0 };
  }
};

/**
 * Updates a user's profile information in Firestore.
 * @param uid The user's unique ID.
 * @param data An object containing the fields to update (e.g., { name: 'New Name' }).
 */
// FIX: Changed the type of 'data' to { [key: string]: any } to allow updating any field, such as 'lastActive'.
export const updateUserProfile = async (uid: string, data: { [key: string]: any }): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    // DEFINITIVE FIX: Switched to 'compat' API for document reference and update.
    const userRef = db.collection("users").doc(uid);
    await userRef.set(data, { merge: true });
};

/**
 * DEFINITIVE FIX: Atomically deducts credits using a more robust transaction pattern.
 * Also handles the "Loyalty Loop" (every 10th generation = +5 credits).
 * @param uid The user's unique ID.
 * @param amount The number of credits to deduct.
 * @param feature The name of the feature used.
 * @returns The updated user profile data after deduction.
 */
export const deductCredits = async (uid: string, amount: number, feature: string) => {
  if (!db) throw new Error("Firestore is not initialized.");

  const userRef = db.collection("users").doc(uid);
  const newTransactionRef = db.collection(`users/${uid}/transactions`).doc();
  const bonusTransactionRef = db.collection(`users/${uid}/transactions`).doc();

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
        throw new Error("A data error occurred. Could not process your request.");
      }

      if (currentCredits < amount) {
        throw new Error("Insufficient credits.");
      }

      // Engagement Logic: Increment generations
      const currentGens = userProfile.lifetimeGenerations || 0;
      const newGens = currentGens + 1;
      
      // Check for Milestone (Every 10th generation)
      const isMilestone = newGens > 0 && newGens % 10 === 0;
      
      // Calculate net credit change
      // If milestone, we deduct cost but add 5 bonus. 
      // E.g., Cost 2, Bonus 5 => Net +3.
      // We will log them separately but update atomically.
      const netChange = isMilestone ? (-amount + 5) : -amount;

      // Perform writes
      transaction.update(userRef, {
        credits: firebase.firestore.FieldValue.increment(netChange),
        lifetimeGenerations: newGens
      });

      // Log the cost deduction
      transaction.set(newTransactionRef, {
        feature,
        cost: amount,
        date: firebase.firestore.FieldValue.serverTimestamp(),
      });

      // Log the bonus if applicable
      if (isMilestone) {
          transaction.set(bonusTransactionRef, {
            feature: "Loyalty Bonus",
            creditChange: "+5",
            reason: "10th Generation Milestone",
            cost: 0,
            date: firebase.firestore.FieldValue.serverTimestamp(),
          });
      }
    });

    // After the transaction succeeds, fetch the latest user profile data.
    const updatedDoc = await userRef.get();
    if (!updatedDoc.exists) {
      throw new Error("Failed to retrieve updated user profile after deduction.");
    }
    return updatedDoc.data();

  } catch (error: any) {
    console.error("Credit deduction transaction failed:", error);
    if (error.message?.includes("Insufficient credits")) {
      throw new Error("You don't have enough credits for this action.");
    }
    throw new Error("An error occurred while processing your request. Please try again.");
  }
};


/**
 * Claims the daily attendance credit (+1 credit every 24 hours).
 * @param uid The user's unique ID.
 */
export const claimDailyAttendance = async (uid: string) => {
    if (!db) throw new Error("Firestore is not initialized.");

    const userRef = db.collection("users").doc(uid);
    const transactionRef = db.collection(`users/${uid}/transactions`).doc();

    try {
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) throw new Error("User not found.");

            const userData = userDoc.data();
            const lastClaim = userData?.lastAttendanceClaim;
            const now = new Date();
            
            // Check if already claimed today (Server time logic)
            if (lastClaim) {
                const lastDate = lastClaim.toDate();
                if (lastDate.getDate() === now.getDate() && 
                    lastDate.getMonth() === now.getMonth() && 
                    lastDate.getFullYear() === now.getFullYear()) {
                    throw new Error("Already claimed today.");
                }
            }

            // Update User
            transaction.update(userRef, {
                credits: firebase.firestore.FieldValue.increment(1),
                totalCreditsAcquired: firebase.firestore.FieldValue.increment(1),
                lastAttendanceClaim: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Log Transaction
            transaction.set(transactionRef, {
                feature: "Daily Attendance",
                creditChange: "+1",
                reason: "Daily Check-in",
                date: firebase.firestore.FieldValue.serverTimestamp(),
                cost: 0
            });
        });

        const updatedDoc = await userRef.get();
        return updatedDoc.data();

    } catch (error: any) {
        console.error("Attendance claim failed:", error);
        throw error;
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
    const newTransactionRef = db.collection(`users/${uid}/transactions`).doc();
    const purchaseRef = db.collection('purchases').doc();
    
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
          throw new Error("Cannot add credits to a user that does not exist.");
      }
      const userData = userDoc.data();

      transaction.update(userRef, {
        credits: firebase.firestore.FieldValue.increment(creditsToAdd),
        totalCreditsAcquired: firebase.firestore.FieldValue.increment(creditsToAdd),
        totalSpent: firebase.firestore.FieldValue.increment(amountPaid),
      });

      transaction.set(newTransactionRef, {
        feature: `Purchased: ${packName}`,
        cost: amountPaid,
        creditChange: `+${creditsToAdd}`,
        date: firebase.firestore.FieldValue.serverTimestamp(),
      });
      
      transaction.set(purchaseRef, {
        userId: uid,
        userName: userData?.name,
        userEmail: userData?.email,
        amountPaid: amountPaid,
        creditsAdded: creditsToAdd,
        packName: packName,
        purchaseDate: firebase.firestore.FieldValue.serverTimestamp(),
      });
    });
  
    const updatedDoc = await userRef.get();
    if (!updatedDoc.exists) {
        throw new Error("Failed to retrieve updated user profile after purchase.");
    }
    return updatedDoc.data();
};

export const completeDailyMission = async (uid: string, reward: number, missionId: string) => {
    if (!db) throw new Error("Firestore is not initialized.");

    const userRef = db.collection("users").doc(uid);
    const newTransactionRef = db.collection(`users/${uid}/transactions`).doc();

    let updatedUserData: User | null = null;

    await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
            throw new Error("User does not exist.");
        }

        const userData = userDoc.data() as User;
        const now = new Date();
        
        // STRICT LOCK CHECK: Check against stored nextUnlock time
        const currentNextUnlockStr = userData.dailyMission?.nextUnlock;
        if (currentNextUnlockStr) {
            const nextUnlockDate = new Date(currentNextUnlockStr);
            if (nextUnlockDate > now) {
                throw new Error("Mission locked");
            }
        }

        // Set new lock time: Now + 12 hours
        const nextUnlockTime = new Date(now.getTime() + 12 * 60 * 60 * 1000);

        transaction.update(userRef, {
            credits: firebase.firestore.FieldValue.increment(reward),
            totalCreditsAcquired: firebase.firestore.FieldValue.increment(reward),
            dailyMission: {
                completedAt: now.toISOString(),
                nextUnlock: nextUnlockTime.toISOString(),
                lastMissionId: missionId
            }
        });

        transaction.set(newTransactionRef, {
            feature: "Daily Mission Reward",
            creditChange: `+${reward}`,
            reason: `Completed Mission`,
            date: firebase.firestore.FieldValue.serverTimestamp(),
            cost: 0
        });
    });

    // Return fresh user data
    const updatedDoc = await userRef.get();
    return updatedDoc.data() as User;
};

export const getCreditHistory = async (uid: string): Promise<any[]> => {
    if (!db) throw new Error("Firestore is not initialized.");
    // DEFINITIVE FIX: Switched to 'compat' API for collection query.
    const transactionsRef = db.collection("users").doc(uid).collection("transactions");
    const q = transactionsRef.orderBy("date", "desc").limit(50);
    const querySnapshot = await q.get();
    const history: any[] = [];
    querySnapshot.forEach((doc) => {
        history.push({ id: doc.id, ...doc.data() });
    });
    return history;
};

// Helper to convert base64 to blob for uploading
const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
};


/**
 * Saves a newly generated image to Storage and its metadata to Firestore.
 * @param uid The user's unique ID.
 * @param dataUri The data URI of the image (e.g., 'data:image/png;base64,...').
 * @param feature The name of the feature used.
 */
export const saveCreation = async (uid: string, dataUri: string, feature: string): Promise<void> => {
    if (!db || !storage) throw new Error("Firebase is not initialized.");
    
    try {
        const [header, base64] = dataUri.split(',');
        if (!base64) throw new Error("Invalid data URI");
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
        
        const creationId = db.collection('users').doc().id; // Generate a unique ID
        const storagePath = `creations/${uid}/${creationId}.png`;
        const storageRef = storage.ref(storagePath);
        
        // Convert base64 to blob and upload
        const imageBlob = base64ToBlob(base64, mimeType);
        const uploadTask = await storageRef.put(imageBlob);
        const downloadURL = await uploadTask.ref.getDownloadURL();

        // Save metadata to Firestore
        const creationRef = db.collection(`users/${uid}/creations`).doc(creationId);
        await creationRef.set({
            imageUrl: downloadURL,
            storagePath: storagePath,
            feature: feature,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        console.log("Creation saved successfully:", creationId);

    } catch (error) {
        console.error("Error saving creation:", error);
        // We don't throw here to avoid interrupting the user's flow if saving fails.
        // In a real app, you might want a more robust error handling/retry mechanism.
    }
};

/**
 * Fetches all of a user's creations from Firestore.
 * @param uid The user's unique ID.
 * @returns A promise that resolves to an array of Creation objects.
 */
export const getCreations = async (uid: string): Promise<any[]> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const creationsRef = db.collection(`users/${uid}/creations`);
    const q = creationsRef.orderBy("createdAt", "desc");
    const querySnapshot = await q.get();
    const creations: any[] = [];
    querySnapshot.forEach((doc) => {
        creations.push({ id: doc.id, ...doc.data() });
    });
    return creations;
};

/**
 * Deletes a creation from both Firestore and Storage.
 * @param uid The user's unique ID.
 * @param creation The Creation object to delete.
 */
export const deleteCreation = async (uid: string, creation: { id: string; storagePath: string }): Promise<void> => {
    if (!db || !storage) throw new Error("Firebase is not initialized.");

    // Delete from Storage
    const storageRef = storage.ref(creation.storagePath);
    await storageRef.delete();
    
    // Delete from Firestore
    const creationRef = db.doc(`users/${uid}/creations/${creation.id}`);
    await creationRef.delete();
};

// --- ADMIN FUNCTIONS ---

export const getAppConfig = async (): Promise<AppConfig> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const configRef = db.collection("config").doc("main");
    const docSnap = await configRef.get();
  
    if (docSnap.exists) {
      return docSnap.data() as AppConfig;
    } else {
      console.warn("App configuration not found in Firestore. Creating a default one.");
      const defaultConfig: AppConfig = {
        featureCosts: {
          'Magic Photo Studio': 2,
          'Model Shot': 3, // Added default cost for Model Shot
          'Thumbnail Studio': 2,
          'Product Studio': 5,
          'Brand Stylist AI': 4,
          'Magic Soul': 3,
          'Magic Photo Colour': 2,
          'CaptionAI': 1,
          'Magic Interior': 2,
          'Magic Apparel': 3,
          'Magic Mockup': 2,
          'Magic Eraser': 1,
        },
        featureToggles: {
          'studio': true,
          'thumbnail_studio': true,
          'product_studio': true,
          'brand_stylist': true,
          'soul': true,
          'colour': true,
          'caption': true,
          'interior': true,
          'apparel': true,
          'scanner': false,
          'mockup': true,
          'notes': false,
        },
        creditPacks: [
            { name: 'Starter Pack', price: 99, credits: 50, totalCredits: 50, bonus: 0, tagline: 'For quick tests & personal use', popular: false, value: 1.98 },
            { name: 'Creator Pack', price: 249, credits: 150, totalCredits: 165, bonus: 15, tagline: 'For creators & influencers — extra credits included!', popular: true, value: 1.51 },
            { name: 'Studio Pack', price: 699, credits: 500, totalCredits: 575, bonus: 75, tagline: 'For professional video and design teams', popular: false, value: 1.21 },
            { name: 'Agency Pack', price: 1199, credits: 1000, totalCredits: 1200, bonus: 200, tagline: 'For studios and agencies — biggest savings!', popular: false, value: 0.99 },
        ],
      };
      await configRef.set(defaultConfig);
      return defaultConfig;
    }
};

export const updateAppConfig = async (newConfig: Partial<AppConfig>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const configRef = db.collection("config").doc("main");
    await configRef.set(newConfig, { merge: true });
};

export const getRecentSignups = async (limit: number = 5): Promise<User[]> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const usersRef = db.collection('users').orderBy('signUpDate', 'desc').limit(limit);
    const snapshot = await usersRef.get();
    return snapshot.docs.map(doc => doc.data() as User);
};

export const getRecentPurchases = async (limit: number = 5): Promise<Purchase[]> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const purchasesRef = db.collection('purchases').orderBy('purchaseDate', 'desc').limit(limit);
    const snapshot = await purchasesRef.get();
    return snapshot.docs.map(doc => doc.data() as Purchase);
};

export const getTotalRevenue = async (): Promise<number> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const purchasesRef = db.collection('purchases');
    const snapshot = await purchasesRef.get();
    let total = 0;
    snapshot.forEach(doc => {
        total += doc.data().amountPaid || 0;
    });
    return total;
};

/**
 * [ADMIN] Fetches all user profiles from Firestore.
 * NOTE: In a production environment, this should be a secured Cloud Function.
 * The frontend rule should only allow admins to call this.
 */
export const getAllUsers = async (): Promise<any[]> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const usersRef = db.collection("users");
    const snapshot = await usersRef.orderBy("signUpDate", "desc").get();
    const users: any[] = [];
    snapshot.forEach(doc => {
        users.push({ ...doc.data(), uid: doc.id });
    });
    return users;
};

/**
 * [ADMIN] Adds credits to a user's account and logs the transaction.
 * @param adminUid The UID of the admin performing the action.
 * @param targetUid The UID of the user receiving credits.
 * @param amount The number of credits to add.
 * @param reason A mandatory reason for the credit addition.
 * @returns The updated user profile.
 */
export const addCreditsToUser = async (adminUid: string, targetUid: string, amount: number, reason: string) => {
    if (!db) throw new Error("Firestore is not initialized.");
    if (amount <= 0) throw new Error("Credit amount must be positive.");
    if (!reason.trim()) throw new Error("A reason is required to add credits.");

    const userRef = db.collection("users").doc(targetUid);
    const newTransactionRef = db.collection(`users/${targetUid}/transactions`).doc();

    await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
            throw new Error("Target user profile does not exist.");
        }

        transaction.update(userRef, {
            credits: firebase.firestore.FieldValue.increment(amount),
            totalCreditsAcquired: firebase.firestore.FieldValue.increment(amount),
        });

        transaction.set(newTransactionRef, {
            feature: "Admin Credit Grant",
            creditChange: `+${amount}`,
            reason: reason,
            grantedBy: adminUid,
            date: firebase.firestore.FieldValue.serverTimestamp(),
        });
    });

    const updatedDoc = await userRef.get();
    if (!updatedDoc.exists) {
        throw new Error("Failed to retrieve updated user profile after adding credits.");
    }
    return updatedDoc.data();
};



export { app, auth };