
import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import HomePage from './HomePage';
import DashboardPage from './DashboardPage';
import AboutUsPage from './AboutUsPage';
import AuthModal from './components/AuthModal';
import EditProfileModal from './components/EditProfileModal';
import ToastNotification from './components/ToastNotification';
import { auth, isConfigValid, getMissingConfigKeys, signInWithGoogle, updateUserProfile, getOrCreateUserProfile, firebaseConfig, getAppConfig, subscribeToAnnouncement, subscribeToUserProfile, subscribeToAppConfig } from './firebase'; 
import ConfigurationError from './components/ConfigurationError';
import { Page, View, User, AuthProps, AppConfig, Announcement } from './types';
import { InformationCircleIcon, XIcon, ShieldCheckIcon, EyeIcon } from './components/icons';

// --- COMPONENTS ---

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

const ImpersonationBanner: React.FC<{ targetName: string; onExit: () => void }> = ({ targetName, onExit }) => (
    <div className="bg-purple-900 text-white px-4 py-3 relative flex items-center justify-center shadow-lg z-[110] border-b-2 border-purple-500">
        <div className="flex items-center gap-3 animate-pulse">
            <EyeIcon className="w-5 h-5 text-purple-300" />
            <span className="font-mono text-sm">
                VIEWING AS: <span className="font-bold text-yellow-400">{targetName}</span>
            </span>
        </div>
        <button 
            onClick={onExit}
            className="absolute right-4 px-3 py-1 bg-white text-purple-900 text-xs font-bold rounded-full hover:bg-purple-100 transition-colors"
        >
            EXIT VIEW
        </button>
    </div>
);

const BannedScreen: React.FC<{ onLogout: () => void }> = ({ onLogout }) => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheckIcon className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Suspended</h1>
            <p className="text-gray-500 mb-8">
                Your account has been suspended due to a violation of our terms of service. Please contact support if you believe this is an error.
            </p>
            <div className="bg-gray-50 p-4 rounded-xl mb-6 text-sm text-gray-600">
                Support: <span className="font-bold">support@magicpixa.com</span>
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

const SystemNotificationBar: React.FC<{ notification: any; onClose: () => void }> = ({ notification, onClose }) => {
    if (!notification || notification.read) return null;
    
    const colors = {
        info: 'bg-blue-600',
        warning: 'bg-orange-500',
        success: 'bg-green-600'
    };

    return (
        <div className={`${colors[notification.type as keyof typeof colors] || 'bg-blue-600'} text-white p-4 shadow-lg flex items-center justify-between z-[90]`}>
            <div className="flex items-center gap-3">
                <InformationCircleIcon className="w-5 h-5" />
                <span className="font-medium text-sm">{notification.message}</span>
            </div>
            <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-1 rounded transition-colors">
                <XIcon className="w-4 h-4"/>
            </button>
        </div>
    );
};

const App: React.FC = () => {
  if (!isConfigValid) {
    const missingKeys = getMissingConfigKeys();
    return <ConfigurationError missingKeys={missingKeys} />;
  }

  // --- STATE ---
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [activeView, setActiveView] = useState<View>('home_dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  // Impersonation State
  const [adminUser, setAdminUser] = useState<User | null>(null); // Stores the real admin when impersonating
  const [isImpersonating, setIsImpersonating] = useState(false);

  // Modals & UI
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [isConversationOpen, setIsConversationOpen] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<ReactNode | null>(null);
  
  // Config & Data
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [showBanner, setShowBanner] = useState(true);
  
  // Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'logout'>('success');

  // --- EFFECTS ---

  useEffect(() => {
    // Real-time App Config
    const unsubConfig = subscribeToAppConfig((cfg) => {
        if(cfg) setAppConfig(cfg);
        setIsConfigLoading(false);
    });
    
    // Real-time Announcement
    const unsubAnnounce = subscribeToAnnouncement((ann) => {
        setAnnouncement(ann);
    });

    return () => {
        unsubConfig();
        unsubAnnounce();
    };
  }, []);

  // Auth Listener
  useEffect(() => {
    if (!auth) {
      setIsLoadingAuth(false);
      return;
    }
  
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const idTokenResult = await firebaseUser.getIdTokenResult();
          const isAdmin = !!idTokenResult.claims.isAdmin || firebaseUser.email === 'mayurhande90@gmail.com';
          
          // Subscribe to real-time user profile updates
          subscribeToUserProfile(firebaseUser.uid, (userProfile) => {
              if (userProfile) {
                  const userObj: User = {
                    ...userProfile,
                    uid: firebaseUser.uid,
                    email: userProfile.email || firebaseUser.email || 'No Email',
                    isAdmin: isAdmin, // Keep claims source of truth for admin
                  };
                  
                  // If we are currently impersonating, DO NOT overwrite the impersonated user with the real user update
                  // UNLESS the real user is being banned/modified.
                  // For simplicity, if impersonating, we ignore real-time updates to the ADMIN's profile in the main state.
                  // We update the 'adminUser' ref instead if needed.
                  
                  if (!isImpersonating) {
                      setUser(userObj);
                  } else {
                      setAdminUser(userObj);
                  }
              }
          });

          setIsAuthenticated(true);
          setAuthError(null); 
        } else {
          setUser(null);
          setAdminUser(null);
          setIsImpersonating(false);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Auth Error:", error);
        setAuthError("Failed to load profile.");
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoadingAuth(false);
      }
    });
  
    return () => unsubscribe();
  }, [isImpersonating]); // Depend on impersonating state to correctly route updates

  // --- ACTIONS ---

  const impersonateUser = (targetUser: User) => {
      if (!user?.isAdmin && !adminUser?.isAdmin) return;
      
      // Save current admin
      if (!isImpersonating) {
          setAdminUser(user);
      }
      
      // Set new user
      setUser(targetUser);
      setIsImpersonating(true);
      
      // Redirect to dashboard to see their view
      setActiveView('home_dashboard');
      setCurrentPage('dashboard');
      
      setToastMessage(`Viewing as ${targetUser.name}`);
      setToastType('info');
  };

  const exitImpersonation = () => {
      if (adminUser) {
          setUser(adminUser);
          setAdminUser(null);
          setIsImpersonating(false);
          setActiveView('admin'); // Go back to admin panel
          setToastMessage("Returned to Admin View");
      }
  };

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
    
    performNavigation();
  }, [isAuthenticated]);

  const handleGoogleSignIn = async (): Promise<void> => {
    try {
      await signInWithGoogle();
      setToastMessage("Successfully signed in!");
      setToastType('success');
    } catch (error: any) {
       console.error("Sign-In Error:", error);
       setAuthError("Failed to sign in. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      if (auth) await auth.signOut();
      setCurrentPage('home');
      setToastMessage("Logged out");
      setToastType('logout');
    } catch (error) {
      console.error("Sign out error", error);
    }
  };
  
  const handleSaveProfile = async (newName: string) => {
    if (user && newName.trim()) {
        await updateUserProfile(user.uid, { name: newName });
        setEditProfileModalOpen(false);
    }
  };

  const clearSystemNotification = async () => {
      if (user) {
          await updateUserProfile(user.uid, { 
              systemNotification: { ...user.systemNotification, read: true } 
          });
      }
  };

  // --- RENDER ---

  const authProps: AuthProps = {
    isAuthenticated,
    user,
    setUser,
    handleLogout,
    openAuthModal: () => setAuthModalOpen(true),
    impersonateUser: impersonateUser, // Pass to children
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

  // Suspended User Lockout (Only if NOT impersonating - admin should see the ban screen of the user they are viewing? No, admin should see dashboard. Real user sees ban.)
  // Actually, if admin impersonates a banned user, they should see what the banned user sees to verify it.
  if (user && user.isBanned && !adminUser) { // If real user is banned
      return <BannedScreen onLogout={handleLogout} />;
  }
  // If admin impersonates banned user
  if (user && user.isBanned && isImpersonating) {
      return (
          <>
            <ImpersonationBanner targetName={user.name} onExit={exitImpersonation} />
            <BannedScreen onLogout={exitImpersonation} /> {/* Logout here just exits view */}
          </>
      )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* 1. Impersonation Banner */}
      {isImpersonating && user && (
          <ImpersonationBanner targetName={user.name} onExit={exitImpersonation} />
      )}

      {/* 2. Global Admin Announcement */}
      {showBanner && announcement && <GlobalBanner announcement={announcement} onClose={() => setShowBanner(false)} />}
      
      {/* 3. Personal System Notification */}
      {user?.systemNotification && !user.systemNotification.read && (
          <SystemNotificationBar notification={user.systemNotification} onClose={clearSystemNotification} />
      )}
      
      {currentPage === 'home' && <HomePage navigateTo={navigateTo} auth={authProps} appConfig={appConfig} />}
      {currentPage === 'about' && <AboutUsPage navigateTo={navigateTo} auth={authProps} />}
      {currentPage === 'dashboard' && (
          <DashboardPage 
            navigateTo={navigateTo} 
            auth={authProps} 
            activeView={activeView} 
            setActiveView={setActiveView} 
            openEditProfileModal={() => setEditProfileModalOpen(true)} 
            isConversationOpen={isConversationOpen} 
            setIsConversationOpen={setIsConversationOpen} 
            appConfig={appConfig} 
            setAppConfig={setAppConfig} // Dashboard passes this to AdminPanel
          />
      )}
      
      {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} onGoogleSignIn={handleGoogleSignIn} error={authError} />}
      {editProfileModalOpen && user && <EditProfileModal user={user} onClose={() => setEditProfileModalOpen(false)} onSave={handleSaveProfile} />}
      
      {toastMessage && <ToastNotification message={toastMessage} type={toastType} onClose={() => setToastMessage(null)} />}
    </div>
  );
};

export default App;
