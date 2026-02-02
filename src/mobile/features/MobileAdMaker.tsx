import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, View } from '../../types';
import { MagicAdsIcon, UploadIcon, SparklesIcon, XIcon, CheckIcon, PaletteIcon, ChevronRightIcon, CreditCoinIcon, ArrowLeftIcon } from '../../components/icons';
import { fileToBase64, base64ToBlobUrl } from '../../utils/imageUtils';
import { generateAdCreative } from '../../services/adMakerService';
import { deductCredits, saveCreation } from '../../firebase';
import { MobileSheet } from '../components/MobileSheet';
import { SelectionGrid } from '../../components/FeatureLayout';

interface MobileAdMakerProps {
    auth: AuthProps;
    appConfig: AppConfig | null;
    onGenerationStart: () => void;
}

export const MobileAdMaker: React.FC<MobileAdMakerProps> = ({ auth, appConfig, onGenerationStart }) => {
    const [image, setImage] = useState<{ url: string; base64: any } | null>(null);
    const [logo, setLogo] = useState<{ url: string; base64: any } | null>(null);
    const [vibe, setVibe] = useState('');
    const [description, setDescription] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [isVibeSheetOpen, setIsVibeSheetOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    const cost = appConfig?.featureCosts['Pixa AdMaker'] || 10;

    const handleGenerate = async () => {
        if (!image || !vibe || !description || !auth.user) return;
        
        onGenerationStart();
        setIsGenerating(true);
        try {
            const resB64 = await generateAdCreative({
                industry: 'ecommerce',
                mainImages: [image.base64],
                logoImage: logo?.base64,
                vibe: vibe,
                description: description,
                aspectRatio: '1:1',
                layoutTemplate: 'Hero Focus'
            }, auth.activeBrandKit);
            
            const blobUrl = await base64ToBlobUrl(resB64, 'image/png');
            setResult(blobUrl);

            await deductCredits(auth.user.uid, cost, 'Pixa AdMaker (Mobile)');
            await saveCreation(auth.user.uid, `data:image/png;base64,${resB64}`, 'Pixa AdMaker');
        } catch (e) {
            console.error(e);
            alert("Ad generation failed.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleNew = () => {
        setImage(null);
        setLogo(null);
        setResult(null);
        setVibe('');
        setDescription('');
    };

    return (
        <div className="min-h-full flex flex-col animate-fadeIn">
            {/* Header with Back */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-50 shrink-0">
                <MagicAdsIcon className="w-5 h-5 text-indigo-600" />
                <h2 className="text-sm font-black uppercase tracking-widest text-gray-800">AdMaker Pro</h2>
            </div>

            {/* Preview Area */}
            <div className="flex-none aspect-square p-4 bg-gray-50">
                <div className="w-full h-full bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden relative flex items-center justify-center">
                    {result ? (
                        <img src={result} className="w-full h-full object-cover animate-fadeIn" />
                    ) : image ? (
                        <div className="relative w-full h-full p-4 flex flex-col items-center justify-center">
                            <img src={image.url} className="max-w-[80%] max-h-[80%] object-contain mb-4" />
                            {logo && (
                                <div className="absolute top-6 left-6 w-12 h-12 bg-white rounded-xl shadow-md p-2 border border-gray-100">
                                    <img src={logo.url} className="w-full h-full object-contain" />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div onClick={() => fileInputRef.current?.click()} className="text-center">
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-blue-500">
                                <UploadIcon className="w-8 h-8" />
                            </div>
                            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Upload Product</p>
                        </div>
                    )}

                    {isGenerating && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white z-50">
                            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                            <p className="text-sm font-black uppercase tracking-widest animate-pulse">Designing Ad...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="flex-none p-6 space-y-6 bg-white pb-10">
                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-4 rounded-2xl border-2 border-dashed flex flex-col items-center gap-2 transition-all ${image ? 'border-green-100 bg-green-50/30' : 'border-gray-100 bg-gray-50'}`}
                    >
                        <div className="p-2 bg-white rounded-xl shadow-sm"><UploadIcon className="w-4 h-4 text-blue-500"/></div>
                        <span className="text-[10px] font-black uppercase text-gray-500">{image ? 'Swap Photo' : 'Product Photo'}</span>
                    </button>

                    <button 
                        onClick={() => logoInputRef.current?.click()}
                        className={`p-4 rounded-2xl border-2 border-dashed flex flex-col items-center gap-2 transition-all ${logo ? 'border-green-100 bg-green-50/30' : 'border-gray-100 bg-gray-50'}`}
                    >
                        <div className="p-2 bg-white rounded-xl shadow-sm"><CheckIcon className="w-4 h-4 text-indigo-500"/></div>
                        <span className="text-[10px] font-black uppercase text-gray-500">{logo ? 'Logo Set' : 'Brand Logo'}</span>
                    </button>
                </div>

                <div className={!image ? 'opacity-40 grayscale pointer-events-none' : ''}>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Ad Strategy</h3>
                    <button 
                        onClick={() => setIsVibeSheetOpen(true)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 active:scale-[0.98] transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-xl text-indigo-500 shadow-sm"><PaletteIcon className="w-4 h-4"/></div>
                            <span className="text-xs font-bold text-gray-700">{vibe || 'Choose Visual Vibe...'}</span>
                        </div>
                        <ChevronRightIcon className="w-4 h-4 text-gray-300" />
                    </button>
                    
                    <div className="mt-4">
                        <textarea 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-400 resize-none h-24"
                            placeholder="What is this ad about? (e.g. Summer sale for organic skincare)"
                        />
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex-none p-6 bg-white border-t border-gray-100 sticky bottom-0 z-50">
                <button 
                    onClick={handleGenerate}
                    disabled={!image || !vibe || !description || isGenerating}
                    className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${!image || !vibe || !description ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white shadow-indigo-500/20'}`}
                >
                    {isGenerating ? 'Designing...' : 'Generate Pro Ad'}
                    <SparklesIcon className="w-4 h-4" />
                </button>
            </div>

            {/* Sheet for Vibes */}
            <MobileSheet isOpen={isVibeSheetOpen} onClose={() => setIsVibeSheetOpen(false)} title="Ad Aesthetic">
                <SelectionGrid 
                    label="Choose Mood" 
                    options={['Luxury', 'Minimalist', 'Vibrant', 'Professional', 'Cinematic', 'Nature']} 
                    value={vibe} 
                    onChange={(val) => { setVibe(val); setIsVibeSheetOpen(false); }} 
                />
            </MobileSheet>

            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={async (e) => {
                if (e.target.files?.[0]) {
                    const base64 = await fileToBase64(e.target.files[0]);
                    setImage({ url: URL.createObjectURL(e.target.files[0]), base64 });
                    setResult(null);
                }
            }} />
            <input ref={logoInputRef} type="file" className="hidden" accept="image/*" onChange={async (e) => {
                if (e.target.files?.[0]) {
                    const base64 = await fileToBase64(e.target.files[0]);
                    setLogo({ url: URL.createObjectURL(e.target.files[0]), base64 });
                }
            }} />
        </div>
    );
};
