import React from 'react';
import { User } from '../App';
import { PhotoStudioIcon, ProjectsIcon, CreditCardIcon, ScissorsIcon, PaletteIcon, CaptionIcon, ScannerIcon, TshirtIcon, UsersIcon, HomeIcon, NotesIcon } from './icons';
import { View } from '../App';

interface SidebarProps {
  user: User | null;
  activeView: View;
  setActiveView: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, activeView, setActiveView }) => {
  const navItems = [
    { id: 'studio', label: 'Magic Photo Studio', icon: PhotoStudioIcon, disabled: false },
    { id: 'background-removal', label: 'Magic Background Removal', icon: ScissorsIcon, disabled: true },
    { id: 'photo-colour', label: 'Magic Photo Colour', icon: PaletteIcon, disabled: true },
    { id: 'caption-ai', label: 'CaptionAI', icon: CaptionIcon, disabled: true },
    { id: 'scanner', label: 'Magic Scanner', icon: ScannerIcon, disabled: true },
    { id: 'mockup', label: 'Magic Mockup', icon: TshirtIcon, disabled: true },
    { id: 'friends', label: 'Magic with Friends', icon: UsersIcon, disabled: true },
    { id: 'interior', label: 'Magic Interior', icon: HomeIcon, disabled: false },
    { id: 'apparel', label: 'Magic Apparel', icon: TshirtIcon, disabled: true },
    { id: 'notes', label: 'Magic Notes', icon: NotesIcon, disabled: true },
    { id: 'billing', label: 'Billing', icon: CreditCardIcon, disabled: false },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200/80 p-4 flex flex-col">
      <nav className="flex-1 space-y-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id as View)}
            disabled={item.disabled}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeView === item.id
                ? 'bg-[#0079F2]/10 text-[#0079F2]'
                : item.disabled
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-[#5F6368] hover:bg-gray-100'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      {user && (
        <div className="mt-auto p-4 bg-gray-50 rounded-lg border border-gray-200/80">
          <p className="text-sm text-[#5F6368] mb-1">Credits</p>
          <p className="text-2xl font-bold text-[#1E1E1E]">{user.credits}</p>
          <button 
            onClick={() => setActiveView('billing')}
            className="w-full mt-3 bg-[#f9d230] text-[#1E1E1E] text-sm font-semibold py-2 rounded-lg hover:scale-105 transform transition-transform"
          >
            Get More Credits
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
// Minor change for commit.