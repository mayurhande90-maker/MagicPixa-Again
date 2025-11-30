
import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import HomePage from './HomePage';
// FIX: Changed to a default import as DashboardPage is exported as default.
import DashboardPage from './DashboardPage';
import AboutUsPage from './AboutUsPage';
import AuthModal from './components/AuthModal';
import EditProfileModal from './components/EditProfileModal';
import ToastNotification from './components/ToastNotification';
import { 
  auth, 
  isConfigValid, 
  getMissingConfigKeys, 
  signInWithGoogle, 
  updateUserProfile, 
  getOrCreateUserProfile, 
  subscribeToAppConfig,
  subscribeToAnnouncement,
  subscribeToUserProfile
} from './firebase'; 
import ConfigurationError from './components/ConfigurationError';
import { Page, View, User, AuthProps, AppConfig, Announcement } from './types';
import { InformationCircleIcon, XIcon, ShieldCheckIcon, EyeIcon } from './components/icons';
import { CreditGrantModal } from './components/CreditGrantModal';

const GlobalBanner: React.FC<{ announcement: Announcement | null; onClose: () => void }> = ({ announcement, onClose }) => {
    if (!announcement || !announcement.isActive) return null;

    const bgColors = {
        info: 'bg-blue-600',
        warning: 'bg-yellow-500',
        error: 'bg-red-600'
    };

    return (
        <div className={`${bgColors[announcement.type]} text-white px-4 py-2 relative flex items-center justify-center shadow-md z-[100]`}>
            <div className="flex items-center gap-2 text-sm font-medium">
                <InformationCircleIcon className="w-5 h-5" />
                <span>{announcement.message}</span>
                {announcement.link && (
                    <a href={announcement.link} target="_blank" rel="noreferrer" className="underline font-bold hover:text-white/80">
                        Learn More
                    </a>
                )}
            </div>
            <button onClick={onClose} className="absolute right-4 p-1 hover:bg-white/20 rounded-full transition-colors">
                <XIcon className="w-4 h-4" />
            </button>
        </div>
    );
};

const BannedScreen: React.FC<{ onLogout: () => void }> = ({ onLogout }) => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheckIcon className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Suspended</h1>
            <p className="text-gray-500 mb-4">
                Your account has been suspended due to a violation of our terms of service.
            </p>
            <div className="bg-red-50 p-3 rounded-lg mb-6 text-sm text-red-700 border border-red-100">
                Contact Support: <br/>
                <a href="mailto:support@magicpixa.com" className="font-bold underline">support@magicpixa.com</a>
            </div>
            <button 
                onClick={onLogout}
                className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
            >
                Sign Out
            </button>
        </div>
    </div>
);

const ImpersonationBanner: React.FC<{ originalUser: User; targetUser: User; onExit: () => void }> = ({ originalUser, targetUser, onExit }) => (
    <div className="bg-orange-500 text-white px-4 py-3 relative flex items-center justify-center shadow-md z-[110]">
        <div className="flex items-center gap-3 text-sm font-bold">
            <EyeIcon className="w-5 h-5" />
            <span>Viewing as: <span className="underline">{targetUser.email}</span> ({targetUser.name})</span>
            <button 
                onClick={onExit}
                className="ml-4 bg-white text-orange-600 px-3 py-1 rounded-full text-xs hover:bg-orange-50 transition-colors uppercase tracking-wider"
            >
                Exit View Mode
            </button>
        </div>
    </div>
);

const App: React.FC = () => {
  if (!isConfigValid) {
    const missingKeys = getMissingConfigKeys();
    return <ConfigurationError missingKeys={missingKeys} />;
  }

  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [activeView, setActiveView] = useState<View>('home_dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Auth State
  const [user, setUser] = useState<User | null>(null); // The actual logged-in user
  const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null); // The admin is viewing this user
  
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [isConversationOpen, setIsConversationOpen] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<ReactNode | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [showBanner, setShowBanner] = useState(true);
  
  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'logout'>('success');

  // Computed User: If impersonating, the app sees the target user. Otherwise, the real user.
  const activeUser = impersonatedUser || user;

  // Real-time Subscriptions for Config & Announcements
  useEffect(() => {
    // 1. App Configuration
    const unsubConfig = subscribeToAppConfig((config) => {
        setAppConfig(config);
        setIsConfigLoading(false);
    });

    // 2. Global Announcements
    const unsubAnnounce = subscribeToAnnouncement((ann) => {
        setAnnouncement(ann);
        if (ann?.isActive) setShowBanner(true);
    });

    return () => {
        unsubConfig();
        unsubAnnounce();
    };
  }, []);

  // Capture referral code from URL
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get('ref');
      if (refCode) {
          window.sessionStorage.setItem('referralCode', refCode);
          console.log("Captured referral code:", refCode);
      }
  }, []);

  // Auth & User Profile Subscription
  useEffect(() => {
    if (!auth) {
      setIsLoadingAuth(false);
      return;
    }
  
    let userUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      // Clear previous user listener if any
      if (userUnsubscribe) {
          userUnsubscribe();
          userUnsubscribe = null;
      }

      if (firebaseUser) {
        try {
          // 1. Get Claims (Admin Status)
          const idTokenResult = await firebaseUser.getIdTokenResult();
          const isAdmin = !!idTokenResult.claims.isAdmin || firebaseUser.email === 'mayurhande90@gmail.com';
          
          // 2. Ensure Profile Exists (Run migration/creation logic once)
          await getOrCreateUserProfile(firebaseUser.uid, firebaseUser.displayName || 'New User', firebaseUser.email);
          await updateUserProfile(firebaseUser.uid, { lastActive: new Date() });

          // 3. Subscribe to Real-time Profile Updates
          userUnsubscribe = subscribeToUserProfile(firebaseUser.uid, (firestoreUser) => {
              if (firestoreUser) {
                  // Merge Auth Data with Firestore Data
                  const userToSet: User = {
                      ...firestoreUser,
                      isAdmin: isAdmin,
                      // Prefer Auth email as it's authoritative
                      email: firebaseUser.email || firestoreUser.email,
                      // Fallback name
                      name: firestoreUser.name || firebaseUser.displayName || 'User',
                  };
                  setUser(userToSet);
                  setIsAuthenticated(true);
                  setAuthError(null);
              } else {
                  // Should rare, but handle if doc missing
                  setUser(null);
                  setIsAuthenticated(false);
              }
              setIsLoadingAuth(false);
          });

        } catch (error) {
          console.error("Error in onAuthStateChanged handler:", error);
          setAuthError("Failed to load your user profile. Please try signing in again.");
          setUser(null);
          setImpersonatedUser(null);
          setIsAuthenticated(false);
          setIsLoadingAuth(false);
        }
      } else {
        setUser(null);
        setImpersonatedUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
      }
    });
  
    return () => {
        authUnsubscribe();
        if (userUnsubscribe) userUnsubscribe();
    };
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
      setToastMessage("Successfully signed in!");
      setToastType('success');
    } catch (error: any) {
       console.error("Google Sign-In Error:", error);
       if (error.code === 'auth/unauthorized-domain') {
          // ... error handling logic ...
          setAuthError("Domain not authorized. Please check console.");
       } else if (error.code === 'auth/account-exists-with-different-credential') {
            setAuthError('An account already exists with this email address.');
       } else if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
         setAuthError("Failed to sign in with Google. Please try again.");
       }
       throw error;
    }
  };

  const handleLogout = async () => {
    try {
      if (auth) await auth.signOut();
      setCurrentPage('home');
      window.scrollTo(0, 0);
      setToastMessage("Successfully logged out!");
      setToastType('logout');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };
  
  const handleSaveProfile = async (newName: string) => {
    if (activeUser && newName.trim() && activeUser.name !== newName) {
      try {
        await updateUserProfile(activeUser.uid, { name: newName });
        // No need to manually update state here, subscription will handle it!
        setEditProfileModalOpen(false);
      } catch (error) {
        console.error("Failed to update profile:", error);
      }
    }
  };
  
  // Impersonation Handler
  const handleImpersonate = (targetUser: User | null) => {
      setImpersonatedUser(targetUser);
      if (targetUser) {
          setToastMessage(`Now viewing as ${targetUser.name}`);
          setToastType('info');
          // Reset to home dashboard view when switching users to avoid broken states
          navigateTo('dashboard', 'home_dashboard');
      } else {
          setToastMessage(`Exited View Mode`);
          setToastType('success');
          // Return admin to admin panel
          navigateTo('dashboard', 'admin');
      }
  };

  const openAuthModal = () => setAuthModalOpen(true);
  const closeAuthModal = () => {
      setAuthModalOpen(false);
      setTimeout(() => setAuthError(null), 300);
  };

  const authProps: AuthProps = {
    isAuthenticated,
    user: activeUser, // Pass the effective user (either real or impersonated)
    setUser: impersonatedUser ? setImpersonatedUser : setUser, // Allow updates to flow to the correct state
    handleLogout,
    openAuthModal,
    impersonateUser: handleImpersonate
  };

  if (isLoadingAuth || isConfigLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <svg className="animate-spin h-8 w-8 text-[#0079F2]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  // Suspended User Lockout
  if (activeUser && activeUser.isBanned) {
      return (
        <>
            {impersonatedUser && user && (
                <ImpersonationBanner 
                    originalUser={user} 
                    targetUser={impersonatedUser} 
                    onExit={() => handleImpersonate(null)} 
                />
            )}
            <BannedScreen onLogout={handleLogout} />
        </>
      );
  }

  // Helper to clear notification
  const clearNotification = async () => {
      if (auth && activeUser) {
          await updateUserProfile(activeUser.uid, { systemNotification: null });
      }
  };

  // Render Logic for Dynamic Notifications
  const renderSystemNotification = () => {
      if (!activeUser?.systemNotification || activeUser.systemNotification.read) return null;
      
      const { message, type, style } = activeUser.systemNotification;
      const notifStyle = style || 'banner'; // Default fallback

      // Colors based on type
      const colors = {
          info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: 'text-blue-600' },
          success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: 'text-green-600' },
          warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', icon: 'text-yellow-600' }
      };
      const theme = colors[type] || colors.info;

      // 1. BANNER (Top Bar - Persistent)
      if (notifStyle === 'banner') {
          return (
            <div className={`w-full px-4 py-3 flex items-center justify-between text-sm font-medium z-[90] shadow-sm border-b ${theme.bg} ${theme.border} ${theme.text}`}>
                <div className="flex items-center gap-2 mx-auto max-w-7xl w-full">
                    <InformationCircleIcon className={`w-5 h-5 shrink-0 ${theme.icon}`} />
                    <span>{message}</span>
                </div>
                <button onClick={clearNotification} className="p-1 hover:bg-black/5 rounded-full"><XIcon className="w-4 h-4" /></button>
            </div>
          );
      }

      // 2. PILL (Floating Dynamic Island - Top Center)
      if (notifStyle === 'pill') {
          return (
              <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] animate-[fadeInDown_0.5s_ease-out]">
                  <div className="bg-white/90 backdrop-blur-md shadow-2xl border border-gray-200 rounded-full px-6 py-3 flex items-center gap-4 min-w-[320px] max-w-md">
                      <div className={`p-1.5 rounded-full ${theme.bg} ${theme.icon}`}>
                          <InformationCircleIcon className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-medium text-gray-800 flex-1">{message}</p>
                      <button onClick={clearNotification} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
                          <XIcon className="w-4 h-4" />
                      </button>
                  </div>
              </div>
          );
      }

      // 3. TOAST (Bottom Right)
      if (notifStyle === 'toast') {
          return (
              <div className="fixed bottom-8 right-8 z-[200] animate-[slideInRight_0.4s_ease-out]">
                  <div className={`bg-white shadow-xl border-l-4 rounded-r-xl p-4 flex items-start gap-3 max-w-sm ${theme.border.replace('border', 'border-l')}`}>
                      <InformationCircleIcon className={`w-5 h-5 mt-0.5 ${theme.icon}`} />
                      <div>
                          <h4 className={`text-sm font-bold capitalize ${theme.text}`}>{type}</h4>
                          <p className="text-sm text-gray-600 mt-1">{message}</p>
                      </div>
                      <button onClick={clearNotification} className="text-gray-400 hover:text-gray-600 ml-2"><XIcon className="w-4 h-4" /></button>
                  </div>
              </div>
          );
      }

      // 4. MODAL (Center Screen - High Priority)
      if (notifStyle === 'modal') {
          return (
              <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn p-4">
                  <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 text-center transform animate-bounce-slight relative overflow-hidden">
                      <div className={`absolute top-0 left-0 w-full h-2 ${theme.bg.replace('bg-', 'bg-').replace('50', '500')}`}></div>
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${theme.bg} ${theme.icon}`}>
                          <InformationCircleIcon className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2 capitalize">{type === 'info' ? 'Update' : type}</h3>
                      <p className="text-gray-600 mb-6 leading-relaxed">{message}</p>
                      <button onClick={clearNotification} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-colors">
                          Got it
                      </button>
                  </div>
              </div>
          );
      }

      return null;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {impersonatedUser && user && (
          <ImpersonationBanner 
            originalUser={user} 
            targetUser={impersonatedUser} 
            onExit={() => handleImpersonate(null)} 
          />
      )}
      
      {/* Show Global Announcement if active */}
      {showBanner && announcement && <GlobalBanner announcement={announcement} onClose={() => setShowBanner(false)} />}
      
      {/* Dynamic System Notification */}
      {renderSystemNotification()}

      {/* Credit Grant Modal */}
      {activeUser?.creditGrantNotification && (
          <CreditGrantModal 
              userId={activeUser.uid}
              amount={activeUser.creditGrantNotification.amount}
              message={activeUser.creditGrantNotification.message}
          />
      )}
      
      {currentPage === 'home' && <HomePage navigateTo={navigateTo} auth={authProps} appConfig={appConfig} />}
      {currentPage === 'about' && <AboutUsPage navigateTo={navigateTo} auth={authProps} />}
      {currentPage === 'dashboard' && <DashboardPage navigateTo={navigateTo} auth={authProps} activeView={activeView} setActiveView={setActiveView} openEditProfileModal={() => setEditProfileModalOpen(true)} isConversationOpen={isConversationOpen} setIsConversationOpen={setIsConversationOpen} appConfig={appConfig} setAppConfig={setAppConfig} />}
      
      {authModalOpen && (
        <AuthModal 
          onClose={closeAuthModal} 
          onGoogleSignIn={handleGoogleSignIn}
          error={authError}
        />
      )}
      {editProfileModalOpen && activeUser && (
        <EditProfileModal
          user={activeUser}
          onClose={() => setEditProfileModalOpen(false)}
          onSave={handleSaveProfile}
        />
      )}
      {toastMessage && (
        <ToastNotification 
            message={toastMessage} 
            type={toastType} 
            onClose={() => setToastMessage(null)} 
        />
      )}
    </div>
  );
};

export default App;
