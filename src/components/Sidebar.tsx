import React, { useState } from 'react';
import { User, Page, View, AppConfig } from '../types';
import { LayoutGridIcon, PhotoStudioIcon, CreditCardIcon, PaletteIcon, CaptionIcon, ScannerIcon, MockupIcon, UsersIcon, HomeIcon, NotesIcon, BrandKitIcon, LightbulbIcon, ProjectsIcon, ShieldCheckIcon, ThumbnailIcon, CheckIcon, GiftIcon, ApparelIcon, MagicAdsIcon, BuildingIcon, UploadTrayIcon, PixaProductIcon, PixaEcommerceIcon } from './icons';
import { claimDailyAttendance } from '../firebase';

interface SidebarProps {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  activeView: View;
  setActiveView: (view: View) => void;
  navigateTo: (page: Page, view?: View, sectionId?: string) => void;
  appConfig: AppConfig | null;
  openReferralModal: () => void;
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
                ? 'bg-[#4D7CFF]/15 text-[#4D7CFF]'
                : item.disabled
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-[#5F6368] hover:bg-gray-100'
        }`}
    >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        <span className="truncate">{item.label}</span>
        {item.disabled && (
            <span className="ml-auto text-[10px] bg-gray-200 text-gray-500 font-bold px-1.5 py-0.5 rounded-full">
                SOON
            </span>
        )}
    </button>
);


const Sidebar: React.FC<SidebarProps> = ({ user, setUser, activeView, setActiveView, navigateTo, appConfig, openReferralModal }) => {
  const [isClaiming, setIsClaiming] = useState(false);

  const allNavItems = [
    ...(user?.isAdmin ? [{ id: 'admin', label: 'Admin Panel', icon: ShieldCheckIcon, disabled: false }] : []),
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGridIcon, disabled: false },
    { id: 'creations', label: 'My Creations', icon: ProjectsIcon, disabled: false },
    { id: 'brand_manager', label: 'My Brand Kit', icon: BrandKitIcon, disabled: false },
    { type: 'divider', label: 'Features' },
    { id: 'studio', label: 'Pixa Product Shots', icon: PixaProductIcon, disabled: false },
    { id: 'thumbnail_studio', label: 'Pixa Thumbnail Pro', icon: ThumbnailIcon, disabled: false },
    { id: 'magic_realty', label: 'Pixa Realty Ads', icon: BuildingIcon, disabled: false }, // Renamed
    { id: 'brand_kit', label: 'Pixa Ecommerce Kit', icon: PixaEcommerceIcon, disabled: false }, 
    { id: 'brand_stylist', label: 'Pixa AdMaker', icon: MagicAdsIcon, disabled: false },
    { id: 'soul', label: 'Magic Soul', icon: UsersIcon, disabled: false },
    { id: 'colour', label: 'Magic Photo Colour', icon: PaletteIcon, disabled: false },
    { id: 'caption', label: 'CaptionAI', icon: CaptionIcon, disabled: false },
    { id: 'interior', label: 'Magic Interior', icon: HomeIcon, disabled: false },
    { id: 'apparel', label: 'Magic Apparel', icon: ApparelIcon, disabled: false },
    { id: 'mockup', label: 'Magic Mockup', icon: MockupIcon, disabled: false },
    { id: 'scanner', label: 'Magic Scanner', icon: ScannerIcon, disabled: true },
    { id: 'notes', label: 'Magic Notes', icon: NotesIcon, disabled: true },
    { type: 'divider', label: 'Account' },
    { id: 'billing', label: 'Billing & Credits', icon: CreditCardIcon, disabled: false },
  ];

  const navStructure = allNavItems.map(item => {
    if (item.id && appConfig?.featureToggles && item.id in appConfig.featureToggles) {
        const isDisabled = appConfig.featureToggles[item.id] === false;
        return { ...item, disabled: isDisabled };
    }
    return item;
  });

  const handleNavClick = (view: View) => {
    setActiveView(view);
  }

  const hasClaimedToday = () => {
    if (!user?.lastAttendanceClaim) return false;
    const last = user.lastAttendanceClaim.toDate();
    const now = new Date();
    const diffMs = now.getTime() - last.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours < 24;
  };

  const handleClaim = async () => {
    if (!user || hasClaimedToday()) return;
    setIsClaiming(true);
    try {
        const updatedUser = await claimDailyAttendance(user.uid);
        setUser(prev => prev ? { ...prev, ...updatedUser } as User : null);
    } catch (e) {
        console.error("Claim failed", e);
        alert("Failed to claim credit. Please check if 24 hours have passed.");
    } finally {
        setIsClaiming(false);
    }
  };

  return (
    <aside className="hidden lg:flex w-72 bg-[#F4F6F8] border-r border-gray-200/80 p-4 flex-col overflow-y-auto custom-scrollbar">
        
        {user && (
            <div className="mb-6 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg flex-shrink-0">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-xs uppercase tracking-wider opacity-80">Daily Check-in</h3>
                    <div className="p-1 bg-white/20 rounded-full">
                        <CheckIcon className="w-3 h-3 text-white" />
                    </div>
                </div>
                <p className="text-2xl font-bold mb-1">Free Credit</p>
                <p className="text-xs text-indigo-100 mb-3">Claim +1 credit every 24 hours.</p>
                <button 
                    onClick={handleClaim}
                    disabled={hasClaimedToday() || isClaiming}
                    className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${
                        hasClaimedToday() 
                        ? 'bg-white/20 text-white cursor-default' 
                        : 'bg-[#F9D230] text-[#1A1A1E] hover:bg-[#dfbc2b] hover:scale-105 shadow-md'
                    }`}
                >
                    {isClaiming ? 'Claiming...' : hasClaimedToday() ? 'Claimed' : 'Claim +1 Credit'}
                </button>
            </div>
        )}

        <nav className="flex-1 space-y-1">
            {navStructure.map((item, index) => {
            if (item.type === 'divider') {
                return (
                <div key={`divider-${index}`} className="pt-3 pb-2">
                    {item.label && <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pb-2">{item.label}</span>}
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
            
            <button 
                onClick={openReferralModal}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors text-left text-purple-600 hover:bg-purple-50 mt-4"
            >
                <GiftIcon className="w-5 h-5" />
                <span>Refer & Earn</span>
                <span className="ml-auto text-[10px] bg-purple-200 text-purple-700 font-bold px-1.5 py-0.5 rounded-full">
                    NEW
                </span>
            </button>

        </nav>
    </aside>
  );
};

export default Sidebar;