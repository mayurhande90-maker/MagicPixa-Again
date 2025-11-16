import React from 'react';
import { Timestamp } from 'firebase/firestore';

// Add Razorpay to the global window interface
declare global {
    interface Window {
      Razorpay: any;
    }
}

export type Page = 'home' | 'dashboard';
export type View = 'dashboard' | 'studio' | 'interior' | 'creations' | 'billing' | 'colour' | 'soul' | 'apparel' | 'mockup' | 'profile' | 'caption' | 'home_dashboard' | 'product_studio' | 'brand_stylist';

export interface User {
  uid: string;
  name: string;
  email: string;
  avatar: string;
  credits: number;
  totalCreditsAcquired?: number; // Add this optional field
  signUpDate?: { seconds: number; nanoseconds: number };
  plan?: string;
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
}

export interface Creation {
    id: string;
    imageUrl: string;
    storagePath: string;
    feature: string;
    createdAt: Timestamp;
}
