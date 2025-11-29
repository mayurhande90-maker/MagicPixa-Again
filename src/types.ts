
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

export type Page = 'home' | 'dashboard' | 'about';
export type View = 'dashboard' | 'studio' | 'interior' | 'creations' | 'billing' | 'colour' | 'soul' | 'apparel' | 'mockup' | 'profile' | 'caption' | 'home_dashboard' | 'brand_kit' | 'brand_stylist' | 'admin' | 'thumbnail_studio' | 'daily_mission' | 'magic_realty' | 'brand_manager';

export interface BrandKit {
    companyName: string;
    website: string;
    toneOfVoice: string;
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
        primary: string | null;
        secondary: string | null;
        mark: string | null;
    };
}

export interface User {
  uid: string;
  name: string;
  email: string;
  avatar: string;
  credits: number;
  totalCreditsAcquired?: number;
  signUpDate?: { seconds: number; nanoseconds: number } | Date | string; // Flexible type for safety
  plan?: string;
  
  // Storage & Tier Logic
  basePlan?: string | null;
  lastTierPurchaseDate?: Timestamp | null;
  storageTier?: 'limited' | 'unlimited';

  isAdmin?: boolean;
  isBanned?: boolean; // Account suspension status
  notes?: string; // Admin notes
  lastActive?: Timestamp | Date | string; // Flexible type
  totalSpent?: number;
  
  // Engagement Features
  lifetimeGenerations?: number;
  lastAttendanceClaim?: Timestamp;

  lastDailyMissionCompleted?: Timestamp;
  dailyMission?: {
      completedAt: string;
      nextUnlock: string;
      lastMissionId?: string;
  };

  // Referral System
  referralCode?: string;
  referredBy?: string;
  referralCount?: number;

  // Brand Kit
  brandKit?: BrandKit;
  
  // Admin Features
  systemNotification?: string | null;
}

export interface AuthProps {
  isAuthenticated: boolean;
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  handleLogout: () => void;
  openAuthModal: () => void;
  // Impersonation
  impersonateUser?: (targetUser: User) => void;
}

export interface Transaction {
    id: string;
    feature: string;
    cost: number; 
    date: Timestamp;
    creditChange?: string;
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
    thumbnailUrl?: string;
    storagePath: string;
    feature: string;
    createdAt: Timestamp;
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
    timestamp: any;
}

export interface ApiErrorLog {
    id: string;
    timestamp: any;
    endpoint: string;
    error: string;
    userId?: string;
}

export interface Announcement {
    message: string;
    isActive: boolean;
    type: 'info' | 'warning' | 'error';
    displayStyle?: 'banner' | 'modal';
    link?: string;
}
