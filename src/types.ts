import React from 'react';
import { Timestamp } from 'firebase/firestore';

export type Page = 'home' | 'dashboard';
export type View = 'dashboard' | 'studio' | 'interior' | 'creations' | 'billing' | 'colour' | 'soul' | 'apparel' | 'mockup' | 'profile' | 'caption' | 'home_dashboard';

export interface User {
  uid: string;
  name: string;
  email: string;
  avatar: string;
  credits: number;
  signUpDate?: { seconds: number; nanoseconds: number };
  plan?: 'Free' | 'Paid';
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
    cost: number;
    date: Timestamp;
}
