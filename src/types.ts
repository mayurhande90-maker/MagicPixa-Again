import React from 'react';
import { Timestamp } from 'firebase/firestore';

// Add Razorpay to the global window interface
declare global {
    // FIX: Moved the AIStudio interface inside `declare global` to properly augment the
    // global `Window` type and resolve declaration merging conflicts. This prevents
    // subsequent property declaration errors.
    interface AIStudio {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    }

    interface Window {
      Razorpay: any;
      // Add aistudio for video generation API key selection
      aistudio?: AIStudio;
    }
}

export type Page = 'home' | 'dashboard';
export type View = 'dashboard' | 'studio' | 'interior' | 'creations' | 'billing' | 'colour' | 'soul' | 'apparel' | 'mockup' | 'profile' | 'caption' | 'home_dashboard' | 'product_studio' | 'brand_stylist' | 'admin';

export interface User {
  uid: string;
  name: string;
  email: string;
  avatar: string;
  credits: number;
  totalCreditsAcquired?: number;
  signUpDate?: { seconds: number; nanoseconds: number };
  plan?: string;
  isAdmin?: boolean; // Added for admin access control
  lastActive?: Timestamp; // For tracking user activity
  totalSpent?: number; // For admin panel tracking
}

export interface AuthProps {
  isAuthenticated: boolean;
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  handleLogout: () => void;
  openAuthModal: () => void;
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