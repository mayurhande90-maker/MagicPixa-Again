
import React, { useState, useEffect, useRef } from 'react';
import { User, BrandKit } from '../types';
import { getUserBrands, activateBrand } from '../firebase';
import { BrandKitIcon, CheckIcon, PlusIcon, ChevronDownIcon } from './icons';

interface BrandSwitcherProps {
    user: User;
    onNavigate: (view: 'brand_manager') => void;
}

export const BrandSwitcher: React.FC<BrandSwitcherProps> = ({ user, onNavigate }) => {
    const [brands, setBrands] = useState<BrandKit[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [switchingId, setSwitchingId] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Active brand is whatever is currently in user.brandKit
    // Fallback to "No Brand" state if undefined
    const activeBrand = user.brandKit;

    useEffect(() => {
        if (isOpen) {
            loadBrands();
        }
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadBrands = async () => {
        try {
            const list = await getUserBrands(user.uid);
            setBrands(list);
        } catch (e) {
            console.error("Failed to load brands", e);
        }
    };

    const handleSwitch = async (brand: BrandKit) => {
        if (!brand.id || brand.id === activeBrand?.id) {
            setIsOpen(false);
            return;
        }
        
        setSwitchingId(brand.id);
        try {
            await activateBrand(user.uid, brand.id);
            // We rely on the Auth Listener in App.tsx to update the 'user' prop automatically
            // which will re-render this component with the new active brand
        } catch (e) {
            console.error("Failed to switch brand", e);
            alert("Failed to switch brand.");
        } finally {
            setSwitchingId(null);
            setIsOpen(false);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border transition-all duration-200 ${
                    activeBrand 
                    ? 'bg-white border-indigo-100 hover:border-indigo-300 hover:shadow-sm' 
                    : 'bg-gray-50 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-100'
                }`}
            >
                {activeBrand ? (
                    <>
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-100 border border-gray-100 flex items-center justify-center shrink-0">
                            {activeBrand.logos.primary ? (
                                <img src={activeBrand.logos.primary} alt="Brand" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-[8px] font-bold text-gray-400">
                                    {(activeBrand.name || activeBrand.companyName || 'B').substring(0, 2).toUpperCase()}
                                </span>
                            )}
                        </div>
                        <span className="text-xs font-bold text-gray-700 max-w-[100px] truncate">
                            {activeBrand.name || activeBrand.companyName || 'Untitled Brand'}
                        </span>
                    </>
                ) : (
                    <>
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                            <BrandKitIcon className="w-3 h-3 text-gray-500" />
                        </div>
                        <span className="text-xs font-medium text-gray-500">Select Brand</span>
                    </>
                )}
                <ChevronDownIcon className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fadeIn origin-top-right">
                    <div className="p-3 border-b border-gray-50">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Switch Brand Context</p>
                        
                        <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                            {brands.length > 0 ? brands.map(brand => {
                                const isActive = activeBrand?.id === brand.id;
                                const isSwitching = switchingId === brand.id;
                                
                                return (
                                    <button 
                                        key={brand.id}
                                        onClick={() => handleSwitch(brand)}
                                        disabled={isSwitching}
                                        className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all ${
                                            isActive 
                                            ? 'bg-indigo-50 text-indigo-900' 
                                            : 'hover:bg-gray-50 text-gray-700'
                                        }`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                                            {brand.logos.primary ? (
                                                <img src={brand.logos.primary} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <span className="text-[9px] font-bold text-gray-400">
                                                    {(brand.name || brand.companyName || 'B').substring(0, 1)}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="flex-1 text-left min-w-0">
                                            <p className="text-xs font-bold truncate">{brand.name || brand.companyName}</p>
                                            {isActive && <p className="text-[9px] text-indigo-500 font-medium">Active</p>}
                                        </div>
                                        
                                        {isSwitching ? (
                                            <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                        ) : isActive && (
                                            <CheckIcon className="w-4 h-4 text-indigo-600" />
                                        )}
                                    </button>
                                );
                            }) : (
                                <p className="text-xs text-gray-400 text-center py-2">No saved brands found.</p>
                            )}
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => {
                            setIsOpen(false);
                            onNavigate('brand_manager');
                        }}
                        className="w-full p-3 text-xs font-bold text-indigo-600 hover:bg-indigo-50 flex items-center justify-center gap-2 transition-colors"
                    >
                        <PlusIcon className="w-3 h-3" /> Create / Manage Brands
                    </button>
                </div>
            )}
        </div>
    );
};
