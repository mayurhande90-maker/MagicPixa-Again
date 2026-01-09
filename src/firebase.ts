import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import { AppConfig, Purchase, User, BrandKit, AuditLog, Announcement, ApiErrorLog, CreditPack, Creation, Transaction, VaultReference, VaultFolderConfig } from './types';
import { resizeImage } from './utils/imageUtils';
import { USE_SECURE_BACKEND } from './services/geminiClient';

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
    return !!value && value !== 'undefined' && value !== '';
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

export let app: firebase.app.App | null = null;
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
}

/**
 * Helper to strip undefined values from objects before Firestore writes.
 */
const sanitizeData = (data: any) => {
    const clean: any = {};
    Object.keys(data).forEach(key => {
        if (data[key] !== undefined) {
            clean[key] = data[key];
        }
    });
    return clean;
};

export const signInWithGoogle = async () => {
    if (!auth) throw new Error("Firebase Auth is not initialized.");
    const provider = new firebase.auth.GoogleAuthProvider();
    return await auth.signInWithPopup(provider);
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

export const getOrCreateUserProfile = async (uid: string, name: string, email: string | null) => {
    if (!db) return;
    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();
    
    const initials = name && name.trim()
        ? name.trim().split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
        : email?.substring(0, 2).toUpperCase() || 'U';

    const SUPER_ADMIN_EMAIL = 'mayurhande90@gmail.com';
    const isSuperAdmin = email === SUPER_ADMIN_EMAIL;

    if (!doc.exists) {
        const newUser: User = {
            uid: uid || '', 
            name: name || 'Creator',
            email: email || '',
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

    if (Object.keys(updates).length > 0) {
        await userRef.update(updates);
        return { uid: doc.id, ...userData, ...updates } as User;
    }
    return { uid: doc.id, ...userData } as User;
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

// --- TRANSFORMATION LAB SYNC FUNCTIONS ---

export const subscribeToLabConfig = (callback: (config: Record<string, { before: string, after: string }>) => void) => {
    if (!db) return () => {};
    return db.collection('config').doc('transformation_lab').onSnapshot((doc) => {
        if (doc.exists) callback(doc.data() as any);
        else callback({});
    }, () => callback({}));
};

export const updateLabConfig = async (featureId: string, data: { before?: string, after?: string }) => {
    if (!db) return;
    await db.collection('config').doc('transformation_lab').set({
        [featureId]: data
    }, { merge: true });
};

export const uploadLabAsset = async (uid: string, dataUri: string, featureId: string, type: 'before' | 'after') => {
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

export const saveCreation = async (uid: string, imageUrl: string, feature: string): Promise<string> => {
    if (!db) throw new Error("DB not initialized");
    let finalImage = imageUrl;
    if (finalImage.length > 800000 && finalImage.startsWith('data:image')) {
        try { finalImage = await resizeImage(finalImage, 1024, 0.7); } catch (e) { console.warn(e); }
    }
    const docRef = await db.collection('users').doc(uid).collection('creations').add({
        imageUrl: finalImage,
        feature,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        storagePath: ''
    });
    return docRef.id;
};

export const updateCreation = async (uid: string, creationId: string, imageUrl: string): Promise<void> => {
    if (!db) throw new Error("DB not initialized");
    let finalImage = imageUrl;
    if (finalImage.length > 800000 && finalImage.startsWith('data:image')) {
        try { finalImage = await resizeImage(finalImage, 1024, 0.7); } catch (e) { console.warn(e); }
    }
    await db.collection('users').doc(uid).collection('creations').doc(creationId).update({
        imageUrl: finalImage,
        lastEditedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
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
 * If USE_SECURE_BACKEND is enabled, this function acts as an "Optimistic UI Update".
 * It calculates the next state so the user sees their balance drop immediately,
 * while the server-side API handles the actual Firestore transaction.
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

    // OPTIMISTIC UPDATE / FALLBACK
    // If we are NOT using the secure backend, we attempt a client-side write (legacy/dev mode).
    // If we ARE using the secure backend, we skip this to prevent double-spending.
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
    // Note: In production, this write should be triggered by a Stripe/Razorpay Webhook for security.
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
export const subscribeToRecentActiveUsers = (callback: (users: User[]) => void, limit = 20) => { if (!db) return () => {}; return db.collection('users').orderBy('lastActive', 'desc').limit(limit).onSnapshot((snapshot) => { const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as unknown as User)); callback(users); }); };
export const addCreditsToUser = async (adminUid: string, targetUid: string, amount: number, reason: string) => { if (!db) return; const userRef = db.collection('users').doc(targetUid); await userRef.update({ credits: firebase.firestore.FieldValue.increment(amount), creditGrantNotification: sanitizeData({ amount: amount, message: reason || 'Admin Grant', type: 'credit', timestamp: firebase.firestore.Timestamp.now() }) }); await userRef.collection('transactions').add(sanitizeData({ feature: 'Admin Grant', reason, creditChange: `+${amount}`, cost: 0, grantedBy: adminUid, date: firebase.firestore.FieldValue.serverTimestamp() })); await logAudit(adminUid, 'Grant Credits', `Granted ${amount} to ${targetUid}. Reason: ${reason}`); };
export const grantPackageToUser = async (adminUid: string, targetUid: string, pack: CreditPack, message: string) => { if (!db) return; const userRef = db.collection('users').doc(targetUid); await userRef.update(sanitizeData({ credits: firebase.firestore.FieldValue.increment(pack.totalCredits), totalCreditsAcquired: firebase.firestore.FieldValue.increment(pack.totalCredits), plan: pack.name, ...(pack.name.includes('Studio') || pack.name.includes('Agency') ? { storageTier: 'unlimited', basePlan: pack.name, lastTierPurchaseDate: firebase.firestore.FieldValue.serverTimestamp() } : {}), creditGrantNotification: { amount: pack.totalCredits, message: message, type: 'package', packageName: pack.name, timestamp: firebase.firestore.Timestamp.now() } })); await userRef.collection('transactions').add(sanitizeData({ feature: `Grant: ${pack.name}`, reason: message, creditChange: `+${pack.totalCredits}`, cost: 0, grantedBy: adminUid, date: firebase.firestore.FieldValue.serverTimestamp() })); await logAudit(adminUid, 'Grant Package', `Granted ${pack.name} to ${targetUid}. Msg: ${message}`); };
export const toggleUserBan = async (adminUid: string, targetUid: string, isBanned: boolean) => { if (!db) return; await db.collection('users').doc(targetUid).update({ isBanned }); await logAudit(adminUid, isBanned ? 'Ban User' : 'Unban User', `Target: ${targetUid}`); };
export const getRecentSignups = async (limit = 10) => { if (!db) return []; const snap = await db.collection('users').orderBy('signUpDate', 'desc').limit(limit).get(); return snap.docs.map(d => ({ uid: d.id, ...d.data() } as User)); };
export const getRecentPurchases = async (limit = 10): Promise<Purchase[]> => { if (!db) return []; const snap = await db.collection('purchases').orderBy('purchaseDate', 'desc').limit(limit).get(); return snap.docs.map(d => ({ id: d.id, ...d.data() } as Purchase)); };
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