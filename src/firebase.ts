
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import { AppConfig, Purchase, User, BrandKit, AuditLog, Announcement, ApiErrorLog, CreditPack, Creation, Transaction } from './types';
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

// --- Auth Helpers ---

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

export const getOrCreateUserProfile = async (uid: string, name: string, email: string | null) => {
    if (!db) return;
    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();
    
    if (!doc.exists) {
        // New User
        const newUser: Partial<User> = {
            uid,
            name,
            email: email || '',
            credits: 10, // Signup bonus
            totalCreditsAcquired: 10,
            plan: 'Free',
            signUpDate: firebase.firestore.Timestamp.now() as any,
            lastActive: firebase.firestore.Timestamp.now() as any,
            storageTier: 'limited',
            referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
            referralCount: 0,
            isAdmin: false,
            isBanned: false,
        };
        await userRef.set(newUser);
        return newUser;
    }
    return doc.data() as User;
};

export const updateUserProfile = async (uid: string, data: Partial<User>) => {
    if (!db) return;
    await db.collection('users').doc(uid).update(data);
};

export const subscribeToUserProfile = (uid: string, callback: (user: User | null) => void) => {
    if (!db) return () => {};
    return db.collection('users').doc(uid).onSnapshot((doc) => {
        if (doc.exists) {
            callback(doc.data() as User);
        } else {
            callback(null);
        }
    });
};

// --- Config & System ---

export const subscribeToAppConfig = (callback: (config: AppConfig | null) => void) => {
    if (!db) return () => {};
    return db.collection('system').doc('config').onSnapshot((doc) => {
        if (doc.exists) {
            callback(doc.data() as AppConfig);
        } else {
            callback(null);
        }
    });
};

export const updateAppConfig = async (config: AppConfig) => {
    if (!db) return;
    await db.collection('system').doc('config').set(config, { merge: true });
};

export const subscribeToAnnouncement = (callback: (announcement: Announcement | null) => void) => {
    if (!db) return () => {};
    return db.collection('system').doc('announcement').onSnapshot((doc) => {
        if (doc.exists) {
            callback(doc.data() as Announcement);
        } else {
            callback(null);
        }
    });
};

export const updateAnnouncement = async (uid: string, announcement: Announcement) => {
    if (!db) return;
    // Basic admin check logic or rely on Firestore rules
    await db.collection('system').doc('announcement').set(announcement);
    // Log action
    await logAudit(uid, 'Update Announcement', `Updated global announcement: ${announcement.title}`);
};

export const getAnnouncement = async () => {
    if (!db) return null;
    const doc = await db.collection('system').doc('announcement').get();
    return doc.exists ? (doc.data() as Announcement) : null;
};

// --- Creations & Credits ---

export const saveCreation = async (uid: string, imageUrl: string, feature: string) => {
    if (!db) return;
    await db.collection('users').doc(uid).collection('creations').add({
        imageUrl,
        feature,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        storagePath: '' // Ideally store in storage and keep path, but for base64/url...
    });
};

export const getCreations = async (uid: string) => {
    if (!db) return [];
    const snapshot = await db.collection('users').doc(uid).collection('creations')
        .orderBy('createdAt', 'desc')
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const deleteCreation = async (uid: string, creation: Creation) => {
    if (!db) return;
    await db.collection('users').doc(uid).collection('creations').doc(creation.id).delete();
    // If we had storage path, delete from storage here too.
};

export const deductCredits = async (uid: string, amount: number, featureName: string) => {
    if (!db) throw new Error("DB not initialized");
    const userRef = db.collection('users').doc(uid);
    
    return await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) throw new Error("User does not exist!");
        
        const userData = userDoc.data() as User;
        const currentCredits = userData.credits || 0;
        
        if (currentCredits < amount) {
            throw new Error("Insufficient credits!");
        }
        
        const newCredits = currentCredits - amount;
        
        // Update user credits
        transaction.update(userRef, { 
            credits: newCredits,
            lifetimeGenerations: firebase.firestore.FieldValue.increment(1),
            lastActive: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Add transaction log
        const transactionRef = userRef.collection('transactions').doc();
        transaction.set(transactionRef, {
            feature: featureName,
            cost: amount,
            date: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return { ...userData, credits: newCredits, lifetimeGenerations: (userData.lifetimeGenerations || 0) + 1 };
    });
};

export const getCreditHistory = async (uid: string) => {
    if (!db) return [];
    const snapshot = await db.collection('users').doc(uid).collection('transactions')
        .orderBy('date', 'desc')
        .limit(50)
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const purchaseTopUp = async (uid: string, packName: string, credits: number, price: number) => {
    if (!db) throw new Error("DB not initialized");
    const userRef = db.collection('users').doc(uid);

    await userRef.update({
        credits: firebase.firestore.FieldValue.increment(credits),
        totalCreditsAcquired: firebase.firestore.FieldValue.increment(credits),
        totalSpent: firebase.firestore.FieldValue.increment(price),
        plan: packName, // Update displayed plan
        // Grant "Studio" or "Agency" tier if applicable (simplified logic)
        ...(packName.includes('Studio') || packName.includes('Agency') ? { 
            storageTier: 'unlimited', 
            basePlan: packName,
            lastTierPurchaseDate: firebase.firestore.FieldValue.serverTimestamp() 
        } : {})
    });

    // Log transaction (purchase is a credit gain)
    await userRef.collection('transactions').add({
        feature: `Purchase: ${packName}`,
        cost: 0, // It's a gain, cost is 0 in terms of credit spend logic usually, or handle differently
        creditChange: `+${credits}`,
        date: firebase.firestore.FieldValue.serverTimestamp(),
        pricePaid: price
    });

    // Record Global Purchase Log
    await db.collection('purchases').add({
        userId: uid,
        packName,
        creditsAdded: credits,
        amountPaid: price,
        purchaseDate: firebase.firestore.FieldValue.serverTimestamp()
    });

    const userSnap = await userRef.get();
    return userSnap.data() as User;
};

// --- Daily Mission & Attendance ---

export const claimDailyAttendance = async (uid: string) => {
    if (!db) throw new Error("DB not initialized");
    const userRef = db.collection('users').doc(uid);
    
    // Check handled in UI or transaction, simplified here
    await userRef.update({
        credits: firebase.firestore.FieldValue.increment(1),
        lastAttendanceClaim: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Log
    await userRef.collection('transactions').add({
        feature: 'Daily Check-in',
        creditChange: '+1',
        cost: 0,
        date: firebase.firestore.FieldValue.serverTimestamp()
    });

    const snap = await userRef.get();
    return snap.data();
};

export const completeDailyMission = async (uid: string, reward: number, missionId: string) => {
    if (!db) throw new Error("DB not initialized");
    const userRef = db.collection('users').doc(uid);
    
    // Calculate next unlock time (tomorrow midnight? or 24h from now? usually reset time)
    const nextUnlock = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await userRef.update({
        credits: firebase.firestore.FieldValue.increment(reward),
        dailyMission: {
            completedAt: new Date().toISOString(),
            nextUnlock: nextUnlock,
            lastMissionId: missionId
        }
    });

    await userRef.collection('transactions').add({
        feature: 'Daily Mission Reward',
        creditChange: `+${reward}`,
        cost: 0,
        date: firebase.firestore.FieldValue.serverTimestamp()
    });

    const snap = await userRef.get();
    return snap.data() as User;
};

// --- Referrals ---

export const claimReferralCode = async (uid: string, code: string) => {
    if (!db) throw new Error("DB not initialized");
    
    // Find referrer
    const snapshot = await db.collection('users').where('referralCode', '==', code).get();
    if (snapshot.empty) {
        throw new Error("Invalid referral code.");
    }
    const referrerDoc = snapshot.docs[0];
    const referrerId = referrerDoc.id;

    if (referrerId === uid) throw new Error("Cannot refer yourself.");

    // Update current user
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (userSnap.data()?.referredBy) throw new Error("You have already claimed a referral.");

    // Transaction to update both
    await db.runTransaction(async (t) => {
        // Update User
        t.update(userRef, {
            referredBy: code,
            credits: firebase.firestore.FieldValue.increment(10)
        });
        const userTx = userRef.collection('transactions').doc();
        t.set(userTx, {
            feature: 'Referral Bonus (Claimed)',
            creditChange: '+10',
            date: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update Referrer
        const refUserRef = db.collection('users').doc(referrerId);
        t.update(refUserRef, {
            referralCount: firebase.firestore.FieldValue.increment(1),
            credits: firebase.firestore.FieldValue.increment(10)
        });
        const refTx = refUserRef.collection('transactions').doc();
        t.set(refTx, {
            feature: 'Referral Bonus (Friend Joined)',
            creditChange: '+10',
            date: firebase.firestore.FieldValue.serverTimestamp()
        });
    });

    return (await userRef.get()).data();
};

// --- Brand Kit ---

export const saveUserBrandKit = async (uid: string, brandKit: BrandKit) => {
    if (!db) return;
    await db.collection('users').doc(uid).update({ brandKit });
};

export const uploadBrandAsset = async (uid: string, dataUri: string, type: string) => {
    if (!storage) throw new Error("Storage not initialized");
    // Convert dataUri to Blob
    const response = await fetch(dataUri);
    const blob = await response.blob();
    
    const ref = storage.ref().child(`users/${uid}/brandKit/${type}_${Date.now()}`);
    await ref.put(blob);
    return await ref.getDownloadURL();
};

// --- Admin ---

export const getAllUsers = async () => {
    if (!db) return [];
    const snapshot = await db.collection('users').limit(100).get(); // Limit for safety
    return snapshot.docs.map(doc => doc.data() as User);
};

export const getUser = async (uid: string) => {
    if (!db) return null;
    const doc = await db.collection('users').doc(uid).get();
    return doc.exists ? (doc.data() as User) : null;
};

export const addCreditsToUser = async (adminUid: string, targetUid: string, amount: number, reason: string) => {
    if (!db) return;
    const userRef = db.collection('users').doc(targetUid);
    
    await userRef.update({
        credits: firebase.firestore.FieldValue.increment(amount)
    });
    
    await userRef.collection('transactions').add({
        feature: 'Admin Grant',
        reason,
        creditChange: `+${amount}`,
        cost: 0,
        grantedBy: adminUid,
        date: firebase.firestore.FieldValue.serverTimestamp()
    });

    await logAudit(adminUid, 'Grant Credits', `Granted ${amount} to ${targetUid}. Reason: ${reason}`);
};

export const grantPackageToUser = async (adminUid: string, targetUid: string, pack: CreditPack, message: string) => {
    if (!db) return;
    const userRef = db.collection('users').doc(targetUid);
    
    await userRef.update({
        credits: firebase.firestore.FieldValue.increment(pack.totalCredits),
        totalCreditsAcquired: firebase.firestore.FieldValue.increment(pack.totalCredits),
        plan: pack.name, // Upgrade plan name
        // Grant unlimited storage for higher tiers
        ...(pack.name.includes('Studio') || pack.name.includes('Agency') ? {
            storageTier: 'unlimited',
            basePlan: pack.name,
            lastTierPurchaseDate: firebase.firestore.FieldValue.serverTimestamp()
        } : {}),
        creditGrantNotification: {
            amount: pack.totalCredits,
            message: message,
            type: 'package',
            packageName: pack.name,
            timestamp: firebase.firestore.Timestamp.now()
        }
    });

    // Transaction Log
    await userRef.collection('transactions').add({
        feature: `Grant: ${pack.name}`,
        reason: message,
        creditChange: `+${pack.totalCredits}`,
        cost: 0,
        grantedBy: adminUid,
        date: firebase.firestore.FieldValue.serverTimestamp()
    });

    await logAudit(adminUid, 'Grant Package', `Granted ${pack.name} to ${targetUid}. Msg: ${message}`);
};

export const toggleUserBan = async (adminUid: string, targetUid: string, isBanned: boolean) => {
    if (!db) return;
    await db.collection('users').doc(targetUid).update({ isBanned });
    await logAudit(adminUid, isBanned ? 'Ban User' : 'Unban User', `Target: ${targetUid}`);
};

export const updateUserPlan = async (uid: string, plan: string) => {
    if (!db) return;
    await db.collection('users').doc(uid).update({ plan });
};

// Analytics & Logs

export const getRecentSignups = async (limit = 10) => {
    if (!db) return [];
    const snap = await db.collection('users').orderBy('signUpDate', 'desc').limit(limit).get();
    return snap.docs.map(d => d.data() as User);
};

export const getRecentPurchases = async (limit = 10) => {
    if (!db) return [];
    const snap = await db.collection('purchases').orderBy('purchaseDate', 'desc').limit(limit).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getTotalRevenue = async (startDate?: Date, endDate?: Date) => {
    if (!db) return 0;
    let query = db.collection('purchases');
    
    let snapshot;
    if (startDate && endDate) {
        snapshot = await query
            .where('purchaseDate', '>=', startDate)
            .where('purchaseDate', '<=', endDate)
            .get();
    } else {
        snapshot = await query.get();
    }
    
    return snapshot.docs.reduce((sum, doc) => sum + (doc.data().amountPaid || 0), 0);
};

export const getRevenueStats = async (days = 7) => {
    // Return empty or simple data structure as aggregating logic is complex
    return []; 
};

export const get24HourCreditBurn = async () => {
    // Expensive query on client. Return 0 placeholder.
    return 0;
};

export const getGlobalFeatureUsage = async () => {
    // Assuming we maintain a 'stats/features' doc
    if (!db) return [];
    const doc = await db.collection('system').doc('stats').get();
    if (doc.exists && doc.data()?.featureUsage) {
        return Object.entries(doc.data()!.featureUsage).map(([k, v]) => ({ feature: k, count: v as number }));
    }
    return [];
};

// Logs

const logAudit = async (adminUid: string, action: string, details: string) => {
    if (!db) return;
    await db.collection('auditLogs').add({
        adminEmail: auth?.currentUser?.email || adminUid,
        action,
        details,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
};

export const getAuditLogs = async (limit = 50) => {
    if (!db) return [];
    const snap = await db.collection('auditLogs').orderBy('timestamp', 'desc').limit(limit).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
};

export const logApiError = async (endpoint: string, error: string, userId?: string) => {
    if (!db) return;
    await db.collection('apiErrors').add({
        endpoint,
        error,
        userId: userId || 'anonymous',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
};

export const getApiErrorLogs = async (limit = 50) => {
    if (!db) return [];
    const snap = await db.collection('apiErrors').orderBy('timestamp', 'desc').limit(limit).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ApiErrorLog));
};

// Notifications

export const sendSystemNotification = async (
    adminUid: string, 
    targetUid: string, 
    title: string, 
    message: string, 
    type: string, 
    style: string
) => {
    if (!db) return;
    await db.collection('users').doc(targetUid).update({
        systemNotification: {
            title,
            message,
            type,
            style,
            read: false,
            timestamp: firebase.firestore.Timestamp.now()
        }
    });
    await logAudit(adminUid, 'Send Notification', `To ${targetUid}: ${title}`);
};

export const clearCreditGrantNotification = async (uid: string) => {
    if (!db) return;
    await db.collection('users').doc(uid).update({
        creditGrantNotification: null
    });
};
