
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig } from '../../types';
import { ThumbnailIcon, UploadIcon, SparklesIcon, XIcon, CheckIcon, ChevronRightIcon, CreditCoinIcon, ArrowRightIcon } from '../../components/icons';
import { fileToBase64, base64ToBlobUrl } from '../../utils/imageUtils';
import { generateThumbnail } from '../../services/thumbnailService';
import { deductCredits, saveCreation } from '../../firebase';
import { MobileSheet } from '../components/MobileSheet';
import { SelectionGrid } from '../../components/FeatureLayout';

export const MobileThumbnail: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [image, setImage] = useState<{ url: string; base64: any } | null>(null);
    const [title, setTitle] = useState('');
    const [mood, setMood] = useState('Viral');
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [isMoodSheetOpen, setIsMoodSheetOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const cost = appConfig?.featureCosts['Pixa Thumbnail Pro'] || 8;

    const handleGenerate = async () => {
        if (!image || !title || !auth.user) return;
        setIsGenerating(true);
        try {
            const resB64 = await generateThumbnail({
                format: 'landscape',
                category: 'Entertainment',
                mood: mood,
                title: title,
                subjectImage: image.base64,
                requestId: Math.random().toString(36).substring(7)
            }, auth.activeBrandKit);
            
            const blobUrl = await base64ToBlobUrl(resB64, 'image/png');
            setResult(blobUrl);

            await deductCredits(auth.user.uid, cost, 'Pixa Thumbnail Pro (Mobile)');
            await saveCreation(auth.user.uid, `data:image/png;base64,${resB64}`, 'Pixa Thumbnail Pro');
        } catch (e) {
            console.error(e);
            alert("Thumbnail generation failed.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="h-full flex flex-col animate-fadeIn">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-50 shrink-0">
                <ThumbnailIcon className="w-5 h-5 text-indigo-600" />
                <h2 className="text-sm font-black uppercase tracking-widest text-gray-800">Thumbnail Pro</h2>
            </div>

            {/* Preview Area */}
            <div className="flex-none aspect-video p-4 bg-gray-50">
                <div className="w-full h-full bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden relative flex items-center justify-center">
                    {result ? (
                        <img src={result} className="w-full h-full object-cover animate-fadeIn" />
                    ) : image ? (
                        <img src={image.url} className="max-w-full max-h-full object-cover transition-all duration-500" />
                    ) : (
                        <div onClick={() => fileInputRef.current?.click()} className="text-center opacity-40">
                            <UploadIcon className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Identity</p>
                        </div>
                    )}

                    {isGenerating && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white z-50">
                            <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                            <p className="text-xs font-black uppercase tracking-widest">Designing Hook...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white no-scrollbar">
                <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">1. Video Identity</h3>
                    <input 
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-300"
                        placeholder="Video Title (e.g. My Morning Routine)"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-4 rounded-2xl border-2 border-dashed flex flex-col items-center gap-2 transition-all ${image ? 'border-indigo-100 bg-indigo-50/30' : 'border-gray-100 bg-gray-50'}`}
                    >
                        <div className="p-2 bg-white rounded-xl shadow-sm"><UploadIcon className="w-4 h-4 text-indigo-500"/></div>
                        <span className="text-[10px] font-black uppercase text-gray-500">{image ? 'Change Photo' : 'Upload Person'}</span>
                    </button>

                    <button 
                        onClick={() => setIsMoodSheetOpen(true)}
                        className="p-4 rounded-2xl border border-gray-100 bg-gray-50 flex flex-col items-center gap-2"
                    >
                        <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-500"><SparklesIcon className="w-4 h-4"/></div>
                        <span className="text-[10px] font-black uppercase text-indigo-900">{mood} Vibe</span>
                    </button>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex-none p-6 bg-white border-t border-gray-100">
                <button 
                    onClick={handleGenerate}
                    disabled={!image || !title || isGenerating}
                    className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 ${!image || !title ? 'bg-gray-100 text-gray-400' : 'bg-[#FF0000] text-white shadow-red-500/20'}`}
                >
                    {isGenerating ? 'Rendering...' : <>Generate Hook <ArrowRightIcon className="w-4 h-4"/></>}
                </button>
            </div>

            {/* Mood Sheet */}
            <MobileSheet isOpen={isMoodSheetOpen} onClose={() => setIsMoodSheetOpen(false)} title="Thumbnail Vibe">
                <SelectionGrid 
                    label="Style Archetypes" 
                    options={['Viral', 'Cinematic', 'Minimalist', 'Gamer', 'Retro', 'Dramatic']} 
                    value={mood} 
                    onChange={(val) => { setMood(val); setIsMoodSheetOpen(false); }} 
                />
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
