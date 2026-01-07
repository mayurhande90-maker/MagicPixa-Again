import React, { useState, useEffect, useCallback } from 'react';
import './styles/typography.css'; // Import centralized typography
import HomePage from './HomePage';
import ProfessionalHome from './ProfessionalHome'; // New Staging Home
import DashboardPage from './DashboardPage';
import AboutUsPage from './AboutUsPage';
import PricingPage from './PricingPage';
import PrivacyPolicyPage from './PrivacyPolicyPage';
import TermsConditionsPage from './TermsConditionsPage';
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
    updateUserLastActive,
    getMissingConfigKeys,
    isConfigValid
} from './firebase';
import { User, Page, View, AuthProps, AppConfig, Announcement, BrandKit } from './types';
import { ShieldCheckIcon } from './components/icons';

// --- Routing Configuration ---

const VIEW_TO_PATH: Record<string, string> = {
    'home_dashboard': '/Dashboard',
    'dashboard': '/Dashboard',
    'studio': '/PixaProductShots',
    'headshot': '/PixaHeadshotPro',
    'brand_kit': '/PixaEcommerceKit',
    'brand_stylist': '/PixaAdMaker',
    'thumbnail_studio': '/PixaThumbnailPro',
    'soul': '/PixaTogether',
    'colour': '/PixaPhotoRestore',
    'caption': '/PixaCaptionPro',
    'interior': '/PixaInteriorDesign',
    'apparel': '/PixaTryOn',
    'billing': '/Billing',
    'creations': '/MyCreations',
    'brand_manager': '/MyBrandKit',
    'support_center': '/HelpAndSupport',
    'admin': '/Admin',
    'campaign_studio': '/CampaignStudio',
};

// Create a case-insensitive map for detection
const PATH_TO_VIEW: Record<string, View> = Object.entries(VIEW_TO_PATH).reduce((acc, [view, path]) => {
    acc[path.toLowerCase()] = view as View;
    return acc;
}, {} as Record<string, View>);

// --- Helper: Auth Guard ---
const isPathPrivate = (path: string): boolean => {
    const p = path.toLowerCase();
    // If it's in our view map, it's a private dashboard route
    return !!PATH_TO_VIEW[p];
};

// --- Inline Components for Admin Features ---

const ImpersonationBanner: React.FC<{ originalUser: User; targetUser: User; onExit: () => void }> = ({ originalUser, targetUser, onExit }) => (
    <div className="fixed top-0 left-0 right-0 bg-orange-600 text-white px-6 py-3 flex justify-between items-center z-[100] shadow-lg animate-slideDown">
        <div className="flex items-center gap-3">
            <div className="bg-white/20 p-1.5 rounded-full">
                <ShieldCheckIcon className="w-5 h-5" />
            </div>
            <div>
                <p className="font-bold text-sm leading-none">Admin Mode Active</p>
                <p className="text-xs text-orange-100 mt-0.5">Viewing as <span className="font-bold underline">{targetUser.name}</span> ({targetUser.email})</p>
            </div>
        </div>
        <button 
            onClick={onExit}
            className="bg-white text-orange-700 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-50 transition-colors shadow-sm"
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
  
  // Helper to get view from current path
  const getViewFromPath = (path: string): View | null => {
      return PATH_TO_VIEW[path.toLowerCase()] || null;
  };

  // Navigation State
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const path = window.location.pathname;
    if (path.toLowerCase() === '/about') return 'about';
    if (path.toLowerCase() === '/pricing') return 'pricing';
    if (path.toLowerCase() === '/privacy') return 'privacy';
    if (path.toLowerCase() === '/terms') return 'terms';
    if (getViewFromPath(path)) return 'dashboard';
    
    // Check for legacy param but we will clean it up in the first effect
    const params = new URLSearchParams(window.location.search);
    return params.get('view') ? 'dashboard' : 'home';
  });

  // Deep Link & Staging View Initialization
  const [currentView, setCurrentView] = useState<View>(() => {
    const path = window.location.pathname;
    const viewFromPath = getViewFromPath(path);
    if (viewFromPath) return viewFromPath;
    
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view') as View;
    // Simple whitelist check
    const validViews: View[] = ['dashboard', 'studio', 'interior', 'creations', 'billing', 'colour', 'soul', 'apparel', 'profile', 'caption', 'home_dashboard', 'brand_kit', 'brand_stylist', 'admin', 'thumbnail_studio', 'daily_mission', 'magic_realty', 'brand_manager', 'support_center', 'headshot', 'campaign_studio'];
    if (viewParam && validViews.includes(viewParam)) {
        return viewParam;
    }
    return 'home_dashboard'; 
  });
  
  // STAGING MODE: Toggle between standard and professional home
  // Accessible via ?staging=true in URL
  const [isStagingMode, setIsStagingMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('staging') === 'true';
  });

  // User State
  const [user, setUser] = useState<User | null>(null); // The logged-in user
  const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null); // Admin impersonation target
  const [loading, setLoading] = useState(true);

  // DEEP LINK PERSISTENCE: Store intended destination when bounced to login
  const [pendingDestination, setPendingDestination] = useState<{ page: Page, view?: View } | null>(null);

  // SESSION-BASED BRAND KIT (Option A: Reset on login/refresh)
  const [activeBrandKit, setActiveBrandKit] = useState<BrandKit | null>(null);
  
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
        setActiveBrandKit(null);
        navigateTo('home');
    }
  };

  const navigateTo = useCallback((page: Page, view?: View, sectionId?: string) => {
    // AUTH GUARD: If trying to navigate to dashboard while not authenticated
    if (page === 'dashboard' && !firebaseAuth?.currentUser) {
        // Capture where the user wanted to go
        if (view) {
            setPendingDestination({ page, view });
        }
        setIsAuthModalOpen(true);
        // Force stay on current page or redirect to home
        if (currentPage === 'dashboard') {
             setCurrentPage('home');
             window.history.pushState({}, '', '/');
        }
        return;
    }

    setCurrentPage(page);
    if (view) setCurrentView(view);
    
    // Sync URL using Clean Paths
    let path = '/';
    if (page === 'about') path = '/About';
    else if (page === 'pricing') path = '/Pricing';
    else if (page === 'privacy') path = '/Privacy';
    else if (page === 'terms') path = '/Terms';
    else if (page === 'dashboard') {
        path = VIEW_TO_PATH[view || currentView] || '/Dashboard';
    }

    const params = new URLSearchParams(window.location.search);
    // STALENESS PREVENTION: Explicitly delete the legacy ?view= param if it re-appears
    params.delete('view'); 
    
    const search = params.toString() ? `?${params.toString()}` : '';
    window.history.pushState({}, '', `${path}${search}`);

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
  }, [currentView, currentPage]);

  const handleSetActiveView = useCallback((view: View) => {
      // AUTH GUARD
      if (!firebaseAuth?.currentUser) {
          setPendingDestination({ page: 'dashboard', view });
          setIsAuthModalOpen(true);
          return;
      }

      setCurrentView(view);
      const path = VIEW_TO_PATH[view] || '/Dashboard';
      const params = new URLSearchParams(window.location.search);
      // STALENESS PREVENTION: Explicitly delete the legacy ?view= param if it re-appears
      params.delete('view'); 
      
      const search = params.toString() ? `?${params.toString()}` : '';
      window.history.pushState({}, '', `${path}${search}`);
  }, []);

  // --- Effects ---

  // Cleanup Legacy URL params on load if they exist
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.has('view')) {
          const view = params.get('view') as View;
          const cleanPath = VIEW_TO_PATH[view] || '/Dashboard';
          params.delete('view');
          const search = params.toString() ? `?${params.toString()}` : '';
          window.history.replaceState({}, '', `${cleanPath}${search}`);
      }
  }, []);

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

  // 3. Auth Listener & Active Status + Hard Guard
  useEffect(() => {
    if (!firebaseAuth) {
        setLoading(false);
        return;
    }
    const unsubscribe = firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // ALWAYS Update Last Active on app load/refresh
        updateUserLastActive(firebaseUser.uid);

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
        // AUTH GUARD: If user is logged out and trying to access a private path
        const currentPath = window.location.pathname;
        if (isPathPrivate(currentPath)) {
            // Capture destination before bounce
            const view = getViewFromPath(currentPath);
            if (view) {
                setPendingDestination({ page: 'dashboard', view });
            }
            // Redirect to Home
            window.history.replaceState({}, '', '/');
            setCurrentPage('home');
            setIsAuthModalOpen(true); // Open modal on bounce
        }

        setUser(null);
        setImpersonatedUser(null);
        setActiveBrandKit(null); // Clear session brand kit on logout
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 4. Impersonated User Profile Listener (Ensures admin sees live target user updates)
  useEffect(() => {
    if (user?.isAdmin && impersonatedUser?.uid) {
        const unsubscribe = subscribeToUserProfile(impersonatedUser.uid, (profile) => {
            if (profile) {
                setImpersonatedUser(profile);
            }
        });
        return () => unsubscribe();
    }
  }, [impersonatedUser?.uid, user?.isAdmin]);

  // 5. Back/Forward Navigation Listener
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      
      // Update Staging mode if param changed
      setIsStagingMode(params.get('staging') === 'true');

      if (path === '/' || path === '/index.html') {
          setCurrentPage('home');
      } else if (path.toLowerCase() === '/about') {
          setCurrentPage('about');
      } else if (path.toLowerCase() === '/pricing') {
          setCurrentPage('pricing');
      } else if (path.toLowerCase() === '/privacy') {
          setCurrentPage('privacy');
      } else if (path.toLowerCase() === '/terms') {
          setCurrentPage('terms');
      } else {
          const view = getViewFromPath(path);
          if (view) {
              // AUTH GUARD: check if allowed to enter dashboard view via popstate
              if (!firebaseAuth?.currentUser) {
                  setPendingDestination({ page: 'dashboard', view });
                  window.history.replaceState({}, '', '/');
                  setCurrentPage('home');
                  setIsAuthModalOpen(true);
                  return;
              }
              setCurrentPage('dashboard');
              setCurrentView(view);
          }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 6. Deep Link Persistence: Effect to handle pending redirects after login success
  useEffect(() => {
    if (user && pendingDestination) {
      const { page, view } = pendingDestination;
      // We clear state BEFORE navigating to prevent race conditions or loops
      setPendingDestination(null);
      navigateTo(page, view);
    }
  }, [user, pendingDestination, navigateTo]);

  const handleImpersonate = (targetUser: User | null) => {
      if (user?.isAdmin) {
          // Clear active brand kit whenever identity switches to avoid context mixing
          setActiveBrandKit(null);
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
    // FIX: Allow state updates to propagate to the correct user state (Impersonated vs Real)
    setUser: impersonatedUser ? (setImpersonatedUser as any) : setUser, 
    activeBrandKit,
    setActiveBrandKit,
    handleLogout,
    openAuthModal: () => setIsAuthModalOpen(true),
    impersonateUser: user?.isAdmin ? handleImpersonate : undefined
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans text-slate-900 ${impersonatedUser ? 'pt-14' : ''}`}>
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
        isStagingMode ? (
          <ProfessionalHome 
              navigateTo={navigateTo} 
              auth={authProps} 
              appConfig={appConfig}
          />
        ) : (
          <HomePage 
              navigateTo={navigateTo} 
              auth={authProps} 
              appConfig={appConfig}
          />
        )
      )}

      {currentPage === 'about' && (
        <AboutUsPage 
            navigateTo={navigateTo} 
            auth={authProps} 
        />
      )}

      {currentPage === 'pricing' && (
        <PricingPage 
            navigateTo={navigateTo} 
            auth={authProps} 
            appConfig={appConfig}
        />
      )}

      {currentPage === 'privacy' && (
        <PrivacyPolicyPage 
            navigateTo={navigateTo} 
            auth={authProps} 
        />
      )}

      {currentPage === 'terms' && (
        <TermsConditionsPage 
            navigateTo={navigateTo} 
            auth={authProps} 
        />
      )}

      {currentPage === 'dashboard' && (
        <DashboardPage 
            key={activeUser?.uid} // CRITICAL: Force remount of whole dashboard when identity switches
            navigateTo={navigateTo} 
            auth={authProps} 
            activeView={currentView}
            setActiveView={handleSetActiveView}
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