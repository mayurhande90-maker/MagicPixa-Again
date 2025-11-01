import React, { useState, useEffect, useCallback } from 'react';
import HomePage from './HomePage';
import DashboardPage from './DashboardPage';
import AuthModal from './components/AuthModal';
import { auth, isConfigValid, getMissingConfigKeys, signInWithGoogle } from './firebase'; 
import ConfigurationError from './components/ConfigurationError';
import { getOrCreateUserProfile } from './firebase';

export type Page = 'home' | 'dashboard';
export type View = 'studio' | 'interior' | 'creations' | 'billing';

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
    return <ConfigurationError missingKeys={missingKeys} />;
  }

  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [activeView, setActiveView] = useState<View>('studio');
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
    const unsubscribe = auth!.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
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

  const navigateTo = useCallback((page: Page, view?: View) => {
    if (page === 'dashboard' && !isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    if (view) {
      setActiveView(view);
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
      setAuthModalOpen(false);
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
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <svg className="animate-spin h-8 w-8 text-[#0079F2]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {currentPage === 'home' && <HomePage navigateTo={navigateTo} auth={authProps} />}
      {currentPage === 'dashboard' && <DashboardPage navigateTo={navigateTo} auth={authProps} activeView={activeView} setActiveView={setActiveView} />}
      {authModalOpen && (
        <AuthModal 
          onClose={closeAuthModal} 
          onGoogleSignIn={handleGoogleSignIn} 
        />
      )}
    </div>
  );
};

export default App;
// Minor change for commit.