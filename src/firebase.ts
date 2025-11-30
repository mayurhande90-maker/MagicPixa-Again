import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import { AppConfig, Purchase, User, BrandKit, AuditLog, Announcement, ApiErrorLog } from './types';
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
}

export const signInWithGoogle = async () => { 
    if (!auth) throw new Error("No Auth"); 
    const p = new firebase.auth.GoogleAuthProvider(); 
    return await auth.signInWithPopup(p); 
};

export const updateUserProfile = async (uid: string, data: any) => { 
    if(!db) return; 
    await db.collection("users").doc(uid).set(data, {merge:true}); 
};

export const getOrCreateUserProfile = async (uid: string, name?: string | null, email?: string | null) => {
  if (!db) throw new Error("Firestore is not initialized.");
  const userRef = db.collection("users").doc(uid);
  const docSnap = await userRef.get();

  if (docSnap.exists) {
    const userData = docSnap.data();
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
      totalSpent: 0,
      lifetimeGenerations: 0,
      lastAttendanceClaim: null,
      referralCode: (name || 'USER').substring(0,4).toUpperCase() + Math.floor(1000+Math.random()*9000),
      referralCount: 0,
      referredBy: null,
      basePlan: null,
      lastTierPurchaseDate: null,
      isBanned: false,
      dailyMission: { completedAt: new Date(0).toISOString(), nextUnlock: new Date(0).toISOString(), lastMissionId: null }
    };
    await userRef.set(newUserProfile);
    return newUserProfile;
  }
};

export const deductCredits = async (uid: string, amount: number, feature: string) => {
    if(!db) throw new Error("No DB");
    const userRef = db.collection("users").doc(uid);
    await db.runTransaction(async (t) => {
        const doc = await t.get(userRef);
        const data = doc.data();
        if((data?.credits || 0) < amount) throw new Error("Insufficient credits");
        t.update(userRef, { credits: firebase.firestore.FieldValue.increment(-amount), lifetimeGenerations: (data?.lifetimeGenerations || 0) + 1 });
        t.set(userRef.collection('transactions').doc(), { feature, cost: amount, date: firebase.firestore.FieldValue.serverTimestamp() });
    });
    const res = await userRef.get();
    return res.data();
};

export const claimReferralCode = async (uid: string, code: string) => {
    if (!db) throw new Error("DB not init");
    
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) throw new Error("User not found");
    const userData = userDoc.data();
    if (userData?.referredBy) throw new Error("Referral code already claimed.");
    if (userData?.referralCode === code) throw new Error("Cannot use your own code.");

    const referrerQuery = await db.collection('users').where('referralCode', '==', code).limit(1).get();
    if (referrerQuery.empty) throw new Error("Invalid referral code.");
    
    const referrerDoc = referrerQuery.docs[0];
    const referrerRef = referrerDoc.ref;

    await db.runTransaction(async (t) => {
        t.update(userRef, { 
            credits: firebase.firestore.FieldValue.increment(10),
            referredBy: code,
            totalCreditsAcquired: firebase.firestore.FieldValue.increment(10)
        });
        t.set(userRef.collection('transactions').doc(), {
            feature: 'Referral Bonus (Claimed)',
            cost: 0,
            creditChange: '+10',
            date: firebase.firestore.FieldValue.serverTimestamp()
        });

        t.update(referrerRef, {
            credits: firebase.firestore.FieldValue.increment(10),
            referralCount: firebase.firestore.FieldValue.increment(1),
            totalCreditsAcquired: firebase.firestore.FieldValue.increment(10)
        });
        t.set(referrerRef.collection('transactions').doc(), {
            feature: 'Referral Bonus (Friend Joined)',
            cost: 0,
            creditChange: '+10',
            date: firebase.firestore.FieldValue.serverTimestamp()
        });
    });

    return (await userRef.get()).data();
};

export const claimDailyAttendance = async (uid: string) => { if(!db) return; const ref=db.collection('users').doc(uid); await ref.update({credits: firebase.firestore.FieldValue.increment(1), lastAttendanceClaim: firebase.firestore.FieldValue.serverTimestamp()}); return (await ref.get()).data(); };
export const purchaseTopUp = async (uid: string, pack: string, creds: number, amt: number) => { if(!db) return; const ref=db.collection('users').doc(uid); await ref.update({credits: firebase.firestore.FieldValue.increment(creds), totalSpent: firebase.firestore.FieldValue.increment(amt), plan: pack}); return (await ref.get()).data(); };
export const completeDailyMission = async (uid: string, reward: number, id: string) => { if(!db) return; const ref=db.collection('users').doc(uid); await ref.update({credits: firebase.firestore.FieldValue.increment(reward)}); return (await ref.get()).data() as User; };
export const getCreditHistory = async (uid: string) => { if(!db) return []; const s = await db.collection('users').doc(uid).collection('transactions').orderBy('date','desc').limit(50).get(); return s.docs.map(d=>({id:d.id, ...d.data()})); };
export const saveCreation = async (uid: string, url: string, feature: string) => { if(!db) return; await db.collection('users').doc(uid).collection('creations').add({imageUrl:url, feature, createdAt: firebase.firestore.FieldValue.serverTimestamp()}); };
export const getCreations = async (uid: string) => { if(!db) return []; const s = await db.collection('users').doc(uid).collection('creations').orderBy('createdAt','desc').get(); return s.docs.map(d=>({id:d.id, ...d.data()})); };
export const deleteCreation = async (uid: string, c: any) => { if(!db) return; await db.doc(`users/${uid}/creations/${c.id}`).delete(); };
export const getAppConfig = async () => { if(!db) throw new Error("No DB"); const s = await db.collection('config').doc('main').get(); return s.exists ? s.data() as AppConfig : {featureCosts:{}, featureToggles:{}, creditPacks:[]} as AppConfig; };
export const updateAppConfig = async (c: any) => { if(!db) return; await db.collection('config').doc('main').set(c, {merge:true}); };
export const getRecentSignups = async (limit:number) => { if(!db) return []; const s = await db.collection('users').orderBy('signUpDate','desc').limit(limit).get(); return s.docs.map(d=>({...d.data(), uid:d.id} as User)); };
export const getRecentPurchases = async (limit:number) => { if(!db) return []; const s = await db.collection('purchases').orderBy('purchaseDate','desc').limit(limit).get(); return s.docs.map(d=>d.data() as Purchase); };
export const getTotalRevenue = async () => { if(!db) return 0; const s = await db.collection('purchases').get(); let t=0; s.forEach(d=>t+=d.data().amountPaid||0); return t; };
export const getAllUsers = async (): Promise<User[]> => { if(!db) return []; const s = await db.collection('users').get(); return s.docs.map(d=>({uid:d.id, ...d.data()} as User)); };
export const addCreditsToUser = async (adminUid:string, targetUid:string, amt:number, reason:string) => { if(!db) return; await db.collection('users').doc(targetUid).update({credits: firebase.firestore.FieldValue.increment(amt)}); await logAdminAction('Admin', 'GRANT_CREDITS', `${amt} to ${targetUid}: ${reason}`); };
export const uploadBrandAsset = async (uid:string, b64:string, type:string) => { 
    if(!storage) throw new Error("No storage"); 
    const ref = storage.ref(`users/${uid}/brandKit/${type}_${Date.now()}`);
    await ref.putString(b64, 'data_url');
    return await ref.getDownloadURL();
};
export const saveUserBrandKit = async (uid:string, k:BrandKit) => { if(!db) return; await db.collection('users').doc(uid).update({brandKit:k}); };

export const toggleUserBan = async (adminUid: string, targetUid: string, isBanned: boolean) => {
    if (!db) throw new Error("DB not init");
    const adminRef = db.collection('users').doc(adminUid);
    const adminSnap = await adminRef.get();
    await db.collection('users').doc(targetUid).update({ isBanned });
    await logAdminAction(adminSnap.data()?.email || 'Admin', isBanned ? 'BAN_USER' : 'UNBAN_USER', `Target: ${targetUid}`);
};

export const updateUserPlan = async (adminUid: string, targetUid: string, newPlan: string) => {
    if (!db) throw new Error("DB not init");
    const adminRef = db.collection('users').doc(adminUid);
    const adminSnap = await adminRef.get();
    await db.collection('users').doc(targetUid).update({ plan: newPlan });
    await logAdminAction(adminSnap.data()?.email || 'Admin', 'UPDATE_PLAN', `Target: ${targetUid}, New Plan: ${newPlan}`);
};

export const sendSystemNotification = async (adminUid: string, targetUid: string, message: string, type: 'info' | 'warning' | 'success') => {
    if (!db) return;
    const adminRef = db.collection('users').doc(adminUid);
    const adminSnap = await adminRef.get();
    await db.collection('users').doc(targetUid).set({
        systemNotification: {
            message,
            type,
            read: false,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }
    }, { merge: true });

    await logAdminAction(adminSnap.data()?.email || 'Admin', 'SEND_NOTIFICATION', `To: ${targetUid}, Msg: ${message}`);
};

export const logAdminAction = async (adminEmail: string, action: string, details: string) => {
    if (!db) return;
    await db.collection('audit_logs').add({
        adminEmail,
        action,
        details,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
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

export const getGlobalFeatureUsage = async (): Promise<{feature: string, count: number}[]> => {
    if (!db) return [];
    try {
        const snap = await db.collectionGroup('transactions').orderBy('date', 'desc').limit(500).get();
        
        const counts: {[key:string]: number} = {};
        snap.forEach(doc => {
            const data = doc.data();
            if (data.feature && !data.feature.includes('Purchase') && !data.feature.includes('Admin')) {
                const f = data.feature.split(':')[0].trim();
                counts[f] = (counts[f] || 0) + 1;
            }
        });
        
        return Object.entries(counts)
            .map(([feature, count]) => ({ feature, count }))
            .sort((a,b) => b.count - a.count);
    } catch (e) {
        console.warn("Analytics fetch failed (missing index?)", e);
        return [];
    }
};

export const get24HourCreditBurn = async (): Promise<number> => {
    if (!db) return 0;
    try {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const query = db.collectionGroup('transactions')
            .where('date', '>=', yesterday);
            
        const snap = await query.get();
        let totalBurn = 0;
        snap.forEach(doc => {
            const data = doc.data();
            if (data.cost > 0 && !data.creditChange?.includes('+')) {
                totalBurn += data.cost;
            }
        });
        return totalBurn;
    } catch (e) {
        console.warn("24h Burn Calc Failed (Index missing?):", e);
        return 0;
    }
};

export const getAnnouncement = async () => { if(!db) return null; const s=await db.collection('config').doc('announcement').get(); return s.exists?s.data() as Announcement:null; };
export const updateAnnouncement = async (uid:string, a:Announcement) => { if(!db) return; await db.collection('config').doc('announcement').set(a); };
export const subscribeToAnnouncement = (cb:any) => { if(!db) return; return db.collection('config').doc('announcement').onSnapshot(s=>cb(s.exists?s.data():null)); };
export const subscribeToUserProfile = (uid:string, cb:any) => { if(!db) return; return db.collection('users').doc(uid).onSnapshot(s=>cb(s.exists?{...s.data(),uid:s.id}:null)); };
export const subscribeToAppConfig = (cb:any) => { if(!db) return; return db.collection('config').doc('main').onSnapshot(s=>cb(s.exists?s.data():null)); };

export { app, auth };