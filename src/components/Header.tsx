
import React from 'react';
import { Page, AuthProps } from '../App';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';

interface HeaderProps {
    navigateTo: (page: Page) => void;
    auth: AuthProps;
}

const Header: React.FC<HeaderProps> = ({ navigateTo, auth }) => {
  return (
    <header className="sticky top-0 z-50 py-4 px-4 sm:px-6 lg:px-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigateTo('home')}>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Magic<span className="text-blue-600 dark:text-blue-400">Pixa</span>
            </h1>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Pricing</a>
          <a href="#reviews" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Reviews</a>
          <button onClick={() => navigateTo('dashboard')} className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Dashboard</button>
          <a href="#" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Contact</a>
        </nav>
        <div className="flex items-center gap-4">
            <ThemeToggle />
            {auth.isAuthenticated && auth.user ? (
              <UserMenu user={auth.user} onLogout={auth.handleLogout} navigateTo={navigateTo} />
            ) : (
              <button onClick={() => auth.openAuthModal()} className="text-sm font-semibold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Sign In
              </button>
            )}
        </div>
      </div>
    </header>
  );
};

export default Header;