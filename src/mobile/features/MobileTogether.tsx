
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig } from '../../types';
import { PixaTogetherIcon, UploadIcon, SparklesIcon, XIcon, CheckIcon, UserIcon, ChevronRightIcon, CreditCoinIcon } from '../../components/icons';
import { fileToBase64, base64ToBlobUrl } from '../../utils/imageUtils';
import { generateMagicSoul } from '../../services/imageToolsService';
import { deductCredits, saveCreation } from '../../firebase';
import { MobileSheet } from '../components/MobileSheet';
import { SelectionGrid } from '../../components/FeatureLayout';

export const MobileTogether: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [personA, setPersonA] = useState<{ url: string; base64: any } | null>(null);
    const [personB, setPersonB] = useState<{ url: string; base64: any } | null>(null);
    const [relationship, setRelationship] = useState('Friends');
    const [mood, setMood] = useState('Happy');
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [isConfigSheetOpen, setIsConfigSheetOpen] = useState(false);
    
    const inputARef = useRef<HTMLInputElement>(null);
    const inputBRef = useRef<HTMLInputElement>(null);

    const cost = appConfig?.featureCosts['Pixa Together'] || 8;

    const handleGenerate = async () => {
        if (!personA || !personB || !auth.user) return;
        setIsGenerating(true);
        try {
            const resB64 = await generateMagicSoul(
                personA.base64.base64, 
                personA.base64.mimeType, 
                personB.base64.base64, 
                personB.base64.mimeType, 
                {
                    mode: 'creative',
                    relationship,
                    mood,
                    faceStrength: 0.8,
                    clothingMode: 'Match Vibe',
                    locks: { age: true, hair: true, accessories: false },
                    autoFix: true
                }
            );
            
            const blobUrl = await base64ToBlobUrl(resB64, 'image/png');
            setResult(blobUrl);

            await deductCredits(auth.user.uid, cost, 'Pixa Together (Mobile)');
            await saveCreation(auth.user.uid, `data:image/png;base64,${resB64}`, 'Pixa Together');
        } catch (e) {
            console.error(e);
            alert("Generation failed.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="h-full flex flex-col animate-fadeIn">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-50 shrink-0">
                <PixaTogetherIcon className="w-5 h-5 text-indigo-600" />
                <h2 className="text-sm font-black uppercase tracking-widest text-gray-800">Pixa Together</h2>
            </div>

            {/* Preview Area */}
            <div className="flex-none aspect-square p-4 bg-gray-50">
                <div className="w-full h-full bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden relative flex items-center justify-center">
                    {result ? (
                        <img src={result} className="w-full h-full object-cover animate-fadeIn" />
                    ) : (
                        <div className="relative w-full h-full flex flex-col items-center justify-center p-8 gap-6">
                            <div className="flex gap-4 w-full">
                                <button 
                                    onClick={() => inputARef.current?.click()}
                                    className={`flex-1 aspect-[3/4] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${personA ? 'border-indigo-100 bg-indigo-50/20' : 'border-gray-200 bg-gray-50'}`}
                                >
                                    {personA ? (
                                        <img src={personA.url} className="w-full h-full object-cover rounded-2xl" />
                                    ) : (
                                        <><UserIcon className="w-6 h-6 text-gray-300"/><span className="text-[8px] font-bold text-gray-400">PERSON A</span></>
                                    )}
                                </button>
                                <button 
                                    onClick={() => inputBRef.current?.click()}
                                    className={`flex-1 aspect-[3/4] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${personB ? 'border-pink-100 bg-pink-50/20' : 'border-gray-200 bg-gray-50'}`}
                                >
                                    {personB ? (
                                        <img src={personB.url} className="w-full h-full object-cover rounded-2xl" />
                                    ) : (
                                        <><UserIcon className="w-6 h-6 text-gray-300"/><span className="text-[8px] font-bold text-gray-400">PERSON B</span></>
                                    )}
                                </button>
                            </div>
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Select Two Subjects to Merge</p>
                        </div>
                    )}

                    {isGenerating && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white z-50">
                            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                            <p className="text-sm font-black uppercase tracking-widest animate-pulse">Merging Souls...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white no-scrollbar">
                <button 
                    onClick={() => setIsConfigSheetOpen(true)}
                    className="w-full flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 active:scale-[0.98] transition-all"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-white rounded-xl shadow-sm text-indigo-500"><SparklesIcon className="w-5 h-5"/></div>
                        <div className="text-left">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Theme Configuration</p>
                            <p className="text-sm font-bold text-gray-800">{relationship} • {mood}</p>
                        </div>
                    </div>
                    <ChevronRightIcon className="w-4 h-4 text-gray-300" />
                </button>
            </div>

            {/* Action Bar */}
            <div className="flex-none p-6 bg-white border-t border-gray-100">
                <button 
                    onClick={handleGenerate}
                    disabled={!personA || !personB || isGenerating}
                    className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 ${!personA || !personB ? 'bg-gray-100 text-gray-400' : 'bg-gradient-to-r from-indigo-600 to-pink-600 text-white shadow-indigo-500/20'}`}
                >
                    {isGenerating ? 'Rendering...' : 'Generate Together'}
                </button>
            </div>

            <MobileSheet isOpen={isConfigSheetOpen} onClose={() => setIsConfigSheetOpen(false)} title="Scene Strategy">
                <div className="space-y-6">
                    <SelectionGrid label="Relationship" options={['Couple', 'Friends', 'Siblings', 'Business']} value={relationship} onChange={setRelationship} />
                    <SelectionGrid label="Visual Mood" options={['Happy', 'Romantic', 'Cinematic', 'Vintage', 'Professional']} value={mood} onChange={setMood} />
                </div>
            </MobileSheet>

            <input ref={inputARef} type="file" className="hidden" accept="image/*" onChange={async (e) => {
                if (e.target.files?.[0]) {
                    const base64 = await fileToBase64(e.target.files[0]);
                    setPersonA({ url: URL.createObjectURL(e.target.files[0]), base64 });
                    setResult(null);
                }
            }} />
            <input ref={inputBRef} type="file" className="hidden" accept="image/*" onChange={async (e) => {
                if (e.target.files?.[0]) {
                    const base64 = await fileToBase64(e.target.files[0]);
                    setPersonB({ url: URL.createObjectURL(e.target.files[0]), base64 });
                    setResult(null);
                }
            }} />
        </div>
    );
};
