// FIX: Corrected the React import statement. 'aistudio' is a global and should not be included here. This resolves errors related to useState and useEffect not being found.
import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from './theme';
import HomePage from './HomePage';
import DashboardPage from './DashboardPage';
import AuthModal from './components/AuthModal';
import { auth, isConfigValid, getMissingConfigKeys, signInWithGoogle } from './firebase'; 
import ConfigurationError from './components/ConfigurationError';
// FIX: Removed firebase/auth imports that were causing errors. The functionality is now accessed through the compat `auth` object.
import { getOrCreateUserProfile } from './firebase';

export type Page = 'home' | 'dashboard';

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
  openAuthModal: () => void;
}

const App: React.FC = () => {
  if (!isConfigValid) {
    const missingKeys = getMissingConfigKeys();
    return (
      <ThemeProvider>
        <ConfigurationError missingKeys={missingKeys} />
      </ThemeProvider>
    );
  }

  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
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
    // FIX: Switched from the modular `onAuthStateChanged(auth, ...)` to the compat `auth.onAuthStateChanged(...)` method.
    // FIX: Removed the explicit type for firebaseUser to allow TypeScript to infer it from the compat SDK.
    const unsubscribe = auth!.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch the full user profile from Firestore, including credits
        const userProfile = await getOrCreateUserProfile(firebaseUser.uid, firebaseUser.displayName || 'New User', firebaseUser.email);
        
        const userToSet: User = {
          uid: firebaseUser.uid,
          name: userProfile.name || firebaseUser.displayName || 'User',
          email: userProfile.email || firebaseUser.email || 'No Email',
          avatar: getInitials(userProfile.name || firebaseUser.displayName || ''),
          credits: userProfile.credits, 
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

  const navigateTo = useCallback((page: Page) => {
    if (page === 'dashboard' && !isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    setCurrentPage(page);
    window.scrollTo(0, 0);
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && authModalOpen) {
      setAuthModalOpen(false);
      navigateTo('dashboard');
    }
  }, [isAuthenticated, authModalOpen, navigateTo]);


  const handleGoogleSignIn = async (): Promise<void> => {
    try {
      await signInWithGoogle();
      setAuthModalOpen(false); // Close modal on success
      setCurrentPage('dashboard');
      window.scrollTo(0,0);
    } catch (error: any) {
       console.error("Google Sign-In Error:", error);
       let message = "Failed to sign in with Google. Please try again.";
       if (error.code !== 'auth/popup-closed-by-user') {
         throw new Error(message);
       }
    }
  };

  const handleLogout = async () => {
    try {
      // FIX: Switched from the modular `signOut(auth)` to the compat `auth.signOut()` method.
      if (auth) await auth.signOut();
      setCurrentPage('home');
      window.scrollTo(0, 0);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };
  
  const openAuthModal = () => setAuthModalOpen(true);
  const closeAuthModal = () => setAuthModalOpen(false);

  const authProps: AuthProps = {
    isAuthenticated,
    user,
    setUser,
    handleLogout,
    openAuthModal,
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
      {authModalOpen && (
        <AuthModal 
          onClose={closeAuthModal} 
          onGoogleSignIn={handleGoogleSignIn} 
        />
      )}
    </ThemeProvider>
  );
};

export default App;