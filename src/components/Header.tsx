
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
    <header className="sticky top-0 z-50 py-4 px-4 sm:px-6 lg:px-8 bg-white/80 dark:bg-black/30 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigateTo('home')}>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Magic<span className="text-cyan-500 dark:text-cyan-400">Pixa</span>
                <div className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400 glowing-dot"></div>
            </h1>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Pricing</a>
          <a href="#reviews" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Reviews</a>
          <button onClick={() => navigateTo('dashboard')} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Dashboard</button>
          <a href="#" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Contact</a>
        </nav>
        <div className="flex items-center gap-4">
            <ThemeToggle />
            {auth.isAuthenticated && auth.user ? (
              <UserMenu user={auth.user} onLogout={auth.handleLogout} navigateTo={navigateTo} />
            ) : (
              <>
                <button onClick={auth.openAuthModal} className="hidden sm:block text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Login</button>
                <button onClick={auth.openAuthModal} className="text-sm font-semibold bg-gray-900 dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors">Sign Up</button>
              </>
            )}
        </div>
      </div>
    </header>
  );
};

export default Header;
