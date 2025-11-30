
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import { AppConfig, Purchase, User, BrandKit, AuditLog, Announcement, ApiErrorLog } from './types';

// Config
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

let app;
let auth: firebase.auth.Auth | null = null;
let db: firebase.firestore.Firestore | null = null;
let storage: firebase.storage.Storage | null = null;

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
  console.error("Configuration is missing or incomplete.");
}

export const signInWithGoogle = async () => {
    if (!auth) throw new Error("Firebase Auth is not initialized.");
    const provider = new firebase.auth.GoogleAuthProvider();
    return await auth.signInWithPopup(provider);
};

const generateReferralCode = (name: string) => {
    const prefix = (name || 'USER').replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 4).padEnd(3, 'X');
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${suffix}`;
};

export const getOrCreateUserProfile = async (uid: string, name?: string | null, email?: string | null) => {
  if (!db) throw new Error("Firestore is not initialized.");
  const userRef = db.collection("users").doc(uid);
  const docSnap = await userRef.get();

  if (docSnap.exists) {
    const userData = docSnap.data();
    if (userData && userData.credits === undefined) {
         userRef.set({ credits: 10, totalCreditsAcquired: 10 }, { merge: true });
         return { ...userData, credits: 10 };
    }
    return userData;
  } else {
    const newUserProfile = {
      uid,
      name: name || 'New User',
      email: email || 'No Email',
      credits: 10,
      totalCreditsAcquired: 10,
      plan: 'Free',
      storageTier: 'limited',
      signUpDate: firebase.firestore.FieldValue.serverTimestamp(),
      isBanned: false,
      referralCode: generateReferralCode(name || 'User'),
    };
    await userRef.set(newUserProfile);
    return newUserProfile;
  }
};

export const updateUserProfile = async (uid: string, data: { [key: string]: any }): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const userRef = db.collection("users").doc(uid);
    await userRef.set(data, { merge: true });
};

// Admin Helpers
export const logAdminAction = async (adminEmail: string, action: string, details: string) => {
    if (!db) return;
    try {
        await db.collection('audit_logs').add({
            adminEmail,
            action,
            details,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch(e) {
        console.warn("Failed to write audit log:", e);
    }
};

export const toggleUserBan = async (adminUid: string, targetUid: string, isBanned: boolean) => {
    if (!db) throw new Error("DB not init");
    
    // Perform update
    await db.collection('users').doc(targetUid).set({ isBanned }, { merge: true });
    
    // Log action safely
    try {
        const adminSnap = await db.collection('users').doc(adminUid).get();
        const adminEmail = adminSnap.data()?.email || 'Admin';
        await logAdminAction(adminEmail, isBanned ? 'BAN_USER' : 'UNBAN_USER', `Target: ${targetUid}`);
    } catch(e) {
        console.warn("Logging failed for ban action, but ban applied.", e);
    }
};

export const updateUserPlan = async (adminUid: string, targetUid: string, newPlan: string) => {
    if (!db) throw new Error("DB not init");
    await db.collection('users').doc(targetUid).set({ plan: newPlan }, { merge: true });
    
    try {
        const adminSnap = await db.collection('users').doc(adminUid).get();
        await logAdminAction(adminSnap.data()?.email || 'Admin', 'UPDATE_PLAN', `Target: ${targetUid}, New Plan: ${newPlan}`);
    } catch(e) {
        console.warn("Logging failed", e);
    }
};

export const sendSystemNotification = async (adminUid: string, targetUid: string, message: string) => {
    if (!db) throw new Error("DB not init");
    await db.collection('users').doc(targetUid).set({ systemNotification: message }, { merge: true });
    
    try {
        const adminSnap = await db.collection('users').doc(adminUid).get();
        await logAdminAction(adminSnap.data()?.email || 'Admin', 'SEND_NOTIFICATION', `Target: ${targetUid}, Msg: ${message}`);
    } catch(e) {
        console.warn("Logging failed", e);
    }
};

export const logApiError = async (endpoint: string, errorMsg: string, userId?: string) => {
    if (!db) return;
    try {
        await db.collection('api_error_logs').add({
            endpoint,
            error: errorMsg,
            userId: userId || 'anonymous',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.warn("Failed to log API error", e);
    }
};

export const getAuditLogs = async (limit: number = 50): Promise<AuditLog[]> => {
    if (!db) return [];
    try {
        let snap;
        try {
            snap = await db.collection('audit_logs').orderBy('timestamp', 'desc').limit(limit).get();
        } catch (idxError) {
            console.warn("Index error on audit_logs, falling back to unsorted query", idxError);
            snap = await db.collection('audit_logs').limit(limit).get();
        }
        
        const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
        logs.sort((a, b) => {
            const tA = a.timestamp?.seconds || 0;
            const tB = b.timestamp?.seconds || 0;
            return tB - tA;
        });
        return logs;
    } catch (error) {
        console.error("Error fetching audit logs", error);
        return [];
    }
};

export const getApiErrorLogs = async (limit: number = 50): Promise<ApiErrorLog[]> => {
    if (!db) return [];
    try {
        let snap;
        try {
            snap = await db.collection('api_error_logs').orderBy('timestamp', 'desc').limit(limit).get();
        } catch (idxError) {
            console.warn("Index error on api_error_logs", idxError);
            snap = await db.collection('api_error_logs').limit(limit).get();
        }
        const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ApiErrorLog));
        logs.sort((a, b) => {
            const tA = a.timestamp?.seconds || 0;
            const tB = b.timestamp?.seconds || 0;
            return tB - tA;
        });
        return logs;
    } catch (error) {
        return [];
    }
};

export const subscribeToAnnouncement = (callback: (announcement: Announcement | null) => void) => {
    if (!db) return () => {};
    return db.collection('config').doc('announcement').onSnapshot((doc) => {
        if (doc.exists) {
            callback(doc.data() as Announcement);
        } else {
            callback(null);
        }
    }, (error) => {
        console.error("Error subscribing to announcement", error);
    });
};

export const getAnnouncement = async (): Promise<Announcement | null> => {
    if (!db) return null;
    try {
        const snap = await db.collection('config').doc('announcement').get();
        return snap.exists ? snap.data() as Announcement : null;
    } catch (error) {
        console.error("Error getting announcement", error);
        return null;
    }
};

export const updateAnnouncement = async (adminUid: string, announcement: Announcement) => {
    if (!db) return;
    await db.collection('config').doc('announcement').set({
        message: announcement.message,
        isActive: announcement.isActive,
        type: announcement.type,
        displayStyle: announcement.displayStyle || 'banner', 
        link: announcement.link || "" // Explicitly saving link
    });
    
    try {
        const adminSnap = await db.collection('users').doc(adminUid).get();
        await logAdminAction(adminSnap.data()?.email || 'Admin', 'UPDATE_ANNOUNCEMENT', `Active: ${announcement.isActive}, Msg: ${announcement.message}`);
    } catch(e) {
        console.warn("Log failed", e);
    }
};

// --- Other Services ---

export const deductCredits = async (uid: string, amount: number, feature: string): Promise<User> => {
    if (!db) throw new Error("DB not init");
    const userRef = db.collection('users').doc(uid);
    
    await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) throw new Error("User not found");
        
        const currentCredits = userDoc.data()?.credits || 0;
        if (currentCredits < amount) throw new Error("Insufficient credits");
        
        transaction.update(userRef, { 
            credits: currentCredits - amount,
            lastActive: firebase.firestore.FieldValue.serverTimestamp(),
            totalSpent: (userDoc.data()?.totalSpent || 0) + amount,
            lifetimeGenerations: (userDoc.data()?.lifetimeGenerations || 0) + 1
        });
        
        const historyRef = db.collection('users').doc(uid).collection('history').doc();
        transaction.set(historyRef, {
            feature,
            cost: amount,
            date: firebase.firestore.FieldValue.serverTimestamp()
        });
    });
    
    const updatedSnap = await userRef.get();
    return { ...updatedSnap.data(), uid } as User;
};

export const saveCreation = async (uid: string, imageUrl: string, feature: string) => {
    if (!db) return;
    await db.collection('users').doc(uid).collection('creations').add({
        imageUrl,
        feature,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
};

export const getCreations = async (uid: string) => {
    if (!db) return [];
    try {
        const snap = await db.collection('users').doc(uid).collection('creations')
            .orderBy('createdAt', 'desc')
            .get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch(e) {
        console.warn("Failed to get creations sorted, trying unsorted", e);
        const snap = await db.collection('users').doc(uid).collection('creations').limit(100).get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
};

export const deleteCreation = async (uid: string, creation: any) => {
    if (!db) return;
    await db.collection('users').doc(uid).collection('creations').doc(creation.id).delete();
};

export const getCreditHistory = async (uid: string) => {
    if (!db) return [];
    try {
        const snap = await db.collection('users').doc(uid).collection('history')
            .orderBy('date', 'desc')
            .limit(50)
            .get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch(e) {
        return [];
    }
};

export const completeDailyMission = async (uid: string, reward: number, missionId: string): Promise<User> => {
    if (!db) throw new Error("DB not init");
    const userRef = db.collection('users').doc(uid);
    
    const now = new Date();
    const nextUnlock = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    await userRef.update({
        credits: firebase.firestore.FieldValue.increment(reward),
        dailyMission: {
            completedAt: now.toISOString(),
            nextUnlock: nextUnlock,
            lastMissionId: missionId
        }
    });
    
    await db.collection('users').doc(uid).collection('history').add({
        feature: 'Daily Mission Reward',
        creditChange: `+${reward}`,
        cost: 0,
        date: firebase.firestore.FieldValue.serverTimestamp()
    });

    const updatedSnap = await userRef.get();
    return { ...updatedSnap.data(), uid } as User;
};

export const purchaseTopUp = async (uid: string, packName: string, credits: number, amountPaid: number): Promise<User> => {
    if (!db) throw new Error("DB not init");
    const userRef = db.collection('users').doc(uid);
    
    await userRef.update({
        credits: firebase.firestore.FieldValue.increment(credits),
        totalCreditsAcquired: firebase.firestore.FieldValue.increment(credits)
    });
    
    await db.collection('users').doc(uid).collection('history').add({
        feature: `Purchase: ${packName}`,
        creditChange: `+${credits}`,
        cost: 0,
        date: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    await db.collection('purchases').add({
        userId: uid,
        packName,
        creditsAdded: credits,
        amountPaid,
        purchaseDate: firebase.firestore.FieldValue.serverTimestamp()
    });

    const updatedSnap = await userRef.get();
    return { ...updatedSnap.data(), uid } as User;
};

export const claimDailyAttendance = async (uid: string): Promise<User> => {
    if (!db) throw new Error("DB not init");
    const userRef = db.collection('users').doc(uid);
    
    await userRef.update({
        credits: firebase.firestore.FieldValue.increment(1),
        lastAttendanceClaim: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    await db.collection('users').doc(uid).collection('history').add({
        feature: 'Daily Check-in',
        creditChange: '+1',
        cost: 0,
        date: firebase.firestore.FieldValue.serverTimestamp()
    });

    const updatedSnap = await userRef.get();
    return { ...updatedSnap.data(), uid } as User;
};

export const claimReferralCode = async (uid: string, code: string): Promise<User> => {
    if (!db) throw new Error("DB not init");
    
    const referrerSnap = await db.collection('users').where('referralCode', '==', code).limit(1).get();
    if (referrerSnap.empty) throw new Error("Invalid code");
    
    const referrer = referrerSnap.docs[0];
    if (referrer.id === uid) throw new Error("Cannot use own code");
    
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (userSnap.data()?.referredBy) throw new Error("Already referred");

    const bonus = 10;
    const batch = db.batch();
    
    batch.update(userRef, {
        credits: firebase.firestore.FieldValue.increment(bonus),
        referredBy: code
    });
    const historyRef = userRef.collection('history').doc();
    batch.set(historyRef, {
        feature: 'Referral Bonus (Redeemed)',
        creditChange: `+${bonus}`,
        cost: 0,
        date: firebase.firestore.FieldValue.serverTimestamp()
    });

    const referrerRef = db.collection('users').doc(referrer.id);
    batch.update(referrerRef, {
        credits: firebase.firestore.FieldValue.increment(bonus),
        referralCount: firebase.firestore.FieldValue.increment(1)
    });
    const refHistoryRef = referrerRef.collection('history').doc();
    batch.set(refHistoryRef, {
        feature: 'Referral Bonus (Friend Joined)',
        creditChange: `+${bonus}`,
        cost: 0,
        date: firebase.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();
    
    const updatedSnap = await userRef.get();
    return { ...updatedSnap.data(), uid } as User;
};

export const uploadBrandAsset = async (uid: string, dataUri: string, type: string) => {
    if (!storage) throw new Error("Storage not init");
    const ref = storage.ref(`users/${uid}/brandKit/${type}_${Date.now()}.png`);
    await ref.putString(dataUri, 'data_url');
    return await ref.getDownloadURL();
};

export const saveUserBrandKit = async (uid: string, kit: any) => {
    if (!db) return;
    await db.collection('users').doc(uid).update({ brandKit: kit });
};

export const getAppConfig = async (): Promise<AppConfig> => {
    if (!db) return { featureCosts: {}, featureToggles: {}, creditPacks: [] };
    const doc = await db.collection('config').doc('app_settings').get();
    return doc.exists ? (doc.data() as AppConfig) : { featureCosts: {}, featureToggles: {}, creditPacks: [] };
};

export const updateAppConfig = async (adminUid: string, config: AppConfig) => {
    if (!db) return;
    await db.collection('config').doc('app_settings').set(config);
    const snap = await db.collection('users').doc(adminUid).get();
    logAdminAction(snap.data()?.email || 'Admin', 'UPDATE_CONFIG', 'Updated app settings');
};

export const getRecentSignups = async (limit = 10) => {
    if (!db) return [];
    try {
        const snap = await db.collection('users').orderBy('signUpDate', 'desc').limit(limit).get();
        return snap.docs.map(d => ({uid: d.id, ...d.data()}));
    } catch(e) {
        const snap = await db.collection('users').limit(limit).get();
        return snap.docs.map(d => ({uid: d.id, ...d.data()}));
    }
};

export const getRecentPurchases = async (limit = 10) => {
    if (!db) return [];
    try {
        const snap = await db.collection('purchases').orderBy('purchaseDate', 'desc').limit(limit).get();
        return snap.docs.map(d => ({id: d.id, ...d.data()}));
    } catch (e) {
        return [];
    }
};

export const getTotalRevenue = async () => {
    if (!db) return 0;
    try {
        const snap = await db.collection('purchases').get();
        return snap.docs.reduce((acc, doc) => acc + (doc.data().amountPaid || 0), 0);
    } catch(e) {
        return 0;
    }
};

export const getAllUsers = async (): Promise<User[]> => {
    if (!db) return [];
    const snap = await db.collection('users').limit(100).get();
    return snap.docs.map(d => ({uid: d.id, ...d.data()} as User));
};

export const addCreditsToUser = async (adminUid: string, targetUid: string, amount: number) => {
    if (!db) return;
    const userRef = db.collection('users').doc(targetUid);
    await userRef.update({
        credits: firebase.firestore.FieldValue.increment(amount)
    });
    const snap = await db.collection('users').doc(adminUid).get();
    logAdminAction(snap.data()?.email || 'Admin', 'GRANT_CREDITS', `Granted ${amount} to ${targetUid}`);
};

export const getGlobalFeatureUsage = async () => {
    return {};
};

export { auth, app };