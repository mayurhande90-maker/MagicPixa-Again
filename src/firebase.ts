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

// ... existing code ...

export const getAppConfig = async (): Promise<AppConfig> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const configRef = db.collection("config").doc("main");
    const docSnap = await configRef.get();
    const defaultConfig: AppConfig = {
        featureCosts: {
          'Pixa Product Shots': 2, 
          'Model Shot': 3, 
          'Pixa Thumbnail Pro': 5, // Renamed from Thumbnail Studio
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
      if (dbConfig.featureCosts) {
          delete dbConfig.featureCosts['Magic Scanner'];
          delete dbConfig.featureCosts['Magic Notes'];
          delete dbConfig.featureCosts['BrandKit AI'];
          delete dbConfig.featureCosts['Magic Photo Studio']; 
          delete dbConfig.featureCosts['Thumbnail Studio']; // Clean legacy key
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

// ... remaining code ...
// Re-export other functions from the original file as needed, but for brevity here focusing on config
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

// Re-including standard exports
export const getUser = async (uid: string): Promise<User | null> => {
    if (!db) return null;
    const doc = await db.collection('users').doc(uid).get();
    return doc.exists ? ({ uid: doc.id, ...doc.data() } as User) : null;
};

// ... (other exports assumed unchanged, only config modified above)
export { 
    updateAppConfig, subscribeToAppConfig, getRecentSignups, getRecentPurchases, 
    getTotalRevenue, getRevenueStats, getAllUsers, addCreditsToUser, grantPackageToUser, 
    clearCreditGrantNotification, uploadBrandAsset, saveUserBrandKit, toggleUserBan, 
    updateUserPlan, sendSystemNotification, logAdminAction, getAuditLogs, logApiError, 
    getApiErrorLogs, get24HourCreditBurn, getGlobalFeatureUsage, getAnnouncement, 
    updateAnnouncement, subscribeToAnnouncement, subscribeToUserProfile, 
    deductCredits, claimDailyAttendance, purchaseTopUp, completeDailyMission, 
    getCreditHistory, saveCreation, getCreations, deleteCreation, getOrCreateUserProfile, 
    updateUserProfile, claimReferralCode
};