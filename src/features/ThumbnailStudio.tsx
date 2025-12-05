
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { 
    ThumbnailIcon, 
    XIcon, 
    UploadTrayIcon,
    CreditCardIcon,
    SparklesIcon,
    MagicWandIcon,
    CheckIcon
} from '../components/icons';
import { FeatureLayout, SelectionGrid, InputField, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { generateThumbnail } from '../services/thumbnailService';
import { saveCreation, deductCredits } from '../firebase';

// Compact Upload Component (Reused pattern for consistency)
const CompactUpload: React.FC<{ 
    label: string; 
    image: { url: string } | null; 
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    onClear: () => void;
    icon: React.ReactNode;
    heightClass?: string;
    optional?: boolean;
}> = ({ label, image, onUpload, onClear, icon, heightClass = "h-40", optional }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="relative w-full group">
            <div className="flex items-center justify-between mb-2 ml-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label} {optional && <span className="text-gray-300 font-normal">(Optional)</span>}</label>
            </div>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-white rounded-xl border-2 border-blue-100 flex items-center justify-center overflow-hidden shadow-sm`}>
                    <img src={image.url} className="max-w-full max-h-full object-contain" alt={label} />
                    <button 
                        onClick={(e) => { e.stopPropagation(); onClear(); }}
                        className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors z-10"
                    >
                        <XIcon className="w-4 h-4"/>
                    </button>
                </div>
            ) : (
                <div 
                    onClick={() => inputRef.current?.click()}
                    className={`w-full ${heightClass} border-2 border-dashed border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50/30 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm`}
                >
                    <div className="p-2 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                        {icon}
                    </div>
                    <p className="text-xs font-bold text-gray-400 group-hover:text-blue-500 uppercase tracking-wide text-center px-2">Upload {label}</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
    );
};

const FormatSelector: React.FC<{
    selected: 'landscape' | 'portrait' | null;
    onSelect: (format: 'landscape' | 'portrait') => void;
}> = ({ selected, onSelect }) => (
    <div className="mb-8">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 block ml-1">1. Choose Format</label>
        <div className="grid grid-cols-2 gap-4">
            {/* YouTube Option */}
            <button
                onClick={() => onSelect('landscape')}
                className={`relative group p-6 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center gap-4 text-center overflow-hidden ${
                    selected === 'landscape'
                        ? 'border-[#FF0000] bg-red-50/50 shadow-xl shadow-red-500/10 scale-[1.02]'
                        : 'border-gray-100 bg-white hover:border-red-200 hover:shadow-lg hover:-translate-y-1'
                }`}
            >
                {/* Visual Representation */}
                <div className={`w-16 h-10 rounded-lg border-2 flex items-center justify-center transition-colors shadow-sm ${selected === 'landscape' ? 'border-[#FF0000] bg-[#FF0000]/10' : 'border-gray-300 bg-gray-50 group-hover:border-[#FF0000]/50'}`}>
                    <div className={`w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-b-[5px] border-b-transparent ml-1 ${selected === 'landscape' ? 'border-l-[#FF0000]' : 'border-l-gray-400 group-hover:border-l-[#FF0000]'}`}></div>
                </div>
                
                <div>
                    <h3 className={`font-bold text-sm ${selected === 'landscape' ? 'text-[#FF0000]' : 'text-gray-700'}`}>YouTube Video</h3>
                    <p className="text-[10px] text-gray-400 font-medium mt-1 tracking-wide">16:9 Landscape</p>
                </div>

                {selected === 'landscape' && (
                    <div className="absolute top-3 right-3 bg-[#FF0000] text-white p-1 rounded-full animate-fadeIn shadow-sm">
                        <CheckIcon className="w-3 h-3" />
                    </div>
                )}
            </button>

            {/* Instagram Option */}
            <button
                onClick={() => onSelect('portrait')}
                className={`relative group p-6 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center gap-4 text-center overflow-hidden ${
                    selected === 'portrait'
                        ? 'border-[#ee2a7b] bg-white shadow-xl shadow-pink-500/10 scale-[1.02]'
                        : 'border-gray-100 bg-white hover:border-pink-200 hover:shadow-lg hover:-translate-y-1'
                }`}
                style={selected === 'portrait' ? { background: 'linear-gradient(135deg, rgba(249, 206, 52, 0.05), rgba(238, 42, 123, 0.05), rgba(98, 40, 215, 0.05))' } : {}}
            >
                {/* Visual Representation */}
                <div 
                    className={`w-9 h-14 rounded-xl border-2 flex flex-col items-center justify-center transition-all shadow-sm ${selected === 'portrait' ? 'border-transparent' : 'border-gray-300 bg-gray-50 group-hover:border-pink-300'}`}
                    style={selected === 'portrait' ? { background: 'linear-gradient(135deg, #f9ce34 0%, #ee2a7b 50%, #6228d7 100%)' } : {}}
                >
                    <div className={`w-3 h-3 rounded-full border-2 ${selected === 'portrait' ? 'border-white bg-transparent' : 'border-gray-400 group-hover:border-pink-400'}`}></div>
                </div>

                <div>
                    <h3 
                        className={`font-bold text-sm ${selected === 'portrait' ? 'text-transparent bg-clip-text' : 'text-gray-700'}`}
                        style={selected === 'portrait' ? { backgroundImage: 'linear-gradient(90deg, #f9ce34, #ee2a7b, #6228d7)' } : {}}
                    >
                        Reels & Stories
                    </h3>
                    <p className="text-[10px] text-gray-400 font-medium mt-1 tracking-wide">9:16 Vertical</p>
                </div>

                {selected === 'portrait' && (
                    <div 
                        className="absolute top-3 right-3 text-white p-1 rounded-full animate-fadeIn shadow-sm"
                        style={{ background: 'linear-gradient(135deg, #f9ce34, #ee2a7b, #6228d7)' }}
                    >
                        <CheckIcon className="w-3 h-3" />
                    </div>
                )}
            </button>
        </div>
    </div>
);

export const ThumbnailStudio: React.FC<{ 
    auth: AuthProps; 
    appConfig: AppConfig | null;
    navigateTo: (page: Page, view?: View) => void;
}> = ({ auth, appConfig, navigateTo }) => {
    // Inputs
    const [format, setFormat] = useState<'landscape' | 'portrait' | null>(null);
    const [category, setCategory] = useState('');
    const [title, setTitle] = useState('');
    const [customText, setCustomText] = useState(''); // New State for Custom Text Override
    
    // Images
    const [referenceImage, setReferenceImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [subjectImage, setSubjectImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [hostImage, setHostImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [guestImage, setGuestImage] = useState<{ url: string; base64: Base64File } | null>(null);

    // State
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [result, setResult] = useState<string | null>(null);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [showMagicEditor, setShowMagicEditor] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Config: Updated cost lookup to prioritize new name
    const cost = appConfig?.featureCosts['Pixa Thumbnail Pro'] || appConfig?.featureCosts['Thumbnail Studio'] || 5;
    const regenCost = 3;
    const editCost = 1;
    const userCredits = auth.user?.credits || 0;
    
    const isPodcast = category === 'Podcast';
    const hasRequirements = format && (isPodcast 
        ? (!!hostImage && !!guestImage && !!title)
        : (!!title));
        
    const isLowCredits = userCredits < cost;

    const categories = [
        'Podcast', 'Entertainment', 'Gaming', 'Vlogs', 'How-to & Style', 
        'Education', 'Comedy', 'Music', 'Technology', 'Sports', 'Travel & Events'
    ];

    useEffect(() => {
        let interval: any;
        if (loading) {
            const steps = ["Pixa is analyzing trend data...", "Pixa is enhancing photos...", "Pixa is designing layout...", "Pixa is rendering text...", "Pixa is polishing..."];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
            }, 1500);
        }
        return () => clearInterval(interval);
    }, [loading]);

    useEffect(() => {
        return () => {
            if (result) URL.revokeObjectURL(result);
        };
    }, [result]);

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

    const processFile = async (file: File): Promise<{ url: string; base64: Base64File }> => {
        const base64 = await fileToBase64(file);
        return { url: URL.createObjectURL(file), base64 };
    };

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const data = await processFile(e.target.files[0]);
            setter(data);
            autoScroll();
            e.target.value = '';
        }
    };

    const handleGenerate = async () => {
        if (!hasRequirements || !auth.user || !format) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }

        setLoading(true);
        setResult(null);

        try {
            const res = await generateThumbnail({
                format,
                category,
                title,
                customText: customText || undefined,
                referenceImage: referenceImage?.base64,
                subjectImage: subjectImage?.base64,
                hostImage: hostImage?.base64,
                guestImage: guestImage?.base64
            });

            const blobUrl = await base64ToBlobUrl(res, 'image/png');
            setResult(blobUrl);
            
            const dataUri = `data:image/png;base64,${res}`;
            // Use updated name 'Pixa Thumbnail Pro'
            saveCreation(auth.user.uid, dataUri, 'Pixa Thumbnail Pro');
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Thumbnail Pro');
            
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

    const handleRegenerate = async () => {
        if (!hasRequirements || !auth.user || !format) return;
        if (userCredits < regenCost) { alert("Insufficient credits."); return; }

        setLoading(true);
        setResult(null);

        try {
            const res = await generateThumbnail({
                format,
                category,
                title,
                customText: customText || undefined,
                referenceImage: referenceImage?.base64,
                subjectImage: subjectImage?.base64,
                hostImage: hostImage?.base64,
                guestImage: guestImage?.base64
            });

            const blobUrl = await base64ToBlobUrl(res, 'image/png');
            setResult(blobUrl);
            
            const dataUri = `data:image/png;base64,${res}`;
            saveCreation(auth.user.uid, dataUri, 'Pixa Thumbnail Pro (Regen)');
            const updatedUser = await deductCredits(auth.user.uid, regenCost, 'Pixa Thumbnail Pro (Regen)');
            
            if (updatedUser.lifetimeGenerations) {
                const bonus = checkMilestone(updatedUser.lifetimeGenerations);
                if (bonus !== false) setMilestoneBonus(bonus);
            }
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);

        } catch (e) {
            console.error(e);
            alert("Regeneration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleNewSession = () => {
        setFormat(null);
        setReferenceImage(null);
        setSubjectImage(null);
        setHostImage(null);
        setGuestImage(null);
        setResult(null);
        setTitle('');
        setCustomText('');
        setCategory('');
    };

    const handleEditorSave = (newUrl: string) => {
        setResult(newUrl);
        saveCreation(auth.user!.uid, newUrl, 'Pixa Thumbnail Pro (Edited)');
    };

    const handleDeductEditCredit = async () => {
        if(auth.user) {
            const updatedUser = await deductCredits(auth.user.uid, editCost, 'Magic Eraser');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        }
    };

    const handleFormatSelect = (val: 'landscape' | 'portrait') => {
        setFormat(val);
        // Clean reset of other fields if switching (optional, but good for UX)
        if (val !== format) {
            setCategory('');
            setTitle('');
            setCustomText('');
            setSubjectImage(null);
            setHostImage(null);
            setGuestImage(null);
            setReferenceImage(null);
        }
        autoScroll();
    };

    return (
        <>
            <FeatureLayout 
                title="Pixa Thumbnail Pro" 
                description="Create viral, high-CTR thumbnails. Analyze trends and generate hyper-realistic results."
                icon={<ThumbnailIcon className="w-14 h-14"/>}
                rawIcon={true}
                creditCost={cost}
                isGenerating={loading}
                canGenerate={!!hasRequirements && !isLowCredits}
                onGenerate={handleGenerate}
                resultImage={result}
                onResetResult={handleRegenerate} 
                onNewSession={handleNewSession}
                resultHeightClass={format === 'portrait' ? "h-[1000px]" : "h-[850px]"}
                hideGenerateButton={isLowCredits}
                generateButtonStyle={{
                    className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]",
                    hideIcon: true,
                    label: "Generate Thumbnail"
                }}
                scrollRef={scrollRef}
                customActionButtons={
                    result ? (
                        <button 
                            onClick={() => setShowMagicEditor(true)}
                            className="bg-[#4D7CFF] hover:bg-[#3b63cc] text-white px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 text-xs sm:text-sm font-bold flex items-center gap-2 transform hover:scale-105 whitespace-nowrap"
                        >
                            <MagicWandIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white"/> 
                            <span>Magic Editor</span>
                        </button>
                    ) : null
                }
                leftContent={
                    <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                        {loading ? (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4">
                                    <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                                </div>
                                <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p>
                            </div>
                        ) : (
                            <div className="text-center opacity-50 select-none">
                                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <ThumbnailIcon className="w-10 h-10 text-red-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-300">Thumbnail Canvas</h3>
                                <p className="text-sm text-gray-300 mt-1">
                                    {format === 'portrait' ? '9:16 Vertical Preview' : (format === 'landscape' ? '16:9 Landscape Preview' : 'Select a format to begin')}
                                </p>
                            </div>
                        )}
                        <style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
                    </div>
                }
                rightContent={
                    isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100">
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4 shadow-inner animate-bounce-slight">
                                <CreditCardIcon className="w-10 h-10 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                            <button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge Now</button>
                        </div>
                    ) : (
                        <div className="space-y-8 p-1 animate-fadeIn">
                            {/* Format Selection */}
                            <FormatSelector selected={format} onSelect={handleFormatSelect} />

                            {format && (
                                <div className="animate-fadeIn space-y-8">
                                    <SelectionGrid label="2. Select Category" options={categories} value={category} onChange={(val) => { setCategory(val); autoScroll(); }} />
                                    
                                    {category && (
                                        <div className="animate-fadeIn space-y-6">
                                            <div className="h-px w-full bg-gray-200"></div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">3. Upload Assets</label>
                                                {isPodcast ? (
                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <CompactUpload label="Host Photo" image={hostImage} onUpload={handleUpload(setHostImage)} onClear={() => setHostImage(null)} icon={<UploadTrayIcon className="w-6 h-6 text-purple-400"/>} />
                                                            <CompactUpload label="Guest Photo" image={guestImage} onUpload={handleUpload(setGuestImage)} onClear={() => setGuestImage(null)} icon={<UploadTrayIcon className="w-6 h-6 text-indigo-400"/>} />
                                                        </div>
                                                        <CompactUpload label="Reference Thumbnail" image={referenceImage} onUpload={handleUpload(setReferenceImage)} onClear={() => setReferenceImage(null)} icon={<UploadTrayIcon className="w-6 h-6 text-yellow-400"/>} heightClass="h-40" optional={true} />
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        <CompactUpload label="Your Photo" image={subjectImage} onUpload={handleUpload(setSubjectImage)} onClear={() => setSubjectImage(null)} icon={<UploadTrayIcon className="w-6 h-6 text-blue-400"/>} optional={true} />
                                                        <CompactUpload label="Reference Thumbnail" image={referenceImage} onUpload={handleUpload(setReferenceImage)} onClear={() => setReferenceImage(null)} icon={<UploadTrayIcon className="w-6 h-6 text-yellow-400"/>} heightClass="h-40" optional={true} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="animate-fadeIn">
                                                <InputField label="4. What is the video about? (Context)" placeholder={isPodcast ? "e.g. Interview with Sam Altman" : "e.g. Haunted House Vlog"} value={title} onChange={(e: any) => setTitle(e.target.value)} />
                                            </div>
                                            <div className="animate-fadeIn">
                                                <InputField label="5. Exact Title Text (Optional)" placeholder="e.g. DONT WATCH THIS" value={customText} onChange={(e: any) => setCustomText(e.target.value)} />
                                                <p className="text-[10px] text-gray-400 px-1 -mt-4 italic">If empty, Pixa will generate a viral title.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                }
            />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClose={() => setMilestoneBonus(undefined)} />}
            {showMagicEditor && result && (
                <MagicEditorModal imageUrl={result} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={handleDeductEditCredit} />
            )}
        </>
    );
};
