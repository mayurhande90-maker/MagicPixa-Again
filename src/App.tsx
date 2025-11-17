import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import HomePage from './HomePage';
// FIX: Changed to a named import to match the named export in `DashboardPage.tsx` and resolve the module error.
import { DashboardPage } from './DashboardPage';
import AuthModal from './components/AuthModal';
import EditProfileModal from './components/EditProfileModal';
// FIX: Removed incorrect modular imports for 'onAuthStateChanged' and 'signOut'.
// The errors indicated these were not exported from 'firebase/auth'. Switched to compat syntax
// by calling these methods directly on the `auth` object instance from Firebase.
import { auth, isConfigValid, getMissingConfigKeys, signInWithGoogle, updateUserProfile, getOrCreateUserProfile, firebaseConfig } from './firebase'; 
import ConfigurationError from './components/ConfigurationError';
import { Page, View, User, AuthProps } from './types';

const App: React.FC = () => {
  if (!isConfigValid) {
    const missingKeys = getMissingConfigKeys();
    return <ConfigurationError missingKeys={missingKeys} />;
  }

  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [activeView, setActiveView] = useState<View>('home_dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [isConversationOpen, setIsConversationOpen] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<ReactNode | null>(null);

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
  
    // FIX: Used compat `auth.onAuthStateChanged(...)` instead of modular `onAuthStateChanged(auth, ...)`.
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const idTokenResult = await firebaseUser.getIdTokenResult();
          const userProfile = await getOrCreateUserProfile(firebaseUser.uid, firebaseUser.displayName || 'New User', firebaseUser.email);
          
          // Check for admin claim or specific email for dev purposes
          const isAdmin = !!idTokenResult.claims.isAdmin || firebaseUser.email === 'mayurhande90@gmail.com';
          
          const userToSet: User = {
            uid: firebaseUser.uid,
            name: userProfile.name || firebaseUser.displayName || 'User',
            email: userProfile.email || firebaseUser.email || 'No Email',
            avatar: getInitials(userProfile.name || firebaseUser.displayName || ''),
            credits: userProfile.credits,
            totalCreditsAcquired: userProfile.totalCreditsAcquired,
            signUpDate: userProfile.signUpDate,
            plan: userProfile.plan,
            isAdmin: isAdmin,
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
            // FIX: Used compat `auth.signOut()` instead of modular `signOut(auth)`.
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
            setActiveView('home_dashboard');
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
      // Successful sign-in is handled by the onAuthStateChanged listener.
    } catch (error: any) {
       console.error("Google Sign-In Error:", error);

       // If the error is an auth/unauthorized-domain error, show the detailed message.
       if (error.code === 'auth/unauthorized-domain') {
          const currentDomain = window.location.hostname;
          const projectId = auth?.app?.options?.['projectId'];
          const expectedAuthDomain = projectId ? `${projectId}.firebaseapp.com` : `[your-project-id].firebaseapp.com`;
          const actualAuthDomain = firebaseConfig.authDomain;
  
          const ErrorMessage = () => (
            <div className="text-left text-sm space-y-2">
              <p><strong>Sign-in failed. Please check your configuration:</strong></p>
              <ol className="list-decimal list-inside space-y-3">
                <li>Ensure <strong>`{currentDomain}`</strong> is in your Firebase project's <strong>Authentication → Settings → Authorized domains</strong>.</li>
                <li>
                  Your app's environment variable for `authDomain` must be <strong>`{expectedAuthDomain}`</strong>.
                  {actualAuthDomain !== expectedAuthDomain && (
                    <div className="mt-1 p-2 bg-red-100 text-red-800 rounded-md text-xs">
                      <span className="font-bold">Mismatch detected!</span> Your config is currently set to:<br/>
                      <code className="font-mono bg-red-200 px-1 rounded">{actualAuthDomain || "not set"}</code>
                    </div>
                  )}
                </li>
                <li>In Google Cloud Console, under APIs &amp; Services → Credentials, your OAuth Client ID must have <strong>`https://{currentDomain}`</strong> in its "Authorized JavaScript origins".</li>
              </ol>
            </div>
          );
          setAuthError(<ErrorMessage />);
       } else if (error.code === 'auth/account-exists-with-different-credential') {
            setAuthError('An account already exists with this email address. Please sign in using the method you originally used.');
       } else if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
         // Generic error for other cases, ignoring when the user manually closes the popup.
         setAuthError("Failed to sign in with Google. Please try again.");
       }
       // Re-throw the error so the modal's loading state can be stopped.
       throw error;
    }
  };

  const handleLogout = async () => {
    try {
      // FIX: Used compat `auth.signOut()` instead of modular `signOut(auth)`.
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
      // Delay clearing error to prevent flash of content before modal closes
      setTimeout(() => setAuthError(null), 300);
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