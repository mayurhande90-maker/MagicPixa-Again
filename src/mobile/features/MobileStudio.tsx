
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig } from '../../types';
import { PixaProductIcon, UploadIcon, SparklesIcon, XIcon, CheckIcon, CreditCoinIcon, ChevronRightIcon, PaletteIcon } from '../../components/icons';
import { SelectionGrid } from '../../components/FeatureLayout';
import { fileToBase64, base64ToBlobUrl } from '../../utils/imageUtils';
import { editImageWithPrompt } from '../../services/photoStudioService';
import { deductCredits, saveCreation } from '../../firebase';
import { MobileSheet } from '../components/MobileSheet';

export const MobileStudio: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [image, setImage] = useState<{ url: string; base64: any } | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [loadingText, setLoadingText] = useState("Initializing...");
    const [vibe, setVibe] = useState('');
    const [result, setResult] = useState<string | null>(null);
    const [isThemeSheetOpen, setIsThemeSheetOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const cost = appConfig?.featureCosts['Pixa Product Shots'] || 10;
    const userCredits = auth.user?.credits || 0;

    // Loading message cycle
    useEffect(() => {
        let interval: any;
        if (isGenerating) {
            const steps = [
                "Analyzing product physics...",
                "Calibrating studio lighting...",
                "Rendering ray-traced shadows...",
                "Polishing 8K output..."
            ];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [isGenerating]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setImage({ url: URL.createObjectURL(file), base64 });
            setResult(null);
        }
    };

    const handleGenerate = async () => {
        if (!image || !vibe || !auth.user) return;
        if (userCredits < cost) {
            alert("Insufficient credits. Please recharge in the profile section.");
            return;
        }

        setIsGenerating(true);
        try {
            const prompt = `Professional ${vibe} studio shot of the product. High-end commercial photography, sharp focus, realistic lighting.`;
            const resB64 = await editImageWithPrompt(image.base64.base64, image.base64.mimeType, prompt, auth.activeBrandKit);
            
            const blobUrl = await base64ToBlobUrl(resB64, 'image/png');
            setResult(blobUrl);

            // Deduct Credits and Save
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Product Shots (Mobile)');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            await saveCreation(auth.user.uid, `data:image/png;base64,${resB64}`, 'Pixa Product Shots');

        } catch (e: any) {
            console.error(e);
            alert("Generation failed: " + (e.message || "Unknown error"));
        } finally {
            setIsGenerating(true); // Keeping true for 1s to show final result transition
            setTimeout(() => setIsGenerating(false), 500);
        }
    };

    const handleNew = () => {
        setImage(null);
        setResult(null);
        setVibe('');
    };

    const themes = ['Luxury', 'Nature', 'Tech', 'Minimal', 'Lifestyle', 'Abstract', 'Industrial', 'Pop Art'];

    return (
        <div className="h-full flex flex-col animate-fadeIn">
            {/* Canvas Area (Top) */}
            <div className="flex-none aspect-square p-4 bg-gray-50">
                <div className="w-full h-full bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden relative flex items-center justify-center">
                    {result ? (
                        <img src={result} className="w-full h-full object-cover animate-fadeIn" />
                    ) : image ? (
                        <img src={image.url} className="w-full h-full object-contain p-4 transition-all duration-500" />
                    ) : (
                        <div onClick={() => fileInputRef.current?.click()} className="text-center cursor-pointer group">
                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-indigo-400 group-hover:scale-110 transition-transform">
                                <UploadIcon className="w-8 h-8" />
                            </div>
                            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Tap to Upload</p>
                        </div>
                    )}

                    {isGenerating && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center z-50">
                            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                            <p className="text-sm font-black uppercase tracking-[0.2em] animate-pulse">{loadingText}</p>
                        </div>
                    )}
                    
                    {!isGenerating && (image || result) && (
                        <button onClick={handleNew} className="absolute top-4 right-4 p-2.5 bg-white/90 backdrop-blur-md rounded-full shadow-lg text-gray-400 hover:text-red-500 transition-all active:scale-90">
                            <XIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Controls Area (Bottom - Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white no-scrollbar">
                {/* 1. Upload Section */}
                <div>
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">1. Product Identity</h3>
                    {!image ? (
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-24 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-indigo-400 hover:bg-indigo-50 transition-all active:scale-[0.98]"
                        >
                            <UploadIcon className="w-6 h-6 text-indigo-400" />
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Product Photo</span>
                        </button>
                    ) : (
                        <div className="flex items-center gap-4 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 animate-fadeIn">
                             <div className="w-12 h-12 bg-white rounded-xl border border-indigo-100 p-1 flex items-center justify-center">
                                 <img src={image.url} className="max-w-full max-h-full object-contain" />
                             </div>
                             <div className="flex-1">
                                 <p className="text-xs font-bold text-indigo-900">Asset Locked</p>
                                 <p className="text-[10px] text-indigo-400 font-medium italic">Identity Anchored</p>
                             </div>
                             <CheckIcon className="w-5 h-5 text-indigo-600" />
                        </div>
                    )}
                </div>

                {/* 2. Visual Theme Trigger */}
                <div className={!image ? 'opacity-40 grayscale pointer-events-none' : ''}>
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">2. Visual Strategy</h3>
                    <button 
                        onClick={() => setIsThemeSheetOpen(true)}
                        className="w-full flex items-center justify-between p-5 bg-gray-50 border border-gray-100 rounded-2xl active:bg-gray-100 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl shadow-sm transition-all ${vibe ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-500 group-hover:scale-110'}`}>
                                <PaletteIcon className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Current Theme</p>
                                <p className={`text-sm font-bold ${vibe ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {vibe || 'Choose Aesthetic...'}
                                </p>
                            </div>
                        </div>
                        <ChevronRightIcon className="w-4 h-4 text-gray-300" />
                    </button>
                </div>
            </div>

            {/* Sticky Action Button */}
            <div className="flex-none p-6 bg-white border-t border-gray-100">
                <button 
                    onClick={handleGenerate}
                    disabled={!image || !vibe || isGenerating}
                    className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
                        !image || !vibe ? 'bg-gray-100 text-gray-400' : 'bg-[#F9D230] text-black shadow-yellow-500/20'
                    }`}
                >
                    {isGenerating ? 'Rendering...' : <>Generate Magic <SparklesIcon className="w-5 h-5" /></>}
                </button>
                <div className="flex items-center justify-center gap-2 mt-3">
                    <CreditCoinIcon className="w-3 h-3 text-gray-400" />
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        Cost: {cost} Credits
                    </p>
                </div>
            </div>

            {/* Bottom Sheet for Theme Selection */}
            <MobileSheet 
                isOpen={isThemeSheetOpen} 
                onClose={() => setIsThemeSheetOpen(false)} 
                title="Visual Strategy"
            >
                <div className="space-y-6">
                    <p className="text-xs text-gray-500 leading-relaxed font-medium">
                        Select an archetype for Pixa AI to follow. Our vision agents will calibrate lighting and materials to match this aesthetic.
                    </p>
                    <SelectionGrid 
                        label="Available Archetypes" 
                        options={themes} 
                        value={vibe} 
                        onChange={(val) => {
                            setVibe(val);
                            setIsThemeSheetOpen(false);
                        }} 
                    />
                </div>
            </MobileSheet>

            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
        </div>
    );
};
