import React from 'react';
import { Timestamp } from 'firebase/firestore';

// FIX: Defined an explicit `AIStudio` interface to resolve a global type conflict.
// This ensures that all declarations of `window.aistudio` use a consistent type,
// satisfying TypeScript's requirement for merging global declarations.
interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

// Add Razorpay to the global window interface
declare global {
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

export interface Creation {
    id: string;
    imageUrl: string;
    storagePath: string;
    feature: string;
    createdAt: Timestamp;
}