
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuthProps, AppConfig } from '../../types';
import { 
    PixaProductIcon, UploadIcon, SparklesIcon, XIcon, CheckIcon, 
    CreditCoinIcon, PaletteIcon, MagicWandIcon, CubeIcon, UsersIcon,
    CameraIcon, ImageIcon, ArrowRightIcon
} from '../../components/icons';
import { fileToBase64, base64ToBlobUrl, urlToBase64 } from '../../utils/imageUtils';
import { editImageWithPrompt, analyzeProductImage, analyzeProductForModelPrompts, generateModelShot } from '../../services/photoStudioService';
import { deductCredits, saveCreation } from '../../firebase';
import { MobileSheet } from '../components/MobileSheet';

const CATEGORIES = [
    { id: 'beauty', label: 'Beauty', icon: '✨' },
    { id: 'tech', label: 'Tech', icon: '💻' },
    { id: 'food', label: 'Food', icon: '🍔' },
    { id: 'fashion', label: 'Fashion', icon: '👗' },
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'jewelry', label: 'Jewelry', icon: '💎' },
];

const VIBES: Record<string, { label: string; prompt: string; preview: string }[]> = {
    'beauty': [
        { label: 'Marble Luxury', prompt: 'Product on polished white marble, soft pink lighting, high-end cosmetics photography', preview: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?q=80&w=200' },
        { label: 'Morning Dew', prompt: 'Product with water droplets, natural morning sunlight, clean aesthetic', preview: 'https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?q=80&w=200' },
        { label: 'Floral Bloom', prompt: 'Product surrounded by delicate flowers, soft bokeh, pastel background', preview: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?q=80&w=200' }
    ],
    'tech': [
        { label: 'Cyber Neon', prompt: 'Product on dark reflective surface, neon blue and magenta rim lighting, futuristic', preview: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=200' },
        { label: 'Minimal Desk', prompt: 'Product on a clean white desk, high-key lighting, soft shadows', preview: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=200' },
        { label: 'Industrial', prompt: 'Product on concrete surface, dramatic shadows, moody lighting', preview: 'https://images.unsplash.com/photo-1534398079244-67c8ad88c440?q=80&w=200' }
    ],
    'food': [
        { label: 'Rustic Wood', prompt: 'Food on dark wood table, warm sunrays, organic textures', preview: 'https://images.unsplash.com/photo-1473093226795-af9932fe5856?q=80&w=200' },
        { label: 'Studio Pop', prompt: 'Food on vibrant solid color background, harsh shadows, pop art style', preview: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=200' },
        { label: 'Luxury Dining', prompt: 'Food on dark slate, elegant gold cutlery nearby, cinematic lighting', preview: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=200' }
    ]
};

export const MobileStudio: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    // --- UI State ---
    const [mode, setMode] = useState<'product' | 'model'>('product');
    const [activeCategory, setActiveCategory] = useState('beauty');
    const [selectedVibe, setSelectedVibe] = useState<string | null>(null);
    const [image, setImage] = useState<{ url: string; base64: any } | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isRefineOpen, setIsRefineOpen] = useState(false);
    const [refineText, setRefineText] = useState('');
    const [loadingText, setLoadingText] = useState("Initializing...");

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const cost = appConfig?.featureCosts['Pixa Product Shots'] || 10;
    const userCredits = auth.user?.credits || 0;

    // --- Derived Data ---
    const currentVibes = VIBES[activeCategory] || VIBES['beauty'];

    // --- Effects ---
    useEffect(() => {
        let interval: any;
        if (isGenerating) {
            const steps = ["Analyzing Physics...", "Rigging Lights...", "Tracing Rays...", "Polishing Pixels..."];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
            }, 1800);
        }
        return () => clearInterval(interval);
    }, [isGenerating]);

    // --- Handlers ---
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setImage({ url: URL.createObjectURL(file), base64 });
            setResult(null);
            
            // Start "Scanning" Animation
            setIsAnalyzing(true);
            setTimeout(() => setIsAnalyzing(false), 2500);
        }
    };

    const handleGenerate = async () => {
        if (!image || !selectedVibe || !auth.user) return;
        if (userCredits < cost) {
            alert("Insufficient credits.");
            return;
        }

        setIsGenerating(true);
        try {
            const vibeObj = currentVibes.find(v => v.label === selectedVibe);
            const finalPrompt = vibeObj?.prompt || `${selectedVibe} studio photography`;
            
            let resB64;
            if (mode === 'product') {
                resB64 = await editImageWithPrompt(image.base64.base64, image.base64.mimeType, finalPrompt, auth.activeBrandKit);
            } else {
                resB64 = await generateModelShot(image.base64.base64, image.base64.mimeType, { modelType: 'Professional Model', region: 'Global' }, auth.activeBrandKit);
            }

            const blobUrl = await base64ToBlobUrl(resB64, 'image/png');
            setResult(blobUrl);

            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Studio (Mobile)');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            await saveCreation(auth.user.uid, `data:image/png;base64,${resB64}`, 'Pixa Product Shots');

        } catch (e: any) {
            console.error(e);
            alert("Generation failed.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRefine = () => {
        if (!refineText.trim()) return;
        // Simple mock for now, ideally calls refineStudioImage
        alert("Refinement triggered: " + refineText);
        setIsRefineOpen(false);
    };

    return (
        <div className="h-full flex flex-col bg-[#0F1115] relative overflow-hidden">
            
            {/* 1. VIEWPORT (Top 55%) */}
            <div className="relative h-[55%] w-full flex items-center justify-center p-4">
                <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden bg-[#1A1C23] border border-white/5 shadow-2xl flex items-center justify-center group">
                    
                    {/* Background Content */}
                    {result ? (
                        <img src={result} className="w-full h-full object-cover animate-fadeIn" />
                    ) : image ? (
                        <img src={image.url} className="max-w-[90%] max-h-[90%] object-contain animate-fadeIn" />
                    ) : (
                        <div className="text-center space-y-6">
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => cameraInputRef.current?.click()}
                                    className="w-20 h-20 bg-white/5 hover:bg-white/10 rounded-3xl flex items-center justify-center transition-all active:scale-95"
                                >
                                    <CameraIcon className="w-8 h-8 text-white/40" />
                                </button>
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 active:scale-95 transition-all"
                                >
                                    <ImageIcon className="w-8 h-8 text-white" />
                                </button>
                            </div>
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Select Your Subject</p>
                        </div>
                    )}

                    {/* Scanning Animation */}
                    {isAnalyzing && (
                        <div className="absolute inset-0 z-20 pointer-events-none">
                            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_20px_#6366f1] animate-scan-y"></div>
                            <div className="absolute inset-0 bg-indigo-500/5 backdrop-blur-[1px] animate-pulse"></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-3">
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-ping"></div>
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Pixa Vision Scanning...</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Loading Overlay */}
                    {isGenerating && (
                        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
                            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
                            <h3 className="text-xl font-black text-white mb-2 tracking-tight">Studio Active</h3>
                            <p className="text-sm font-bold text-white/50 uppercase tracking-[0.2em] animate-pulse">{loadingText}</p>
                        </div>
                    )}

                    {/* Quick Action Overlays */}
                    {(image || result) && !isGenerating && (
                        <div className="absolute top-6 right-6 z-40 flex flex-col gap-3 animate-fadeIn">
                            <button onClick={() => { setImage(null); setResult(null); }} className="p-3 bg-black/40 backdrop-blur-md rounded-2xl text-white border border-white/10 active:scale-90">
                                <XIcon className="w-5 h-5" />
                            </button>
                            {result && (
                                <button onClick={() => setIsRefineOpen(true)} className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl active:scale-90">
                                    <MagicWandIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 2. LOGIC TRAY (Bottom 45%) */}
            <div className="flex-1 bg-[#1A1C23]/80 backdrop-blur-3xl rounded-t-[3rem] border-t border-white/5 p-6 flex flex-col shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
                
                {/* TIER 1: MODE SWITCHER */}
                <div className="flex-none flex justify-center mb-8">
                    <div className="bg-white/5 p-1 rounded-2xl flex gap-1 border border-white/5">
                        <button 
                            onClick={() => setMode('product')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-[0.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'product' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white/60'}`}
                        >
                            <CubeIcon className="w-4 h-4" /> Product Shot
                        </button>
                        <button 
                            onClick={() => setMode('model')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-[0.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'model' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white/60'}`}
                        >
                            <UsersIcon className="w-4 h-4" /> Model Shot
                        </button>
                    </div>
                </div>

                {/* TIER 2: CATEGORY SCROLL */}
                <div className="flex-none mb-6">
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                        {CATEGORIES.map(cat => (
                            <button 
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`shrink-0 flex flex-col items-center justify-center w-20 h-20 rounded-3xl border transition-all duration-300 ${activeCategory === cat.id ? 'bg-indigo-600/10 border-indigo-500/30 text-white' : 'bg-white/5 border-white/5 text-white/40'}`}
                            >
                                <span className="text-xl mb-1">{cat.icon}</span>
                                <span className="text-[8px] font-black uppercase tracking-widest">{cat.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* TIER 3: VIBE CARDS */}
                <div className="flex-1 overflow-hidden relative">
                    <div className="h-full flex gap-4 overflow-x-auto no-scrollbar items-center px-1">
                        {currentVibes.map(v => (
                            <button 
                                key={v.label}
                                onClick={() => setSelectedVibe(v.label)}
                                className={`shrink-0 relative w-36 h-full rounded-2xl overflow-hidden border-2 transition-all duration-500 ${selectedVibe === v.label ? 'border-indigo-500 scale-105 shadow-2xl shadow-indigo-500/30' : 'border-transparent opacity-60'}`}
                            >
                                <img src={v.preview} className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                                <div className="absolute inset-0 p-3 flex flex-col justify-end">
                                    <p className="text-[10px] font-black text-white uppercase tracking-wider leading-tight">{v.label}</p>
                                    {selectedVibe === v.label && <div className="mt-1 w-4 h-1 bg-white rounded-full"></div>}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 3. FLOATING ACTION BUTTON (FAB) */}
            <div className="absolute bottom-10 left-0 right-0 px-10 z-[60] pointer-events-none">
                <button 
                    onClick={handleGenerate}
                    disabled={!image || !selectedVibe || isGenerating}
                    className={`pointer-events-auto w-full py-5 rounded-full font-black text-sm uppercase tracking-[0.3em] shadow-2xl transition-all duration-500 active:scale-95 flex items-center justify-center gap-3 relative overflow-hidden group ${
                        !image || !selectedVibe ? 'bg-gray-800 text-white/20' : 'bg-[#F9D230] text-black shadow-yellow-500/40'
                    }`}
                >
                    {!image || !selectedVibe ? 'Awaiting Input' : isGenerating ? 'Rendering...' : 'Render Masterpiece'}
                    <SparklesIcon className="w-5 h-5 group-active:rotate-12 transition-transform" />
                    {image && selectedVibe && !isGenerating && (
                        <div className="absolute inset-0 rounded-full border-2 border-white/40 animate-pulse-ring"></div>
                    )}
                </button>
            </div>

            {/* Refinement Modal */}
            <MobileSheet isOpen={isRefineOpen} onClose={() => setIsRefineOpen(false)} title="Manual Refinement">
                <div className="space-y-6 pb-6">
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                        Describe specific additions or changes. Pixa will intelligently blend your request into the existing studio rig.
                    </p>
                    <div className="relative">
                        <textarea 
                            value={refineText}
                            onChange={e => setRefineText(e.target.value)}
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none h-32"
                            placeholder="e.g. Add soft water droplets to the bottle surface..."
                        />
                    </div>
                    <button 
                        onClick={handleRefine}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl"
                    >
                        Apply Changes
                    </button>
                </div>
            </MobileSheet>

            {/* Hidden Inputs */}
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            <input ref={cameraInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handleUpload} />

            <style>{`
                @keyframes scan-y {
                    0% { top: 0%; }
                    100% { top: 100%; }
                }
                .animate-scan-y { animation: scan-y 2s linear infinite; }
                
                @keyframes pulse-ring {
                    0% { transform: scale(0.95); opacity: 1; }
                    100% { transform: scale(1.05); opacity: 0; }
                }
                .animate-pulse-ring { animation: pulse-ring 2s infinite; }
            `}</style>
        </div>
    );
};
