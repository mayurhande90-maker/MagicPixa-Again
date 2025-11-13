import React from 'react';
import { User, Page, View } from '../types';
import { DashboardIcon, PhotoStudioIcon, CreditCardIcon, PaletteIcon, CaptionIcon, ScannerIcon, MockupIcon, UsersIcon, HomeIcon, NotesIcon, ProductStudioIcon, LightbulbIcon } from './icons';

interface SidebarProps {
  user: User | null;
  activeView: View;
  setActiveView: (view: View) => void;
  navigateTo: (page: Page, view?: View, sectionId?: string) => void;
}

const NavButton: React.FC<{
    item: { id: string; label: string; icon: React.FC<{ className?: string }>; disabled: boolean };
    activeView: View;
    onClick: () => void;
}> = ({ item, activeView, onClick }) => (
    <button
        key={item.id}
        onClick={onClick}
        disabled={item.disabled}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors text-left ${
            activeView === item.id
                ? 'bg-[#0079F2]/10 text-[#0079F2]'
                : item.disabled
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-[#5F6368] hover:bg-gray-100'
        }`}
    >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        <span className="truncate">{item.label}</span>
    </button>
);


const Sidebar: React.FC<SidebarProps> = ({ user, activeView, setActiveView, navigateTo }) => {
  const navStructure = [
    { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon, disabled: false },
    { type: 'divider', label: 'Features' },
    { id: 'studio', label: 'Magic Photo Studio', icon: PhotoStudioIcon, disabled: false },
    { id: 'product_studio', label: 'Product Studio', icon: ProductStudioIcon, disabled: false },
    { id: 'brand_stylist', label: 'Brand Stylist AI', icon: LightbulbIcon, disabled: false },
    { id: 'soul', label: 'Magic Soul', icon: UsersIcon, disabled: false },
    { id: 'colour', label: 'Magic Photo Colour', icon: PaletteIcon, disabled: false },
    { id: 'caption', label: 'CaptionAI', icon: CaptionIcon, disabled: false },
    { id: 'interior', label: 'Magic Interior', icon: HomeIcon, disabled: false },
    { id: 'apparel', label: 'Magic Apparel', icon: UsersIcon, disabled: false },
    { id: 'scanner', label: 'Magic Scanner', icon: ScannerIcon, disabled: true },
    { id: 'mockup', label: 'Magic Mockup', icon: MockupIcon, disabled: false },
    { id: 'notes', label: 'Magic Notes', icon: NotesIcon, disabled: true },
    { type: 'divider', label: 'Account' },
    { id: 'billing', label: 'Billing & Credits', icon: CreditCardIcon, disabled: false },
  ];

  const handleNavClick = (view: View) => {
    setActiveView(view);
  }

  return (
    <aside className="hidden lg:flex w-72 bg-white border-r border-gray-200/80 p-4 flex-col">
        <nav className="flex-1 space-y-1">
            {navStructure.map((item, index) => {
            if (item.type === 'divider') {
                return (
                <div key={`divider-${index}`} className="pt-3 pb-2">
                    {item.label && <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pb-2">{item.label}</span>}
                    <hr className="border-gray-200/80" />
                </div>
                );
            }
            return (
                <NavButton
                key={item.id}
                item={item as any}
                activeView={activeView}
                onClick={() => handleNavClick(item.id as View)}
                />
            );
            })}
        </nav>
    </aside>
  );
};

export default Sidebar;
// Removed credits display from sidebar.