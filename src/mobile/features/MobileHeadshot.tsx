
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig } from '../../types';
import { PixaHeadshotIcon, UploadIcon, SparklesIcon, XIcon, UserIcon, ChevronRightIcon, CreditCoinIcon } from '../../components/icons';
import { fileToBase64, base64ToBlobUrl } from '../../utils/imageUtils';
import { generateProfessionalHeadshot } from '../../services/headshotService';
import { deductCredits, saveCreation } from '../../firebase';
import { MobileSheet } from '../components/MobileSheet';
import { SelectionGrid } from '../../components/FeatureLayout';

export const MobileHeadshot: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [image, setImage] = useState<{ url: string; base64: any } | null>(null);
    const [persona, setPersona] = useState('');
    const [background, setBackground] = useState('Studio');
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [isPersonaSheetOpen, setIsPersonaSheetOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const cost = appConfig?.featureCosts['Pixa Headshot Pro'] || 5;

    const handleGenerate = async () => {
        if (!image || !persona || !auth.user) return;
        setIsGenerating(true);
        try {
            const resB64 = await generateProfessionalHeadshot(
                image.base64.base64, 
                image.base64.mimeType, 
                persona, 
                background
            );
            
            const blobUrl = await base64ToBlobUrl(resB64, 'image/png');
            setResult(blobUrl);

            await deductCredits(auth.user.uid, cost, 'Pixa Headshot Pro (Mobile)');
            await saveCreation(auth.user.uid, `data:image/png;base64,${resB64}`, 'Pixa Headshot Pro');
        } catch (e) {
            console.error(e);
            alert("Headshot generation failed.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleNew = () => {
        setImage(null);
        setResult(null);
        setPersona('');
    };

    return (
        <div className="h-full flex flex-col animate-fadeIn">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-50 shrink-0">
                <PixaHeadshotIcon className="w-5 h-5 text-indigo-600" />
                <h2 className="text-sm font-black uppercase tracking-widest text-gray-800">Headshot Pro</h2>
            </div>

            {/* Preview Area */}
            <div className="flex-none aspect-square p-4 bg-gray-50">
                <div className="w-full h-full bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden relative flex items-center justify-center">
                    {result ? (
                        <img src={result} className="w-full h-full object-cover animate-fadeIn" />
                    ) : image ? (
                        <img src={image.url} className="max-w-full max-h-full object-cover transition-all duration-500" />
                    ) : (
                        <div onClick={() => fileInputRef.current?.click()} className="text-center">
                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-indigo-400">
                                <UserIcon className="w-8 h-8" />
                            </div>
                            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Upload Selfie</p>
                        </div>
                    )}

                    {isGenerating && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white z-50">
                            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                            <p className="text-sm font-black uppercase tracking-widest animate-pulse">Polishing Portrait...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white no-scrollbar pb-10">
                {!image ? (
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-8 border-2 border-dashed border-gray-100 rounded-3xl flex flex-col items-center gap-3 bg-gray-50 active:bg-gray-100 transition-all"
                    >
                        <div className="p-3 bg-white rounded-2xl shadow-sm"><UploadIcon className="w-6 h-6 text-indigo-400"/></div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Select Portrait Photo</p>
                    </button>
                ) : (
                    <div className="space-y-4 animate-fadeIn">
                        <div>
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">1. Professional Style</h3>
                            <button 
                                onClick={() => setIsPersonaSheetOpen(true)}
                                className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 active:scale-[0.98] transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-xl text-indigo-500 shadow-sm"><SparklesIcon className="w-4 h-4"/></div>
                                    <span className="text-xs font-bold text-gray-700">{persona || 'Choose Professional Persona...'}</span>
                                </div>
                                <ChevronRightIcon className="w-4 h-4 text-gray-300" />
                            </button>
                        </div>

                        <div>
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">2. Location Context</h3>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                {['Studio', 'Office', 'Outdoors', 'Lobby', 'Library'].map(loc => (
                                    <button 
                                        key={loc}
                                        onClick={() => setBackground(loc)}
                                        className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${background === loc ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-gray-500 border-gray-200'}`}
                                    >
                                        {loc}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button 
                            onClick={handleNew}
                            className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors"
                        >
                            Reset Photo
                        </button>
                    </div>
                )}
            </div>

            {/* Action Bar */}
            <div className="flex-none p-6 bg-white border-t border-gray-100">
                <button 
                    onClick={handleGenerate}
                    disabled={!image || !persona || isGenerating}
                    className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${!image || !persona ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white shadow-indigo-500/20'}`}
                >
                    {isGenerating ? 'Rendering...' : 'Generate 4K Headshot'}
                </button>
            </div>

            {/* Persona Sheet */}
            <MobileSheet isOpen={isPersonaSheetOpen} onClose={() => setIsPersonaSheetOpen(false)} title="Professional Persona">
                <div className="space-y-4">
                    <p className="text-xs text-gray-500 font-medium leading-relaxed px-1">Choose the industry archetype for your headshot.</p>
                    <SelectionGrid 
                        label="Industry Archetypes" 
                        options={['Executive', 'Tech Founder', 'Creative', 'Legal', 'Medical', 'Realtor']} 
                        value={persona} 
                        onChange={(val) => { setPersona(val); setIsPersonaSheetOpen(false); }} 
                    />
                </div>
            </MobileSheet>

            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={async (e) => {
                if (e.target.files?.[0]) {
                    const base64 = await fileToBase64(e.target.files[0]);
                    setImage({ url: URL.createObjectURL(e.target.files[0]), base64 });
                    setResult(null);
                }
            }} />
        </div>
    );
};
