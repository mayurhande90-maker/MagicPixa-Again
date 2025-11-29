
import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import HomePage from './HomePage';
// FIX: Changed to a default import as DashboardPage is exported as default.
import DashboardPage from './DashboardPage';
import AboutUsPage from './AboutUsPage';
import AuthModal from './components/AuthModal';
import EditProfileModal from './components/EditProfileModal';
import ToastNotification from './components/ToastNotification';
import { auth, isConfigValid, getMissingConfigKeys, signInWithGoogle, updateUserProfile, getOrCreateUserProfile, firebaseConfig, getAppConfig, getAnnouncement } from './firebase'; 
import ConfigurationError from './components/ConfigurationError';
import { Page, View, User, AuthProps, AppConfig, Announcement } from './types';
import { InformationCircleIcon, XIcon, ShieldCheckIcon } from './components/icons';

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
            <p className="text-gray-500 mb-8">
                Your account has been suspended due to a violation of our terms of service. Please contact support if you believe this is an error.
            </p>
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
    
    const fetchAnnouncement = async () => {
        const ann = await getAnnouncement();
        setAnnouncement(ann);
    };

    fetchConfig();
    fetchAnnouncement();
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
          
          const userToSet: User = {
            uid: firebaseUser.uid,
            name: userProfile.name || firebaseUser.displayName || 'User',
            email: userProfile.email || firebaseUser.email || 'No Email',
            avatar: getInitials(userProfile.name || firebaseUser.displayName || ''),
            credits: userProfile.credits,
            totalCreditsAcquired: userProfile.totalCreditsAcquired,
            signUpDate: userProfile.signUpDate,
            lastActive: userProfile.lastActive,
            plan: userProfile.plan,
            isAdmin: isAdmin,
            isBanned: userProfile.isBanned || false, // Mapping ban status
            totalSpent: userProfile.totalSpent || 0,
            dailyMission: userProfile.dailyMission, 
            lifetimeGenerations: userProfile.lifetimeGenerations || 0,
            lastAttendanceClaim: userProfile.lastAttendanceClaim || null,
            referralCode: userProfile.referralCode,
            referralCount: userProfile.referralCount,
            referredBy: userProfile.referredBy,
            brandKit: userProfile.brandKit,
            storageTier: userProfile.storageTier
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
      }
    }
  };
  
  const openAuthModal = () => setAuthModalOpen(true);
  const closeAuthModal = () => {
      setAuthModalOpen(false);
      setTimeout(() => setAuthError(null), 300);
  };

  const authProps: AuthProps = {
    isAuthenticated,
    user,
    setUser,
    handleLogout,
    openAuthModal,
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
  if (user && user.isBanned) {
      return <BannedScreen onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {showBanner && announcement && <GlobalBanner announcement={announcement} onClose={() => setShowBanner(false)} />}
      
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
      {editProfileModalOpen && user && (
        <EditProfileModal
          user={user}
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
