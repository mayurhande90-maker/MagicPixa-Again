
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig } from '../types';
import { 
    ThumbnailIcon, 
    UploadIcon, 
    XIcon, 
    SparklesIcon,
    CreditCardIcon,
    LightbulbIcon,
    UploadTrayIcon,
    UserIcon
} from '../components/icons';
import { FeatureLayout, SelectionGrid, InputField, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { fileToBase64, Base64File } from '../utils/imageUtils';
import { generateThumbnail } from '../services/thumbnailService';
import { saveCreation, deductCredits } from '../firebase';

// Local Compact Upload Component
const ReferenceUpload: React.FC<{ 
    image: { url: string } | null; 
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    onClear: () => void;
}> = ({ image, onUpload, onClear }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="relative w-full group mb-6">
            <div className="flex items-center justify-between mb-2 ml-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Style Reference (Optional)</label>
                {image && <button onClick={onClear} className="text-[10px] text-red-500 font-bold">REMOVE</button>}
            </div>
            
            {image ? (
                <div className="relative w-full h-32 bg-white rounded-xl border-2 border-red-100 flex items-center justify-center overflow-hidden shadow-sm">
                    <img src={image.url} className="max-w-full max-h-full object-cover" alt="Reference" />
                </div>
            ) : (
                <div 
                    onClick={() => inputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-gray-300 hover:border-red-400 bg-gray-50 hover:bg-red-50/30 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm"
                >
                    <div className="p-2 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                        <LightbulbIcon className="w-5 h-5 text-red-400"/>
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 group-hover:text-red-500 uppercase tracking-wide">Upload Style / Vibe</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
    );
};

export const ThumbnailStudio: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    // Inputs
    const [subjectImage, setSubjectImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [styleImage, setStyleImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');

    // State
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [result, setResult] = useState<string | null>(null);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [isDragging, setIsDragging] = useState(false);

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const redoFileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Config
    const cost = appConfig?.featureCosts['Thumbnail Studio'] || 2;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = subjectImage && userCredits < cost;

    const categories = ['Gaming', 'Vlog', 'Tech / Review', 'Finance', 'Education', 'Fitness', 'Reaction', 'News'];

    // Animation
    useEffect(() => {
        let interval: any;
        if (loading) {
            const steps = ["Analyzing Subject...", "Researching Trends...", "Designing Layout...", "Rendering Typography...", "Maximizing CTR..."];
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
                    element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
                }
            }, 100); 
        }
    };

    // File Handling
    const processFile = async (file: File): Promise<{ url: string; base64: Base64File }> => {
        const base64 = await fileToBase64(file);
        return { url: URL.createObjectURL(file), base64 };
    };

    const handleSubjectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const data = await processFile(e.target.files[0]);
            setResult(null);
            setSubjectImage(data);
            e.target.value = '';
        }
    };

    const handleStyleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const data = await processFile(e.target.files[0]);
            setStyleImage(data);
            e.target.value = '';
        }
    };

    // Drag & Drop
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        if (e.dataTransfer.files?.[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                const data = await processFile(file);
                setResult(null);
                setSubjectImage(data);
            } else {
                alert("Please drop a valid image file.");
            }
        }
    };

    const handleGenerate = async () => {
        if (!subjectImage || !title || !category || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }

        setLoading(true);
        setResult(null);

        try {
            const res = await generateThumbnail(
                subjectImage.base64.base64,
                subjectImage.base64.mimeType,
                styleImage ? styleImage.base64.base64 : null,
                styleImage ? styleImage.base64.mimeType : null,
                title,
                category
            );

            const url = `data:image/png;base64,${res}`;
            setResult(url);
            
            saveCreation(auth.user.uid, url, 'Thumbnail Studio');
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Thumbnail Studio');
            
            if (updatedUser.lifetimeGenerations) {
                const bonus = checkMilestone(updatedUser.lifetimeGenerations);
                if (bonus !== false) setMilestoneBonus(bonus);
            }
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);

        } catch (e) {
            console.error(e);
            alert("Generation failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleNewSession = () => {
        setSubjectImage(null);
        setStyleImage(null);
        setResult(null);
        setTitle('');
        setCategory('');
    };

    const canGenerate = !!subjectImage && !!title && !!category && !isLowCredits;

    return (
        <>
            <FeatureLayout 
                title="Thumbnail Studio"
                description="Create viral, high-CTR YouTube thumbnails. Upload your photo, set a title, and let AI design the rest."
                icon={<ThumbnailIcon className="w-6 h-6 text-red-500"/>}
                creditCost={cost}
                isGenerating={loading}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                resultImage={result}
                onResetResult={() => setResult(null)}
                onNewSession={handleNewSession}
                resultHeightClass="h-[650px]"
                hideGenerateButton={isLowCredits}
                generateButtonStyle={{
                    className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]",
                    hideIcon: true,
                    label: "Generate Thumbnail"
                }}
                scrollRef={scrollRef}
                leftContent={
                    subjectImage ? (
                        <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                            {loading && (
                                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                    <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4">
                                        <div className="h-full bg-gradient-to-r from-red-500 to-orange-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                                    </div>
                                    <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p>
                                </div>
                            )}
                            <img src={subjectImage.url} className={`max-w-full max-h-full rounded-xl shadow-md object-contain transition-all duration-700 ${loading ? 'scale-95 opacity-50' : ''}`} alt="Subject" />
                            {!loading && (
                                <>
                                    <div className="absolute top-4 left-0 w-full px-4 flex justify-between pointer-events-none">
                                         <span className="bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full border border-white/10">SUBJECT PREVIEW</span>
                                    </div>
                                    <button onClick={handleNewSession} className="absolute top-4 right-4 pointer-events-auto bg-white p-2 rounded-full shadow-md hover:bg-red-50 text-gray-500 hover:text-red-500 transition-all"><XIcon className="w-4 h-4"/></button>
                                    <button onClick={() => redoFileInputRef.current?.click()} className="absolute top-4 right-16 pointer-events-auto bg-white p-2 rounded-full shadow-md hover:bg-blue-50 text-gray-500 hover:text-blue-500 transition-all"><UploadIcon className="w-4 h-4"/></button>
                                </>
                            )}
                            <input ref={redoFileInputRef} type="file" className="hidden" accept="image/*" onChange={handleSubjectUpload} />
                            <style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
                        </div>
                    ) : (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`w-full h-full border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden bg-white ${isDragging ? 'border-red-500 bg-red-50/30 scale-[1.01]' : 'border-gray-300 hover:border-red-400 hover:bg-gray-50'}`}
                        >
                            <div className="p-6 bg-red-50 text-red-500 rounded-full mb-4 group-hover:scale-110 group-hover:bg-red-100 transition-all duration-300 shadow-sm">
                                <UserIcon className="w-12 h-12"/>
                            </div>
                            <h3 className="text-xl font-bold text-gray-700 mb-2 group-hover:text-red-600 transition-colors">Upload Subject Photo</h3>
                            <div className="bg-gray-100 px-3 py-1 rounded-full group-hover:bg-white border border-transparent group-hover:border-gray-200 transition-colors">
                                <p className="text-xs font-bold text-gray-400 group-hover:text-red-500 uppercase tracking-widest">Click or Drop</p>
                            </div>
                        </div>
                    )
                }
                rightContent={
                    !subjectImage ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-50 select-none">
                            <div className="bg-white p-4 rounded-full mb-4 border border-gray-100"><SparklesIcon className="w-8 h-8 text-gray-400"/></div>
                            <h3 className="font-bold text-gray-600 mb-2">Controls Locked</h3>
                            <p className="text-sm text-gray-400">Upload a subject photo to begin.</p>
                        </div>
                    ) : isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100">
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4 shadow-inner animate-bounce-slight">
                                <CreditCardIcon className="w-10 h-10 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                            <p className="text-gray-500 mb-6 max-w-xs text-sm leading-relaxed">Requires <span className="font-bold text-gray-800">{cost} credits</span>.</p>
                            <button onClick={() => (window as any).navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge</button>
                        </div>
                    ) : (
                        <div className="space-y-6 p-1 animate-fadeIn">
                            {/* 1. Reference Image */}
                            <ReferenceUpload 
                                image={styleImage} 
                                onUpload={handleStyleUpload} 
                                onClear={() => setStyleImage(null)} 
                            />

                            {/* 2. Title Input */}
                            <InputField 
                                label="Video Title (Text on Thumbnail)" 
                                placeholder="e.g., I SPENT 24 HOURS IN VR..." 
                                value={title} 
                                onChange={(e: any) => setTitle(e.target.value)} 
                            />

                            {/* 3. Category Selection */}
                            <SelectionGrid 
                                label="Category / Niche" 
                                options={categories} 
                                value={category} 
                                onChange={(val) => { setCategory(val); autoScroll(); }} 
                            />
                        </div>
                    )
                }
            />
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleSubjectUpload} />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClose={() => setMilestoneBonus(undefined)} />}
        </>
    );
};
