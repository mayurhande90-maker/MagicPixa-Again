
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { 
    ThumbnailIcon, 
    XIcon, 
    UploadTrayIcon,
    CreditCardIcon,
    SparklesIcon
} from '../components/icons';
import { FeatureLayout, SelectionGrid, InputField, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { fileToBase64, Base64File } from '../utils/imageUtils';
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

export const ThumbnailStudio: React.FC<{ 
    auth: AuthProps; 
    appConfig: AppConfig | null;
    navigateTo: (page: Page, view?: View) => void;
}> = ({ auth, appConfig, navigateTo }) => {
    // Inputs
    const [category, setCategory] = useState('');
    const [title, setTitle] = useState('');
    const [customText, setCustomText] = useState(''); // New State for Custom Text Override
    
    // Images
    const [referenceImage, setReferenceImage] = useState<{ url: string; base64: Base64File } | null>(null);
    
    // Standard Mode Images
    const [subjectImage, setSubjectImage] = useState<{ url: string; base64: Base64File } | null>(null);
    
    // Podcast Mode Images
    const [hostImage, setHostImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [guestImage, setGuestImage] = useState<{ url: string; base64: Base64File } | null>(null);

    // State
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [result, setResult] = useState<string | null>(null);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);

    // Refs
    const scrollRef = useRef<HTMLDivElement>(null);

    // Config
    const cost = appConfig?.featureCosts['Thumbnail Studio'] || 5;
    const regenCost = 3;
    const userCredits = auth.user?.credits || 0;
    
    // Requirement Check
    const isPodcast = category === 'Podcast';
    // Podcast: Needs Host + Guest + Title. Reference is optional.
    // Standard: Needs Title. Subject is optional. Reference is optional.
    const hasRequirements = isPodcast 
        ? (!!hostImage && !!guestImage && !!title)
        : (!!title); 
        
    // Immediate credit check: Block UI if user doesn't have enough credits to start
    const isLowCredits = userCredits < cost;

    const categories = [
        'Podcast', 'Entertainment', 'Gaming', 'Vlogs', 'How-to & Style', 
        'Education', 'Comedy', 'Music', 'Technology', 'Sports', 'Travel & Events'
    ];

    // Animation
    useEffect(() => {
        let interval: any;
        if (loading) {
            const steps = ["Analyzing Trend Data...", "Enhancing Photos...", "Designing Layout...", "Rendering Text...", "Final Polish..."];
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

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const data = await processFile(e.target.files[0]);
            setter(data);
            autoScroll();
            e.target.value = '';
        }
    };

    const handleGenerate = async () => {
        if (!hasRequirements || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }

        setLoading(true);
        setResult(null);

        try {
            const res = await generateThumbnail({
                category,
                title,
                customText: customText || undefined, // Pass custom text if present
                referenceImage: referenceImage?.base64,
                subjectImage: subjectImage?.base64,
                hostImage: hostImage?.base64,
                guestImage: guestImage?.base64
            });

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

    const handleRegenerate = async () => {
        if (!hasRequirements || !auth.user) return;
        
        if (userCredits < regenCost) { 
            alert("Insufficient credits for regeneration (3 credits required)."); 
            return; 
        }

        setLoading(true);
        setResult(null);

        try {
            const res = await generateThumbnail({
                category,
                title,
                customText: customText || undefined, // Pass custom text here too
                referenceImage: referenceImage?.base64,
                subjectImage: subjectImage?.base64,
                hostImage: hostImage?.base64,
                guestImage: guestImage?.base64
            });

            const url = `data:image/png;base64,${res}`;
            setResult(url);
            
            saveCreation(auth.user.uid, url, 'Thumbnail Studio (Regen)');
            const updatedUser = await deductCredits(auth.user.uid, regenCost, 'Thumbnail Studio (Regen)');
            
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
        setReferenceImage(null);
        setSubjectImage(null);
        setHostImage(null);
        setGuestImage(null);
        setResult(null);
        setTitle('');
        setCustomText('');
        setCategory('');
    };

    return (
        <>
            <FeatureLayout 
                title="Thumbnail Studio"
                description="Create viral, high-CTR thumbnails. Analyze trends and generate hyper-realistic results."
                icon={<ThumbnailIcon className="w-6 h-6 text-blue-500"/>}
                creditCost={cost}
                isGenerating={loading}
                canGenerate={hasRequirements && !isLowCredits}
                onGenerate={handleGenerate}
                resultImage={result}
                onResetResult={handleRegenerate} 
                onNewSession={handleNewSession}
                resultHeightClass="h-[850px]" // Increased height to accommodate extra field
                hideGenerateButton={isLowCredits}
                generateButtonStyle={{
                    className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]",
                    hideIcon: true,
                    label: "Generate Thumbnail"
                }}
                scrollRef={scrollRef}
                // Left Content: Result Canvas
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
                                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <ThumbnailIcon className="w-10 h-10 text-blue-300" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-300">Thumbnail Canvas</h3>
                                <p className="text-sm text-gray-300 mt-1">Your generated thumbnail will appear here.</p>
                            </div>
                        )}
                        <style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
                    </div>
                }
                // Right Content: Control Panel
                rightContent={
                    isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100">
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4 shadow-inner animate-bounce-slight">
                                <CreditCardIcon className="w-10 h-10 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                            <p className="text-gray-500 mb-6 max-w-xs text-sm leading-relaxed">
                                This generation requires <span className="font-bold text-gray-800">{cost} credits</span>, but you only have <span className="font-bold text-red-500">{userCredits}</span>.
                            </p>
                            <button
                                onClick={() => navigateTo('dashboard', 'billing')}
                                className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg shadow-yellow-500/20 hover:scale-105 flex items-center gap-2"
                            >
                                <SparklesIcon className="w-5 h-5" />
                                Recharge Now
                            </button>
                            <p className="text-xs text-gray-400 mt-4">Or earn credits by referring friends!</p>
                        </div>
                    ) : (
                        <div className="space-y-8 p-1 animate-fadeIn">
                            {/* 1. Category Selection */}
                            <SelectionGrid 
                                label="1. Select Category" 
                                options={categories} 
                                value={category} 
                                onChange={(val) => { setCategory(val); autoScroll(); }} 
                            />

                            {category && (
                                <div className="animate-fadeIn space-y-6">
                                    <div className="h-px w-full bg-gray-200"></div>
                                    
                                    {/* 2. Uploads */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">2. Upload Assets</label>
                                        
                                        {isPodcast ? (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <CompactUpload 
                                                        label="Host Photo" 
                                                        image={hostImage} 
                                                        onUpload={handleUpload(setHostImage)} 
                                                        onClear={() => setHostImage(null)}
                                                        icon={<UploadTrayIcon className="w-6 h-6 text-purple-400"/>}
                                                    />
                                                    <CompactUpload 
                                                        label="Guest Photo" 
                                                        image={guestImage} 
                                                        onUpload={handleUpload(setGuestImage)} 
                                                        onClear={() => setGuestImage(null)}
                                                        icon={<UploadTrayIcon className="w-6 h-6 text-indigo-400"/>}
                                                    />
                                                </div>
                                                <CompactUpload 
                                                    label="Reference Thumbnail" 
                                                    image={referenceImage} 
                                                    onUpload={handleUpload(setReferenceImage)} 
                                                    onClear={() => setReferenceImage(null)}
                                                    icon={<UploadTrayIcon className="w-6 h-6 text-yellow-400"/>}
                                                    heightClass="h-40"
                                                    optional={true}
                                                />
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <CompactUpload 
                                                    label="Your Photo" 
                                                    image={subjectImage} 
                                                    onUpload={handleUpload(setSubjectImage)} 
                                                    onClear={() => setSubjectImage(null)}
                                                    icon={<UploadTrayIcon className="w-6 h-6 text-blue-400"/>}
                                                    optional={true}
                                                />
                                                <CompactUpload 
                                                    label="Reference Thumbnail" 
                                                    image={referenceImage} 
                                                    onUpload={handleUpload(setReferenceImage)} 
                                                    onClear={() => setReferenceImage(null)}
                                                    icon={<UploadTrayIcon className="w-6 h-6 text-yellow-400"/>}
                                                    heightClass="h-40"
                                                    optional={true}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* 3. Title Input (Context) */}
                                    <div className="animate-fadeIn">
                                        <InputField 
                                            label="3. What is the video about? (Context)" 
                                            placeholder={isPodcast ? "e.g. Interview with Sam Altman about AGI" : "e.g. I spent 24 hours in a haunted house"} 
                                            value={title} 
                                            onChange={(e: any) => setTitle(e.target.value)} 
                                        />
                                    </div>

                                    {/* 4. Custom Text Input (Optional Override) */}
                                    <div className="animate-fadeIn">
                                        <InputField 
                                            label="4. Exact Title Text (Optional)" 
                                            placeholder="e.g. DONT WATCH THIS" 
                                            value={customText} 
                                            onChange={(e: any) => setCustomText(e.target.value)} 
                                        />
                                        <p className="text-[10px] text-gray-400 px-1 -mt-4 italic">
                                            If you leave this blank, AI will generate a viral clickbait title for you.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }
            />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClose={() => setMilestoneBonus(undefined)} />}
        </>
    );
};
