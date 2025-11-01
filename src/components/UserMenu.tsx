import React, { useState, useRef, useEffect } from 'react';
// FIX: Import `View` from `../App` where it is defined, instead of `../DashboardPage` which does not export it.
import { User, Page, View } from '../App';
import { LogoutIcon, DashboardIcon, ProjectsIcon, CreditCardIcon } from './icons';

interface UserMenuProps {
  user: User;
  onLogout: () => void;
  navigateTo: (page: Page) => void;
  setActiveView?: (view: View) => void;
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
        className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer text-[#0079F2] font-bold text-lg hover:ring-2 hover:ring-[#0079F2] transition-all"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="User menu"
      >
        {user.avatar}
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-64 bg-white border border-gray-200/80 rounded-xl shadow-lg z-20"
          role="menu"
        >
          <div className="p-4 border-b border-gray-200/80">
            <p className="font-semibold text-[#1E1E1E] truncate" title={user.name}>{user.name}</p>
            <p className="text-sm text-[#5F6368] truncate" title={user.email}>{user.email}</p>
          </div>
          <div className="py-2">
            <button onClick={() => { navigateTo('dashboard'); setActiveView?.('studio'); setIsOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-[#1E1E1E] hover:bg-gray-100" role="menuitem">
              <DashboardIcon className="w-5 h-5" /> Dashboard
            </button>
            <button onClick={() => { navigateTo('dashboard'); setActiveView?.('creations'); setIsOpen(false); }} disabled className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-400 cursor-not-allowed" role="menuitem">
              <ProjectsIcon className="w-5 h-5" /> My Creations
            </button>
            <button onClick={() => { navigateTo('dashboard'); setActiveView?.('billing'); setIsOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-[#1E1E1E] hover:bg-gray-100" role="menuitem">
              <CreditCardIcon className="w-5 h-5" /> Billing
            </button>
          </div>
          <div className="py-2 border-t border-gray-200/80">
             <button onClick={onLogout} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50" role="menuitem">
                <LogoutIcon className="w-5 h-5" /> Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
// Minor change for commit.