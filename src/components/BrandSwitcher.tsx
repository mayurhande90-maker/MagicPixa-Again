import React, { useState, useEffect, useRef } from 'react';
import { User, BrandKit } from '../types';
import { activateBrand, deactivateBrand, subscribeToUserBrands } from '../firebase';
import { BrandKitIcon, CheckIcon, PlusIcon, ChevronDownIcon, XIcon } from './icons';

interface BrandSwitcherProps {
    user: User;
    activeBrand: BrandKit | null;
    setActiveBrand: (kit: BrandKit | null) => void;
    onNavigate: (view: 'brand_manager') => void;
}

export const BrandSwitcher: React.FC<BrandSwitcherProps> = ({ user, activeBrand, setActiveBrand, onNavigate }) => {
    const [brands, setBrands] = useState<BrandKit[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [switchingId, setSwitchingId] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Use Subscription to keep brands list updated in background
    useEffect(() => {
        if (!user.uid) return;
        const unsubscribe = subscribeToUserBrands(user.uid, (list) => {
            setBrands(list);
        });
        return () => unsubscribe();
    }, [user.uid]);

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

    const handleSwitch = async (brand: BrandKit) => {
        if (!brand.id || brand.id === activeBrand?.id) {
            setIsOpen(false);
            return;
        }
        
        setSwitchingId(brand.id);
        try {
            // Fetch brand data (session-based, no persistent update)
            const brandData = await activateBrand(user.uid, brand.id);
            setActiveBrand(brandData || null);
        } catch (e) {
            console.error("Failed to switch brand", e);
            alert("Failed to switch brand.");
        } finally {
            setSwitchingId(null);
            setIsOpen(false);
        }
    };

    const handleDeactivate = async () => {
        if (!activeBrand) return;
        setSwitchingId('disable');
        try {
            await deactivateBrand(user.uid);
            setActiveBrand(null);
        } catch (e) {
            console.error("Failed to disable brand", e);
        } finally {
            setSwitchingId(null);
        }
    };

    const handleToggle = async () => {
        if (activeBrand) {
            await handleDeactivate();
        } else {
            // Activate the first available brand or redirect if none
            if (brands.length > 0) {
                await handleSwitch(brands[0]);
            } else {
                setIsOpen(false);
                onNavigate('brand_manager');
            }
        }
    };

    // Helper to get display name
    const getBrandName = (brand: BrandKit) => {
        if (brand.companyName) return brand.companyName;
        if (brand.name && brand.name !== 'New Brand') return brand.name;
        return 'Untitled Brand';
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border transition-all duration-200 ${
                    activeBrand 
                    ? 'bg-white border-green-200 shadow-sm ring-1 ring-green-100' 
                    : 'bg-gray-50 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-100'
                }`}
            >
                {activeBrand ? (
                    <>
                        <div className="relative w-6 h-6 rounded-full">
                            <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 border border-gray-100 flex items-center justify-center">
                                {activeBrand.logos.primary ? (
                                    <img src={activeBrand.logos.primary} alt="Brand" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-[8px] font-bold text-gray-400">
                                        {getBrandName(activeBrand).substring(0, 2).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                        <span className="text-xs font-bold text-gray-700 max-w-[100px] truncate">
                            {getBrandName(activeBrand)}
                        </span>
                    </>
                ) : (
                    <>
                        <BrandKitIcon className="w-5 h-5 text-gray-500" />
                        <span className="text-xs font-medium text-gray-500">Select Brand</span>
                    </>
                )}
                <ChevronDownIcon className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fadeIn origin-top-right">
                    
                    {/* Master Toggle */}
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <div>
                            <p className="text-xs font-bold text-gray-800">Brand Integration</p>
                            <p className="text-[9px] text-gray-500">{activeBrand ? 'On' : 'Off'}</p>
                        </div>
                        <button 
                            onClick={handleToggle}
                            disabled={switchingId !== null}
                            className={`w-10 h-6 rounded-full relative transition-colors duration-200 ${activeBrand ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-all duration-200 ${activeBrand ? 'left-5' : 'left-1'}`}>
                                {switchingId && <div className="absolute inset-0 rounded-full border-2 border-gray-200 border-t-transparent animate-spin"></div>}
                            </div>
                        </button>
                    </div>

                    <div className="p-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-2 mt-2">Saved Brands</p>
                        
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
                                            ? 'bg-indigo-50 text-indigo-900 ring-1 ring-indigo-100' 
                                            : 'hover:bg-gray-50 text-gray-700'
                                        }`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                                            {brand.logos.primary ? (
                                                <img src={brand.logos.primary} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <span className="text-[9px] font-bold text-gray-400">
                                                    {getBrandName(brand).substring(0, 1)}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="flex-1 text-left min-w-0">
                                            <p className="text-xs font-bold truncate">{getBrandName(brand)}</p>
                                            {isActive && <p className="text-[9px] text-indigo-500 font-medium">Active</p>}
                                        </div>
                                        
                                        {isSwitching ? (
                                            <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                        ) : isActive && (
                                            <div className="w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
                                                <CheckIcon className="w-2.5 h-2.5 text-white" />
                                            </div>
                                        )}
                                    </button>
                                );
                            }) : (
                                <p className="text-xs text-gray-400 text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200 mb-2">No saved brands found.</p>
                            )}
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => {
                            setIsOpen(false);
                            onNavigate('brand_manager');
                        }}
                        className="w-full p-3 text-xs font-bold text-indigo-600 hover:bg-indigo-50 flex items-center justify-center gap-2 transition-colors border-t border-gray-100"
                    >
                        <PlusIcon className="w-3 h-3" /> Create New Brand
                    </button>
                </div>
            )}
        </div>
    );
};