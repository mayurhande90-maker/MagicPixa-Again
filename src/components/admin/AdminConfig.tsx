
import React, { useState, useEffect } from 'react';
import { AppConfig, CreditPack } from '../../types';
import { updateAppConfig } from '../../firebase';
import { CreditCardIcon, ShieldCheckIcon, TicketIcon, PlusIcon, StarIcon, XIcon, TrashIcon } from '../icons';

interface AdminConfigProps {
    appConfig: AppConfig | null;
    onConfigUpdate: (config: AppConfig) => void;
}

// Mapping Legacy/Internal DB Keys to Client-Facing Names
const FEATURE_NAME_MAP: Record<string, string> = {
    'Magic Photo Studio': 'Pixa Product Shots',
    'Product Shot': 'Pixa Product Shots',
    'Model Shot': 'Pixa Model Shots',
    'Brand Stylist AI': 'Pixa AdMaker',
    'Magic Ads': 'Pixa AdMaker',
    'Pixa AdMaker': 'Pixa AdMaker',
    'Brand Kit AI': 'Pixa Ecommerce Kit',
    'Merchant Studio': 'Pixa Ecommerce Kit',
    'Ecommerce Kit': 'Pixa Ecommerce Kit',
    'Pixa Ecommerce Kit': 'Pixa Ecommerce Kit',
    // New specific keys for Ecommerce Kit
    'Pixa Ecommerce Kit (5 Assets)': 'Pixa Ecommerce Kit (5 Assets)',
    'Pixa Ecommerce Kit (7 Assets)': 'Pixa Ecommerce Kit (7 Assets)',
    'Pixa Ecommerce Kit (10 Assets)': 'Pixa Ecommerce Kit (10 Assets)',
    
    'Magic Soul': 'Pixa Together',
    'Together': 'Pixa Together',
    'Pixa Together': 'Pixa Together',
    'Magic Photo Colour': 'Pixa Photo Restore',
    'Pixa Photo Restore': 'Pixa Photo Restore',
    'CaptionAI': 'Pixa Caption Pro',
    'Pixa Caption Pro': 'Pixa Caption Pro',
    'Magic Interior': 'Pixa Interior Design',
    'Interior': 'Pixa Interior Design',
    'Pixa Interior Design': 'Pixa Interior Design',
    'Magic Apparel': 'Pixa TryOn',
    'Apparel': 'Pixa TryOn',
    'Pixa TryOn': 'Pixa TryOn',
    'Magic Mockup': 'Pixa Mockups',
    'Mockup': 'Pixa Mockups',
    'Pixa Mockups': 'Pixa Mockups',
    'Thumbnail Studio': 'Pixa Thumbnail Pro',
    'Pixa Thumbnail Pro': 'Pixa Thumbnail Pro',
    'Magic Realty': 'Pixa Realty Ads',
    'Realty Ads': 'Pixa Realty Ads',
    'Pixa Realty Ads': 'Pixa Realty Ads',
    'Magic Eraser': 'Magic Eraser',
    'Pixa Headshot Pro': 'Pixa Headshot Pro',
    'Headshot': 'Pixa Headshot Pro'
};

export const AdminConfig: React.FC<AdminConfigProps> = ({ appConfig, onConfigUpdate }) => {
    const [localConfig, setLocalConfig] = useState<AppConfig | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    
    // State for adding new feature cost
    const [newFeatureKey, setNewFeatureKey] = useState('');
    const [newFeatureCost, setNewFeatureCost] = useState(0);

    useEffect(() => {
        if (appConfig) {
            setLocalConfig(prev => {
                if (hasChanges) return prev;
                if (!prev || JSON.stringify(prev) !== JSON.stringify(appConfig)) {
                    return JSON.parse(JSON.stringify(appConfig));
                }
                return prev;
            });
        }
    }, [appConfig, hasChanges]);

    const handleConfigChange = (section: keyof AppConfig, key: string, value: any) => { 
        if (!localConfig) return; 
        setLocalConfig(prev => { 
            if(!prev) return null; 
            const next = JSON.parse(JSON.stringify(prev)); 
            if (section === 'featureToggles') { 
                next.featureToggles[key] = value; 
            } else if (section === 'featureCosts') { 
                next.featureCosts[key] = value; 
            } 
            return next; 
        }); 
        setHasChanges(true); 
    };

    const addFeatureCost = () => {
        if(!newFeatureKey.trim()) return;
        handleConfigChange('featureCosts', newFeatureKey.trim(), newFeatureCost);
        setNewFeatureKey('');
        setNewFeatureCost(0);
    };

    const removeCostKey = (key: string) => { 
        if (!localConfig) return; 
        if (confirm(`Delete pricing for "${key}"?`)) { 
            setLocalConfig(prev => { 
                if (!prev) return null; 
                const next = JSON.parse(JSON.stringify(prev)); 
                delete next.featureCosts[key]; 
                return next; 
            }); 
            setHasChanges(true); 
        } 
    };

    const handlePackChange = (index: number, field: keyof CreditPack, value: any) => { if (!localConfig) return; setLocalConfig(prev => { if (!prev) return null; const next = JSON.parse(JSON.stringify(prev)); const pack = next.creditPacks[index]; (pack as any)[field] = value; if (field === 'credits' || field === 'bonus') { pack.totalCredits = (parseInt(pack.credits.toString()) || 0) + (parseInt(pack.bonus.toString()) || 0); } const newCredits = field === 'credits' ? value : pack.credits; const newBonus = field === 'bonus' ? value : pack.bonus; const newPrice = field === 'price' ? value : pack.price; const total = (parseInt(newCredits) || 0) + (parseInt(newBonus) || 0); if (total > 0 && newPrice > 0) { pack.value = parseFloat((newPrice / total).toFixed(2)); } else { pack.value = 0; } return next; }); setHasChanges(true); };
    const addPack = () => { if (!localConfig) return; setLocalConfig(prev => { if (!prev) return null; const next = JSON.parse(JSON.stringify(prev)); next.creditPacks.push({ name: 'New Pack', price: 0, credits: 0, totalCredits: 0, bonus: 0, tagline: 'Best value', popular: false, value: 0 }); return next; }); setHasChanges(true); };
    const removePack = (index: number) => { if (!localConfig) return; if (confirm("Delete this package?")) { setLocalConfig(prev => { if (!prev) return null; const next = JSON.parse(JSON.stringify(prev)); next.creditPacks.splice(index, 1); return next; }); setHasChanges(true); } };
    const saveConfig = async () => { if (!localConfig) return; try { await updateAppConfig(localConfig); onConfigUpdate(localConfig); setHasChanges(false); alert("Configuration updated successfully."); } catch (e) { console.error("Config save error", e); alert("Failed to save config. Check permissions."); } };

    const getDisplayName = (key: string) => FEATURE_NAME_MAP[key] || key;

    return (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm animate-fadeIn">
            <div className="flex justify-between items-center mb-6"><div><h2 className="text-xl font-bold text-gray-800">Feature Pricing & Availability</h2><p className="text-sm text-gray-500">Set credit costs and toggle features on/off.</p></div>{hasChanges && <button onClick={saveConfig} className="bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold animate-pulse shadow-lg shadow-green-200 hover:scale-105 transition-transform">Save Changes</button>}</div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2"><CreditCardIcon className="w-4 h-4"/> Credit Pricing</h3>
                    <div className="space-y-3">
                        {Object.entries(localConfig?.featureCosts || {}).map(([feature, cost]) => (
                            <div key={feature} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm group">
                                <div className="flex items-center gap-2">
                                    <button onClick={() => removeCostKey(feature)} className="text-gray-300 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100" title="Delete this feature cost"><TrashIcon className="w-4 h-4"/></button>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-gray-700">{getDisplayName(feature)}</span>
                                        {getDisplayName(feature) !== feature && <span className="text-[10px] text-gray-400 font-mono">{feature}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="number" value={cost ?? 0} min="0" onChange={(e) => handleConfigChange('featureCosts', feature, parseInt(e.target.value) || 0)} className="w-16 p-2 text-right border border-gray-200 rounded-lg font-mono font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none"/>
                                    <span className="text-xs font-bold text-gray-400">CR</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {/* Add New Cost Key Form */}
                    <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                        <input 
                            type="text" 
                            placeholder="Feature Name (e.g. Pixa Ecommerce Kit (7 Assets))" 
                            value={newFeatureKey} 
                            onChange={e => setNewFeatureKey(e.target.value)} 
                            className="flex-1 p-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-indigo-500"
                        />
                        <input 
                            type="number" 
                            placeholder="Cost" 
                            value={newFeatureCost} 
                            onChange={e => setNewFeatureCost(parseInt(e.target.value)||0)} 
                            className="w-16 p-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-indigo-500"
                        />
                        <button onClick={addFeatureCost} className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 flex-shrink-0">Add</button>
                    </div>
                </div>
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2"><ShieldCheckIcon className="w-4 h-4"/> Feature Toggles</h3>
                    <div className="space-y-3">
                        {Object.entries(localConfig?.featureToggles || {}).map(([key, enabled]) => (
                            <div key={key} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-gray-700">{getDisplayName(key)}</span>
                                    {getDisplayName(key) !== key && <span className="text-[10px] text-gray-400 font-mono">{key}</span>}
                                </div>
                                <button onClick={() => handleConfigChange('featureToggles', key, !enabled)} className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-transform duration-300 ${enabled ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="mt-8 bg-gray-50 p-6 rounded-2xl border border-gray-100"><div className="flex justify-between items-center mb-4"><h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2"><TicketIcon className="w-4 h-4"/> Credit Packages</h3><button onClick={addPack} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"><PlusIcon className="w-3 h-3"/> Add Pack</button></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{localConfig?.creditPacks?.map((pack, index) => (<div key={index} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative group hover:border-indigo-200 transition-colors"><button onClick={() => removePack(index)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 p-1 transition-colors" title="Remove Pack"><XIcon className="w-4 h-4"/></button><div className="space-y-3"><div className="flex items-center gap-2 pr-6"><input type="text" value={pack.name} onChange={(e) => handlePackChange(index, 'name', e.target.value)} className="w-full p-2 border border-gray-200 rounded font-bold text-gray-800 text-sm focus:border-indigo-500 outline-none" placeholder="Pack Name"/><button onClick={() => handlePackChange(index, 'popular', !pack.popular)} className={`p-1.5 rounded-full transition-colors ${pack.popular ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-300 hover:text-yellow-400'}`} title="Toggle 'Popular' Badge"><StarIcon className="w-4 h-4 fill-current"/></button></div><input type="text" value={pack.tagline} onChange={(e) => handlePackChange(index, 'tagline', e.target.value)} className="w-full p-2 border border-gray-200 rounded text-xs text-gray-600 focus:border-indigo-500 outline-none" placeholder="Tagline"/><div className="grid grid-cols-3 gap-2"><div><label className="text-[9px] text-gray-400 uppercase font-bold block mb-1">Price (₹)</label><input type="number" value={pack.price} min="0" onChange={(e) => handlePackChange(index, 'price', parseInt(e.target.value) || 0)} className="w-full p-2 border border-gray-200 rounded text-sm font-bold focus:border-indigo-500 outline-none"/></div><div><label className="text-[9px] text-gray-400 uppercase font-bold block mb-1">Credits</label><input type="number" value={pack.credits} min="0" onChange={(e) => handlePackChange(index, 'credits', parseInt(e.target.value) || 0)} className="w-full p-2 border border-gray-200 rounded text-sm font-bold focus:border-indigo-500 outline-none"/></div><div><label className="text-[9px] text-gray-400 uppercase font-bold block mb-1">Bonus</label><input type="number" value={pack.bonus} min="0" onChange={(e) => handlePackChange(index, 'bonus', parseInt(e.target.value) || 0)} className="w-full p-2 border border-gray-200 rounded text-sm font-bold text-green-600 focus:border-indigo-500 outline-none bg-green-50/50"/></div></div><div className="flex justify-between items-center text-[10px] font-mono text-gray-400 pt-2 border-t border-gray-100"><span>Total: <span className="text-gray-600 font-bold">{pack.totalCredits}</span> Cr</span><span>Value: <span className="text-gray-600 font-bold">₹{pack.value}</span>/Cr</span></div></div></div>))}</div></div>
        </div>
    );
};
