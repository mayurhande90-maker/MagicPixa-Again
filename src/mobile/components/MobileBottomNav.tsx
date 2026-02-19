
import React from 'react';
import { View } from '../../types';
import { HomeIcon, DashboardIcon, ProjectsIcon, UserIcon } from '../../components/icons';

interface MobileBottomNavProps {
    activeTab: View;
    setActiveTab: (tab: View) => void;
}

const FluentHomeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fill="url(#fluentColorHome280)" d="M10 15h8v10h-8z"/>
        <path fill="url(#fluentColorHome281)" d="M15.408 4.498a2.25 2.25 0 0 0-2.816 0l-7.75 6.217A2.25 2.25 0 0 0 4 12.47v10.28A2.25 2.25 0 0 0 6.25 25H11v-7.75c0-.69.56-1.25 1.25-1.25h3.5c.69 0 1.25.56 1.25 1.25V25h4.75A2.25 2.25 0 0 0 24 22.75V12.47a2.25 2.25 0 0 0-.842-1.755z"/>
        <path fill="url(#fluentColorHome282)" fill-rule="evenodd" d="m14 5.715l-9.714 7.863a1.25 1.25 0 0 1-1.573-1.943L12.9 3.39a1.75 1.75 0 0 1 2.202 0l10.186 8.245a1.25 1.25 0 0 1-1.573 1.943z" clip-rule="evenodd"/>
        <defs>
            <linearGradient id="fluentColorHome280" x1="14" x2="7.592" y1="15" y2="26.396" gradientUnits="userSpaceOnUse">
                <stop stop-color="#944600"/>
                <stop offset="1" stop-color="#CD8E02"/>
            </linearGradient>
            <linearGradient id="fluentColorHome281" x1="5.909" x2="26.285" y1="2.976" y2="18.752" gradientUnits="userSpaceOnUse">
                <stop stop-color="#FFD394"/>
                <stop offset="1" stop-color="#FFB357"/>
            </linearGradient>
            <linearGradient id="fluentColorHome282" x1="10.203" x2="14.689" y1=".421" y2="13.551" gradientUnits="userSpaceOnUse">
                <stop stop-color="#FF921F"/>
                <stop offset="1" stop-color="#EB4824"/>
            </linearGradient>
        </defs>
    </svg>
);

const FluentProfileIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fill="url(#fluentColorPerson280)" d="M21 16a3 3 0 0 1 3 3v.715C24 23.292 19.79 26 14 26S4 23.433 4 19.715V19a3 3 0 0 1 3-3z"/>
        <path fill="url(#fluentColorPerson281)" d="M21 16a3 3 0 0 1 3 3v.715C24 23.292 19.79 26 14 26S4 23.433 4 19.715V19a3 3 0 0 1 3-3z"/>
        <path fill="url(#fluentColorPerson282)" d="M14 2a6 6 0 1 1 0 12a6 6 0 0 1 0-12"/>
        <defs>
            <linearGradient id="fluentColorPerson280" x1="8.756" x2="11.987" y1="17.329" y2="27.647" gradientUnits="userSpaceOnUse">
                <stop offset=".125" stop-color="#9C6CFE"/>
                <stop offset="1" stop-color="#7A41DC"/>
            </linearGradient>
            <linearGradient id="fluentColorPerson281" x1="14" x2="18.524" y1="14.809" y2="31.714" gradientUnits="userSpaceOnUse">
                <stop stop-color="#885EDB" stop-opacity="0"/>
                <stop offset="1" stop-color="#E362F8"/>
            </linearGradient>
            <linearGradient id="fluentColorPerson282" x1="10.854" x2="16.969" y1="3.595" y2="13.361" gradientUnits="userSpaceOnUse">
                <stop offset=".125" stop-color="#9C6CFE"/>
                <stop offset="1" stop-color="#7A41DC"/>
            </linearGradient>
        </defs>
    </svg>
);

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, setActiveTab }) => {
    const navItems = [
        { id: 'home_dashboard', label: 'Home', icon: FluentHomeIcon },
        { id: 'dashboard', label: 'Features', icon: DashboardIcon },
        { id: 'creations', label: 'Projects', icon: ProjectsIcon },
        { id: 'profile', label: 'Profile', icon: FluentProfileIcon },
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
