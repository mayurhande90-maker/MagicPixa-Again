
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig } from '../types';
import { generateCaptions } from '../services/geminiService';
import { deductCredits } from '../firebase';
import { fileToBase64, Base64File } from '../utils/imageUtils';
import { FeatureLayout } from '../components/FeatureLayout';
import { CaptionIcon, CopyIcon, UploadIcon, XIcon, ArrowUpCircleIcon } from '../components/icons';

export const CaptionAI: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [captions, setCaptions] = useState<{caption: string; hashtags: string}[]>([]);
    const [language, setLanguage] = useState('English');
    
    // UI States
    const [isDragging, setIsDragging] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const redoFileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Determine Cost
    const cost = appConfig?.featureCosts['CaptionAI'] || 1;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = image && userCredits < cost;

    // Animation Timer
    useEffect(() => {
        let interval: any;
        if (loading) {
            const steps = ["Scanning Image...", "Analyzing Mood...", "Writing Captions...", "Generating Hashtags...", "Finalizing..."];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
            }, 1500);
        }
        return () => clearInterval(interval);
    }, [loading]);

    const autoScroll = () => {
        if (scrollRef.current) {
            setTimeout(() => {
                const element = scrollRef.current;
                if (element) {
                    element.scrollTo({
                        top: element.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            }, 100); 
        }
    };

    // --- Drag & Drop Logic ---
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging) setIsDragging(true);
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging) setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                const base64 = await fileToBase64(file);
                handleNewSession();
                setImage({ url: URL.createObjectURL(file), base64 });
            } else {
                alert("Please drop a valid image file.");
            }
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            handleNewSession();
            setImage({ url: URL.createObjectURL(file), base64 });
        }
    };

    const handleGenerate = async () => {
        if (!image || !auth.user) return;
        
        if (isLowCredits) {
            alert("Insufficient credits. Please purchase a pack to continue.");
            return;
        }

        setLoading(true);
        setIsAnalyzing(true);
        setCaptions([]); // Clear previous results

        try {
            const res = await generateCaptions(image.base64.base64, image.base64.mimeType, language);
            setCaptions(res);
            const updatedUser = await deductCredits(auth.user.uid, cost, 'CaptionAI');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            autoScroll();
        } catch (e) {
            console.error(e);
            alert("Generation failed.");
        } finally {
            setLoading(false);
            setIsAnalyzing(false);
        }
    };

    const handleNewSession = () => {
        setImage(null);
        setCaptions([]);
        setLanguage('English');
    };

    return (
        <>
            <FeatureLayout
                title="CaptionAI"
                description="Get viral captions in your language. Optimized for engagement."
                icon={<CaptionIcon className="w-6 h-6 text-amber-500"/>}
                creditCost={cost}
                isGenerating={loading}
                canGenerate={!!image && !isLowCredits}
                onGenerate={handleGenerate}
                resultImage={null} // Captions don't generate a result image
                onNewSession={handleNewSession}
                resultHeightClass="h-[600px]" // Match Magic Photo Studio height
                hideGenerateButton={isLowCredits}
                generateButtonStyle={{
                    className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]",
                    label: "Generate Captions"
                }}
                scrollRef={scrollRef}
                leftContent={
                    image ? (
                        <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                            
                            {/* Loading Animation Overlay */}
                            {(loading || isAnalyzing) && (
                                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                    {/* Animated Gradient Bar */}
                                    <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4">
                                        <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                                    </div>
                                    <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p>
                                </div>
                            )}

                            <img 
                                src={image.url} 
                                className={`max-w-full max-h-full rounded-xl shadow-md object-contain transition-all duration-700 ${loading ? 'scale-95 opacity-50' : ''}`} 
                                alt="Source"
                            />
                            
                            {!loading && (
                                <>
                                    <button 
                                        onClick={handleNewSession} 
                                        className="absolute top-4 right-4 bg-white p-2.5 rounded-full shadow-md hover:bg-red-50 text-gray-500 hover:text-red-500 transition-all z-40"
                                        title="Remove Photo"
                                    >
                                        <XIcon className="w-5 h-5"/>
                                    </button>
                                    <button 
                                        onClick={() => redoFileInputRef.current?.click()} 
                                        className="absolute top-4 left-4 bg-white p-2.5 rounded-full shadow-md hover:bg-[#4D7CFF] hover:text-white text-gray-500 transition-all z-40"
                                        title="Change Photo"
                                    >
                                        <UploadIcon className="w-5 h-5"/>
                                    </button>
                                </>
                            )}
                            <input ref={redoFileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                            <style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
                        </div>
                    ) : (
                        <div className="w-full h-full flex justify-center">
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={handleDragOver}
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`h-full w-full border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden mx-auto ${
                                    isDragging 
                                    ? 'border-amber-500 bg-amber-50 scale-[1.02] shadow-xl' 
                                    : 'border-amber-300 hover:border-amber-500 bg-white hover:-translate-y-1 hover:shadow-xl'
                                }`}
                            >
                                <div className="relative z-10 p-6 bg-amber-50 rounded-2xl shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
                                    <CaptionIcon className="w-12 h-12 text-amber-400 group-hover:text-amber-600 transition-colors duration-300" />
                                </div>
                                
                                <div className="relative z-10 mt-6 text-center space-y-2 px-6">
                                    <p className="text-xl font-bold text-gray-500 group-hover:text-[#1A1A1E] transition-colors duration-300 tracking-tight">Upload Photo</p>
                                    <div className="bg-gray-50 rounded-full px-3 py-1 inline-block">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-amber-600 transition-colors">Click to Browse</p>
                                    </div>
                                </div>

                                {isDragging && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-amber-500/10 backdrop-blur-[2px] z-50 rounded-3xl pointer-events-none">
                                        <div className="bg-white px-6 py-3 rounded-full shadow-2xl border border-amber-100 animate-bounce">
                                            <p className="text-lg font-bold text-amber-600 flex items-center gap-2">
                                                <UploadIcon className="w-5 h-5"/> Drop to Upload!
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }
                rightContent={
                    !image ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-50 select-none">
                            <div className="bg-white p-4 rounded-full mb-4 border border-gray-100">
                                <ArrowUpCircleIcon className="w-8 h-8 text-gray-400"/>
                            </div>
                            <h3 className="font-bold text-gray-600 mb-2">Controls Locked</h3>
                            <p className="text-sm text-gray-400">Upload a photo to begin.</p>
                        </div>
                    ) : (
                        <div className="space-y-6 p-1 animate-fadeIn">
                            {/* Language Selection */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Select Language</label>
                                <div className="flex gap-3">
                                    {['English', 'Hindi', 'Marathi'].map(lang => (
                                        <button
                                            key={lang}
                                            onClick={() => setLanguage(lang)}
                                            className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all duration-300 transform active:scale-95 ${
                                                language === lang
                                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-lg scale-105'
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            {lang}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Results Grid */}
                            {captions.length > 0 && (
                                <div className="mt-6 animate-fadeIn">
                                    <div className="flex items-center justify-between mb-4 ml-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Generated Captions</label>
                                        <span className="text-[10px] bg-green-100 text-green-600 px-2 py-1 rounded-full font-bold">6 OPTIONS</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {captions.map((c, i) => (
                                            <div 
                                                key={i} 
                                                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 flex flex-col justify-between h-full group"
                                                style={{ animationDelay: `${i * 100}ms` }}
                                            >
                                                <div>
                                                    <p className="text-sm font-medium text-gray-800 mb-3 leading-relaxed">{c.caption}</p>
                                                    <p className="text-xs text-blue-600 font-semibold leading-snug opacity-80">{c.hashtags}</p>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(`${c.caption}\n\n${c.hashtags}`);
                                                        // Optional: Add visual feedback state here
                                                    }} 
                                                    className="mt-4 w-full py-2 bg-gray-50 hover:bg-amber-50 text-gray-500 hover:text-amber-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-transparent hover:border-amber-200"
                                                >
                                                    <CopyIcon className="w-3 h-3"/> Copy Caption
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }
            />
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} accept="image/*" />
        </>
    );
};
