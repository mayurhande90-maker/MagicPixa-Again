
import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import HomePage from './HomePage';
// FIX: Changed to a default import as DashboardPage is exported as default.
import DashboardPage from './DashboardPage';
import AboutUsPage from './AboutUsPage';
import AuthModal from './components/AuthModal';
import EditProfileModal from './components/EditProfileModal';
import ToastNotification from './components/ToastNotification';
import { auth, isConfigValid, getMissingConfigKeys, signInWithGoogle, updateUserProfile, getOrCreateUserProfile, firebaseConfig, getAppConfig, subscribeToAnnouncement } from './firebase'; 
import ConfigurationError from './components/ConfigurationError';
import { Page, View, User, AuthProps, AppConfig, Announcement } from './types';
import { InformationCircleIcon, XIcon, ShieldCheckIcon, EyeIcon } from './components/icons';

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

const GlobalAnnouncementModal: React.FC<{ announcement: Announcement | null; onClose: () => void }> = ({ announcement, onClose }) => {
    if (!announcement || !announcement.isActive) return null;

    const styles = {
        info: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-100', icon: 'text-blue-600' },
        warning: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-100', icon: 'text-yellow-600' },
        error: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-100', icon: 'text-red-600' }
    };
    
    const style = styles[announcement.type];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-bounce-slight relative">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full transition-all">
                    <XIcon className="w-5 h-5" />
                </button>
                
                <div className={`p-6 text-center ${style.bg} border-b ${style.border}`}>
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <InformationCircleIcon className={`w-8 h-8 ${style.icon}`} />
                    </div>
                    <h3 className={`text-xl font-bold ${style.text} mb-1`}>Announcement</h3>
                </div>
                
                <div className="p-6 text-center">
                    <p className="text-gray-600 leading-relaxed mb-6">{announcement.message}</p>
                    
                    {announcement.link ? (
                        <a 
                            href={announcement.link} 
                            target="_blank" 
                            rel="noreferrer"
                            className="block w-full py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors"
                        >
                            Read More
                        </a>
                    ) : (
                        <button 
                            onClick={onClose}
                            className="block w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            Dismiss
                        </button>
                    )}
                </div>
            </div>
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
            <p className="text-gray-500 mb-6">
                Your account has been suspended due to a violation of our terms of service.
            </p>
            <div className="bg-gray-100 p-4 rounded-xl mb-8">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Contact Support</p>
                <a href="mailto:support@magicpixa.com" className="text-blue-600 font-bold hover:underline">support@magicpixa.com</a>
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

const App: React.FC = () => {
  if (!isConfigValid) {
    const missingKeys = getMissingConfigKeys();
    return <ConfigurationError missingKeys={missingKeys} />;
  }

  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [activeView, setActiveView] = useState<View>('home_dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  // Impersonation State
  const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [isConversationOpen, setIsConversationOpen] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<ReactNode | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  
  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'logout'>('success');

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
    const fetchConfig = async () => {
      try {
        const config = await getAppConfig();
        setAppConfig(config);
      } catch (error) {
        console.error("Failed to load app configuration:", error);
      } finally {
        setIsConfigLoading(false);
      }
    };
    
    // Subscribe to announcement updates in real-time
    const unsubscribeAnnouncement = subscribeToAnnouncement((ann) => {
        setAnnouncement(ann);
        setShowAnnouncement(true); // Re-show on update
    });

    fetchConfig();
    
    return () => unsubscribeAnnouncement();
  }, []);

  // Listen for Targeted Notifications
  useEffect(() => {
      if (user && user.systemNotification) {
          // Show toast
          setToastMessage(user.systemNotification);
          setToastType('info');
          
          // Clear notification from DB to prevent showing it again
          updateUserProfile(user.uid, { systemNotification: null });
          
          // Update local state immediately to prevent loop
          setUser(prev => prev ? { ...prev, systemNotification: null } : null);
      }
  }, [user]);

  // Capture referral code from URL
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get('ref');
      if (refCode) {
          window.sessionStorage.setItem('referralCode', refCode);
          console.log("Captured referral code:", refCode);
      }
  }, []);

  useEffect(() => {
    if (!auth) {
      setIsLoadingAuth(false);
      return;
    }
  
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const idTokenResult = await firebaseUser.getIdTokenResult();
          await updateUserProfile(firebaseUser.uid, { lastActive: new Date() }); // Update last active timestamp
          const userProfile = await getOrCreateUserProfile(firebaseUser.uid, firebaseUser.displayName || 'New User', firebaseUser.email);
          
          // Check for admin claim or specific email for dev purposes
          const isAdmin = !!idTokenResult.claims.isAdmin || firebaseUser.email === 'mayurhande90@gmail.com';
          
          const profileData = userProfile as any;

          const userToSet: User = {
            uid: firebaseUser.uid,
            name: profileData.name || firebaseUser.displayName || 'User',
            email: profileData.email || firebaseUser.email || 'No Email',
            avatar: getInitials(profileData.name || firebaseUser.displayName || ''),
            credits: profileData.credits,
            totalCreditsAcquired: profileData.totalCreditsAcquired,
            signUpDate: profileData.signUpDate,
            lastActive: profileData.lastActive,
            plan: profileData.plan,
            isAdmin: isAdmin,
            isBanned: profileData.isBanned || false, // Mapping ban status
            totalSpent: profileData.totalSpent || 0,
            dailyMission: profileData.dailyMission, 
            lifetimeGenerations: profileData.lifetimeGenerations || 0,
            lastAttendanceClaim: profileData.lastAttendanceClaim || null,
            referralCode: profileData.referralCode,
            referralCount: profileData.referralCount,
            referredBy: profileData.referredBy,
            brandKit: profileData.brandKit,
            storageTier: profileData.storageTier,
            systemNotification: profileData.systemNotification
          };
          setUser(userToSet);
          setIsAuthenticated(true);
          setAuthError(null); 
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
            auth.signOut(); 
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
      if (impersonatedUser) {
          // If impersonating, just exit impersonation mode
          setImpersonatedUser(null);
          setToastMessage("Returned to Admin view");
          setToastType('info');
          return;
      }

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
    // Determine which user to update (should probably only update own profile unless admin)
    const targetUser = impersonatedUser || user;
    if (targetUser && newName.trim() && targetUser.name !== newName) {
      try {
        await updateUserProfile(targetUser.uid, { name: newName });
        // Update local state
        const updateState = (prev: User | null) => prev ? { ...prev, name: newName, avatar: getInitials(newName) } : null;
        
        if (impersonatedUser) setImpersonatedUser(updateState);
        else setUser(updateState);

        setEditProfileModalOpen(false);
      } catch (error) {
        console.error("Failed to update profile:", error);
      }
    }
  };
  
  // Impersonation Logic
  const handleImpersonateUser = (targetUser: User) => {
      setImpersonatedUser(targetUser);
      navigateTo('dashboard', 'home_dashboard');
      setToastMessage(`Viewing as ${targetUser.name}`);
      setToastType('info');
  };

  const stopImpersonation = () => {
      setImpersonatedUser(null);
      setToastMessage("Exited View Mode");
      setToastType('info');
      // Optionally navigate back to admin panel
      navigateTo('dashboard', 'admin');
  };
  
  const openAuthModal = () => setAuthModalOpen(true);
  const closeAuthModal = () => {
      setAuthModalOpen(false);
      setTimeout(() => setAuthError(null), 300);
  };

  // Determine the active user object to pass down
  const activeUser = impersonatedUser || user;

  const authProps: AuthProps = {
    isAuthenticated: !!activeUser, // If impersonating, we are "authenticated" as them
    user: activeUser,
    setUser: impersonatedUser ? setImpersonatedUser : setUser, // If impersonating, state updates go to the temp user state
    handleLogout,
    openAuthModal,
    impersonateUser: handleImpersonateUser
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

  // Suspended User Lockout (Only if real user is banned, not if admin views a banned user)
  if (user && user.isBanned && !impersonatedUser) {
      return <BannedScreen onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Impersonation Banner */}
      {impersonatedUser && (
          <div className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between shadow-md z-[110] sticky top-0">
              <div className="flex items-center gap-2">
                  <EyeIcon className="w-5 h-5 animate-pulse" />
                  <span className="font-bold text-sm">Viewing as: {impersonatedUser.name} ({impersonatedUser.email})</span>
              </div>
              <button 
                onClick={stopImpersonation}
                className="bg-white text-indigo-600 px-4 py-1.5 rounded-full text-xs font-bold hover:bg-indigo-50 transition-colors shadow-sm"
              >
                  Exit View Mode
              </button>
          </div>
      )}

      {/* Global Announcement Logic */}
      {showAnnouncement && announcement && announcement.isActive && !impersonatedUser && (
          <>
            {announcement.displayStyle === 'modal' ? (
                <GlobalAnnouncementModal announcement={announcement} onClose={() => setShowAnnouncement(false)} />
            ) : (
                <GlobalBanner announcement={announcement} onClose={() => setShowAnnouncement(false)} />
            )}
          </>
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