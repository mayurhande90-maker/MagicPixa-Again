import React, { useState, useRef, useEffect } from 'react';
import { User } from '../App';
import { Page } from '../App';
import { LogoutIcon, DashboardIcon, ProjectsIcon } from './icons';

interface UserMenuProps {
  user: User;
  onLogout: () => void;
  navigateTo: (page: Page) => void;
  // FIX: Changed the type of `setActiveView` to be more specific, matching the state in DashboardPage.
  setActiveView?: (view: 'studio' | 'creations' | 'billing') => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, onLogout, navigateTo, setActiveView }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center cursor-pointer text-blue-600 dark:text-blue-400 font-bold text-lg hover:ring-2 hover:ring-blue-500 transition-all"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="User menu"
      >
        {user.avatar}
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20"
          role="menu"
        >
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <p className="font-semibold text-slate-800 dark:text-white truncate" title={user.name}>{user.name}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate" title={user.email}>{user.email}</p>
          </div>
          <div className="py-2">
            <button onClick={() => { navigateTo('dashboard'); setActiveView?.('studio'); setIsOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50" role="menuitem">
              <DashboardIcon className="w-5 h-5" /> Dashboard
            </button>
            <button onClick={() => { /* Placeholder */ setIsOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-400 dark:text-slate-500 cursor-not-allowed" role="menuitem">
              <ProjectsIcon className="w-5 h-5" /> My Creations
            </button>
          </div>
          <div className="py-2 border-t border-slate-200 dark:border-slate-700">
             <button onClick={onLogout} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" role="menuitem">
                <LogoutIcon className="w-5 h-5" /> Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;