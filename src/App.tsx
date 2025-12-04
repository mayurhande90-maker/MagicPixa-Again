
import React, { useState, useEffect, useCallback } from 'react';
import HomePage from './HomePage';
import DashboardPage from './DashboardPage';
import AboutUsPage from './AboutUsPage';
import AuthModal from './components/AuthModal';
import { NotificationDisplay } from './components/NotificationDisplay';
import { CreditGrantModal } from './components/CreditGrantModal';
import ConfigurationError from './components/ConfigurationError';
import { 
    auth as firebaseAuth, 
    signInWithGoogle, 
    getOrCreateUserProfile, 
    subscribeToUserProfile,
    subscribeToAnnouncement,
    subscribeToAppConfig,
    updateUserProfile,
    getMissingConfigKeys,
    isConfigValid
} from './firebase';
import { User, Page, View, AuthProps, AppConfig, Announcement } from './types';
import { ShieldCheckIcon } from './components/icons';

// --- Inline Components for Admin Features ---

const ImpersonationBanner: React.FC<{ originalUser: User; targetUser: User; onExit: () => void }> = ({ originalUser, targetUser, onExit }) => (
    <div className="bg-orange-500 text-white px-4 py-2 flex justify-between items-center z-[100] relative">
        <div className="flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5" />
            <span className="font-bold text-sm">
                Admin Mode: Viewing as {targetUser.name} ({targetUser.email})
            </span>
        </div>
        <button 
            onClick={onExit}
            className="bg-white text-orange-600 px-3 py-1 rounded text-xs font-bold hover:bg-gray-100"
        >
            Exit View
        </button>
    </div>
);

const BannedScreen: React.FC<{ onLogout: () => void }> = ({ onLogout }) => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
            <ShieldCheckIcon className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Suspended</h1>
        <p className="text-gray-600 text-center max-w-md mb-8">
            Your account has been suspended for violating our terms of service. 
            If you believe this is a mistake, please contact support.
        </p>
        <button 
            onClick={onLogout}
            className="bg-gray-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-black transition-colors"
        >
            Sign Out
        </button>
    </div>
);

// --- Main App Component ---

function App() {
  // Config Validation
  const [missingKeys] = useState<string[]>(getMissingConfigKeys());
  
  // Navigation State
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [currentView, setCurrentView] = useState<View>('home_dashboard'); // Default view
  
  // User State
  const [user, setUser] = useState<User | null>(null); // The logged-in user
  const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null); // Admin impersonation target
  const [loading, setLoading] = useState(true);
  
  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // App Configuration State
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [showBanner, setShowBanner] = useState(true);

  // Gemini Live Conversation State (Global)
  const [isConversationOpen, setIsConversationOpen] = useState(false);

  // Computed Active User (Impersonated or Real)
  const activeUser = impersonatedUser || user;

  // --- Effects ---

  // 1. App Config Subscription
  useEffect(() => {
      const unsubscribe = subscribeToAppConfig((config) => {
          if (config) setAppConfig(config);
      });
      return () => unsubscribe();
  }, []);

  // 2. Announcement Subscription
  useEffect(() => {
      const unsubscribe = subscribeToAnnouncement((ann) => {
          setAnnouncement(ann);
          setShowBanner(true); // Re-show banner on update
      });
      return () => unsubscribe();
  }, []);

  // 3. Auth Listener
  useEffect(() => {
    if (!firebaseAuth) {
        setLoading(false);
        return;
    }
    const unsubscribe = firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        subscribeToUserProfile(firebaseUser.uid, (profile) => {
            if (profile) {
                setUser(profile);
            } else {
                getOrCreateUserProfile(firebaseUser.uid, firebaseUser.displayName || 'User', firebaseUser.email)
                    .then((newProfile) => setUser(newProfile as User));
            }
            setLoading(false);
        });
      } else {
        setUser(null);
        setImpersonatedUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // --- Handlers ---

  const handleGoogleSignIn = async () => {
    try {
      setAuthError(null);
      await signInWithGoogle();
      setIsAuthModalOpen(false);
    } catch (error: any) {
      console.error("Sign in error", error);
      setAuthError(error.message);
      throw error; 
    }
  };

  const handleLogout = async () => {
    if (firebaseAuth) {
        await firebaseAuth.signOut();
        setUser(null);
        setImpersonatedUser(null);
        setCurrentPage('home');
    }
  };

  const navigateTo = useCallback((page: Page, view?: View, sectionId?: string) => {
    setCurrentPage(page);
    if (view) setCurrentView(view);
    
    // Handle scrolling for home page sections
    if (page === 'home' && sectionId) {
        setTimeout(() => {
            const element = document.getElementById(sectionId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100);
    } else {
        window.scrollTo(0, 0);
    }
  }, []);

  const handleImpersonate = (targetUser: User | null) => {
      if (user?.isAdmin) {
          setImpersonatedUser(targetUser);
          if (targetUser) {
              navigateTo('dashboard', 'dashboard');
          }
      }
  };

  // Helper to clear notification
  const clearNotification = async () => {
      if (activeUser) {
          await updateUserProfile(activeUser.uid, { systemNotification: null as any });
      }
  };

  // --- Render ---

  if (!isConfigValid) {
      return <ConfigurationError missingKeys={missingKeys} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
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

  const authProps: AuthProps = {
    isAuthenticated: !!activeUser,
    user: activeUser,
    setUser: impersonatedUser ? (() => {}) : setUser, // Disable local updates if impersonating
    handleLogout,
    openAuthModal: () => setIsAuthModalOpen(true),
    impersonateUser: user?.isAdmin ? handleImpersonate : undefined
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900">
      {impersonatedUser && user && (
          <ImpersonationBanner 
            originalUser={user} 
            targetUser={impersonatedUser} 
            onExit={() => handleImpersonate(null)} 
          />
      )}
      
      {/* 1. Global Announcement Display */}
      {showBanner && announcement && announcement.isActive && (
          <NotificationDisplay 
              title={announcement.title}
              message={announcement.message}
              type={announcement.type}
              style={announcement.style || 'banner'}
              link={announcement.link}
              onClose={() => setShowBanner(false)}
          />
      )}
      
      {/* 2. User System Notification Display */}
      {activeUser?.systemNotification && !activeUser.systemNotification.read && (
          <NotificationDisplay 
              title={activeUser.systemNotification.title}
              message={activeUser.systemNotification.message}
              type={activeUser.systemNotification.type}
              style={activeUser.systemNotification.style || 'banner'}
              link={activeUser.systemNotification.link || undefined}
              onClose={clearNotification}
          />
      )}

      {/* Credit Grant Modal */}
      {activeUser?.creditGrantNotification && (
          <CreditGrantModal 
              userId={activeUser.uid}
              amount={activeUser.creditGrantNotification.amount}
              message={activeUser.creditGrantNotification.message}
              type={activeUser.creditGrantNotification.type}
              packageName={activeUser.creditGrantNotification.packageName}
          />
      )}

      {currentPage === 'home' && (
        <HomePage 
            navigateTo={navigateTo} 
            auth={authProps} 
            appConfig={appConfig}
        />
      )}

      {currentPage === 'about' && (
        <AboutUsPage 
            navigateTo={navigateTo} 
            auth={authProps} 
        />
      )}

      {currentPage === 'dashboard' && (
        <DashboardPage 
            navigateTo={navigateTo} 
            auth={authProps} 
            activeView={currentView}
            setActiveView={setCurrentView}
            openEditProfileModal={() => {}} // Placeholder if needed
            isConversationOpen={isConversationOpen}
            setIsConversationOpen={setIsConversationOpen}
            appConfig={appConfig}
            setAppConfig={setAppConfig as any}
        />
      )}

      {isAuthModalOpen && (
        <AuthModal 
            onClose={() => setIsAuthModalOpen(false)} 
            onGoogleSignIn={handleGoogleSignIn}
            error={authError}
        />
      )}
    </div>
  );
}

export default App;
