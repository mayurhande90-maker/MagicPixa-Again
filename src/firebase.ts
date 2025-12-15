
// ... existing imports
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import { AppConfig, Purchase, User, BrandKit, AuditLog, Announcement, ApiErrorLog, CreditPack, Creation, Transaction } from './types';
import { resizeImage } from './utils/imageUtils';

// ... (keep existing configuration code up to getUserBrands) ...
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
} else {
  console.error("Configuration is missing or incomplete. Please check your environment variables. Missing:", missingKeys.join(', '));
}

// ... existing Auth Helpers ...
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

// Explicit function to update last active timestamp cheaply
export const updateUserLastActive = async (uid: string) => {
    if (!db) return;
    try {
        await db.collection('users').doc(uid).update({
            lastActive: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        // Ignore errors (e.g., if user doc doesn't exist yet, getOrCreate will handle it)
        console.warn("Could not update lastActive", e);
    }
};

export const getOrCreateUserProfile = async (uid: string, name: string, email: string | null) => {
    if (!db) return;
    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();
    
    const initials = name
        ? name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
        : email?.substring(0, 2).toUpperCase() || 'U';

    const SUPER_ADMIN_EMAIL = 'mayurhande90@gmail.com';
    const isSuperAdmin = email === SUPER_ADMIN_EMAIL;

    if (!doc.exists) {
        const newUser: Partial<User> = {
            uid,
            name,
            email: email || '',
            avatar: initials, 
            credits: 10,
            totalCreditsAcquired: 10,
            lifetimeGenerations: 0, // Explicit initialization
            plan: 'Free',
            signUpDate: firebase.firestore.FieldValue.serverTimestamp() as any,
            lastActive: firebase.firestore.FieldValue.serverTimestamp() as any,
            storageTier: 'limited',
            referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
            referralCount: 0,
            isAdmin: isSuperAdmin, 
            isBanned: false,
        };
        await userRef.set(newUser);
        return newUser;
    }
    
    // Fallback update if this function is called explicitly
    try {
        await userRef.update({
            lastActive: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) { console.error("Error updating lastActive:", e); }
    
    const userData = doc.data() as User;
    const updates: any = {};

    // DATA BACKFILL / NORMALIZATION
    // Ensures old users don't see "NaN" or missing stats
    if (userData.lifetimeGenerations === undefined) updates.lifetimeGenerations = 0;
    if (userData.totalCreditsAcquired === undefined) updates.totalCreditsAcquired = userData.credits || 0;
    if (!userData.plan) updates.plan = 'Free';
    if (!userData.avatar) updates.avatar = initials;
    
    // Promote Super Admin if needed
    if (isSuperAdmin && userData.isAdmin !== true) {
        updates.isAdmin = true;
    }

    if (Object.keys(updates).length > 0) {
        await userRef.update(updates);
        return { ...userData, ...updates };
    }

    return userData;
};

export const updateUserProfile = async (uid: string, data: Partial<User>) => {
    if (!db) return;
    await db.collection('users').doc(uid).update(data);
};

export const subscribeToUserProfile = (uid: string, callback: (user: User | null) => void) => {
    if (!db) {
        callback(null);
        return () => {};
    }
    return db.collection('users').doc(uid).onSnapshot((doc) => {
        if (doc.exists) {
            callback(doc.data() as User);
        } else {
            callback(null);
        }
    }, (error) => {
        console.error("Error subscribing to user profile:", error);
        callback(null);
    });
};

// ... Config & System ...

export const subscribeToAppConfig = (callback: (config: AppConfig | null) => void) => {
    if (!db) {
        callback(null);
        return () => {};
    }
    return db.collection('config').doc('main').onSnapshot((doc) => {
        if (doc.exists) {
            callback(doc.data() as AppConfig);
        } else {
            callback(null);
        }
    }, (error) => {
        console.error("Error subscribing to app config:", error);
        callback(null);
    });
};

export const updateAppConfig = async (config: AppConfig) => {
    if (!db) return;
    await db.collection('config').doc('main').set(config, { merge: true });
};

export const subscribeToAnnouncement = (callback: (announcement: Announcement | null) => void) => {
    if (!db) {
        callback(null);
        return () => {};
    }
    return db.collection('config').doc('announcement').onSnapshot((doc) => {
        if (doc.exists) {
            callback(doc.data() as Announcement);
        } else {
            callback(null);
        }
    }, (error) => {
        console.warn("Announcement subscription failed:", error);
        callback(null);
    });
};

export const updateAnnouncement = async (uid: string, announcement: Announcement) => {
    if (!db) return;
    
    const cleanPayload = {
        title: announcement.title || "",
        message: announcement.message || "",
        isActive: !!announcement.isActive,
        type: announcement.type || "info",
        link: announcement.link || "",
        style: announcement.style || "banner"
    };

    try {
        await db.collection('config').doc('announcement').set(cleanPayload);
        try {
            await logAudit(uid, 'Update Announcement', `Updated: ${cleanPayload.title}`);
        } catch (e) { console.warn("Audit log failed (non-fatal)", e); }

    } catch (error: any) {
        console.error("Update Announcement FAILED:", error);
        if (error.code === 'permission-denied') {
            throw new Error(`Permission Denied. Ensure your email matches the rule 'mayurhande90@gmail.com'.`);
        }
        throw error;
    }
};

export const getAnnouncement = async () => {
    if (!db) return null;
    const doc = await db.collection('config').doc('announcement').get();
    return doc.exists ? (doc.data() as Announcement) : null;
};

// ... Creations & Credits ...
export const saveCreation = async (uid: string, imageUrl: string, feature: string): Promise<string> => {
    if (!db) throw new Error("DB not initialized");
    
    let finalImage = imageUrl;
    
    // Firestore limit is 1MB. Safety check: Compress if > 800KB
    if (finalImage.length > 800000 && finalImage.startsWith('data:image')) {
        try {
            // Compress to HD (1024px) JPEG @ 70% quality to fit in Firestore
            finalImage = await resizeImage(finalImage, 1024, 0.7);
        } catch (e) {
            console.warn("Image compression failed, attempting save with original...", e);
        }
    }

    const docRef = await db.collection('users').doc(uid).collection('creations').add({
        imageUrl: finalImage,
        feature,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        storagePath: ''
    });
    return docRef.id;
};

export const getCreations = async (uid: string) => {
    if (!db) return [];
    const snapshot = await db.collection('users').doc(uid).collection('creations')
        .orderBy('createdAt', 'desc')
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
        
        transaction.update(userRef, { 
            credits: newCredits,
            lifetimeGenerations: firebase.firestore.FieldValue.increment(1),
            lastActive: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        const transactionRef = userRef.collection('transactions').doc();
        transaction.set(transactionRef, {
            feature: featureName,
            cost: amount,
            date: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Return updated object with assumed increment
        return { ...userData, credits: newCredits, lifetimeGenerations: (userData.lifetimeGenerations || 0) + 1 };
    });
};

export const claimMilestoneBonus = async (uid: string, amount: number) => {
    if (!db) throw new Error("DB not initialized");
    const userRef = db.collection('users').doc(uid);
    
    await db.runTransaction(async (t) => {
        t.update(userRef, {
            credits: firebase.firestore.FieldValue.increment(amount)
        });
        
        const txRef = userRef.collection('transactions').doc();
        t.set(txRef, {
            feature: 'Milestone Reward',
            creditChange: `+${amount}`,
            cost: 0,
            date: firebase.firestore.FieldValue.serverTimestamp()
        });
    });
    
    const snap = await userRef.get();
    return snap.data() as User;
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
        plan: packName,
        ...(packName.includes('Studio') || packName.includes('Agency') ? { 
            storageTier: 'unlimited', 
            basePlan: packName,
            lastTierPurchaseDate: firebase.firestore.FieldValue.serverTimestamp() 
        } : {})
    });

    await userRef.collection('transactions').add({
        feature: `Purchase: ${packName}`,
        cost: 0,
        creditChange: `+${credits}`,
        date: firebase.firestore.FieldValue.serverTimestamp(),
        pricePaid: price
    });

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

// ... Daily Mission & Attendance ...
export const claimDailyAttendance = async (uid: string) => {
    if (!db) throw new Error("DB not initialized");
    const userRef = db.collection('users').doc(uid);
    
    await userRef.update({
        credits: firebase.firestore.FieldValue.increment(1),
        lastAttendanceClaim: firebase.firestore.FieldValue.serverTimestamp()
    });
    
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

// ... Referrals ...
export const claimReferralCode = async (uid: string, code: string) => {
    if (!db) throw new Error("DB not initialized");
    
    const snapshot = await db.collection('users').where('referralCode', '==', code).get();
    if (snapshot.empty) {
        throw new Error("Invalid referral code.");
    }
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
        t.set(userTx, {
            feature: 'Referral Bonus (Claimed)',
            creditChange: '+10',
            date: firebase.firestore.FieldValue.serverTimestamp()
        });

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

// ... Brand Kit ...
export const getUserBrands = async (uid: string) => {
    if (!db) return [];
    const snapshot = await db.collection('users').doc(uid).collection('brands').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BrandKit));
};

export const subscribeToUserBrands = (uid: string, callback: (brands: BrandKit[]) => void) => {
    if (!db) {
        callback([]);
        return () => {};
    }
    return db.collection('users').doc(uid).collection('brands')
        .onSnapshot((snapshot) => {
            const brands = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BrandKit));
            callback(brands);
        }, (error) => {
            console.error("Error subscribing to brands:", error);
        });
};

export const saveBrandToCollection = async (uid: string, brand: BrandKit) => {
    if (!db) return;
    const collectionRef = db.collection('users').doc(uid).collection('brands');
    
    if (brand.id) {
        await collectionRef.doc(brand.id).set(brand, { merge: true });
        return brand.id;
    } else {
        const docRef = await collectionRef.add(brand);
        return docRef.id;
    }
};

export const activateBrand = async (uid: string, brandId: string) => {
    if (!db) return;
    const brandSnap = await db.collection('users').doc(uid).collection('brands').doc(brandId).get();
    if (!brandSnap.exists) throw new Error("Brand not found");
    const brandData = { id: brandSnap.id, ...brandSnap.data() } as BrandKit;
    await db.collection('users').doc(uid).update({ brandKit: brandData });
    return brandData;
};

// Deactivates the brand kit (switches to manual/default mode)
export const deactivateBrand = async (uid: string) => {
    if (!db) return;
    await db.collection('users').doc(uid).update({ brandKit: null });
};

export const deleteBrandFromCollection = async (uid: string, brandId: string) => {
    if (!db) return;
    await db.collection('users').doc(uid).collection('brands').doc(brandId).delete();
};

export const saveUserBrandKit = async (uid: string, brandKit: BrandKit) => {
    if (!db) return;
    const brandId = await saveBrandToCollection(uid, brandKit);
    const activeKit = { ...brandKit, id: brandId }; 
    await db.collection('users').doc(uid).update({ brandKit: activeKit });
    return activeKit;
};

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

// ... remaining existing functions ...
export const saveSupportMessage = async (uid: string, message: any) => { if (!db) return; await db.collection('users').doc(uid).collection('support_chat').doc(message.id).set(message); };
export const getSupportHistory = async (uid: string) => { if (!db) return []; const snap = await db.collection('users').doc(uid).collection('support_chat').orderBy('timestamp', 'asc').get(); return snap.docs.map(d => d.data()); };
export const cleanupSupportHistory = async (uid: string) => { if (!db) return; const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); const snap = await db.collection('users').doc(uid).collection('support_chat').where('timestamp', '<', cutoff).get(); if (snap.empty) return; const batch = db.batch(); snap.docs.forEach(doc => batch.delete(doc.ref)); await batch.commit(); };
export const clearSupportChat = async (uid: string) => { if (!db) return; const ref = db.collection('users').doc(uid).collection('support_chat'); const snapshot = await ref.get(); if (snapshot.size === 0) return; const batch = db.batch(); snapshot.docs.forEach((doc) => { batch.delete(doc.ref); }); await batch.commit(); };
export const submitFeedback = async (uid: string, creationId: string | null, feedback: 'up' | 'down', feature: string = 'Unknown', imageUrl: string | null = null, userEmail: string = '', userName: string = '') => { if (!db) return; await db.collection('feedbacks').add({ userId: uid, creationId: creationId, feedback: feedback, feature: feature, imageUrl: imageUrl, userEmail: userEmail, userName: userName, timestamp: firebase.firestore.FieldValue.serverTimestamp() }); };
export const getRecentFeedbacks = async (limit = 100) => { if (!db) return []; const snap = await db.collection('feedbacks').orderBy('timestamp', 'desc').limit(limit).get(); return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); };
export const getAllUsers = async (limit = 100) => { if (!db) return []; const snapshot = await db.collection('users').limit(limit).get(); return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)); };
export const subscribeToRecentActiveUsers = (callback: (users: User[]) => void, limit = 20) => { if (!db) { callback([]); return () => {}; } return db.collection('users').orderBy('lastActive', 'desc').limit(limit).onSnapshot((snapshot) => { const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)); callback(users); }, (error) => { console.error("Error subscribing to active users:", error); }); };
export const getUser = async (uid: string) => { if (!db) return null; const doc = await db.collection('users').doc(uid).get(); return doc.exists ? ({ uid: doc.id, ...doc.data() } as User) : null; };
export const addCreditsToUser = async (adminUid: string, targetUid: string, amount: number, reason: string) => { if (!db) return; const userRef = db.collection('users').doc(targetUid); await userRef.update({ credits: firebase.firestore.FieldValue.increment(amount), creditGrantNotification: { amount: amount, message: reason || 'Admin Grant', type: 'credit', timestamp: firebase.firestore.Timestamp.now() } }); await userRef.collection('transactions').add({ feature: 'Admin Grant', reason, creditChange: `+${amount}`, cost: 0, grantedBy: adminUid, date: firebase.firestore.FieldValue.serverTimestamp() }); await logAudit(adminUid, 'Grant Credits', `Granted ${amount} to ${targetUid}. Reason: ${reason}`); };
export const grantPackageToUser = async (adminUid: string, targetUid: string, pack: CreditPack, message: string) => { if (!db) return; const userRef = db.collection('users').doc(targetUid); await userRef.update({ credits: firebase.firestore.FieldValue.increment(pack.totalCredits), totalCreditsAcquired: firebase.firestore.FieldValue.increment(pack.totalCredits), plan: pack.name, ...(pack.name.includes('Studio') || pack.name.includes('Agency') ? { storageTier: 'unlimited', basePlan: pack.name, lastTierPurchaseDate: firebase.firestore.FieldValue.serverTimestamp() } : {}), creditGrantNotification: { amount: pack.totalCredits, message: message, type: 'package', packageName: pack.name, timestamp: firebase.firestore.Timestamp.now() } }); await userRef.collection('transactions').add({ feature: `Grant: ${pack.name}`, reason: message, creditChange: `+${pack.totalCredits}`, cost: 0, grantedBy: adminUid, date: firebase.firestore.FieldValue.serverTimestamp() }); await logAudit(adminUid, 'Grant Package', `Granted ${pack.name} to ${targetUid}. Msg: ${message}`); };
export const toggleUserBan = async (adminUid: string, targetUid: string, isBanned: boolean) => { if (!db) return; await db.collection('users').doc(targetUid).update({ isBanned }); await logAudit(adminUid, isBanned ? 'Ban User' : 'Unban User', `Target: ${targetUid}`); };
export const updateUserPlan = async (uid: string, plan: string) => { if (!db) return; await db.collection('users').doc(uid).update({ plan }); };
export const getRecentSignups = async (limit = 10) => { if (!db) return []; const snap = await db.collection('users').orderBy('signUpDate', 'desc').limit(limit).get(); return snap.docs.map(d => ({ uid: d.id, ...d.data() } as User)); };
export const getRecentPurchases = async (limit = 10): Promise<Purchase[]> => { if (!db) return []; const snap = await db.collection('purchases').orderBy('purchaseDate', 'desc').limit(limit).get(); return snap.docs.map(d => ({ id: d.id, ...d.data() } as Purchase)); };
export const getDashboardStats = async () => { if (!db) return { revenue: 0, totalUsers: 0 }; try { const purchasesAgg = await (db.collection('purchases') as any).aggregate({ total: (firebase.firestore as any).AggregateField.sum('amountPaid') }).get(); const revenue = purchasesAgg.data().total || 0; const usersAgg = await (db.collection('users') as any).count().get(); const totalUsers = usersAgg.data().count; return { revenue, totalUsers }; } catch (e) { console.warn("Aggregation failed", e); const pSnap = await db.collection('purchases').orderBy('purchaseDate', 'desc').limit(500).get(); const revenue = pSnap.docs.reduce((acc, doc) => acc + (doc.data().amountPaid || 0), 0); const uSnap = await db.collection('users').limit(100).get(); const totalUsers = uSnap.size; return { revenue, totalUsers }; } };
export const getTotalRevenue = async (startDate?: Date, endDate?: Date) => { if (!db) return 0; let query = db.collection('purchases'); let snapshot; if (startDate && endDate) { snapshot = await query.where('purchaseDate', '>=', startDate).where('purchaseDate', '<=', endDate).get(); return snapshot.docs.reduce((sum, doc) => sum + (doc.data().amountPaid || 0), 0); } else { try { const agg = await (query as any).aggregate({ total: (firebase.firestore as any).AggregateField.sum('amountPaid') }).get(); return agg.data().total || 0; } catch(e) { snapshot = await query.limit(1000).get(); return snapshot.docs.reduce((sum, doc) => sum + (doc.data().amountPaid || 0), 0); } } };
export const getRevenueStats = async (days = 7) => { return []; };
export const get24HourCreditBurn = async () => { return 0; };
export const getGlobalFeatureUsage = async () => { if (!db) return []; const doc = await db.collection('config').doc('stats').get(); if (doc.exists && doc.data()?.featureUsage) { return Object.entries(doc.data()!.featureUsage).map(([k, v]) => ({ feature: k, count: v as number })); } return []; };
export const logAudit = async (adminUid: string, action: string, details: string) => { if (!db) return; await db.collection('audit_logs').add({ adminEmail: auth?.currentUser?.email || adminUid, action, details, timestamp: firebase.firestore.FieldValue.serverTimestamp() }); };
export const getAuditLogs = async (limit = 50) => { if (!db) return []; const snap = await db.collection('audit_logs').orderBy('timestamp', 'desc').limit(limit).get(); return snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog)); };
export const logApiError = async (endpoint: string, error: string, userId?: string) => { if (!db) return; await db.collection('api_errors').add({ endpoint, error, userId: userId || 'anonymous', timestamp: firebase.firestore.FieldValue.serverTimestamp() }); };
export const getApiErrorLogs = async (limit = 50) => { if (!db) return []; const snap = await db.collection('api_errors').orderBy('timestamp', 'desc').limit(limit).get(); return snap.docs.map(d => ({ id: d.id, ...d.data() } as ApiErrorLog)); };
export const sendSystemNotification = async (adminUid: string, targetUid: string, title: string, message: string, type: string, style: string, link?: string) => { if (!db) return; await db.collection('users').doc(targetUid).update({ systemNotification: { title, message, type, style, link: link || null, read: false, timestamp: firebase.firestore.Timestamp.now() } }); await logAudit(adminUid, 'Send Notification', `To ${targetUid}: ${title} ${link ? `(Link: ${link})` : ''}`); };
export const clearCreditGrantNotification = async (uid: string) => { if (!db) return; await db.collection('users').doc(uid).update({ creditGrantNotification: null }); };
