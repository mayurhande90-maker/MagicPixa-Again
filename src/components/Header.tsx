import React from 'react';
import { Page, AuthProps } from '../App';
import UserMenu from './UserMenu';
import { View } from '../DashboardPage';

// Add `setActiveView` to AuthProps for the dashboard context
interface DashboardAuthProps extends AuthProps {
    setActiveView?: (view: View) => void;
}

interface HeaderProps {
    navigateTo: (page: Page) => void;
    auth: DashboardAuthProps;
}

const Header: React.FC<HeaderProps> = ({ navigateTo, auth }) => {
  return (
    <header className="sticky top-0 z-50 py-4 px-4 sm:px-6 lg:px-8 bg-[#F9FAFB]/80 backdrop-blur-lg border-b border-gray-200/80">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigateTo('home')}>
            <h1 className="text-2xl font-bold text-[#1E1E1E] flex items-center gap-2">
                Magic<span className="text-[#0079F2]">Pixa</span>
            </h1>
        </div>
        <div className="flex items-center gap-4">
            {auth.isAuthenticated && auth.user ? (
              <UserMenu user={auth.user} onLogout={auth.handleLogout} navigateTo={navigateTo} setActiveView={auth.setActiveView} />
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
