




import React, { useState, useEffect, useCallback } from 'react';
import HomePage from './HomePage';
// FIX: Changed to a named import to resolve a circular dependency.
import { DashboardPage } from './DashboardPage';
import AuthModal from './components/AuthModal';
import EditProfileModal from './components/EditProfileModal';
import { auth, isConfigValid, getMissingConfigKeys, signInWithGoogle, updateUserProfile, getOrCreateUserProfile } from './firebase'; 
// FIX: The errors indicate Firebase v8 is used. Removing v9 imports as methods are called on the `auth` object directly.


import ConfigurationError from './components/ConfigurationError';

export type Page = 'home' | 'dashboard';
export type View = 'dashboard' | 'studio' | 'interior' | 'creations' | 'billing' | 'colour' | 'eraser' | 'apparel' | 'mockup' | 'profile' | 'caption';

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
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [isConversationOpen, setIsConversationOpen] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

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
    if (!auth) {
      setIsLoadingAuth(false);
      return;
    }
  
    // This handles the result of a sign-in redirect. It's crucial to call this
    // on page load to complete the authentication flow.
    // FIX: Updated to Firebase v8 syntax.
    auth.getRedirectResult().catch((error) => {
      console.error("Error processing Google Sign-In redirect:", error);
      let message = "An error occurred during sign-in. Please try again.";
      if (error.code === 'auth/account-exists-with-different-credential') {
        message = 'An account already exists with this email. Please sign in using the original method.';
      }
      setAuthError(message);
      setIsLoadingAuth(false);
    });
  
    // FIX: Updated to Firebase v8 syntax.
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      try {
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
          setAuthError(null); // Clear any previous auth errors on success.
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Error in onAuthStateChanged handler:", error);
        setAuthError("Failed to load your user profile. Please try signing in again.");
        setUser(null);
        setIsAuthenticated(false);
        if (auth) {
            // FIX: Updated to Firebase v8 syntax.
            auth.signOut(); // Sign out to prevent a broken state.
        }
      } finally {
        setIsLoadingAuth(false);
      }
    });
  
    return () => unsubscribe();
  }, []);

  const navigateTo = useCallback((page: Page, view?: View, sectionId?: string) => {
    if (page === 'dashboard' && !isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }

    const performNavigation = () => {
        if (view) {
            setActiveView(view);
        } else if (page === 'dashboard') {
            setActiveView('dashboard');
        }
        setCurrentPage(page);

        if (sectionId) {
            setTimeout(() => {
                document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
            }, 50);
        } else {
            window.scrollTo(0, 0);
        }
    };
    
    if (currentPage !== page) {
        performNavigation();
    } else {
        // If we are already on the page, just scroll.
        if (sectionId) {
            document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
        } else {
             window.scrollTo(0, 0);
        }
        if (view) setActiveView(view);
    }
  }, [isAuthenticated, currentPage]);


  useEffect(() => {
    if (isAuthenticated && authModalOpen) {
      setAuthModalOpen(false);
      navigateTo('dashboard');
    }
  }, [isAuthenticated, authModalOpen, navigateTo]);

  useEffect(() => {
    if (authError) {
      setAuthModalOpen(true);
    }
  }, [authError]);

  const handleGoogleSignIn = async (): Promise<void> => {
    try {
      await signInWithGoogle();
      // Note: Code after signInWithGoogle() will not execute due to the page redirect.
      // The redirect result is handled by the useEffect hook when the user returns.
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
      // FIX: Updated to Firebase v8 syntax.
      if (auth) await auth.signOut();
      setCurrentPage('home');
      window.scrollTo(0, 0);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };
  
  const handleSaveProfile = async (newName: string) => {
    if (user && newName.trim() && user.name !== newName) {
      try {
        await updateUserProfile(user.uid, { name: newName });
        setUser(prevUser => {
          if (!prevUser) return null;
          return {
            ...prevUser,
            name: newName,
            avatar: getInitials(newName),
          };
        });
        setEditProfileModalOpen(false);
      } catch (error) {
        console.error("Failed to update profile:", error);
        // Optionally, show an error message in the modal
      }
    }
  };
  
  const openAuthModal = () => setAuthModalOpen(true);
  const closeAuthModal = () => {
      setAuthModalOpen(false);
      setAuthError(null);
  };

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
      {currentPage === 'dashboard' && <DashboardPage navigateTo={navigateTo} auth={authProps} activeView={activeView} setActiveView={setActiveView} openEditProfileModal={() => setEditProfileModalOpen(true)} isConversationOpen={isConversationOpen} setIsConversationOpen={setIsConversationOpen} />}
      {authModalOpen && (
        <AuthModal 
          onClose={closeAuthModal} 
          onGoogleSignIn={handleGoogleSignIn}
          error={authError}
        />
      )}
      {editProfileModalOpen && user && (
        <EditProfileModal
          user={user}
          onClose={() => setEditProfileModalOpen(false)}
          onSave={handleSaveProfile}
        />
      )}
    </div>
  );
};

export default App;
// Minor change for commit.