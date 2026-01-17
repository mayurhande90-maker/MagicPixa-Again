
import React from 'react';
import { View } from '../../types';
import { HomeIcon, PixaProductIcon, ProjectsIcon, UserIcon } from '../../components/icons';

interface MobileBottomNavProps {
    activeTab: View;
    setActiveTab: (tab: View) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, setActiveTab }) => {
    const navItems = [
        { id: 'home_dashboard', label: 'Home', icon: HomeIcon },
        { id: 'studio', label: 'Studio', icon: PixaProductIcon },
        { id: 'creations', label: 'Projects', icon: ProjectsIcon },
        { id: 'profile', label: 'Profile', icon: UserIcon },
    ];

    return (
        <nav className="flex-none bg-white border-t border-gray-100 px-2 pt-2 pb-6 flex items-center justify-around z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
            {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as View)}
                        className={`flex flex-col items-center gap-1 p-2 min-w-[64px] transition-all duration-300 ${
                            isActive ? 'text-indigo-600 scale-110' : 'text-gray-400'
                        }`}
                    >
                        <div className={`p-1.5 rounded-2xl transition-all duration-300 ${isActive ? 'bg-indigo-50 shadow-inner' : ''}`}>
                            <item.icon className="w-6 h-6" />
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                            {item.label}
                        </span>
                        {isActive && (
                            <div className="w-1 h-1 bg-indigo-600 rounded-full animate-fadeIn"></div>
                        )}
                    </button>
                );
            })}
        </nav>
    );
};
