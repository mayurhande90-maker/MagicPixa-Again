import React from 'react';
// FIX: Import `View` from `../App` where it is defined, instead of `../DashboardPage` which does not export it.
import { Page, AuthProps, View } from '../App';
import UserMenu from './UserMenu';
import { SparklesIcon, MagicPixaLogo } from './icons';

// Add `setActiveView` to AuthProps for the dashboard context
interface DashboardAuthProps extends AuthProps {
    setActiveView?: (view: View) => void;
}

interface HeaderProps {
    navigateTo: (page: Page) => void;
    auth: DashboardAuthProps;
}

const Header: React.FC<HeaderProps> = ({ navigateTo, auth }) => {
  const scrollToSection = (id: string) => {
    // Check if we are on the home page by looking for a unique home page element.
    const isHomePage = !!document.getElementById('pricing'); 

    if (!isHomePage) {
        navigateTo('home');
        // Need a slight delay for React to render the home page before we can scroll.
        setTimeout(() => {
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    } else {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };


  return (
    <header className="sticky top-0 z-50 py-4 px-4 sm:px-6 lg:px-8 bg-[#F9FAFB]/80 backdrop-blur-lg border-b border-gray-200/80">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-10">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => scrollToSection('home')}>
                <MagicPixaLogo />
            </div>
            <nav className="hidden md:flex items-center gap-6">
                 <button onClick={() => scrollToSection('home')} className="text-sm font-semibold text-[#5F6368] hover:text-[#1E1E1E] transition-colors">Home</button>
                 <button onClick={() => scrollToSection('features')} className="text-sm font-semibold text-[#5F6368] hover:text-[#1E1E1E] transition-colors">Features</button>
                 <button onClick={() => scrollToSection('pricing')} className="text-sm font-semibold text-[#5F6368] hover:text-[#1E1E1E] transition-colors">Pricing</button>
                 <button onClick={() => scrollToSection('about')} className="text-sm font-semibold text-[#5F6368] hover:text-[#1E1E1E] transition-colors">About Us</button>
            </nav>
        </div>
        <div className="flex items-center gap-4">
            {auth.isAuthenticated && auth.user ? (
              <>
                <div className="hidden sm:flex items-center gap-2 bg-yellow-100/80 text-yellow-900 font-semibold px-3 py-1.5 rounded-full text-sm border border-yellow-300/50">
                    <SparklesIcon className="w-4 h-4 text-yellow-600" />
                    <span>{auth.user.credits} Credits</span>
                </div>
                <UserMenu user={auth.user} onLogout={auth.handleLogout} navigateTo={navigateTo} setActiveView={auth.setActiveView} />
              </>
            ) : (
              <button onClick={() => auth.openAuthModal()} className="hidden sm:block text-sm font-semibold bg-white text-[#0079F2] px-4 py-2 rounded-xl border-2 border-[#0079F2] hover:bg-blue-50 transition-colors">
                Sign In
              </button>
            )}
        </div>
      </div>
    </header>
  );
};

export default Header;