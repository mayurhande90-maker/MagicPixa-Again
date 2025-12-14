
import React, { useState, useRef, useEffect } from 'react';
import { User, Page, View } from '../types';
import { LogoutIcon, DashboardIcon, ProjectsIcon, PixaBillingIcon, ShieldCheckIcon } from './icons';
import { getBadgeInfo } from '../utils/badgeUtils';
import { CreatorRanksModal } from './CreatorRanksModal';

interface UserMenuProps {
  user: User;
  onLogout: () => void;
  navigateTo: (page: Page, view?: View) => void;
  setActiveView?: (view: View) => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, onLogout, navigateTo, setActiveView }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showRanksModal, setShowRanksModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const badge = getBadgeInfo(user.lifetimeGenerations);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigation = (view: View) => {
    if (setActiveView) {
      setActiveView(view);
    } else {
      navigateTo('dashboard', view);
    }
    setIsOpen(false);
  };

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
          className="absolute right-0 mt-2 w-72 bg-white border border-gray-200/80 rounded-xl shadow-lg z-20"
          role="menu"
        >
          <div className="p-4 border-b border-gray-200/80 bg-gray-50/50 rounded-t-xl">
            <p className="font-semibold text-[#1E1E1E] truncate" title={user.name}>{user.name}</p>
            <p className="text-sm text-[#5F6368] truncate mb-3" title={user.email}>{user.email}</p>
            
            {/* Badge Display with Click Trigger */}
            <button 
                onClick={() => {
                    setIsOpen(false);
                    setShowRanksModal(true);
                }}
                className={`w-full flex items-center gap-3 p-2 rounded-lg border text-left transition-colors cursor-pointer hover:brightness-95 ${badge.bgColor} ${badge.borderColor}`}
            >
                <div className={`p-1.5 rounded-full bg-white shadow-sm ${badge.iconColor}`}>
                    <badge.Icon className="w-5 h-5" />
                </div>
                <div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${badge.color}`}>{badge.rank}</p>
                    {badge.nextMilestone > 0 ? (
                        <p className="text-[10px] text-gray-500">{user.lifetimeGenerations || 0} / {badge.nextMilestone} Gens</p>
                    ) : (
                        <p className="text-[10px] text-gray-500">Max Level Reached!</p>
                    )}
                </div>
            </button>
          </div>
          <div className="py-2">
            {user.isAdmin && (
                <button onClick={() => handleNavigation('admin')} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-green-600 font-bold hover:bg-green-50" role="menuitem">
                    <ShieldCheckIcon className="w-5 h-5" /> Admin Panel
                </button>
            )}
            <button onClick={() => handleNavigation('dashboard')} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-[#1E1E1E] hover:bg-gray-100" role="menuitem">
              <DashboardIcon className="w-5 h-5" /> Dashboard
            </button>
            <button onClick={() => handleNavigation('creations')} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-[#1E1E1E] hover:bg-gray-100" role="menuitem">
              <ProjectsIcon className="w-5 h-5" /> My Creations
            </button>
            <button onClick={() => handleNavigation('billing')} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-[#1E1E1E] hover:bg-gray-100" role="menuitem">
              <PixaBillingIcon className="w-5 h-5" /> Billing & Credits
            </button>
          </div>
          <div className="py-2 border-t border-gray-200/80">
             <button onClick={onLogout} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50" role="menuitem">
                <LogoutIcon className="w-5 h-5" /> Logout
            </button>
          </div>
        </div>
      )}
      
      {showRanksModal && <CreatorRanksModal currentGens={user.lifetimeGenerations || 0} onClose={() => setShowRanksModal(false)} />}
    </div>
  );
};

export default UserMenu;
