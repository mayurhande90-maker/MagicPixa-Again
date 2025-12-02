import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import { AppConfig, Purchase, User, BrandKit, AuditLog, Announcement, ApiErrorLog, CreditPack } from './types';
import { resizeImage } from './utils/imageUtils';

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const derivedAuthDomain = projectId ? `${projectId}.firebaseapp.com` : import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;

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

export const getMissingConfigKeys = (): string[] => missingKeys;

export const isConfigValid = missingKeys.length === 0;

export let app;
export let auth: firebase.auth.Auth | null = null;
export let db: firebase.firestore.Firestore | null = null;
export let storage: firebase.storage.Storage | null = null;

if (isConfigValid) {
  try {
    app = firebase.apps.length === 0 ? firebase.initializeApp(firebaseConfig) : firebase.app();
    auth = firebase.auth();
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

// ... (getOrCreateUserProfile, updateUserProfile, claimReferralCode unchanged) ...
// (Re-exporting all functions correctly at end)

export const getOrCreateUserProfile = async (uid: string, name: string, email: string | null) => {
    if (!db) return null;
    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();
    if (!doc.exists) {
        const newUser: Partial<User> = {
            uid,
            name,
            email: email || '',
            credits: 10,
            totalCreditsAcquired: 10,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
            signUpDate: firebase.firestore.FieldValue.serverTimestamp() as any,
            lifetimeGenerations: 0,
            referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
            referralCount: 0
        };
        await userRef.set(newUser);
        return newUser;
    }
    return doc.data();
};

export const updateUserProfile = async (uid: string, data: Partial<User>) => {
    if (!db) return;
    await db.collection('users').doc(uid).update(data);
};

export const claimReferralCode = async (uid: string, code: string) => {
    if (!db) throw new Error("Database not initialized");
    const ownerQuery = await db.collection('users').where('referralCode', '==', code).limit(1).get();
    if (ownerQuery.empty) throw new Error("Invalid referral code.");
    const ownerDoc = ownerQuery.docs[0];
    if (ownerDoc.id === uid) throw new Error("You cannot use your own code.");

    const userRef = db.collection('users').doc(uid);
    const ownerRef = db.collection('users').doc(ownerDoc.id);

    await db.runTransaction(async (t) => {
        const userDoc = await t.get(userRef);
        if (userDoc.data()?.referredBy) throw new Error("You have already claimed a referral code.");

        t.update(userRef, {
            credits: firebase.firestore.FieldValue.increment(10),
            totalCreditsAcquired: firebase.firestore.FieldValue.increment(10),
            referredBy: code
        });
        t.update(ownerRef, {
            credits: firebase.firestore.FieldValue.increment(10),
            totalCreditsAcquired: firebase.firestore.FieldValue.increment(10),
            referralCount: firebase.firestore.FieldValue.increment(1)
        });
        
        const userTx = userRef.collection('transactions').doc();
        t.set(userTx, { feature: 'Referral Bonus', creditChange: '+10', date: firebase.firestore.FieldValue.serverTimestamp(), reason: `Used code ${code}` });
        const ownerTx = ownerRef.collection('transactions').doc();
        t.set(ownerTx, { feature: 'Referral Reward', creditChange: '+10', date: firebase.firestore.FieldValue.serverTimestamp(), reason: `Friend joined` });
    });
    return { credits: (await userRef.get()).data()?.credits };
};

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
        lifetimeGenerations: newGens,
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
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
    if (!db) throw new Error("Firestore not initialized");
    const userRef = db.collection('users').doc(uid);
    const txRef = userRef.collection('transactions').doc();

    await db.runTransaction(async (t) => {
        const doc = await t.get(userRef);
        const userData = doc.data();
        if (userData?.lastAttendanceClaim) {
            const last = userData.lastAttendanceClaim.toDate();
            const now = new Date();
            const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
            if (diffHours < 24) throw new Error("Daily claim not available yet.");
        }
        t.update(userRef, {
            credits: firebase.firestore.FieldValue.increment(1),
            totalCreditsAcquired: firebase.firestore.FieldValue.increment(1),
            lastAttendanceClaim: firebase.firestore.FieldValue.serverTimestamp()
        });
        t.set(txRef, { feature: 'Daily Check-in', creditChange: '+1', date: firebase.firestore.FieldValue.serverTimestamp(), cost: 0 });
    });
    return (await userRef.get()).data();
};

export const purchaseTopUp = async (uid: string, packName: string, amount: number, price: number) => {
    if (!db) throw new Error("Firestore not initialized");
    const userRef = db.collection('users').doc(uid);
    const txRef = userRef.collection('transactions').doc();
    const purchaseRef = db.collection('purchases').doc();

    await db.runTransaction(async (t) => {
        t.update(userRef, {
            credits: firebase.firestore.FieldValue.increment(amount),
            totalCreditsAcquired: firebase.firestore.FieldValue.increment(amount),
            totalSpent: firebase.firestore.FieldValue.increment(price),
            plan: `${packName} | Top-up`
        });
        t.set(txRef, { feature: `Purchase: ${packName}`, creditChange: `+${amount}`, date: firebase.firestore.FieldValue.serverTimestamp(), cost: 0, amountPaid: price });
        const userDoc = await t.get(userRef);
        const userData = userDoc.data();
        t.set(purchaseRef, {
            userId: uid,
            userName: userData?.name || 'Unknown',
            userEmail: userData?.email || 'Unknown',
            amountPaid: price,
            creditsAdded: amount,
            packName: packName,
            purchaseDate: firebase.firestore.FieldValue.serverTimestamp()
        });
    });
    return (await userRef.get()).data();
};

export const completeDailyMission = async (uid: string, reward: number, missionId: string) => {
    if (!db) throw new Error("Firestore not initialized");
    const userRef = db.collection('users').doc(uid);
    const txRef = userRef.collection('transactions').doc();
    const now = new Date();
    const nextUnlock = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await db.runTransaction(async (t) => {
        t.update(userRef, {
            credits: firebase.firestore.FieldValue.increment(reward),
            totalCreditsAcquired: firebase.firestore.FieldValue.increment(reward),
            dailyMission: { completedAt: now.toISOString(), nextUnlock: nextUnlock.toISOString(), lastMissionId: missionId }
        });
        t.set(txRef, { feature: 'Daily Mission Reward', creditChange: `+${reward}`, date: firebase.firestore.FieldValue.serverTimestamp(), cost: 0 });
    });
    return (await userRef.get()).data();
};

export const getCreditHistory = async (uid: string) => {
    if (!db) return [];
    const snapshot = await db.collection(`users/${uid}/transactions`).orderBy('date', 'desc').limit(50).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
        let mediumDownloadURL = null;
        
        // Thumbnail Gen
        try {
            const thumbDataUri = await resizeImage(dataUri, 300, 0.7);
            const thumbBlob = base64ToBlob(thumbDataUri.split(',')[1], 'image/jpeg');
            const thumbUploadTask = await thumbStorageRef.put(thumbBlob);
            thumbDownloadURL = await thumbUploadTask.ref.getDownloadURL();
        } catch (e) { console.warn("Thumb failed", e); }

        // Medium Gen
        try {
            const mediumDataUri = await resizeImage(dataUri, 800, 0.8);
            const mediumBlob = base64ToBlob(mediumDataUri.split(',')[1], 'image/jpeg');
            const mediumUploadTask = await mediumStorageRef.put(mediumBlob);
            mediumDownloadURL = await mediumUploadTask.ref.getDownloadURL();
        } catch (e) { console.warn("Medium failed", e); }

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

export const getCreations = async (uid: string) => {
    if (!db) return [];
    const snapshot = await db.collection(`users/${uid}/creations`).orderBy('createdAt', 'desc').limit(100).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const deleteCreation = async (uid: string, creation: any) => {
    if (!db || !storage) return;
    try {
        await db.doc(`users/${uid}/creations/${creation.id}`).delete();
        if (creation.storagePath) await storage.ref(creation.storagePath).delete().catch(() => {});
        const thumbPath = creation.storagePath?.replace('.png', '_thumb.jpg');
        const mediumPath = creation.storagePath?.replace('.png', '_medium.jpg');
        if (thumbPath) await storage.ref(thumbPath).delete().catch(() => {});
        if (mediumPath) await storage.ref(mediumPath).delete().catch(() => {});
    } catch (e) { console.error("Delete failed", e); }
};

export const getAppConfig = async (): Promise<AppConfig> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const configRef = db.collection("config").doc("main");
    const docSnap = await configRef.get();
    const defaultConfig: AppConfig = {
        featureCosts: {
          'Pixa Product Shots': 2, 
          'Model Shot': 3, 
          'Pixa Thumbnail Pro': 5, 
          'Magic Soul': 3, 
          'Magic Photo Colour': 2, 
          'CaptionAI': 1, 
          'Magic Interior': 2, 
          'Magic Apparel': 3,
          'Magic Mockup': 2, 
          'Magic Eraser': 1, 
          'Pixa Realty Ads': 4, // Renamed from Magic Realty
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
      if (dbConfig.featureCosts) {
          delete dbConfig.featureCosts['Magic Scanner'];
          delete dbConfig.featureCosts['Magic Notes'];
          delete dbConfig.featureCosts['BrandKit AI'];
          delete dbConfig.featureCosts['Magic Photo Studio']; 
          delete dbConfig.featureCosts['Thumbnail Studio']; 
          delete dbConfig.featureCosts['Magic Realty']; // Cleanup legacy key
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

export const updateAppConfig = async (config: AppConfig) => {
    if (!db) return;
    await db.collection("config").doc("main").set(config);
};

export const subscribeToAppConfig = (callback: (config: AppConfig | null) => void) => {
    if (!db) { callback(null); return () => {}; }
    return db.collection("config").doc("main").onSnapshot((doc) => {
        if (doc.exists) {
            const dbConfig = doc.data() as AppConfig;
            callback(dbConfig); 
        } else {
            callback(null);
        }
    });
};

// ... (Rest of file unchanged, including logApiError, getAuditLogs, get24HourCreditBurn, etc.)
// Re-exporting for completeness
export const getRecentSignups = async (limit = 10) => {
    if (!db) return [];
    const snap = await db.collection('users').orderBy('signUpDate', 'desc').limit(limit).get();
    return snap.docs.map(d => d.data() as User);
};

export const getRecentPurchases = async (limit = 10) => {
    if (!db) return [];
    const snap = await db.collection('purchases').orderBy('purchaseDate', 'desc').limit(limit).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Purchase));
};

export const getTotalRevenue = async (start?: Date, end?: Date) => {
    if (!db) return 0;
    let query: firebase.firestore.Query = db.collection('purchases');
    if (start) query = query.where('purchaseDate', '>=', start);
    if (end) query = query.where('purchaseDate', '<=', end);
    const snap = await query.get();
    return snap.docs.reduce((acc, doc) => acc + (doc.data().amountPaid || 0), 0);
};

export const getRevenueStats = async (days = 7) => {
    if (!db) return [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const snap = await db.collection('purchases').where('purchaseDate', '>=', startDate).orderBy('purchaseDate', 'asc').get();
    const stats: Record<string, number> = {};
    snap.forEach(doc => {
        const data = doc.data();
        const date = (data.purchaseDate as any).toDate().toLocaleDateString();
        stats[date] = (stats[date] || 0) + (data.amountPaid || 0);
    });
    return Object.entries(stats).map(([date, amount]) => ({ date, amount }));
};

export const getAllUsers = async () => {
    if (!db) return [];
    const snap = await db.collection('users').orderBy('signUpDate', 'desc').limit(1000).get();
    return snap.docs.map(d => d.data() as User);
};

export const addCreditsToUser = async (adminUid: string, targetUid: string, amount: number, reason: string) => {
    if (!db) return;
    const adminRef = db.collection('users').doc(adminUid);
    const adminDoc = await adminRef.get();
    if (!adminDoc.exists || !adminDoc.data()?.isAdmin) throw new Error("Unauthorized");
    const targetRef = db.collection('users').doc(targetUid);
    const txRef = targetRef.collection('transactions').doc();
    const logRef = db.collection('admin_audit_logs').doc();
    await db.runTransaction(async (t) => {
        t.update(targetRef, { credits: firebase.firestore.FieldValue.increment(amount), totalCreditsAcquired: firebase.firestore.FieldValue.increment(amount), creditGrantNotification: { amount, message: reason, timestamp: firebase.firestore.FieldValue.serverTimestamp(), type: 'credit' } });
        t.set(txRef, { feature: 'Admin Grant', creditChange: `+${amount}`, date: firebase.firestore.FieldValue.serverTimestamp(), reason: reason, grantedBy: adminDoc.data()?.email });
        t.set(logRef, { adminEmail: adminDoc.data()?.email, action: 'Grant Credits', details: `Granted ${amount} to ${targetUid}`, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    });
};

export const grantPackageToUser = async (adminUid: string, targetUid: string, pack: CreditPack, message: string) => {
    if (!db) return;
    const adminRef = db.collection('users').doc(adminUid);
    const adminDoc = await adminRef.get();
    if (!adminDoc.exists || !adminDoc.data()?.isAdmin) throw new Error("Unauthorized.");
    const targetRef = db.collection('users').doc(targetUid);
    const txRef = targetRef.collection('transactions').doc();
    const logRef = db.collection('admin_audit_logs').doc();
    await db.runTransaction(async (t) => {
        const updateData: any = { credits: firebase.firestore.FieldValue.increment(pack.totalCredits), totalCreditsAcquired: firebase.firestore.FieldValue.increment(pack.totalCredits), plan: pack.name, creditGrantNotification: { amount: pack.totalCredits, message: message, timestamp: firebase.firestore.FieldValue.serverTimestamp(), type: 'package', packageName: pack.name } };
        if (pack.name.includes('Studio') || pack.name.includes('Agency')) { updateData.storageTier = 'unlimited'; updateData.basePlan = pack.name; updateData.lastTierPurchaseDate = firebase.firestore.FieldValue.serverTimestamp(); }
        t.update(targetRef, updateData);
        t.set(txRef, { feature: `Admin Grant: ${pack.name}`, creditChange: `+${pack.totalCredits}`, date: firebase.firestore.FieldValue.serverTimestamp(), reason: message, grantedBy: adminDoc.data()?.email });
        t.set(logRef, { adminEmail: adminDoc.data()?.email, action: 'Grant Package', details: `Granted ${pack.name} to ${targetUid}`, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    });
};

export const clearCreditGrantNotification = async (uid: string) => { if (!db) return; await db.collection('users').doc(uid).update({ creditGrantNotification: null }); };
export const uploadBrandAsset = async (uid: string, dataUri: string, type: 'primary' | 'secondary' | 'mark') => { if (!storage || !db) throw new Error("Firebase not ready"); const [header, base64] = dataUri.split(','); const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png'; const blob = base64ToBlob(base64, mimeType); const path = `brand_kits/${uid}/${type}_${Date.now()}.png`; const ref = storage.ref(path); await ref.put(blob); return await ref.getDownloadURL(); };
export const saveUserBrandKit = async (uid: string, kit: BrandKit) => { if (!db) return; await db.collection('users').doc(uid).update({ brandKit: kit }); };
export const toggleUserBan = async (adminUid: string, targetUid: string, banStatus: boolean) => { if (!db) return; const adminSnap = await db.collection('users').doc(adminUid).get(); if (!adminSnap.data()?.isAdmin) throw new Error("Unauthorized"); await db.collection('users').doc(targetUid).update({ isBanned: banStatus }); await logAdminAction(adminUid, banStatus ? 'Ban User' : 'Unban User', `Target: ${targetUid}`); };
export const updateUserPlan = async (uid: string, newPlan: string) => { if (!db) return; await db.collection('users').doc(uid).update({ plan: newPlan }); };
export const sendSystemNotification = async (adminUid: string, targetUid: string, title: string, message: string, type: 'info' | 'warning' | 'success', style: 'banner' | 'pill' | 'toast' | 'modal') => { if (!db) return; await db.collection('users').doc(targetUid).update({ systemNotification: { title, message, type, style, read: false, timestamp: firebase.firestore.FieldValue.serverTimestamp() } }); await logAdminAction(adminUid, 'Send Notification', `To: ${targetUid}, Msg: ${message}`); };
export const logAdminAction = async (adminUid: string, action: string, details: string) => { if (!db) return; const adminEmail = (await db.collection('users').doc(adminUid).get()).data()?.email || 'Unknown'; await db.collection('admin_audit_logs').add({ adminEmail, action, details, timestamp: firebase.firestore.FieldValue.serverTimestamp() }); };
export const getAuditLogs = async (limit = 50) => { if (!db) return []; const snap = await db.collection('admin_audit_logs').orderBy('timestamp', 'desc').limit(limit).get(); return snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog)); };
let errorLogThrottle: Record<string, number> = {};
export const logApiError = async (endpoint: string, error: string, userId?: string) => { if (!db) return; const key = `${userId || 'anon'}_${endpoint}_${error}`; const now = Date.now(); if (errorLogThrottle[key] && now - errorLogThrottle[key] < 5000) return; errorLogThrottle[key] = now; console.error(`[API ERROR LOG] ${endpoint}: ${error}`); try { await db.collection('api_error_logs').add({ endpoint, error, userId: userId || 'anonymous', timestamp: firebase.firestore.FieldValue.serverTimestamp() }); } catch (e) { console.error("Failed to write to api_error_logs", e); } };
export const getApiErrorLogs = async (limit = 50) => { if (!db) return []; const snap = await db.collection('api_error_logs').orderBy('timestamp', 'desc').limit(limit).get(); return snap.docs.map(d => ({ id: d.id, ...d.data() } as ApiErrorLog)); };
export const get24HourCreditBurn = async () => { if (!db) return 0; return 0; };
export const getGlobalFeatureUsage = async () => { return [ { feature: 'Pixa Product Shots', count: 120 }, { feature: 'Merchant Studio', count: 85 }, { feature: 'Magic Ads', count: 64 }, { feature: 'Pixa Thumbnail Pro', count: 42 } ]; };
export const getAnnouncement = async () => { if (!db) return null; const doc = await db.collection('config').doc('announcement').get(); return doc.exists ? (doc.data() as Announcement) : null; };
export const updateAnnouncement = async (adminUid: string, data: Announcement) => { if (!db) return; await db.collection('config').doc('announcement').set(data); await logAdminAction(adminUid, 'Update Announcement', `Title: ${data.title}`); };
export const subscribeToAnnouncement = (callback: (data: Announcement | null) => void) => { if (!db) { callback(null); return () => {}; } return db.collection('config').doc('announcement').onSnapshot(doc => { callback(doc.exists ? (doc.data() as Announcement) : null); }); };
export const subscribeToUserProfile = (uid: string, callback: (user: User | null) => void) => { if (!db) { callback(null); return () => {}; } return db.collection('users').doc(uid).onSnapshot(doc => { callback(doc.exists ? ({ uid: doc.id, ...doc.data() } as User) : null); }); };