
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import { AppConfig, Purchase, User, BrandKit, AuditLog, Announcement, ApiErrorLog, CreditPack, Creation, Transaction, VaultReference, VaultFolderConfig, UsageLog } from './types';
import { resizeImage } from './utils/imageUtils';
import { USE_SECURE_BACKEND } from './services/geminiClient';

// Import the config file directly so it's bundled by Vite
import firebaseAppletConfig from '../firebase-applet-config.json';

// Hardcoded fallbacks for APK/Production environments where env vars might be missing
const FALLBACK_CONFIG = {
  projectId: "magicpixa-prod2",
  appId: "1:975816945931:web:2fd6d22a330528f1d6f20e",
  apiKey: "AIzaSyA24HC0EoCiNJrZiPQ-UnqcMMoy4AbIsDg",
  authDomain: "magicpixa-prod2.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-2c7634f2-0fb9-4be3-a912-593f46f96faa",
  storageBucket: "magicpixa-prod2.firebasestorage.app",
  messagingSenderId: "975816945931"
};

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId || FALLBACK_CONFIG.projectId;
const derivedAuthDomain = projectId ? `${projectId}.firebaseapp.com` : (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain || FALLBACK_CONFIG.authDomain);

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey || FALLBACK_CONFIG.apiKey,
  authDomain: derivedAuthDomain,
  projectId: projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket || FALLBACK_CONFIG.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId || FALLBACK_CONFIG.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId || FALLBACK_CONFIG.appId,
  // Ensure we use the specific database ID if provided
  firestoreDatabaseId: (firebaseAppletConfig as any).firestoreDatabaseId || FALLBACK_CONFIG.firestoreDatabaseId
};

const checkConfigValue = (value: string | undefined): boolean => {
    return !!value && value !== 'undefined' && value !== '';
};

const allConfigKeys = {
    "VITE_FIREBASE_API_KEY": firebaseConfig.apiKey,
    "VITE_FIREBASE_AUTH_DOMAIN": firebaseConfig.authDomain,
    "VITE_FIREBASE_PROJECT_ID": firebaseConfig.projectId,
    "VITE_FIREBASE_STORAGE_BUCKET": firebaseConfig.storageBucket,
    "VITE_FIREBASE_MESSAGING_SENDER_ID": firebaseConfig.messagingSenderId,
    "VITE_FIREBASE_APP_ID": firebaseConfig.appId
};

const missingKeys = Object.entries(allConfigKeys)
    .filter(([_, value]) => !checkConfigValue(value as string | undefined))
    .map(([key, _]) => key);

export const getMissingConfigKeys = (): string[] => missingKeys;

export const isConfigValid = missingKeys.length === 0;

export let app: firebase.app.App | null = null;
export let auth: firebase.auth.Auth | null = null;
export let db: firebase.firestore.Firestore | null = null;
export let storage: firebase.storage.Storage | null = null;

if (isConfigValid) {
  try {
    if (firebase.apps.length === 0) {
      app = firebase.initializeApp(firebaseConfig);
    } else {
      app = firebase.app();
    }
    
    auth = firebase.auth();
    storage = firebase.storage();

    // Support for named databases in Firestore (compat mode)
    const dbId = (firebaseConfig as any).firestoreDatabaseId;
    if (dbId && dbId !== '(default)') {
        // @ts-ignore - Accessing named database in compat mode
        db = app.firestore(dbId);
    } else {
        db = firebase.firestore();
    }

    // Connection test as per guidelines
    if (db) {
        const testConnection = async () => {
            try {
                // @ts-ignore
                await db.collection('_conn_test').doc('ping').get({ source: 'server' });
                console.log("Firestore connection verified.");
            } catch (error: any) {
                if (error.message && error.message.includes('offline')) {
                    console.error("Firestore appears to be offline. Please check configuration.");
                }
            }
        };
        testConnection();
    }
  } catch (error) {
    console.error("Error initializing Firebase:", error);
  }
}

/**
 * Helper to strip undefined values from objects before Firestore writes.
 */
const sanitizeData = (data: any) => {
    const clean: any = {};
    if (!data) return clean;
    Object.keys(data).forEach(key => {
        if (data[key] !== undefined) {
            clean[key] = data[key];
        }
    });
    return clean;
};

export const signInWithGoogle = async () => {
    if (!auth) throw new Error("Firebase Auth is not initialized.");
    
    try {
        // Force local persistence to prevent state loss on mobile
        // Persistence.LOCAL is better for APKs as it survives app restarts
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        
        // Custom parameters to improve mobile compatibility
        provider.setCustomParameters({
            prompt: 'select_account'
        });

        // Detect if we are likely in a restricted WebView environment
        const isWebView = /wv|Android.*Version\/4\.0/i.test(navigator.userAgent) || 
                          (window.location.protocol === 'file:' || window.location.hostname === 'localhost');

        // On mobile APKs/WebViews, popups are often blocked or fail to return state.
        // However, if redirect is failing with "missing initial state", we try popup as a fallback
        // because it keeps the parent window alive, preserving the session state.
        try {
            // If we are in a WebView, we might want to try redirect first if the user prefers,
            // but the error reported is specifically about redirect failing.
            // So we try Popup first.
            return await auth.signInWithPopup(provider);
        } catch (popupError: any) {
            console.log("Popup failed or blocked, trying redirect...", popupError.code);
            
            // If popup is blocked or not supported, we use redirect.
            // If the user gets "missing initial state" later, App.tsx will catch it.
            if (popupError.code === 'auth/popup-blocked' || 
                popupError.code === 'auth/operation-not-supported-in-this-environment' ||
                popupError.code === 'auth/auth-domain-config-required') {
                return await auth.signInWithRedirect(provider);
            }
            throw popupError;
        }
    } catch (error: any) {
        console.error("Sign-in process failed", error);
        throw error;
    }
};

export const updateUserLastActive = async (uid: string) => {
    if (!db) return;
    try {
        await db.collection('users').doc(uid).update({
            lastActive: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.warn("Could not update lastActive", e);
    }
};

export const getOrCreateUserProfile = async (uid: string, name: string, email: string | null, phoneNumber?: string | null) => {
    if (!db) return;
    
    // First, try to find by UID
    const userRef = db.collection('users').doc(uid);
    let doc = await userRef.get();
    
    // If not found by UID, but we have an email, try to find by email
    // This helps link Google accounts to existing Phone accounts that have an email set
    if (!doc.exists && email) {
        const existingUser = await findUserByEmail(email);
        if (existingUser && existingUser.uid !== uid) {
            console.log("Found existing user by email, merging might be needed or this is a secondary login.");
            // We don't automatically merge here for security, but we know the user exists
        }
    }

    const initials = name && name.trim()
        ? name.trim().split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
        : email?.substring(0, 2).toUpperCase() || 'U';

    const SUPER_ADMIN_EMAIL = 'mayurhande90@gmail.com';
    // Use case-insensitive comparison for safety
    const isSuperAdmin = email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    if (!doc.exists) {
        const newUser: User = {
            uid: uid || '', 
            name: name || 'Creator',
            email: email || '',
            phoneNumber: phoneNumber || null,
            avatar: initials, 
            credits: 50,
            totalCreditsAcquired: 50,
            lifetimeGenerations: 0,
            plan: 'Free',
            signUpDate: firebase.firestore.FieldValue.serverTimestamp() as any,
            lastActive: firebase.firestore.FieldValue.serverTimestamp() as any,
            storageTier: 'limited',
            referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
            referralCount: 0,
            isAdmin: isSuperAdmin, 
            isBanned: false,
        };
        await userRef.set(sanitizeData(newUser));
        return newUser;
    }
    
    const userData = doc.data() as User;
    const updates: any = {};
    if (userData.lifetimeGenerations === undefined) updates.lifetimeGenerations = 0;
    if (userData.totalCreditsAcquired === undefined) updates.totalCreditsAcquired = userData.credits || 0;
    if (!userData.plan) updates.plan = 'Free';
    if (!userData.avatar) updates.avatar = initials;
    if (isSuperAdmin && userData.isAdmin !== true) updates.isAdmin = true;
    if (phoneNumber && userData.phoneNumber !== phoneNumber) updates.phoneNumber = phoneNumber;

    if (Object.keys(updates).length > 0) {
        await userRef.update(updates);
        return { ...userData, ...updates, uid: doc.id } as User;
    }
    return { ...userData, uid: doc.id } as User;
};

export const updateUserProfile = async (uid: string, data: Partial<User>) => {
    if (!db) return;
    await db.collection('users').doc(uid).update(sanitizeData(data));
};

export const subscribeToUserProfile = (uid: string, callback: (user: User | null) => void) => {
    if (!db) return () => {};
    return db.collection('users').doc(uid).onSnapshot((doc) => {
        if (doc.exists) callback({ uid: doc.id, ...doc.data() } as User);
        else callback(null);
    }, () => callback(null));
};

export const subscribeToAppConfig = (callback: (config: AppConfig | null) => void) => {
    if (!db) return () => {};
    return db.collection('config').doc('main').onSnapshot((doc) => {
        if (doc.exists) callback(doc.data() as AppConfig);
        else callback(null);
    }, () => callback(null));
};

export const updateAppConfig = async (config: AppConfig) => {
    if (!db) return;
    await db.collection('config').doc('main').set(config, { merge: true });
};

export const subscribeToAnnouncement = (callback: (announcement: Announcement | null) => void) => {
    if (!db) return () => {};
    return db.collection('config').doc('announcement').onSnapshot((doc) => {
        if (doc.exists) callback(doc.data() as Announcement);
        else callback(null);
    }, () => callback(null));
};

export const updateAnnouncement = async (uid: string, announcement: Announcement) => {
    if (!db) return;
    await db.collection('config').doc('announcement').set(announcement);
    await logAudit(uid, 'Update Announcement', `Updated: ${announcement.title}`);
};

export const getAnnouncement = async () => {
    if (!db) return null;
    const doc = await db.collection('config').doc('announcement').get();
    return doc.exists ? (doc.data() as Announcement) : null;
};

// --- FINANCIALS & USAGE LOGGING ---

/**
 * Logs a specific AI model call for financial tracking.
 */
export const logUsage = async (model: string, feature: string, userId: string, estimatedCost: number) => {
    if (!db) return;
    try {
        await db.collection('usage_logs').add({
            model,
            feature,
            userId,
            estimatedCost,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.error("Usage log failed", e);
    }
};

/**
 * Fetches usage logs for a specific time range.
 */
export const getUsageLogs = async (days = 30, start?: Date, end?: Date): Promise<UsageLog[]> => {
    if (!db) return [];
    
    let q = db.collection('usage_logs') as any;

    if (start || end) {
        if (start) q = q.where('timestamp', '>=', start);
        if (end) q = q.where('timestamp', '<=', end);
    } else if (days !== -1) {
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - days);
        q = q.where('timestamp', '>=', limitDate);
    }
    
    const qSnap = await q.orderBy('timestamp', 'desc').get();
    return qSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as UsageLog));
};

/**
 * Scans Firebase Storage to estimate size.
 */
export const scanStorageUsage = async (): Promise<{ totalBytes: number; fileCount: number }> => {
    if (!storage) return { totalBytes: 0, fileCount: 0 };
    
    let totalBytes = 0;
    let fileCount = 0;

    const scanFolder = async (path: string) => {
        const listRef = storage!.ref(path);
        const res = await listRef.listAll();
        
        const metadataPromises = res.items.map(async (item) => {
            const meta = await item.getMetadata();
            totalBytes += meta.size;
            fileCount++;
        });
        await Promise.all(metadataPromises);

        const subfolderPromises = res.prefixes.map(prefix => scanFolder(prefix.fullPath));
        await Promise.all(subfolderPromises);
    };

    try {
        await Promise.all([
            scanFolder('users'),
            scanFolder('global_vault'),
            scanFolder('admin/lab')
        ]);
    } catch (e) {
        console.error("Storage scan error", e);
    }

    return { totalBytes, fileCount };
};

// --- TRANSFORMATION LAB SYNC FUNCTIONS ---

export const subscribeToLabConfig = (callback: (config: Record<string, { before: string, after: string }>) => void) => {
    if (!db) return () => {};
    return db.collection('config').doc('transformation_lab').onSnapshot((doc) => {
        if (doc.exists) callback(doc.data() as any);
        else callback({});
    }, () => callback({}));
};

// Fix: Support both arrays and objects in lab collections subscription to allow more flexible structure management
export const subscribeToLabCollections = (callback: (config: Record<string, any[] | Record<string, any>>) => void) => {
    if (!db) return () => {};
    return db.collection('config').doc('transformation_lab_collections').onSnapshot((doc) => {
        if (doc.exists) callback(doc.data() as any);
        else callback({});
    }, () => callback({}));
};

// Fix: Update type to allow both arrays and objects to support slot-based manager logic in AdminLabManager
export const updateLabCollection = async (collectionId: string, items: any[] | Record<string, any>) => {
    if (!db) return;
    await db.collection('config').doc('transformation_lab_collections').set({
        [collectionId]: items
    }, { merge: true });
};

export const updateLabConfig = async (featureId: string, data: { before?: string, after?: string }) => {
    if (!db) return;
    await db.collection('config').doc('transformation_lab').set({
        [featureId]: data
    }, { merge: true });
};

export const uploadLabAsset = async (uid: string, dataUri: string, featureId: string, type: string) => {
    if (!storage) throw new Error("Storage not initialized");
    const response = await fetch(dataUri);
    const blob = await response.blob();
    const ext = blob.type.split('/')[1] || 'png';
    const filename = `${featureId}_${type}_${Date.now()}.${ext}`;
    const path = `admin/lab/${filename}`;
    const ref = storage.ref().child(path);
    await ref.put(blob, { contentType: blob.type, customMetadata: { uploadedBy: uid, labFeature: featureId, assetType: type } });
    return await ref.getDownloadURL();
};

export const saveCreation = async (uid: string, imageUrl: string, feature: string, originalImage?: { base64: string; mimeType: string }, originalPrompt?: string): Promise<string> => {
    if (!db) throw new Error("DB not initialized");
    let finalImage = imageUrl;
    
    // AGGRESSIVE OPTIMIZATION for Firestore 1MB document limit
    // base64 length is roughly 1.37x the actual byte size.
    // 1,000,000 chars is approx 730KB.
    if (finalImage.length > 800000 && finalImage.startsWith('data:image')) {
        try { 
            // First pass: 1536px, 0.7 quality
            finalImage = await resizeImage(finalImage, 1536, 0.7); 
            
            // Second pass if still too large: 1024px, 0.5 quality
            if (finalImage.length > 950000) {
                finalImage = await resizeImage(finalImage, 1024, 0.5);
            }
        } catch (e) { 
            console.warn("Auto-resize for storage failed", e); 
        }
    }
    
    const docRef = await db.collection('users').doc(uid).collection('creations').add(sanitizeData({
        imageUrl: finalImage,
        feature,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        storagePath: '',
        originalImage,
        originalPrompt
    }));
    return docRef.id;
};

export const updateCreation = async (uid: string, creationId: string, imageUrl: string, originalImage?: { base64: string; mimeType: string }, originalPrompt?: string): Promise<void> => {
    if (!db) throw new Error("DB not initialized");
    let finalImage = imageUrl;
    
    // AGGRESSIVE OPTIMIZATION for Firestore 1MB document limit
    if (finalImage.length > 800000 && finalImage.startsWith('data:image')) {
        try { 
            // First pass
            finalImage = await resizeImage(finalImage, 1536, 0.7); 
            
            // Second pass if still too large
            if (finalImage.length > 950000) {
                finalImage = await resizeImage(finalImage, 1024, 0.5);
            }
        } catch (e) { 
            console.warn("Auto-resize for storage update failed", e); 
        }
    }
    
    await db.collection('users').doc(uid).collection('creations').doc(creationId).update(sanitizeData({
        imageUrl: finalImage,
        lastEditedAt: firebase.firestore.FieldValue.serverTimestamp(),
        originalImage,
        originalPrompt
    }));
};

export const getCreations = async (uid: string) => {
    if (!db) return [];
    try {
        const snapshot = await db.collection('users').doc(uid).collection('creations')
            .orderBy('createdAt', 'desc')
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.warn("Creations fetch ordered failed, falling back", e);
        const snapshot = await db.collection('users').doc(uid).collection('creations').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    }
};

export const getCreationById = async (uid: string, creationId: string): Promise<Creation | null> => {
    if (!db) return null;
    const doc = await db.collection('users').doc(uid).collection('creations').doc(creationId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Creation;
};

export const deleteCreation = async (uid: string, creation: Creation) => {
    if (!db) return;
    await db.collection('users').doc(uid).collection('creations').doc(creation.id).delete();
};

/**
 * Deduct Credits logic - SECURE REFACTOR
 */
export const deductCredits = async (userId: string, amount: number, featureName: string) => {
    if (!db) throw new Error("Database not initialized.");
    if (!userId) throw new Error("User ID is missing.");
    
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) throw new Error("User profile not found");
    
    const userData = { uid: userDoc.id, ...userDoc.data() } as User;
    const currentCredits = userData.credits || 0;
    
    if (currentCredits < amount) {
        throw new Error(`Insufficient credits. You need ${amount} but have ${currentCredits}.`);
    }

    const newCredits = currentCredits - amount;
    const newGens = (userData.lifetimeGenerations || 0) + 1;

    if (!USE_SECURE_BACKEND) {
        await db.runTransaction(async (transaction) => {
            transaction.update(userRef, sanitizeData({ 
                credits: newCredits,
                lifetimeGenerations: firebase.firestore.FieldValue.increment(1),
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            }));
            
            const transactionRef = userRef.collection('transactions').doc();
            transaction.set(transactionRef, sanitizeData({
                feature: featureName,
                cost: amount,
                date: firebase.firestore.FieldValue.serverTimestamp()
            }));
        });
    }
    
    return { ...userData, credits: newCredits, lifetimeGenerations: newGens } as User;
};

export const getCreditHistory = async (uid: string) => {
    if (!db) return [];
    try {
        const snapshot = await db.collection('users').doc(uid).collection('transactions')
            .orderBy('date', 'desc')
            .limit(50)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e: any) {
        console.warn("Ordered history fetch failed, falling back", e);
        const snapshot = await db.collection('users').doc(uid).collection('transactions')
            .limit(50)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a: any, b: any) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
    }
};

export const purchaseTopUp = async (uid: string, packName: string, credits: number, price: number) => {
    if (!db) throw new Error("DB not initialized");
    const userRef = db.collection('users').doc(uid);
    await userRef.update(sanitizeData({
        credits: firebase.firestore.FieldValue.increment(credits),
        totalCreditsAcquired: firebase.firestore.FieldValue.increment(credits),
        totalSpent: firebase.firestore.FieldValue.increment(price),
        plan: packName,
        ...(packName.includes('Studio') || packName.includes('Agency') ? { 
            storageTier: 'unlimited', 
            basePlan: packName,
            lastTierPurchaseDate: firebase.firestore.FieldValue.serverTimestamp() 
        } : {})
    }));
    await userRef.collection('transactions').add(sanitizeData({
        feature: `Purchase: ${packName}`,
        cost: 0,
        creditChange: `+${credits}`,
        date: firebase.firestore.FieldValue.serverTimestamp(),
        pricePaid: price
    }));
    await db.collection('purchases').add(sanitizeData({
        userId: uid,
        packName,
        creditsAdded: credits,
        amountPaid: price,
        purchaseDate: firebase.firestore.FieldValue.serverTimestamp()
    }));
    const userSnap = await userRef.get();
    return { uid: userSnap.id, ...userSnap.data() } as User;
};

export const purchaseCreditRefill = async (uid: string, credits: number, price: number) => {
    if (!db) throw new Error("DB not initialized");
    const userRef = db.collection('users').doc(uid);
    await userRef.update(sanitizeData({
        credits: firebase.firestore.FieldValue.increment(credits),
        totalCreditsAcquired: firebase.firestore.FieldValue.increment(credits),
        totalSpent: firebase.firestore.FieldValue.increment(price),
    }));
    await userRef.collection('transactions').add(sanitizeData({
        feature: `Credit Refill`,
        cost: 0,
        creditChange: `+${credits}`,
        date: firebase.firestore.FieldValue.serverTimestamp(),
        pricePaid: price
    }));
    const userSnap = await userRef.get();
    return { uid: userSnap.id, ...userSnap.data() } as User;
};

export const claimDailyAttendance = async (uid: string) => {
    if (!db) throw new Error("DB not initialized");
    const userRef = db.collection('users').doc(uid);
    await userRef.update({
        credits: firebase.firestore.FieldValue.increment(1),
        lastAttendanceClaim: firebase.firestore.FieldValue.serverTimestamp()
    });
    await userRef.collection('transactions').add(sanitizeData({
        feature: 'Daily Check-in',
        creditChange: '+1',
        cost: 0,
        date: firebase.firestore.FieldValue.serverTimestamp()
    }));
    const snap = await userRef.get();
    return { uid: snap.id, ...snap.data() } as User;
};

export const completeDailyMission = async (uid: string, reward: number, missionId: string) => {
    if (!db) throw new Error("DB not initialized");
    const userRef = db.collection('users').doc(uid);
    const nextUnlock = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await userRef.update(sanitizeData({
        credits: firebase.firestore.FieldValue.increment(reward),
        dailyMission: {
            completedAt: new Date().toISOString(),
            nextUnlock: nextUnlock,
            lastMissionId: missionId
        }
    }));
    await userRef.collection('transactions').add(sanitizeData({
        feature: 'Daily Mission Reward',
        creditChange: `+${reward}`,
        cost: 0,
        date: firebase.firestore.FieldValue.serverTimestamp()
    }));
    const snap = await userRef.get();
    return { uid: snap.id, ...snap.data() } as User;
};

export const claimReferralCode = async (uid: string, code: string) => {
    if (!db) throw new Error("DB not initialized");
    const snapshot = await db.collection('users').where('referralCode', '==', code).get();
    if (snapshot.empty) throw new Error("Invalid referral code.");
    const referrerDoc = snapshot.docs[0];
    const referrerId = referrerDoc.id;
    if (referrerId === uid) throw new Error("Cannot refer yourself.");
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (userSnap.data()?.referredBy) throw new Error("You have already claimed a referral.");
    await db.runTransaction(async (t) => {
        t.update(userRef, {
            referredBy: code,
            credits: firebase.firestore.FieldValue.increment(10)
        });
        const userTx = userRef.collection('transactions').doc();
        t.set(userTx, sanitizeData({
            feature: 'Referral Bonus (Claimed)',
            creditChange: '+10',
            date: firebase.firestore.FieldValue.serverTimestamp()
        }));
        if (!db) throw new Error("Database not initialized");
        const refUserRef = db.collection('users').doc(referrerId);
        t.update(refUserRef, {
            referralCount: firebase.firestore.FieldValue.increment(1),
            credits: firebase.firestore.FieldValue.increment(10)
        });
        const refTx = refUserRef.collection('transactions').doc();
        t.set(refTx, sanitizeData({
            feature: 'Referral Bonus (Friend Joined)',
            creditChange: '+10',
            date: firebase.firestore.FieldValue.serverTimestamp()
        }));
    });
    const updatedSnap = await userRef.get();
    return { uid: updatedSnap.id, ...updatedSnap.data() } as User;
};

export const getUserBrands = async (uid: string) => {
    if (!db) return [];
    const snapshot = await db.collection('users').doc(uid).collection('brands').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BrandKit));
};

export const subscribeToUserBrands = (uid: string, callback: (brands: BrandKit[]) => void) => {
    if (!db) return () => {};
    return db.collection('users').doc(uid).collection('brands')
        .onSnapshot((snapshot) => {
            const brands = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BrandKit));
            callback(brands);
        }, () => callback([]));
};

export const saveBrandToCollection = async (uid: string, brand: BrandKit) => {
    if (!db) return;
    const collectionRef = db.collection('users').doc(uid).collection('brands');
    if (brand.id) {
        await collectionRef.doc(brand.id).set(sanitizeData(brand), { merge: true });
        return brand.id;
    } else {
        const docRef = await collectionRef.add(sanitizeData(brand));
        return docRef.id;
    }
};

export const activateBrand = async (uid: string, brandId: string) => {
    if (!db) return;
    const brandSnap = await db.collection('users').doc(uid).collection('brands').doc(brandId).get();
    if (!brandSnap.exists) throw new Error("Brand not found");
    return { id: brandSnap.id, ...brandSnap.data() } as BrandKit;
};

export const deactivateBrand = async (uid: string) => { return null; };
export const deleteBrandFromCollection = async (uid: string, brandId: string) => { if (!db) return; await db.collection('users').doc(uid).collection('brands').doc(brandId).delete(); };
export const saveUserBrandKit = async (uid: string, brandKit: BrandKit) => { if (!db) return; const brandId = await saveBrandToCollection(uid, brandKit); return { ...brandKit, id: brandId }; };

export const uploadBrandAsset = async (uid: string, dataUri: string, type: string) => {
    if (!storage) throw new Error("Storage not initialized");
    const response = await fetch(dataUri);
    const blob = await response.blob();
    const ext = blob.type.split('/')[1] || 'png';
    const filename = `${type}_${Date.now()}.${ext}`;
    const path = `users/${uid}/brandKit/${filename}`;
    const ref = storage.ref().child(path);
    await ref.put(blob, { contentType: blob.type, customMetadata: { uploadedBy: uid, assetType: type } });
    return await ref.getDownloadURL();
};

export const saveSupportMessage = async (uid: string, message: any) => { if (!db) return; await db.collection('users').doc(uid).collection('support_chat').doc(message.id).set(sanitizeData(message)); };
export const getSupportHistory = async (uid: string) => { if (!db) return []; const snap = await db.collection('users').doc(uid).collection('support_chat').orderBy('timestamp', 'asc').get(); return snap.docs.map(d => d.data()); };
export const clearSupportChat = async (uid: string) => { if (!db) return; const ref = db.collection('users').doc(uid).collection('support_chat'); const snapshot = await ref.get(); if (snapshot.size === 0) return; const batch = db.batch(); snapshot.docs.forEach((doc) => { batch.delete(doc.ref); }); await batch.commit(); };
export const submitFeedback = async (uid: string, creationId: string | null, feedback: 'up' | 'down', feature: string = 'Unknown', imageUrl: string | null = null, userEmail: string = '', userName: string = '') => { if (!db) return; await db.collection('feedbacks').add(sanitizeData({ userId: uid, creationId: creationId, feedback: feedback, feature: feature, imageUrl: imageUrl, userEmail: userEmail, userName: userName, timestamp: firebase.firestore.Timestamp.now() })); };
export const getRecentFeedbacks = async (limit = 100) => { if (!db) return []; const snap = await db.collection('feedbacks').orderBy('timestamp', 'desc').limit(limit).get(); return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); };
export const getAllUsers = async (limit = 100) => { if (!db) return []; const snapshot = await db.collection('users').limit(limit).get(); return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)); };

export const findUserByEmail = async (email: string): Promise<User | null> => {
    if (!db) return null;
    const snap = await db.collection('users').where('email', '==', email.toLowerCase().trim()).limit(1).get();
    if (snap.empty) return null;
    return { uid: snap.docs[0].id, ...snap.docs[0].data() } as User;
};

export const findUserByPhone = async (phone: string): Promise<User | null> => {
    if (!db) return null;
    // We try both with and without + prefix just in case
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    let snap = await db.collection('users').where('phoneNumber', '==', phone.trim()).limit(1).get();
    if (snap.empty) {
        snap = await db.collection('users').where('phoneNumber', '==', `+${cleanPhone}`).limit(1).get();
    }
    if (snap.empty) return null;
    return { uid: snap.docs[0].id, ...snap.docs[0].data() } as User;
};

export const mergeUserAccounts = async (sourceUid: string, targetUid: string, adminUid?: string) => {
    if (!db) throw new Error("DB not initialized");
    
    const sourceRef = db.collection('users').doc(sourceUid);
    const targetRef = db.collection('users').doc(targetUid);
    
    const [sourceDoc, targetDoc] = await Promise.all([sourceRef.get(), targetRef.get()]);
    
    if (!sourceDoc.exists || !targetDoc.exists) throw new Error("One or both users not found.");
    
    const sourceData = sourceDoc.data() as User;
    const targetData = targetDoc.data() as User;
    
    // 1. Calculate Paid Credits (Subtract 50 free credits from source to avoid duplication)
    const sourcePaidCredits = Math.max(0, (sourceData.credits || 0) - 50);
    const sourcePaidTotal = Math.max(0, (sourceData.totalCreditsAcquired || 0) - 50);
    
    const batch = db.batch();
    
    // 2. Update Target Profile
    const targetUpdates: any = {
        credits: firebase.firestore.FieldValue.increment(sourcePaidCredits),
        totalCreditsAcquired: firebase.firestore.FieldValue.increment(sourcePaidTotal),
    };
    
    // If target has no phone, copy source phone
    if (!targetData.phoneNumber && sourceData.phoneNumber) {
        targetUpdates.phoneNumber = sourceData.phoneNumber;
    }
    
    // If target has no email, copy source email
    if (!targetData.email && sourceData.email) {
        targetUpdates.email = sourceData.email;
    }
    
    batch.update(targetRef, targetUpdates);
    
    // 3. Migrate Subcollections (Creations, Brands, Transactions, Support)
    const migrateSubcollection = async (collName: string) => {
        const snap = await sourceRef.collection(collName).get();
        snap.docs.forEach(doc => {
            const data = doc.data();
            batch.set(targetRef.collection(collName).doc(doc.id), data);
            batch.delete(doc.ref);
        });
    };
    
    await Promise.all([
        migrateSubcollection('creations'),
        migrateSubcollection('brands'),
        migrateSubcollection('transactions'),
        migrateSubcollection('support_chat')
    ]);
    
    // 4. Migrate Root Collections with userId field
    const migrateRootCollection = async (collName: string) => {
        const snap = await db!.collection(collName).where('userId', '==', sourceUid).get();
        snap.docs.forEach(doc => {
            batch.update(doc.ref, { userId: targetUid });
        });
    };
    
    await Promise.all([
        migrateRootCollection('usage_logs'),
        migrateRootCollection('purchases'),
        migrateRootCollection('feedbacks'),
        migrateRootCollection('api_errors')
    ]);
    
    // 5. Delete Source Profile
    batch.delete(sourceRef);
    
    // 6. Commit Batch
    await batch.commit();
    
    if (adminUid) {
        await logAudit(adminUid, 'Merge Accounts', `Merged ${sourceUid} into ${targetUid}. Transferred ${sourcePaidCredits} paid credits.`);
    }
};

export const unlinkUserPhone = async (adminUid: string, uid: string) => {
    if (!db) return;
    await db.collection('users').doc(uid).update({
        phoneNumber: null,
        phoneUnlinked: true
    });
    await logAudit(adminUid, 'Unlink Phone', `Removed phone from user ${uid}`);
};

export const unlinkUserEmail = async (adminUid: string, uid: string) => {
    if (!db) return;
    await db.collection('users').doc(uid).update({
        email: ''
    });
    await logAudit(adminUid, 'Unlink Email', `Removed email from user ${uid}`);
};

export const adminLinkUserPhone = async (adminUid: string, targetUid: string, phoneNumber: string) => {
    if (!db) return;
    
    // 1. Check if this phone is already in use
    const existingUser = await findUserByPhone(phoneNumber);
    
    if (existingUser) {
        if (existingUser.uid === targetUid) {
            throw new Error("This phone number is already linked to this user.");
        }
        // If it's another user, we offer to merge
        throw new Error(`This phone number is already linked to another user (${existingUser.email || existingUser.uid}). Please use the Merge tool instead or unlink it first.`);
    }

    // 2. Update the target user
    await db.collection('users').doc(targetUid).update({
        phoneNumber: phoneNumber.trim(),
        phoneUnlinked: firebase.firestore.FieldValue.delete()
    });

    await logAudit(adminUid, 'Manual Phone Link', `Linked ${phoneNumber} to user ${targetUid}`);
};

export const adminLinkUserEmail = async (adminUid: string, targetUid: string, email: string) => {
    if (!db) return;
    
    // 1. Check if this email is already in use
    const existingUser = await findUserByEmail(email);
    
    if (existingUser) {
        if (existingUser.uid === targetUid) {
            throw new Error("This email is already linked to this user.");
        }
        throw new Error(`This email is already linked to another user (${existingUser.phoneNumber || existingUser.uid}). Please use the Merge tool instead or unlink it first.`);
    }

    // 2. Update the target user
    await db.collection('users').doc(targetUid).update({
        email: email.toLowerCase().trim()
    });

    await logAudit(adminUid, 'Manual Email Link', `Linked ${email} to user ${targetUid}`);
};
export const subscribeToRecentActiveUsers = (callback: (users: User[]) => void, limit = 20) => { if (!db) return () => {}; return db.collection('users').orderBy('lastActive', 'desc').limit(limit).onSnapshot((snapshot) => { const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as unknown as User)); callback(users); }); };
export const addCreditsToUser = async (adminUid: string, targetUid: string, amount: number, reason: string) => { if (!db) return; const userRef = db.collection('users').doc(targetUid); await userRef.update({ credits: firebase.firestore.FieldValue.increment(amount), creditGrantNotification: sanitizeData({ amount: amount, message: reason || 'Admin Grant', type: 'credit', timestamp: firebase.firestore.Timestamp.now() }) }); await userRef.collection('transactions').add(sanitizeData({ feature: 'Admin Grant', reason, creditChange: `+${amount}`, cost: 0, grantedBy: adminUid, date: firebase.firestore.FieldValue.serverTimestamp() })); await logAudit(adminUid, 'Grant Credits', `Granted ${amount} to ${targetUid}. Reason: ${reason}`); };
export const grantPackageToUser = async (adminUid: string, targetUid: string, pack: CreditPack, message: string) => { if (!db) return; const userRef = db.collection('users').doc(targetUid); await userRef.update(sanitizeData({ credits: firebase.firestore.FieldValue.increment(pack.totalCredits), totalCreditsAcquired: firebase.firestore.FieldValue.increment(pack.totalCredits), plan: pack.name, ...(pack.name.includes('Studio') || pack.name.includes('Agency') ? { storageTier: 'unlimited', basePlan: pack.name, lastTierPurchaseDate: firebase.firestore.FieldValue.serverTimestamp() } : {}), creditGrantNotification: { amount: pack.totalCredits, message: message, type: 'package', packageName: pack.name, timestamp: firebase.firestore.Timestamp.now() } })); await userRef.collection('transactions').add(sanitizeData({ feature: `Grant: ${pack.name}`, reason: message, creditChange: `+${pack.totalCredits}`, cost: 0, grantedBy: adminUid, date: firebase.firestore.FieldValue.serverTimestamp() })); await logAudit(adminUid, 'Grant Package', `Granted ${pack.name} to ${targetUid}. Msg: ${message}`); };
export const toggleUserBan = async (adminUid: string, targetUid: string, isBanned: boolean) => { if (!db) return; await db.collection('users').doc(targetUid).update({ isBanned }); await logAudit(adminUid, isBanned ? 'Ban User' : 'Unban User', `Target: ${targetUid}`); };
export const getRecentSignups = async (limit = 10) => { if (!db) return []; const snap = await db.collection('users').orderBy('signUpDate', 'desc').limit(limit).get(); return snap.docs.map(d => ({ uid: d.id, ...d.data() } as User)); };
export const getRecentPurchases = async (limit = 10, start?: Date, end?: Date): Promise<Purchase[]> => { 
    if (!db) return []; 
    let q = db.collection('purchases') as any;
    if (start) q = q.where('purchaseDate', '>=', start);
    if (end) q = q.where('purchaseDate', '<=', end);
    const snap = await q.orderBy('purchaseDate', 'desc').limit(limit).get(); 
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Purchase)); 
};
export const getDashboardStats = async () => { if (!db) return { revenue: 0, totalUsers: 0 }; try { const pSnap = await db.collection('purchases').get(); const revenue = pSnap.docs.reduce((acc, doc) => acc + (doc.data().amountPaid || 0), 0); const uSnap = await db.collection('users').get(); const totalUsers = uSnap.size; return { revenue, totalUsers }; } catch (e) { return { revenue: 0, totalUsers: 0 }; } };
export const getTotalRevenue = async (start?: Date, end?: Date) => { if (!db) return 0; let q = db.collection('purchases') as any; if (start) q = q.where('purchaseDate', '>=', start); if (end) q = q.where('purchaseDate', '<=', end); const snap = await q.get(); return snap.docs.reduce((sum: number, doc: any) => sum + (doc.data().amountPaid || 0), 0); };
export const getRevenueStats = async (days = 7) => { return []; };
export const logAudit = async (adminUid: string, action: string, details: string) => { if (!db) return; await db.collection('audit_logs').add(sanitizeData({ adminEmail: auth?.currentUser?.email || adminUid, action, details, timestamp: firebase.firestore.Timestamp.now() })); };
export const getAuditLogs = async (limit = 50) => { if (!db) return []; const snap = await db.collection('audit_logs').orderBy('timestamp', 'desc').limit(limit).get(); return snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog)); };
export const logApiError = async (endpoint: string, error: string, userId?: string) => { if (!db) return; await db.collection('api_errors').add(sanitizeData({ endpoint, error, userId: userId || 'anonymous', timestamp: firebase.firestore.Timestamp.now() })); };
export const getApiErrorLogs = async (limit = 50) => { if (!db) return []; const snap = await db.collection('api_errors').orderBy('timestamp', 'desc').limit(limit).get(); return snap.docs.map(d => ({ id: d.id, ...d.data() } as ApiErrorLog)); };
export const sendSystemNotification = async (adminUid: string, targetUid: string, title: string, message: string, type: string, style: string, link?: string) => { if (!db) return; await db.collection('users').doc(targetUid).update({ systemNotification: sanitizeData({ title, message, type, style, link: link || null, read: false, timestamp: firebase.firestore.Timestamp.now() }) }); await logAudit(adminUid, 'Send Notification', `To ${targetUid}: ${title}`); };
export const clearCreditGrantNotification = async (uid: string) => { if (!db) return; await db.collection('users').doc(uid).update({ creditGrantNotification: null }); };
export const getGlobalFeatureUsage = async () => { return []; };
export const claimMilestoneBonus = async (uid: string, amount: number) => {
    if (!db) return;
    const userRef = db.collection('users').doc(uid);
    // Optimistic UI logic: Only write if secure backend is off
    if (!USE_SECURE_BACKEND) {
        await userRef.update({
            credits: firebase.firestore.FieldValue.increment(amount)
        });
        await userRef.collection('transactions').add(sanitizeData({
            feature: 'Milestone Bonus',
            creditChange: `+${amount}`,
            cost: 0,
            date: firebase.firestore.FieldValue.serverTimestamp()
        }));
    }
    const snap = await userRef.get();
    return { uid: snap.id, ...snap.data() } as User;
};

// --- GLOBAL STYLE VAULT FUNCTIONS ---

export const getVaultImages = async (featureId: string, subCategoryId?: string): Promise<VaultReference[]> => {
    if (!db) return [];
    try {
        let collRef;
        if (subCategoryId) {
            collRef = db.collection('global_vault').doc(featureId).collection('categories').doc(subCategoryId).collection('references');
        } else {
            collRef = db.collection('global_vault').doc(featureId).collection('references');
        }
        const snap = await collRef.orderBy('addedAt', 'desc').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as VaultReference));
    } catch(e) {
        console.warn("Vault fetch error", e);
        return [];
    }
};

export const getRandomVaultImage = async (featureId: string, subCategoryId?: string): Promise<VaultReference | null> => {
    try {
        const images = await getVaultImages(featureId, subCategoryId);
        if (images.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * images.length);
        return images[randomIndex];
    } catch (e) {
        console.warn("Random vault fetch error", e);
        return null;
    }
};

export const uploadVaultImage = async (adminUid: string, featureId: string, dataUri: string, subCategoryId?: string): Promise<string> => {
    if (!storage || !db) throw new Error("Init error");
    
    // 1. Upload to Storage
    const response = await fetch(dataUri);
    const blob = await response.blob();
    const ext = blob.type.split('/')[1] || 'jpg';
    
    const storagePath = subCategoryId 
        ? `global_vault/${featureId}/categories/${subCategoryId}/${Date.now()}.${ext}`
        : `global_vault/${featureId}/${Date.now()}.${ext}`;
        
    const ref = storage.ref().child(storagePath);
    await ref.put(blob);
    const url = await ref.getDownloadURL();

    // 2. Add to Firestore
    let collRef;
    if (subCategoryId) {
        collRef = db.collection('global_vault').doc(featureId).collection('categories').doc(subCategoryId).collection('references');
    } else {
        collRef = db.collection('global_vault').doc(featureId).collection('references');
    }
    
    const docRef = await collRef.add({
        imageUrl: url,
        addedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await logAudit(adminUid, 'Vault Upload', `Feature: ${featureId}, SubCat: ${subCategoryId || 'None'}, ID: ${docRef.id}`);
    return docRef.id;
};

export const deleteVaultImage = async (adminUid: string, featureId: string, imageId: string, subCategoryId?: string) => {
    if (!db) return;
    let collRef;
    if (subCategoryId) {
        collRef = db.collection('global_vault').doc(featureId).collection('categories').doc(subCategoryId).collection('references');
    } else {
        collRef = db.collection('global_vault').doc(featureId).collection('references');
    }
    await collRef.doc(imageId).delete();
    await logAudit(adminUid, 'Vault Delete', `Feature: ${featureId}, SubCat: ${subCategoryId || 'None'}, ID: ${imageId}`);
};

export const getVaultFolderConfig = async (featureId: string, subCategoryId?: string): Promise<VaultFolderConfig | null> => {
    if (!db) return null;
    let docRef;
    if (subCategoryId) {
        docRef = db.collection('global_vault').doc(featureId).collection('categories').doc(subCategoryId);
    } else {
        docRef = db.collection('global_vault').doc(featureId);
    }
    
    const doc = await docRef.get();
    if (!doc.exists) return null;
    return { featureId: doc.id, ...doc.data() } as VaultFolderConfig;
};

export const updateVaultFolderConfig = async (adminUid: string, featureId: string, dna: string, subCategoryId?: string) => {
    if (!db) return;
    let docRef;
    if (subCategoryId) {
        docRef = db.collection('global_vault').doc(featureId).collection('categories').doc(subCategoryId);
    } else {
        docRef = db.collection('global_vault').doc(featureId);
    }
    
    await docRef.set({
        dna,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    await logAudit(adminUid, 'Vault Update DNA', `Feature: ${featureId}, SubCat: ${subCategoryId || 'None'}`);
};
