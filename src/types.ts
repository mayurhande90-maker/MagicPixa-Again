
import React from 'react';
import { Timestamp } from 'firebase/firestore';

// Add Razorpay to the global window interface
declare global {
    interface AIStudio {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    }

    interface Window {
      Razorpay: any;
      aistudio?: AIStudio;
    }
}

// Brand Storage Limits per Plan
export const BRAND_LIMITS: Record<string, number> = {
    'Free': 1,
    'Starter Pack': 1,
    'Creator Pack': 3,
    'Studio Pack': 10,
    'Agency Pack': 50
};

export type Page = 'home' | 'dashboard' | 'about';
export type View = 'dashboard' | 'studio' | 'interior' | 'creations' | 'billing' | 'colour' | 'soul' | 'apparel' | 'mockup' | 'profile' | 'caption' | 'home_dashboard' | 'brand_kit' | 'brand_stylist' | 'admin' | 'thumbnail_studio' | 'daily_mission' | 'magic_realty' | 'brand_manager' | 'support_center' | 'headshot' | 'campaign_studio' | 'mockup_staging';

export interface ProductAnalysis {
    id: string;
    detectedName: string;
    category: 'Edible' | 'Topical' | 'Wearable' | 'Tech' | 'Home' | 'Other';
    state: 'Liquid' | 'Solid' | 'Granular' | 'Powder' | 'Digital';
    physicalScale: string;
    sceneConstraints: string;
    visualCues: string; // OCR text and visual markers
}

export type IndustryType = 'physical' | 'digital' | 'realty' | 'service' | 'fashion' | 'food' | 'fmcg' | 'education';

export interface BrandKit {
    id?: string; // Unique ID for the brand profile
    name?: string; // Display name for the brand profile (e.g. "Nike Summer")
    industry?: IndustryType; // The business category
    companyName: string;
    website: string;
    toneOfVoice: string;
    targetAudience?: string; // New: Who are we talking to?
    negativePrompts?: string; // New: What to avoid?
    colors: {
        primary: string;
        secondary: string;
        accent: string;
    };
    fonts: {
        heading: string;
        body: string;
    };
    logos: {
        primary: string | null; // URL
        secondary: string | null; // URL
        mark: string | null; // URL
    };
    products?: {
        id: string;
        name: string;
        imageUrl: string;
        analysis?: ProductAnalysis; // AI's forensic report
    }[];
    moodBoard?: {
        id: string;
        imageUrl: string;
    }[];
    competitor?: {
        website: string;
        adScreenshots: { id: string; imageUrl: string }[];
        analysis?: {
            theirStrategy: string;
            winningAngle: string;
            visualGap: string;
            avoidTags: string; // Negative prompts derived from competitor
            lastUpdated: string;
        };
    };
}

export interface Ticket {
    id: string;
    userId: string;
    userEmail: string;
    type: 'bug' | 'refund' | 'general' | 'feature';
    status: 'open' | 'resolved' | 'rejected';
    subject: string;
    description: string;
    relatedTransactionId?: string; // For refunds
    refundAmount?: number;         // For refunds
    screenshotUrl?: string;        // For bugs
    adminReply?: string;
    createdAt: any; // Timestamp
}

export interface User {
  uid: string;
  name: string;
  email: string;
  avatar: string;
  credits: number;
  totalCreditsAcquired?: number;
  signUpDate?: { seconds: number; nanoseconds: number };
  plan?: string; // Display Name (e.g. "Studio Pack | Top-up")
  
  // Storage & Tier Logic
  basePlan?: string | null; // The underlying high-tier plan (e.g. "Studio Pack")
  lastTierPurchaseDate?: Timestamp | null; // When the high-tier plan was bought
  storageTier?: 'limited' | 'unlimited'; // 'limited' = 30 days, 'unlimited' = forever

  isAdmin?: boolean; // Added for admin access control
  isBanned?: boolean; // New: Account suspension status
  notes?: string; // New: Admin notes for user
  lastActive?: Timestamp; // For tracking user activity
  totalSpent?: number; // For admin panel tracking
  
  // Engagement Features
  lifetimeGenerations?: number; // Track total generations for milestones
  lastAttendanceClaim?: Timestamp; // Track daily check-in
  lastAutomatedRefund?: Timestamp; // Track smart refund system usage

  lastDailyMissionCompleted?: Timestamp; // Legacy field, keeping for backward compatibility
  dailyMission?: {
      completedAt: string; // ISO string
      nextUnlock: string;  // ISO string
      lastMissionId?: string;
  };

  // Referral System
  referralCode?: string;
  referredBy?: string;
  referralCount?: number;

  // Brand Kit
  brandKit?: BrandKit;
  
  // Admin System Notifications
  systemNotification?: {
      title?: string; // Added custom title
      message: string;
      type: 'info' | 'warning' | 'success';
      style?: 'banner' | 'pill' | 'toast' | 'modal';
      link?: string | null;
      read: boolean;
      timestamp: any;
  };

  // Credit Grant Notification
  creditGrantNotification?: {
      amount: number;
      message: string;
      timestamp: any;
      type?: 'credit' | 'package'; // Added type
      packageName?: string;        // Added package name
  } | null;
}

export interface AuthProps {
  isAuthenticated: boolean;
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  activeBrandKit: BrandKit | null;
  setActiveBrandKit: (kit: BrandKit | null) => void;
  handleLogout: () => void;
  openAuthModal: () => void;
  impersonateUser?: (user: User | null) => void;
}

export interface Transaction {
    id: string;
    feature: string;
    // Cost is now the INR amount for purchases, or credit amount for deductions
    cost: number; 
    date: Timestamp;
    // creditChange stores the string representation, e.g., "+165"
    creditChange?: string;
    // Fields for admin grants
    reason?: string;
    grantedBy?: string;
}

export interface Purchase {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    amountPaid: number;
    creditsAdded: number;
    packName: string;
    purchaseDate: Timestamp;
}

export interface Creation {
    id: string;
    imageUrl: string;
    thumbnailUrl?: string; // Added for optimization
    storagePath: string;
    feature: string;
    createdAt: Timestamp;
    lastEditedAt?: Timestamp; // Added for editor tracking
}

export interface VaultReference {
    id: string;
    imageUrl: string;
    addedAt: Timestamp;
}

export interface VaultFolderConfig {
    featureId: string;
    dna: string; // The "Visual DNA" instructions for AI
    lastUpdated: Timestamp;
}

export interface CreditPack {
    name: string;
    price: number;
    credits: number;
    totalCredits: number;
    bonus: number;
    tagline: string;
    popular: boolean;
    value: number;
}

export interface AppConfig {
    featureCosts: { [key: string]: number };
    featureToggles: { [key: string]: boolean };
    creditPacks: CreditPack[];
}

export interface AuditLog {
    id: string;
    adminEmail: string;
    action: string;
    details: string;
    timestamp: any; // Timestamp
}

export interface ApiErrorLog {
    id: string;
    endpoint: string;
    error: string;
    userId?: string;
    timestamp: any;
}

export interface Announcement {
    title?: string; // Added custom title
    message: string;
    isActive: boolean;
    type: 'info' | 'warning' | 'error' | 'success';
    link?: string;
    style?: 'banner' | 'pill' | 'toast' | 'modal';
}
