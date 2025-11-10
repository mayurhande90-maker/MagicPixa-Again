import React, { useState } from 'react';
import { Page, AuthProps, View } from '../types';
import UserMenu from './UserMenu';
import { SparklesIcon, MagicPixaLogo, AudioWaveIcon, MenuIcon, XIcon, ArrowLeftIcon } from './icons';

// Add `setActiveView` to AuthProps for the dashboard context
interface DashboardAuthProps extends AuthProps {
    setActiveView?: (view: View) => void;
    openConversation?: () => void;
    isDashboard?: boolean;
    showBackButton?: boolean;
    handleBack?: () => void;
}

interface HeaderProps {
    navigateTo: (page: Page, view?: View, sectionId?: string) => void;
    auth: DashboardAuthProps;
}

const Header: React.FC<HeaderProps> = ({ navigateTo, auth }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleMobileLinkClick = (page: Page, view?: View, sectionId?: string) => {
    navigateTo(page, view, sectionId);
    setIsMobileMenuOpen(false);
  }

  const MobileNavMenu: React.FC = () => (
    <div className="fixed inset-0 bg-white z-[100] p-4 flex flex-col">
        <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleMobileLinkClick('home', undefined, 'home')}>
                <MagicPixaLogo />
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2">
                <XIcon className="w-6 h-6 text-gray-600" />
            </button>
        </div>
        <nav className="flex flex-col gap-6 text-center">
            {auth.isAuthenticated ? (
              <button onClick={() => handleMobileLinkClick('dashboard', 'dashboard')} className="text-lg font-semibold text-[#1E1E1E]">Dashboard</button>
            ) : (
              <button onClick={() => handleMobileLinkClick('home', undefined, 'home')} className="text-lg font-semibold text-[#1E1E1E]">Home</button>
            )}
            <button onClick={() => handleMobileLinkClick('home', undefined, 'features')} className="text-lg font-semibold text-[#1E1E1E]">Features</button>
            <button onClick={() => handleMobileLinkClick('home', undefined, 'pricing')} className="text-lg font-semibold text-[#1E1E1E]">Pricing</button>
            <button onClick={() => handleMobileLinkClick('home', undefined, 'about')} className="text-lg font-semibold text-[#1E1E1E]">About Us</button>
        </nav>
        {!auth.isAuthenticated && (
            <div className="mt-auto">
                <button onClick={() => { auth.openAuthModal(); setIsMobileMenuOpen(false); }} className="w-full text-lg font-semibold bg-[#0079F2] text-white px-4 py-3 rounded-xl">
                    Sign In
                </button>
            </div>
        )}
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-50 py-4 px-4 sm:px-6 lg:px-8 bg-[#F9FAFB]/80 backdrop-blur-lg border-b border-gray-200/80">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-10">
              {auth.isDashboard && (
                <div className="lg:hidden">
                    {auth.showBackButton && (
                        <button onClick={auth.handleBack} className="p-2 -ml-2 text-[#1E1E1E]" aria-label="Go back">
                            <ArrowLeftIcon className="w-6 h-6" />
                        </button>
                    )}
                </div>
              )}
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigateTo('home', undefined, 'home')}>
                  <MagicPixaLogo />
              </div>
              <nav className="hidden md:flex items-center gap-6">
                   {auth.isAuthenticated ? (
                      <button onClick={() => navigateTo('dashboard', 'dashboard')} className="text-sm font-semibold text-[#5F6368] hover:text-[#1E1E1E] transition-colors">Dashboard</button>
                   ) : (
                      <button onClick={() => navigateTo('home', undefined, 'home')} className="text-sm font-semibold text-[#5F6368] hover:text-[#1E1E1E] transition-colors">Home</button>
                   )}
                   <button onClick={() => navigateTo('home', undefined, 'features')} className="text-sm font-semibold text-[#5F6368] hover:text-[#1E1E1E] transition-colors">Features</button>
                   <button onClick={() => navigateTo('home', undefined, 'pricing')} className="text-sm font-semibold text-[#5F6368] hover:text-[#1E1E1E] transition-colors">Pricing</button>
                   <button onClick={() => navigateTo('home', undefined, 'about')} className="text-sm font-semibold text-[#5F6368] hover:text-[#1E1E1E] transition-colors">About Us</button>
              </nav>
          </div>
          <div className="flex items-center gap-4">
              {auth.isAuthenticated && auth.user ? (
                <>
                  {/* Mobile view: Show credits instead of user circle */}
                  <div className="sm:hidden flex items-center gap-2 bg-yellow-100/80 text-yellow-900 font-semibold px-3 py-1.5 rounded-full text-sm border border-yellow-300/50">
                    <SparklesIcon className="w-4 h-4 text-yellow-600" />
                    <span>{auth.user.credits} Credits</span>
                  </div>

                  {/* Desktop view: Unchanged */}
                  <div className="hidden sm:flex items-center gap-4">
                    {auth.isDashboard ? (
                      <>
                        <button 
                            onClick={auth.openConversation}
                            className="flex items-center gap-2 bg-white text-blue-600 font-semibold px-3 py-1.5 rounded-full text-sm border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
                        >
                            <AudioWaveIcon className="w-4 h-4" />
                            <span>Magic Conversation</span>
                        </button>
                        <div className="flex items-center gap-2 bg-yellow-100/80 text-yellow-900 font-semibold px-3 py-1.5 rounded-full text-sm border border-yellow-300/50">
                            <SparklesIcon className="w-4 h-4 text-yellow-600" />
                            <span>{auth.user.credits} Credits</span>
                        </div>
                        <UserMenu user={auth.user} onLogout={auth.handleLogout} navigateTo={navigateTo} setActiveView={auth.setActiveView} />
                      </>
                    ) : (
                       <UserMenu user={auth.user} onLogout={auth.handleLogout} navigateTo={navigateTo} setActiveView={auth.setActiveView} />
                    )}
                  </div>
                </>
              ) : (
                <>
                  <button onClick={() => auth.openAuthModal()} className="hidden sm:block text-sm font-semibold bg-white text-[#0079F2] px-4 py-2 rounded-xl border-2 border-[#0079F2] hover:bg-blue-50 transition-colors">
                    Sign In
                  </button>
                  <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-[#1E1E1E] md:hidden" aria-label="Open navigation menu">
                    <MenuIcon className="w-6 h-6" />
                  </button>
                </>
              )}
          </div>
        </div>
      </header>
      {isMobileMenuOpen && !auth.isDashboard && <MobileNavMenu />}
    </>
  );
};

export default Header;
// Minor change for commit.