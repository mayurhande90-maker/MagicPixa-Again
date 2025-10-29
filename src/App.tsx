

import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './theme';
import HomePage from './HomePage';
import DashboardPage from './DashboardPage';
import AuthModal from './components/AuthModal';
import { auth, isFirebaseConfigValid } from './firebase'; 
import ConfigurationError from './components/ConfigurationError';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from "firebase/auth";

export type Page = 'home' | 'dashboard';
export type AuthView = 'login' | 'signup';

export interface User {
  uid: string;
  name: string;
  email: string;
  avatar: string;
  credits: number;
}

export interface AuthProps {
  isAuthenticated: boolean;
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  handleLogout: () => void;
  openAuthModal: (view: AuthView) => void;
}

const App: React.FC = () => {
  if (!isFirebaseConfigValid) {
    return (
      <ThemeProvider>
        <ConfigurationError />
      </ThemeProvider>
    );
  }

  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authModalView, setAuthModalView] = useState<AuthView | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const getInitials = (name: string): string => {
    if (!name) return '';
    return name
      .split(' ')
      .map(n => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth!, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userToSet: User = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email || 'No Email',
          avatar: getInitials(firebaseUser.displayName || ''),
          credits: 10, 
        };
        setUser(userToSet);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const navigateTo = (page: Page) => {
    if (page === 'dashboard' && !isAuthenticated) {
      setAuthModalView('login');
      return;
    }
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const handleLogin = async (email: string, password: string): Promise<void> => {
    try {
      await signInWithEmailAndPassword(auth!, email, password);
      // Success is handled in the modal, it will close itself
      setCurrentPage('dashboard');
      window.scrollTo(0, 0);
    } catch (error: any) {
      let message = 'An unknown error occurred.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'Invalid email or password. Please try again.';
      }
      throw new Error(message);
    }
  };
  
  const handleSignUp = async (name: string, email: string, password:string): Promise<void> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth!, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      
      setUser({
        uid: userCredential.user.uid,
        name: name,
        email: email,
        avatar: getInitials(name),
        credits: 10,
      });
      setIsAuthenticated(true);
      
      // Success is handled in the modal, it will close itself
      setCurrentPage('dashboard');
      window.scrollTo(0, 0);

    } catch (error: any) {
      let message = 'An unknown error occurred.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'An account with this email already exists. Please login.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password is too weak. It should be at least 6 characters.';
      }
      throw new Error(message);
    }
  };

  const handleLogout = async () => {
    try {
      if (auth) await signOut(auth);
      setCurrentPage('home');
      window.scrollTo(0, 0);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };
  
  const openAuthModal = (view: AuthView) => setAuthModalView(view);
  const closeAuthModal = () => setAuthModalView(null);

  const authProps: AuthProps = {
    isAuthenticated,
    user,
    setUser,
    handleLogout,
    openAuthModal,
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0e0e0e]">
        <svg className="animate-spin h-8 w-8 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen transition-colors duration-300">
        {currentPage === 'home' && <HomePage navigateTo={navigateTo} auth={authProps} />}
        {currentPage === 'dashboard' && <DashboardPage navigateTo={navigateTo} auth={authProps} />}
      </div>
      {authModalView && <AuthModal initialView={authModalView} onClose={closeAuthModal} onLogin={handleLogin} onSignUp={handleSignUp} />}
    </ThemeProvider>
  );
};

export default App;
