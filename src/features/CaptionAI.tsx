
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig } from '../types';
import { generateCaptions } from '../services/captionService';
import { deductCredits } from '../firebase';
import { fileToBase64, Base64File } from '../utils/imageUtils';
import { FeatureLayout, SelectionGrid } from '../components/FeatureLayout';
import { CaptionIcon, CopyIcon, UploadIcon, XIcon, ArrowUpCircleIcon, CheckIcon, PixaCaptionIcon } from '../components/icons';
import { CaptionStyles } from '../styles/features/CaptionAI.styles';

export const CaptionAI: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [captions, setCaptions] = useState<{caption: string; hashtags: string}[]>([]);
    const [language, setLanguage] = useState('');
    const [tone, setTone] = useState('');
    const [captionType, setCaptionType] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const redoFileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    const cost = appConfig?.featureCosts['Pixa Caption Pro'] || appConfig?.featureCosts['CaptionAI'] || 2;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = image && userCredits < cost;
    
    const captionTypes = ['SEO Friendly', 'Long Caption', 'Short Caption'];
    const toneOptions = [
        'Friendly', 
        'Funny', 
        'Chill', 
        'Emotional/Heartfelt', 
        'Hype/Exciting', 
        'Professional', 
        'Marketing'
    ];

    useEffect(() => { 
        let interval: any; 
        if (loading) { 
            const steps = [
                "Scanning Image Details...", 
                "Researching Global Trends...", 
                "Analyzing High-Reach Keywords...", 
                "Applying Human-Touch Protocol...", 
                "Drafting Viral Hooks...",
                "Engineering SEO Hashtags...",
                "Polishing Day-to-Day Phrasing..."
            ]; 
            let step = 0; 
            setLoadingText(steps[0]); 
            interval = setInterval(() => { 
                step = (step + 1) % steps.length; 
                setLoadingText(steps[step]); 
            }, 1800); 
        } 
        return () => clearInterval(interval); 
    }, [loading]);

    const autoScroll = () => { if (scrollRef.current) setTimeout(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, 100); };
    const scrollToResults = () => { if (scrollRef.current && resultsRef.current) setTimeout(() => { const element = resultsRef.current; const container = scrollRef.current; if (element && container) container.scrollTo({ top: element.offsetTop - 20, behavior: 'smooth' }); }, 100); };

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };
    const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = async (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer.files && e.dataTransfer.files[0]) { const file = e.dataTransfer.files[0]; if (file.type.startsWith('image/')) { const base64 = await fileToBase64(file); handleNewSession(); setImage({ url: URL.createObjectURL(file), base64 }); } else { alert("Please drop a valid image file."); } } };
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) { const file = e.target.files[0]; const base64 = await fileToBase64(file); handleNewSession(); setImage({ url: URL.createObjectURL(file), base64 }); } };

    const handleGenerate = async () => {
        if (!image || !auth.user) return; if (isLowCredits) { alert("Insufficient credits."); return; } if (!language || !tone || !captionType) return;
        setLoading(true); setIsAnalyzing(true); setCaptions([]);
        try { 
            const res = await generateCaptions(
                image.base64.base64, 
                image.base64.mimeType, 
                language || 'English', 
                tone || 'Friendly',
                (captionType as any) || 'SEO Friendly', 
                auth.activeBrandKit
            ); 
            setCaptions(res); 
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Caption Pro'); 
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); 
            scrollToResults(); 
        } catch (e) { 
            console.error(e); 
            alert("Generation failed. Please try again."); 
        } finally { 
            setLoading(false); 
            setIsAnalyzing(false); 
        }
    };

    const handleNewSession = () => { setImage(null); setCaptions([]); setLanguage(''); setTone(''); setCaptionType(''); setCopiedIndex(null); };
    const handleCopy = (text: string, index: number) => { navigator.clipboard.writeText(text); setCopiedIndex(index); setTimeout(() => setCopiedIndex(null), 2000); };
    const canGenerate = !!image && !isLowCredits && !!language && !!tone && !!captionType;

    return (
        <>
            <FeatureLayout
                title="Pixa Caption Pro" description="Get viral, research-backed captions optimized for engagement and organic reach." icon={<PixaCaptionIcon className="w-14 h-14"/>} rawIcon={true} creditCost={cost} isGenerating={loading} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={null} onNewSession={handleNewSession} resultHeightClass="h-[600px]" hideGenerateButton={isLowCredits}
                activeBrandKit={auth.activeBrandKit}
                isBrandCritical={true}
                generateButtonStyle={{ className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]", label: captions.length > 0 ? "Regenerate Captions" : "Generate Captions", hideIcon: true }} scrollRef={scrollRef}
                leftContent={
                    image ? (
                        <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                            {(loading || isAnalyzing) && (<div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"><div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4"><div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div></div><p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p></div>)}
                            <img src={image.url} className={`max-w-full max-h-full rounded-xl shadow-md object-contain transition-all duration-700 ${loading ? 'scale-95 opacity-50' : ''}`} alt="Source" />
                            {!loading && (<><button onClick={handleNewSession} className="absolute top-4 right-4 bg-white p-2.5 rounded-full shadow-md hover:bg-red-50 text-gray-500 hover:text-red-500 transition-all z-40" title="Remove Photo"><XIcon className="w-5 h-5"/></button><button onClick={() => redoFileInputRef.current?.click()} className="absolute top-4 left-4 bg-white p-2.5 rounded-full shadow-md hover:bg-[#4D7CFF] hover:text-white text-gray-500 transition-all z-40" title="Change Photo"><UploadIcon className="w-5 h-5"/></button></>)}
                            <style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
                        </div>
                    ) : (
                        <div className="w-full h-full flex justify-center"><div onClick={() => fileInputRef.current?.click()} onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`h-full w-full border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden mx-auto ${isDragging ? 'border-indigo-600 bg-indigo-50 scale-[1.02] shadow-xl' : 'border-indigo-300 hover:border-indigo-500 bg-white hover:-translate-y-1 hover:shadow-xl'}`}>
                            <div className="relative z-10 p-6 bg-indigo-50 rounded-2xl shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300"><PixaCaptionIcon className="w-12 h-12 text-indigo-400 group-hover:text-indigo-600 transition-colors duration-300" /></div>
                            <div className="relative z-10 mt-6 text-center space-y-2 px-6"><p className="text-xl font-bold text-gray-500 group-hover:text-[#1A1A1E] transition-colors duration-300 tracking-tight">Upload Photo</p><div className="bg-gray-50 rounded-full px-3 py-1 inline-block"><p className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Click to Browse</p></div><p className="text-[10px] text-gray-400 mt-3 font-medium">Recommended: Clear, well-lit photo.</p></div>{isDragging && (<div className="absolute inset-0 flex items-center justify-center bg-indigo-500/10 backdrop-blur-[2px] z-50 rounded-3xl pointer-events-none"><div className="bg-white px-6 py-3 rounded-full shadow-2xl border border-indigo-100 animate-bounce"><p className="text-lg font-bold text-indigo-600 flex items-center gap-2"><UploadIcon className="w-5 h-5"/> Drop to Upload!</p></div></div>)}</div></div>
                    )
                }
                rightContent={
                    <div className={`space-y-6 p-1 animate-fadeIn transition-all duration-300 ${!image ? 'opacity-40 pointer-events-none select-none grayscale-[0.5]' : ''}`}>
                        <div>
                            <div className="flex items-center justify-between mb-3 ml-1">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">1. Select Language</label>
                                {language && (<button onClick={() => { setLanguage(''); setTone(''); setCaptionType(''); }} className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded hover:bg-red-100 transition-colors">Clear</button>)}
                            </div>
                            <div className="flex gap-3">
                                {['English', 'Hindi', 'Marathi'].map(lang => (
                                    <button key={lang} onClick={() => { setLanguage(lang); }} className={`${CaptionStyles.langButton} ${language === lang ? CaptionStyles.langActive : CaptionStyles.langInactive}`}>{lang}</button>
                                ))}
                            </div>
                        </div>
                        
                        {language && (
                            <div className="animate-fadeIn">
                                <SelectionGrid label="2. Select Tone" options={toneOptions} value={tone} onChange={(val) => { setTone(val); if (val) autoScroll(); }} />
                            </div>
                        )}

                        {tone && (
                            <div className="animate-fadeIn">
                                <SelectionGrid label="3. Caption Style" options={captionTypes} value={captionType} onChange={(val) => { setCaptionType(val); if (val) autoScroll(); }} />
                                <p className="text-[10px] text-gray-400 px-1 -mt-4 mb-4 italic">AI will research current internet trends for the best results.</p>
                            </div>
                        )}

                        {captions.length > 0 && (<div className="mt-6 animate-fadeIn" ref={resultsRef}><div className="flex items-center justify-between mb-4 ml-1"><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Research-Driven Captions</label><span className="text-[10px] bg-green-100 text-green-600 px-2 py-1 rounded-full font-bold uppercase tracking-widest">Viral Mix Ready</span></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{captions.map((c, i) => (<div key={i} className={CaptionStyles.resultCard} style={{ animationDelay: `${i * 100}ms` }}><div><p className="text-sm font-medium text-gray-800 mb-3 leading-relaxed whitespace-pre-line">{c.caption}</p><p className="text-xs text-indigo-600 font-semibold leading-snug opacity-80">{c.hashtags}</p></div><button onClick={() => handleCopy(`${c.caption}\n\n${c.hashtags}`, i)} className={`${CaptionStyles.copyButton} ${copiedIndex === i ? CaptionStyles.copyActive : CaptionStyles.copyInactive}`}>{copiedIndex === i ? (<><CheckIcon className="w-3 h-3"/> Copied</>) : (<><CopyIcon className="w-3 h-3"/> Copy Caption</>)}</button></div>))}</div></div>)}
                    </div>
                }
            />
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            <input ref={redoFileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
        </>
    );
};
