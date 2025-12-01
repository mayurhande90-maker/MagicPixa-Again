
// FIX: The build process was failing because it could not resolve scoped Firebase packages like '@firebase/auth'.
// Changed imports to the standard Firebase v9+ modular format (e.g., 'firebase/auth') which Vite can resolve from the installed 'firebase' package.
// FIX: Switched to using the compat library for app initialization to resolve module errors. This is a robust way to handle potential version conflicts or build tool issues without a full rewrite.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
// FIX: Import AppConfig for use in getAppConfig function.
import { AppConfig, Purchase, User, BrandKit, AuditLog, Announcement, ApiErrorLog } from './types';
import { resizeImage } from './utils/imageUtils';

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

export let app;
// FIX: Correctly typed `auth` using the compat library's namespace.
export let auth: firebase.auth.Auth | null = null;
// DEFINITIVE FIX: Switched the Firestore instance to use the 'compat' API to match the app initialization and eliminate library conflicts.
export let db: firebase.firestore.Firestore | null = null;
export let storage: firebase.storage.Storage | null = null;

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

// ... (existing code for signInWithGoogle, getOrCreateUserProfile, etc.)

export const signInWithGoogle = async () => {
    if (!auth) throw new Error("Firebase Auth is not initialized.");
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        const result = await auth.signInWithPopup(provider);
        return result;
    } catch (error) {
        console.error("Error during Google Sign-In with Popup:", error);
        throw error;
    }
};

export const getUser = async (uid: string): Promise<User | null> => {
    if (!db) return null;
    const doc = await db.collection('users').doc(uid).get();
    return doc.exists ? ({ uid: doc.id, ...doc.data() } as User) : null;
};

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

        // REPAIR LOGIC: If existing user has no credits field (legacy bug), give them the welcome bonus now.
        if (userData.credits === undefined) {
            console.warn("Repairing user profile: Missing credits field. Assigning welcome bonus.");
            updatePayload.credits = 10; 
            updatePayload.totalCreditsAcquired = 10;
            needsUpdate = true;
        }

        // REPAIR LOGIC: Backfill totalCreditsAcquired for legacy users to fix Admin Panel Burn Stats
        // If missing, we assume it equals current credits (resetting historical burn to 0 for tracking moving forward)
        if (userData.totalCreditsAcquired === undefined) {
             updatePayload.totalCreditsAcquired = userData.credits || 0;
             needsUpdate = true;
        }

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
        // Backward compatibility for Referral Code
        if (!userData.referralCode) {
            // Helper needed here or just inline logic
            const prefix = (userData.name || 'USER').replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 4).padEnd(3, 'X');
            const suffix = Math.floor(1000 + Math.random() * 9000);
            updatePayload.referralCode = `${prefix}${suffix}`;
            updatePayload.referralCount = 0;
            needsUpdate = true;
        }

        // --- NAME SYNCHRONIZATION (Fix for Admin Panel) ---
        // If the database has a blank/generic name, but Google Auth provides a real name, update it.
        if ((!userData.name || userData.name === 'New User' || userData.name.trim() === '') && name && name !== 'New User') {
            updatePayload.name = name;
            needsUpdate = true;
        }

        // Same for Email
        if ((!userData.email || userData.email === 'No Email') && email) {
            updatePayload.email = email;
            needsUpdate = true;
        }
        
        // --- STORAGE TIER SELF-HEALING (6-MONTH RULE) ---
        const now = new Date();
        const sixMonthsMs = 1000 * 60 * 60 * 24 * 30 * 6; // Approx 6 months
        
        if (userData.lastTierPurchaseDate) {
            const purchaseDate = userData.lastTierPurchaseDate.toDate();
            const timeDiff = now.getTime() - purchaseDate.getTime();
            
            if (timeDiff > sixMonthsMs) {
                // EXPIRED
                if (userData.storageTier !== 'limited') {
                    updatePayload.storageTier = 'limited';
                    needsUpdate = true;
                }
            } else {
                // VALID
                if (userData.storageTier !== 'unlimited') {
                    updatePayload.storageTier = 'unlimited';
                    needsUpdate = true;
                }
            }
        } else {
            // Legacy handling for users who bought Studio before we tracked dates
            const currentPlan = (userData.plan || '').toLowerCase();
            const impliesUnlimited = currentPlan.includes('studio') || currentPlan.includes('agency');
            
            if (impliesUnlimited && userData.storageTier !== 'unlimited') {
                updatePayload.storageTier = 'unlimited';
                needsUpdate = true;
            } else if (!impliesUnlimited && !userData.storageTier) {
                updatePayload.storageTier = 'limited';
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
             userRef.set(updatePayload, { merge: true }).catch(e => console.error("Failed to patch legacy user", e));
             return { ...userData, ...updatePayload };
        }
    }

    return userData;
  } else {
    // Profile does not exist, create it.
    
    // Generate Referral Code for new user
    const prefix = (name || 'USER').replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 4).padEnd(3, 'X');
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const myReferralCode = `${prefix}${suffix}`;
    
    // Initial Credits
    const initialCredits = 10; // Standard start

    const newUserProfile = {
      uid,
      name: name || 'New User',
      email: email || 'No Email',
      credits: initialCredits,
      totalCreditsAcquired: initialCredits,
      plan: 'Free',
      storageTier: 'limited', // Default to 30-day retention
      signUpDate: firebase.firestore.FieldValue.serverTimestamp(),
      totalSpent: 0,
      lifetimeGenerations: 0,
      lastAttendanceClaim: null,
      referralCode: myReferralCode,
      referralCount: 0,
      referredBy: null,
      basePlan: null,
      lastTierPurchaseDate: null,
      isBanned: false,
      dailyMission: {
          completedAt: new Date(0).toISOString(),
          nextUnlock: new Date(0).toISOString(),
          lastMissionId: null
      }
    };
    
    await userRef.set(newUserProfile);
    
    // Log the signup transaction for the new user
    if (initialCredits > 0) {
         const initialTxRef = userRef.collection('transactions').doc();
         await initialTxRef.set({
             feature: "Signup",
             creditChange: `+${initialCredits}`,
             reason: "Welcome Bonus",
             cost: 0,
             date: firebase.firestore.FieldValue.serverTimestamp()
         });
    }

    return { ...newUserProfile, credits: initialCredits, totalCreditsAcquired: initialCredits };
  }
};

export const claimReferralCode = async (uid: string, code: string) => {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const normalizedCode = code.trim().toUpperCase();
    
    try {
        const referrerQuery = await db.collection('users').where('referralCode', '==', normalizedCode).limit(1).get();
        
        if (referrerQuery.empty) {
            throw new Error("Invalid referral code.");
        }
        
        const referrerDoc = referrerQuery.docs[0];
        const referrerId = referrerDoc.id;
        
        if (referrerId === uid) {
            throw new Error("You cannot use your own referral code.");
        }
        
        const userRef = db.collection('users').doc(uid);
        const referrerRef = db.collection('users').doc(referrerId);
        
        await db.runTransaction(async (t) => {
            const userDoc = await t.get(userRef);
            const referrerDocTx = await t.get(referrerRef);

            if (!userDoc.exists) throw new Error("User profile not found.");
            
            const userData = userDoc.data();
            if (userData?.referredBy) {
                throw new Error("You have already claimed a referral bonus.");
            }

            if (userData?.signUpDate) {
                const signUpTime = userData.signUpDate.toMillis ? userData.signUpDate.toMillis() : (userData.signUpDate.seconds * 1000);
                const hoursSinceSignUp = (Date.now() - signUpTime) / (1000 * 60 * 60);
                if (hoursSinceSignUp > 48) {
                    throw new Error("Referral codes can only be claimed within 48 hours of sign-up.");
                }
            }

            if ((userData?.lifetimeGenerations || 0) < 1) {
                throw new Error("To prevent spam, please use at least one AI feature (generate 1 image) before claiming a referral code.");
            }
            
            t.update(userRef, {
                credits: firebase.firestore.FieldValue.increment(10),
                referredBy: referrerId,
                totalCreditsAcquired: firebase.firestore.FieldValue.increment(10)
            });
            
            const userTxRef = userRef.collection('transactions').doc();
            t.set(userTxRef, {
                feature: "Referral Bonus (Referee)",
                creditChange: "+10",
                reason: `Used code ${normalizedCode}`,
                date: firebase.firestore.FieldValue.serverTimestamp(),
                cost: 0
            });
            
            if (referrerDocTx.exists) {
                const referrerData = referrerDocTx.data();
                const currentReferrals = referrerData?.referralCount || 0;

                if (currentReferrals < 50) {
                    t.update(referrerRef, {
                        credits: firebase.firestore.FieldValue.increment(10),
                        referralCount: firebase.firestore.FieldValue.increment(1),
                        totalCreditsAcquired: firebase.firestore.FieldValue.increment(10)
                    });
                    
                    const referrerTxRef = referrerRef.collection('transactions').doc();
                    t.set(referrerTxRef, {
                        feature: "Referral Bonus (Referrer)",
                        creditChange: "+10",
                        reason: `User ${userData?.name || 'Unknown'} used your code`,
                        date: firebase.firestore.FieldValue.serverTimestamp(),
                        cost: 0
                    });
                }
            }
        });
        
        const finalDoc = await userRef.get();
        return finalDoc.data();
    } catch (error: any) {
        if (error.code === 'permission-denied' || error.message.includes('Missing or insufficient permissions')) {
            console.error("Referral permission error.", error);
            throw new Error("System Permission Error: The admin must update the 'Firestore Security Rules' in the Admin Panel.");
        }
        throw error;
    }
};

export const updateUserProfile = async (uid: string, data: { [key: string]: any }): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const userRef = db.collection("users").doc(uid);
    await userRef.set(data, { merge: true });
};

// ... (deductCredits, claimDailyAttendance, purchaseTopUp, completeDailyMission, getCreditHistory, saveCreation, getCreations, deleteCreation unchanged)

// Re-include essential functions for compilation without showing full repeated code
export const deductCredits = async (uid: string, amount: number, feature: string) => {
  if (!db) throw new Error("Firestore is not initialized.");
  const userRef = db.collection("users").doc(uid);
  const newTransactionRef = db.collection(`users/${uid}/transactions`).doc();
  const bonusTransactionRef = db.collection(`users/${uid}/transactions`).doc();

  try {
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error("User profile does not exist.");
      const userProfile = userDoc.data();
      if (!userProfile) throw new Error("User profile data is missing.");
      const currentCredits = userProfile.credits || 0;
      if (currentCredits < amount) throw new Error("Insufficient credits.");

      const currentGens = userProfile.lifetimeGenerations || 0;
      const newGens = currentGens + 1;
      let isMilestone = false;
      let bonusCredits = 0;

      if (newGens === 10) { isMilestone = true; bonusCredits = 5; } 
      else if (newGens === 25) { isMilestone = true; bonusCredits = 10; } 
      else if (newGens === 50) { isMilestone = true; bonusCredits = 15; } 
      else if (newGens === 75) { isMilestone = true; bonusCredits = 20; } 
      else if (newGens === 100) { isMilestone = true; bonusCredits = 30; } 
      else if (newGens > 100 && newGens % 100 === 0) { isMilestone = true; bonusCredits = 30; }
      
      const netChange = isMilestone ? (-amount + bonusCredits) : -amount;

      transaction.update(userRef, {
        credits: firebase.firestore.FieldValue.increment(netChange),
        lifetimeGenerations: newGens
      });

      transaction.set(newTransactionRef, {
        feature,
        cost: amount,
        date: firebase.firestore.FieldValue.serverTimestamp(),
      });

      if (isMilestone) {
          transaction.set(bonusTransactionRef, {
            feature: "Loyalty Bonus",
            creditChange: `+${bonusCredits}`,
            reason: `${newGens}th Generation Milestone`,
            cost: 0,
            date: firebase.firestore.FieldValue.serverTimestamp(),
          });
          // FIX: Increment totalCreditsAcquired for the bonus so burn calc remains accurate
          transaction.update(userRef, {
              totalCreditsAcquired: firebase.firestore.FieldValue.increment(bonusCredits)
          });
      }
    });
    const updatedDoc = await userRef.get();
    return updatedDoc.data();
  } catch (error: any) {
    console.error("Credit deduction transaction failed:", error);
    if (error.message?.includes("Insufficient credits")) {
      throw new Error("You don't have enough credits for this action.");
    }
    throw new Error("An error occurred while processing your request. Please try again.");
  }
};

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
            
            if (lastClaim) {
                const lastDate = lastClaim.toDate();
                const diffMs = now.getTime() - lastDate.getTime();
                const diffHours = diffMs / (1000 * 60 * 60);
                if (diffHours < 24) throw new Error("Already claimed today.");
            }
            transaction.update(userRef, {
                credits: firebase.firestore.FieldValue.increment(1),
                totalCreditsAcquired: firebase.firestore.FieldValue.increment(1),
                lastAttendanceClaim: firebase.firestore.FieldValue.serverTimestamp()
            });
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
        throw error;
    }
};

export const purchaseTopUp = async (uid: string, packName: string, creditsToAdd: number, amountPaid: number) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const userRef = db.collection("users").doc(uid);
    const newTransactionRef = db.collection(`users/${uid}/transactions`).doc();
    const purchaseRef = db.collection('purchases').doc();
    
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error("User does not exist.");
      const userData = userDoc.data();
      const lowerPackName = packName.toLowerCase();
      const isHighTier = lowerPackName.includes("studio") || lowerPackName.includes("agency");
      
      const updates: any = {
        credits: firebase.firestore.FieldValue.increment(creditsToAdd),
        totalCreditsAcquired: firebase.firestore.FieldValue.increment(creditsToAdd),
        totalSpent: firebase.firestore.FieldValue.increment(amountPaid),
      };

      if (isHighTier) {
          updates.storageTier = 'unlimited';
          updates.lastTierPurchaseDate = firebase.firestore.FieldValue.serverTimestamp();
          updates.basePlan = packName;
          updates.plan = packName;
      } else {
          const now = new Date();
          const sixMonthsMs = 1000 * 60 * 60 * 24 * 30 * 6;
          let hasValidHighTier = false;
          if (userData?.lastTierPurchaseDate) {
              const lastDate = userData.lastTierPurchaseDate.toDate();
              if ((now.getTime() - lastDate.getTime()) < sixMonthsMs) {
                  hasValidHighTier = true;
              }
          }
          if (hasValidHighTier) {
              const baseName = userData?.basePlan || 'Studio Pack';
              updates.plan = `${baseName} | Top-up`;
          } else {
              updates.storageTier = 'limited';
              updates.basePlan = null;
              updates.plan = packName;
          }
      }
      transaction.update(userRef, updates);
      transaction.set(newTransactionRef, {
        feature: `Purchased: ${packName}`,
        cost: amountPaid,
        creditChange: `+${creditsToAdd}`,
        date: firebase.firestore.FieldValue.serverTimestamp(),
      });
      transaction.set(purchaseRef, {
        userId: uid,
        userName: userData?.name || 'Unknown',
        userEmail: userData?.email || 'No Email',
        amountPaid: amountPaid,
        creditsAdded: creditsToAdd,
        packName: packName,
        purchaseDate: firebase.firestore.FieldValue.serverTimestamp(),
      });
    });
    const updatedDoc = await userRef.get();
    return updatedDoc.data();
};

export const completeDailyMission = async (uid: string, reward: number, missionId: string) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const userRef = db.collection("users").doc(uid);
    const newTransactionRef = db.collection(`users/${uid}/transactions`).doc();
    await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) throw new Error("User does not exist.");
        const userData = userDoc.data() as User;
        const now = new Date();
        const currentNextUnlockStr = userData.dailyMission?.nextUnlock;
        if (currentNextUnlockStr) {
            const nextUnlockDate = new Date(currentNextUnlockStr);
            if (nextUnlockDate > now) throw new Error("Mission locked");
        }
        const nextUnlockTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
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
    const updatedDoc = await userRef.get();
    return updatedDoc.data() as User;
};

export const getCreditHistory = async (uid: string): Promise<any[]> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const transactionsRef = db.collection("users").doc(uid).collection("transactions");
    const q = transactionsRef.orderBy("date", "desc").limit(50);
    try {
        const querySnapshot = await q.get();
        const history: any[] = [];
        querySnapshot.forEach((doc) => {
            history.push({ id: doc.id, ...doc.data() });
        });
        return history;
    } catch (error) {
        console.error("Error fetching credit history:", error);
        return [];
    }
};

const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
};

export const saveCreation = async (uid: string, dataUri: string, feature: string): Promise<void> => {
    if (!db || !storage) throw new Error("Firebase is not initialized.");
    try {
        const [header, base64] = dataUri.split(',');
        if (!base64) throw new Error("Invalid data URI");
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
        const creationId = db.collection('users').doc().id;
        const storagePath = `creations/${uid}/${creationId}.png`;
        const thumbStoragePath = `creations/${uid}/${creationId}_thumb.jpg`;
        const mediumStoragePath = `creations/${uid}/${creationId}_medium.jpg`;
        const storageRef = storage.ref(storagePath);
        const thumbStorageRef = storage.ref(thumbStoragePath);
        const mediumStorageRef = storage.ref(mediumStoragePath);
        
        const imageBlob = base64ToBlob(base64, mimeType);
        const uploadTask = await storageRef.put(imageBlob);
        const downloadURL = await uploadTask.ref.getDownloadURL();

        let thumbDownloadURL = null;
        try {
            const thumbDataUri = await resizeImage(dataUri, 300, 0.7);
            const [thumbHeader, thumbBase64] = thumbDataUri.split(',');
            const thumbBlob = base64ToBlob(thumbBase64, 'image/jpeg');
            const thumbUploadTask = await thumbStorageRef.put(thumbBlob);
            thumbDownloadURL = await thumbUploadTask.ref.getDownloadURL();
        } catch (thumbError) {
            console.warn("Failed to generate thumbnail.", thumbError);
        }

        let mediumDownloadURL = null;
        try {
            const mediumDataUri = await resizeImage(dataUri, 800, 0.8);
            const [mediumHeader, mediumBase64] = mediumDataUri.split(',');
            const mediumBlob = base64ToBlob(mediumBase64, 'image/jpeg');
            const mediumUploadTask = await mediumStorageRef.put(mediumBlob);
            mediumDownloadURL = await mediumUploadTask.ref.getDownloadURL();
        } catch (mediumError) {
            console.warn("Failed to generate medium preview.", mediumError);
        }

        const creationRef = db.collection(`users/${uid}/creations`).doc(creationId);
        await creationRef.set({
            imageUrl: downloadURL,
            thumbnailUrl: thumbDownloadURL || downloadURL,
            mediumUrl: mediumDownloadURL || downloadURL,
            storagePath: storagePath,
            feature: feature,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
        console.error("Error saving creation:", error);
    }
};

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

export const deleteCreation = async (uid: string, creation: { id: string; storagePath: string }): Promise<void> => {
    if (!db || !storage) throw new Error("Firebase is not initialized.");
    const storageRef = storage.ref(creation.storagePath);
    await storageRef.delete().catch(e => console.warn("Could not delete original image", e));
    const thumbPath = creation.storagePath.replace('.png', '_thumb.jpg');
    const thumbRef = storage.ref(thumbPath);
    await thumbRef.delete().catch(e => console.warn("Could not delete thumbnail", e));
    const mediumPath = creation.storagePath.replace('.png', '_medium.jpg');
    const mediumRef = storage.ref(mediumPath);
    await mediumRef.delete().catch(e => console.warn("Could not delete medium preview", e));
    const creationRef = db.doc(`users/${uid}/creations/${creation.id}`);
    await creationRef.delete();
};

export const getAppConfig = async (): Promise<AppConfig> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const configRef = db.collection("config").doc("main");
    const docSnap = await configRef.get();
    const defaultConfig: AppConfig = {
        featureCosts: {
          'Magic Photo Studio': 2, 
          'Model Shot': 3, 
          'Thumbnail Studio': 5, 
          'Magic Soul': 3, 
          'Magic Photo Colour': 2, 
          'CaptionAI': 1, 
          'Magic Interior': 2, 
          'Magic Apparel': 3,
          'Magic Mockup': 2, 
          'Magic Eraser': 1, 
          'Magic Realty': 4, 
          'Merchant Studio': 15,
          'Magic Ads': 4, 
        },
        featureToggles: {
          'studio': true, 'thumbnail_studio': true, 'brand_kit': true, 'brand_stylist': true,
          'soul': true, 'colour': true, 'caption': true, 'interior': true, 'apparel': true,
          'scanner': false, 'mockup': true, 'notes': false, 'magic_realty': true,
        },
        creditPacks: [
            { name: 'Starter Pack', price: 99, credits: 50, totalCredits: 50, bonus: 0, tagline: 'For quick tests & personal use', popular: false, value: 1.98 },
            { name: 'Creator Pack', price: 249, credits: 150, totalCredits: 165, bonus: 15, tagline: 'For creators & influencers — extra credits included!', popular: true, value: 1.51 },
            { name: 'Studio Pack', price: 699, credits: 500, totalCredits: 575, bonus: 75, tagline: 'For professional video and design teams', popular: false, value: 1.21 },
            { name: 'Agency Pack', price: 1199, credits: 1000, totalCredits: 1200, bonus: 200, tagline: 'For studios and agencies — biggest savings!', popular: false, value: 0.99 },
        ],
    };
    if (docSnap.exists) {
      const dbConfig = docSnap.data() as AppConfig;
      // Remove obsolete features from config immediately
      if (dbConfig.featureCosts) {
          delete dbConfig.featureCosts['Magic Scanner'];
          delete dbConfig.featureCosts['Magic Notes'];
          delete dbConfig.featureCosts['BrandKit AI']; // Replaced by Merchant Studio / Magic Ads
      }
      return {
          ...defaultConfig,
          ...dbConfig,
          featureCosts: { ...defaultConfig.featureCosts, ...(dbConfig.featureCosts || {}) },
          featureToggles: { ...defaultConfig.featureToggles, ...(dbConfig.featureToggles || {}) },
          creditPacks: dbConfig.creditPacks || defaultConfig.creditPacks
      };
    } else {
      await configRef.set(defaultConfig);
      return defaultConfig;
    }
};

export const updateAppConfig = async (newConfig: Partial<AppConfig>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const configRef = db.collection("config").doc("main");
    await configRef.set(newConfig, { merge: true });
};

export const subscribeToAppConfig = (callback: (config: AppConfig | null) => void) => {
    if (!db) { callback(null); return () => {}; }
    return db.collection("config").doc("main").onSnapshot((doc) => {
        if (doc.exists) {
            const dbConfig = doc.data() as AppConfig;
            // Use same defaults as getAppConfig (re-defined here for simplicity or scoped variable)
            const defaultConfig: AppConfig = {
                featureCosts: {
                  'Magic Photo Studio': 2, 
                  'Model Shot': 3, 
                  'Thumbnail Studio': 5, 
                  'Magic Soul': 3, 
                  'Magic Photo Colour': 2, 
                  'CaptionAI': 1, 
                  'Magic Interior': 2, 
                  'Magic Apparel': 3,
                  'Magic Mockup': 2, 
                  'Magic Eraser': 1, 
                  'Magic Realty': 4, 
                  'Merchant Studio': 15,
                  'Magic Ads': 4, 
                },
                featureToggles: {
                  'studio': true, 'thumbnail_studio': true, 'brand_kit': true, 'brand_stylist': true,
                  'soul': true, 'colour': true, 'caption': true, 'interior': true, 'apparel': true,
                  'scanner': false, 'mockup': true, 'notes': false, 'magic_realty': true,
                },
                creditPacks: [
                    { name: 'Starter Pack', price: 99, credits: 50, totalCredits: 50, bonus: 0, tagline: 'For quick tests & personal use', popular: false, value: 1.98 },
                    { name: 'Creator Pack', price: 249, credits: 150, totalCredits: 165, bonus: 15, tagline: 'For creators & influencers — extra credits included!', popular: true, value: 1.51 },
                    { name: 'Studio Pack', price: 699, credits: 500, totalCredits: 575, bonus: 75, tagline: 'For professional video and design teams', popular: false, value: 1.21 },
                    { name: 'Agency Pack', price: 1199, credits: 1000, totalCredits: 1200, bonus: 200, tagline: 'For studios and agencies — biggest savings!', popular: false, value: 0.99 },
                ],
            };
            
            // Clean up obsolete keys
            if (dbConfig.featureCosts) {
                delete dbConfig.featureCosts['Magic Scanner'];
                delete dbConfig.featureCosts['Magic Notes'];
                delete dbConfig.featureCosts['BrandKit AI'];
            }

            const mergedConfig = {
                ...defaultConfig,
                ...dbConfig,
                featureCosts: { ...defaultConfig.featureCosts, ...(dbConfig.featureCosts || {}) },
                featureToggles: { ...defaultConfig.featureToggles, ...(dbConfig.featureToggles || {}) },
                creditPacks: dbConfig.creditPacks || defaultConfig.creditPacks
            };
            callback(mergedConfig);
        } else {
            // Document doesn't exist, create it? Or just return defaults.
            // Returning defaults seems safer for a listener.
            const defaultConfig: AppConfig = {
                featureCosts: {
                  'Magic Photo Studio': 2, 
                  'Model Shot': 3, 
                  'Thumbnail Studio': 5, 
                  'Magic Soul': 3, 
                  'Magic Photo Colour': 2, 
                  'CaptionAI': 1, 
                  'Magic Interior': 2, 
                  'Magic Apparel': 3,
                  'Magic Mockup': 2, 
                  'Magic Eraser': 1, 
                  'Magic Realty': 4, 
                  'Merchant Studio': 15,
                  'Magic Ads': 4, 
                },
                featureToggles: {
                  'studio': true, 'thumbnail_studio': true, 'brand_kit': true, 'brand_stylist': true,
                  'soul': true, 'colour': true, 'caption': true, 'interior': true, 'apparel': true,
                  'scanner': false, 'mockup': true, 'notes': false, 'magic_realty': true,
                },
                creditPacks: [
                    { name: 'Starter Pack', price: 99, credits: 50, totalCredits: 50, bonus: 0, tagline: 'For quick tests & personal use', popular: false, value: 1.98 },
                    { name: 'Creator Pack', price: 249, credits: 150, totalCredits: 165, bonus: 15, tagline: 'For creators & influencers — extra credits included!', popular: true, value: 1.51 },
                    { name: 'Studio Pack', price: 699, credits: 500, totalCredits: 575, bonus: 75, tagline: 'For professional video and design teams', popular: false, value: 1.21 },
                    { name: 'Agency Pack', price: 1199, credits: 1000, totalCredits: 1200, bonus: 200, tagline: 'For studios and agencies — biggest savings!', popular: false, value: 0.99 },
                ],
            };
            callback(defaultConfig);
        }
    });
};

export const getRecentSignups = async (limit: number = 20): Promise<User[]> => {
    if (!db) throw new Error("Firestore is not initialized.");
    try {
        const usersRef = db.collection('users').orderBy('signUpDate', 'desc').limit(limit);
        const snapshot = await usersRef.get();
        return snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id }) as User);
    } catch (error) {
        console.error("Error fetching recent signups:", error);
        return [];
    }
};

export const getRecentPurchases = async (limit: number = 5): Promise<Purchase[]> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const purchasesRef = db.collection('purchases').orderBy('purchaseDate', 'desc').limit(limit);
    const snapshot = await purchasesRef.get();
    return snapshot.docs.map(doc => doc.data() as Purchase);
};

export const getTotalRevenue = async (startDate?: Date, endDate?: Date): Promise<number> => {
    if (!db) throw new Error("Firestore is not initialized.");
    let query: firebase.firestore.Query = db.collection('purchases');

    if (startDate) {
        query = query.where('purchaseDate', '>=', startDate);
    }
    if (endDate) {
        query = query.where('purchaseDate', '<=', endDate);
    }

    const snapshot = await query.get();
    let total = 0;
    snapshot.forEach(doc => {
        total += doc.data().amountPaid || 0;
    });
    return total;
};

// Aggregates revenue data by date for charts
export const getRevenueStats = async (days: number = 7): Promise<{ date: string; amount: number }[]> => {
    if (!db) return [];
    
    // Create an array of last 7 days keys
    const dates: string[] = [];
    const stats: Record<string, number> = {};
    const endDate = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(endDate);
        d.setDate(d.getDate() - i);
        // Format: "Jan 15"
        const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dates.push(key);
        stats[key] = 0;
    }

    // Calculate start date for query
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
        const purchasesRef = db.collection('purchases')
            .where('purchaseDate', '>=', startDate)
            .orderBy('purchaseDate', 'asc');
        
        const snapshot = await purchasesRef.get();

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.purchaseDate) {
                const date = data.purchaseDate.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                if (stats[date] !== undefined) {
                    stats[date] += (data.amountPaid || 0);
                }
            }
        });

        // Convert to array in correct order
        return dates.map(date => ({
            date,
            amount: stats[date]
        }));
    } catch (e) {
        console.error("Failed to fetch revenue stats:", e);
        return dates.map(date => ({ date, amount: 0 }));
    }
};

export const getAllUsers = async (): Promise<any[]> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const usersRef = db.collection("users");
    const snapshot = await usersRef.get();
    const users: any[] = [];
    snapshot.forEach(doc => {
        users.push({ ...doc.data(), uid: doc.id });
    });
    return users.sort((a, b) => {
        const dateA = a.signUpDate?.seconds || (a.signUpDate ? new Date(a.signUpDate).getTime() / 1000 : 0);
        const dateB = b.signUpDate?.seconds || (b.signUpDate ? new Date(b.signUpDate).getTime() / 1000 : 0);
        return dateB - dateA; // Default Newest First, Sortable in UI
    });
};

export const addCreditsToUser = async (adminUid: string, targetUid: string, amount: number, reason: string) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const userRef = db.collection("users").doc(targetUid);
    const newTransactionRef = db.collection(`users/${targetUid}/transactions`).doc();
    
    // Validate amount
    const safeAmount = Number(amount);
    if (isNaN(safeAmount)) throw new Error("Invalid credit amount");

    await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) throw new Error("Target user profile does not exist.");
        
        transaction.update(userRef, {
            credits: firebase.firestore.FieldValue.increment(safeAmount),
            totalCreditsAcquired: firebase.firestore.FieldValue.increment(safeAmount),
            // Set the notification on the user document
            creditGrantNotification: {
                amount: safeAmount,
                message: reason,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }
        });
        
        transaction.set(newTransactionRef, {
            feature: "MagicPixa Credit Grant",
            creditChange: `+${safeAmount}`,
            reason: reason,
            grantedBy: adminUid,
            date: firebase.firestore.FieldValue.serverTimestamp(),
            cost: 0 // Explicitly set cost to 0 as it's a grant
        });
    });
    
    // Log action outside transaction in try-catch to prevent failure if logs are locked
    try {
        const adminSnap = await db.collection('users').doc(adminUid).get();
        await logAdminAction(adminSnap.data()?.email || 'Admin', 'GRANT_CREDITS', `Added ${safeAmount} to ${targetUid}. Reason: ${reason}`);
    } catch (e) {
        console.warn("Audit logging failed (Permissions?):", e);
    }
    
    const updatedDoc = await userRef.get();
    return updatedDoc.data();
};

export const clearCreditGrantNotification = async (uid: string) => {
    if (!db) return;
    try {
        await db.collection('users').doc(uid).update({
            creditGrantNotification: firebase.firestore.FieldValue.delete()
        });
    } catch (error) {
        console.error("Failed to clear credit notification:", error);
    }
};

export const uploadBrandAsset = async (uid: string, base64: string, type: string): Promise<string> => {
    if (!storage) throw new Error("Storage is not initialized.");
    let data = base64;
    let mimeType = 'image/png';
    if (base64.includes(',')) {
        const parts = base64.split(',');
        data = parts[1];
        mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
    }
    const blob = base64ToBlob(data.trim(), mimeType);
    const path = `users/${uid}/brand_assets/${type}.png`;
    const ref = storage.ref(path);
    await ref.put(blob, { cacheControl: 'public, max-age=31536000', contentType: mimeType });
    return await ref.getDownloadURL();
};

export const saveUserBrandKit = async (uid: string, brandKit: BrandKit): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const userRef = db.collection("users").doc(uid);
    await userRef.update({ brandKit });
};

// --- NEW ADVANCED ADMIN FUNCTIONS ---

export const toggleUserBan = async (adminUid: string, targetUid: string, isBanned: boolean) => {
    if (!db) throw new Error("DB not init");
    await db.collection('users').doc(targetUid).update({ isBanned });
    
    try {
        const adminRef = db.collection('users').doc(adminUid);
        const adminSnap = await adminRef.get();
        await logAdminAction(adminSnap.data()?.email || 'Admin', isBanned ? 'BAN_USER' : 'UNBAN_USER', `Target: ${targetUid}`);
    } catch (e) { console.warn("Audit logging failed", e); }
};

export const updateUserPlan = async (adminUid: string, targetUid: string, newPlan: string) => {
    if (!db) throw new Error("DB not init");
    await db.collection('users').doc(targetUid).update({ plan: newPlan });
    
    try {
        const adminRef = db.collection('users').doc(adminUid);
        const adminSnap = await adminRef.get();
        await logAdminAction(adminSnap.data()?.email || 'Admin', 'UPDATE_PLAN', `Target: ${targetUid}, New Plan: ${newPlan}`);
    } catch (e) { console.warn("Audit logging failed", e); }
};

// Updated to accept 'style' and 'title'
export const sendSystemNotification = async (
    adminUid: string, 
    targetUid: string,
    title: string, // New Argument
    message: string, 
    type: 'info' | 'warning' | 'success',
    style: 'banner' | 'pill' | 'toast' | 'modal' = 'banner'
) => {
    if (!db) return;
    
    // Write directly to user profile for real-time listener pick-up
    await db.collection('users').doc(targetUid).set({
        systemNotification: {
            title, // Save Title
            message,
            type,
            style,
            read: false,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }
    }, { merge: true });

    try {
        const adminRef = db.collection('users').doc(adminUid);
        const adminSnap = await adminRef.get();
        await logAdminAction(adminSnap.data()?.email || 'Admin', 'SEND_NOTIFICATION', `To: ${targetUid}, Style: ${style}, Title: ${title}`);
    } catch (e) { console.warn("Audit logging failed", e); }
};

export const logAdminAction = async (adminEmail: string, action: string, details: string) => {
    if (!db) return;
    try {
        await db.collection('audit_logs').add({
            adminEmail,
            action,
            details,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.warn("Failed to write to audit_logs (Check permissions)", e);
    }
};

export const getAuditLogs = async (limit: number = 50): Promise<AuditLog[]> => {
    if (!db) return [];
    try {
        const snap = await db.collection('audit_logs').orderBy('timestamp', 'desc').limit(limit).get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
    } catch (error) {
        console.error("Error fetching audit logs", error);
        return [];
    }
};

// --- API ERROR MONITORING ---
export const logApiError = async (endpoint: string, errorMsg: string, userId?: string) => {
    if (!db) return;
    try {
        await db.collection('api_errors').add({
            endpoint,
            error: errorMsg,
            userId: userId || 'anonymous',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.error("Failed to log API error", e);
    }
};

export const getApiErrorLogs = async (limit: number = 50): Promise<ApiErrorLog[]> => {
    if (!db) return [];
    try {
        const snap = await db.collection('api_errors').orderBy('timestamp', 'desc').limit(limit).get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ApiErrorLog));
    } catch (e) {
        console.error("Failed to fetch API errors", e);
        return [];
    }
};

// --- GLOBAL STATS ---
export const get24HourCreditBurn = async (): Promise<number> => {
    if (!db) return 0;
    try {
        // Calculate 24 hours ago
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        // Use a Collection Group Query to search ALL subcollections named 'transactions'
        // Note: This requires a Firestore Composite Index on 'date' (Descending).
        const query = db.collectionGroup('transactions')
            .where('date', '>=', yesterday);
            
        const snap = await query.get();
        
        let totalBurn = 0;
        snap.forEach(doc => {
            const data = doc.data();
            // FILTER LOGIC:
            // 1. cost > 0: Must represent usage/spend.
            // 2. !creditChange.includes('+'): Exclude Grants/Purchases (which have +10, +50 etc).
            //    Note: Purchases have 'cost' as amountPaid (INR), but also have creditChange '+'.
            //    Deductions have 'cost' as credits, and NO creditChange field (or empty).
            
            const isPositiveChange = data.creditChange && data.creditChange.includes('+');
            const cost = Number(data.cost);
            
            if (!isNaN(cost) && cost > 0 && !isPositiveChange) {
                totalBurn += cost;
            }
        });
        return totalBurn;
    } catch (e: any) {
        if (e.code === 'failed-precondition') {
             console.error("CRITICAL: Missing Firestore Index for Credit Burn stats. Open console to see the link to create it.", e);
        } else {
             console.warn("24h Burn Calc Failed:", e);
        }
        return 0;
    }
};

export const getGlobalFeatureUsage = async (): Promise<{feature: string, count: number}[]> => {
    if (!db) return [];
    try {
        const snap = await db.collectionGroup('transactions')
            .orderBy('date', 'desc')
            .limit(500)
            .get();
            
        const counts: Record<string, number> = {};
        snap.forEach(doc => {
            const data = doc.data();
            const feature = data.feature;
            if (feature) {
                counts[feature] = (counts[feature] || 0) + 1;
            }
        });
        
        return Object.entries(counts).map(([feature, count]) => ({ feature, count })).sort((a, b) => b.count - a.count);
    } catch (e) {
        console.error("Failed to get feature usage", e);
        return [];
    }
};

export const getAnnouncement = async (): Promise<Announcement | null> => {
    if (!db) return null;
    try {
        const snap = await db.collection('config').doc('announcement').get();
        return snap.exists ? snap.data() as Announcement : null;
    } catch (error) {
        return null;
    }
};

export const updateAnnouncement = async (adminUid: string, announcement: Announcement) => {
    if (!db) return;
    try {
        // Create a clean object to avoid undefined value errors in Firestore
        const cleanAnn: any = {
            title: announcement.title || "", // Save Title
            message: announcement.message || "",
            isActive: !!announcement.isActive,
            type: announcement.type || 'info',
            style: announcement.style || 'banner',
            link: announcement.link || ""
        };

        await db.collection('config').doc('announcement').set(cleanAnn);
        
        try {
            const adminRef = db.collection('users').doc(adminUid);
            const adminSnap = await adminRef.get();
            await logAdminAction(adminSnap.data()?.email || 'Admin', 'UPDATE_ANNOUNCEMENT', `Active: ${cleanAnn.isActive}, Style: ${cleanAnn.style}, Title: ${cleanAnn.title}`);
        } catch (e) { console.warn("Audit logging failed", e); }

    } catch (error: any) {
        console.error("Update Announcement Error:", error);
        throw error;
    }
};

// Real-time Subscriptions (Essential for immediate UI updates)
export const subscribeToAnnouncement = (callback: (announcement: Announcement | null) => void) => {
    if (!db) { callback(null); return () => {}; }
    return db.collection('config').doc('announcement').onSnapshot(
        (doc) => callback(doc.exists ? doc.data() as Announcement : null),
        (error) => { console.error("Announcement subscription error", error); callback(null); }
    );
};

export const subscribeToUserProfile = (uid: string, callback: (user: User | null) => void) => {
    if (!db) { callback(null); return () => {}; }
    
    // Name Initials Helper inside closure
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    return db.collection('users').doc(uid).onSnapshot(
        (doc) => {
            if (doc.exists) {
                const data = doc.data();
                if (data) {
                    const userWithId = {
                        uid: doc.id,
                        ...data,
                        avatar: getInitials(data.name || 'User')
                    } as User;
                    callback(userWithId);
                }
            } else {
                callback(null);
            }
        },
        (error) => {
            console.error("Profile subscription error", error);
            // Don't nuke the user state on transient errors, just log
        }
    );
};
