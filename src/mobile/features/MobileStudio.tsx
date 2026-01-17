
import React, { useState } from 'react';
import { AuthProps, AppConfig } from '../../types';
import { PixaProductIcon, UploadIcon, SparklesIcon, XIcon, CheckIcon } from '../../components/icons';
import { SelectionGrid } from '../../components/FeatureLayout';

export const MobileStudio: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [image, setImage] = useState<{ url: string } | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [vibe, setVibe] = useState('');
    const [result, setResult] = useState<string | null>(null);

    const cost = 10;

    const handleGenerate = () => {
        setIsGenerating(true);
        // Simulate generation
        setTimeout(() => {
            setIsGenerating(false);
            setResult("https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?q=80&w=2070&auto=format&fit=crop");
        }, 3000);
    };

    const handleNew = () => {
        setImage(null);
        setResult(null);
        setVibe('');
    };

    return (
        <div className="h-full flex flex-col animate-fadeIn">
            {/* Canvas Area (Top) */}
            <div className="flex-none aspect-square p-4 bg-gray-50">
                <div className="w-full h-full bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden relative flex items-center justify-center">
                    {result ? (
                        <img src={result} className="w-full h-full object-cover" />
                    ) : image ? (
                        <img src={image.url} className="w-full h-full object-contain p-4" />
                    ) : (
                        <div className="text-center opacity-40">
                            <UploadIcon className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                            <p className="text-xs font-bold uppercase tracking-widest">Awaiting Asset</p>
                        </div>
                    )}

                    {isGenerating && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center animate-fadeIn">
                            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                            <p className="text-sm font-black uppercase tracking-[0.2em]">Crafting Masterpiece...</p>
                        </div>
                    )}
                    
                    {!isGenerating && (image || result) && (
                        <button onClick={handleNew} className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg text-gray-400 hover:text-red-500">
                            <XIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Controls Area (Bottom - Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
                <div>
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">1. Product Identity</h3>
                    {!image ? (
                        <button className="w-full h-24 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-indigo-400 hover:bg-indigo-50 transition-all">
                            <UploadIcon className="w-6 h-6 text-indigo-400" />
                            <span className="text-xs font-bold text-gray-500">Upload Product Photo</span>
                        </button>
                    ) : (
                        <div className="flex items-center gap-4 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                             <div className="w-12 h-12 bg-white rounded-xl border border-indigo-100 p-1">
                                 <img src={image.url} className="w-full h-full object-contain" />
                             </div>
                             <div className="flex-1">
                                 <p className="text-xs font-bold text-indigo-900">Photo Locked</p>
                                 <p className="text-[10px] text-indigo-400 font-medium">Ready for Studio Production</p>
                             </div>
                             <CheckIcon className="w-5 h-5 text-indigo-600" />
                        </div>
                    )}
                </div>

                <div className={!image ? 'opacity-40 grayscale pointer-events-none' : ''}>
                    <SelectionGrid 
                        label="2. Visual Theme" 
                        options={['Luxury', 'Nature', 'Tech', 'Minimal', 'Lifestyle']} 
                        value={vibe} 
                        onChange={setVibe} 
                    />
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
                <p className="text-center text-[9px] font-black text-gray-400 uppercase tracking-widest mt-3">
                    Cost: {cost} Credits
                </p>
            </div>
        </div>
    );
};
