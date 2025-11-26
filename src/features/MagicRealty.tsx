
import React, { useState, useRef } from 'react';
import { AuthProps, AppConfig } from '../types';
import { FeatureLayout, InputField, MilestoneSuccessModal, checkMilestone, SelectionGrid } from '../components/FeatureLayout';
import { BuildingIcon, UploadTrayIcon, XIcon, SparklesIcon, CreditCardIcon, UserIcon, LightbulbIcon, MagicWandIcon } from '../components/icons';
import { fileToBase64, Base64File } from '../utils/imageUtils';
import { generateRealtyAd } from '../services/realtyService';
import { deductCredits, saveCreation } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';

// Specialized Card for Step Selection
const StepCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    selected: boolean;
    onClick: () => void;
}> = ({ title, description, icon, selected, onClick }) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left w-full hover:shadow-md ${
            selected 
            ? 'border-blue-500 bg-blue-50 shadow-sm' 
            : 'border-gray-100 bg-white hover:border-blue-200'
        }`}
    >
        <div className={`p-2 rounded-full mb-3 ${selected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
            {icon}
        </div>
        <h3 className={`font-bold text-sm ${selected ? 'text-blue-800' : 'text-gray-800'}`}>{title}</h3>
        <p className={`text-xs mt-1 ${selected ? 'text-blue-600' : 'text-gray-500'}`}>{description}</p>
    </button>
);

const CompactUpload: React.FC<{
    label: string;
    image: { url: string } | null; 
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    onClear: () => void;
    icon: React.ReactNode;
    heightClass?: string;
    optional?: boolean;
}> = ({ label, image, onUpload, onClear, icon, heightClass = "h-32", optional }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="relative w-full group h-full">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">{label} {optional && <span className="text-gray-300 font-normal">(Optional)</span>}</label>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-white rounded-xl border-2 border-blue-100 flex items-center justify-center overflow-hidden shadow-sm`}>
                    <img src={image.url} className="max-w-full max-h-full object-contain p-1" alt={label} />
                    <button
                        onClick={(e) => { e.stopPropagation(); onClear(); }}
                        className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors z-10"
                    >
                        <XIcon className="w-3 h-3"/>
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
                    <p className="text-[10px] font-bold text-gray-400 group-hover:text-blue-500 uppercase tracking-wide text-center px-2">Upload {label}</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
    );
};

export const MagicRealty: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    // Assets
    const [modelImage, setModelImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [propertyImage, setPropertyImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [referenceImage, setReferenceImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [logoImage, setLogoImage] = useState<{ url: string; base64: Base64File } | null>(null);

    // Decisions
    const [modelChoice, setModelChoice] = useState<'upload' | 'generate' | 'skip' | null>(null);
    const [propertyChoice, setPropertyChoice] = useState<'upload' | 'generate' | null>(null);

    // Model Generation State
    const [modelType, setModelType] = useState('');
    const [modelRegion, setModelRegion] = useState('');
    const [skinTone, setSkinTone] = useState('');
    const [bodyType, setBodyType] = useState('');
    const [modelComposition, setModelComposition] = useState('');
    const [modelFraming, setModelFraming] = useState('');

    // Model Options
    const modelTypes = ['Young Female', 'Young Male', 'Adult Female', 'Adult Male', 'Senior Female', 'Senior Male', 'Kid Model'];
    const modelRegions = ['Indian', 'South Asian', 'East Asian', 'Southeast Asian', 'Middle Eastern', 'African', 'European', 'American', 'Australian / Oceania'];
    const skinTones = ['Fair Tone', 'Wheatish Tone', 'Dusky Tone'];
    const bodyTypes = ['Slim Build', 'Average Build', 'Athletic Build', 'Plus Size Model'];
    const compositionTypes = ['Single Model', 'Group Shot'];
    const shotTypes = ['Tight Close Shot', 'Close-Up Shot', 'Mid Shot', 'Wide Shot'];

    // Details
    const [texts, setTexts] = useState({
        headline: '', // Project Name
        subHeadline: '', // Config (2 BHK)
        location: '',
        price: '',
        rera: '',
        contact: ''
    });

    // Result
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [showMagicEditor, setShowMagicEditor] = useState(false);

    const cost = appConfig?.featureCosts['Magic Realty'] || 4;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    const scrollRef = useRef<HTMLDivElement>(null);

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

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setter({ url: URL.createObjectURL(file), base64 });
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!referenceImage || !auth.user || !texts.headline) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }

        setLoading(true);
        setResultImage(null);

        try {
            const mode = propertyChoice === 'generate' ? 'new_property' : 'lifestyle_fusion';
            
            // Construct generation params if generating model
            const modelGenerationParams = modelChoice === 'generate' ? {
                modelType,
                region: modelRegion,
                skinTone,
                bodyType,
                composition: modelComposition,
                framing: modelFraming
            } : undefined;

            const assetUrl = await generateRealtyAd({
                mode,
                modelImage: modelChoice === 'upload' ? modelImage?.base64 : null, 
                modelGenerationParams,
                propertyImage: propertyChoice === 'upload' ? propertyImage?.base64 : null, 
                referenceImage: referenceImage.base64,
                logoImage: logoImage?.base64,
                texts
            });

            const finalImageUrl = `data:image/png;base64,${assetUrl}`;
            setResultImage(finalImageUrl);
            
            saveCreation(auth.user.uid, finalImageUrl, 'Magic Realty');
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Magic Realty');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);

            if (updatedUser.lifetimeGenerations) {
                const bonus = checkMilestone(updatedUser.lifetimeGenerations);
                if (bonus !== false) setMilestoneBonus(bonus);
            }

        } catch (e: any) {
            console.error(e);
            alert(`Generation failed: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleNewSession = () => {
        setModelImage(null);
        setPropertyImage(null);
        setReferenceImage(null);
        setLogoImage(null);
        setModelChoice(null);
        setPropertyChoice(null);
        setTexts({ headline: '', subHeadline: '', location: '', price: '', rera: '', contact: '' });
        
        // Reset Model Gen Params
        setModelType(''); setModelRegion(''); setSkinTone(''); setBodyType('');
        setModelComposition(''); setModelFraming('');
        
        setResultImage(null);
    };

    const handleEditorSave = (newUrl: string) => {
        setResultImage(newUrl);
        saveCreation(auth.user!.uid, newUrl, 'Magic Realty (Edited)');
    };

    const handleDeductEditCredit = async () => {
        if(auth.user) {
            const updatedUser = await deductCredits(auth.user.uid, 1, 'Magic Eraser');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        }
    };

    // Validation
    const isModelReady = 
        modelChoice === 'skip' || 
        (modelChoice === 'upload' && !!modelImage) || 
        (modelChoice === 'generate' && !!modelType && !!modelRegion && !!skinTone && !!bodyType && !!modelComposition && !!modelFraming);

    const canGenerate = 
        !!referenceImage && 
        !!texts.headline && 
        (propertyChoice === 'generate' || !!propertyImage) && 
        !!modelChoice &&
        isModelReady &&
        !isLowCredits;

    return (
        <>
            <FeatureLayout
                title="Magic Realty"
                description="Create stunning Real Estate ads with Lifestyle Fusion and Golden Hour enhancement."
                icon={<BuildingIcon className="w-6 h-6 text-indigo-600" />}
                creditCost={cost}
                isGenerating={loading}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                resultImage={resultImage}
                onResetResult={handleGenerate}
                onNewSession={handleNewSession}
                resultHeightClass="h-[900px]"
                hideGenerateButton={isLowCredits}
                generateButtonStyle={{
                    className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]",
                    hideIcon: true,
                    label: "Generate Ad"
                }}
                scrollRef={scrollRef}
                customActionButtons={
                    resultImage ? (
                        <button 
                            onClick={() => setShowMagicEditor(true)}
                            className="bg-[#4D7CFF] hover:bg-[#3b63cc] text-white px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 text-xs sm:text-sm font-bold flex items-center gap-2 transform hover:scale-105 whitespace-nowrap"
                        >
                            <MagicWandIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white"/> 
                            <span>Magic Editor</span>
                        </button>
                    ) : null
                }
                // Left Content
                leftContent={
                    <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                        {loading ? (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4">
                                    <div className="h-full bg-gradient-to-r from-indigo-400 to-blue-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                                </div>
                                <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">Constructing Ad...</p>
                            </div>
                        ) : (
                            <div className="text-center opacity-50 select-none">
                                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <BuildingIcon className="w-10 h-10 text-indigo-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-300">Realty Canvas</h3>
                                <p className="text-sm text-gray-300 mt-1">Your flyer will appear here.</p>
                            </div>
                        )}
                        <style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
                    </div>
                }
                // Right Content: The Wizard
                rightContent={
                    isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100">
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4 shadow-inner animate-bounce-slight">
                                <CreditCardIcon className="w-10 h-10 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                            <button onClick={() => (window as any).navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">
                                Recharge Now
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-8 p-1 animate-fadeIn">
                            
                            {/* Step 1: Model */}
                            <div>
                                <div className="flex items-center gap-2 mb-3 ml-1">
                                    <span className="bg-indigo-100 text-indigo-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lifestyle Model</label>
                                </div>
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    <StepCard 
                                        title="Upload" 
                                        description="Use own photo" 
                                        icon={<UserIcon className="w-4 h-4"/>} 
                                        selected={modelChoice === 'upload'}
                                        onClick={() => setModelChoice('upload')}
                                    />
                                    <StepCard 
                                        title="Generate" 
                                        description="Create with AI" 
                                        icon={<SparklesIcon className="w-4 h-4"/>} 
                                        selected={modelChoice === 'generate'}
                                        onClick={() => setModelChoice('generate')}
                                    />
                                    <StepCard 
                                        title="Skip" 
                                        description="Focus on house" 
                                        icon={<XIcon className="w-4 h-4"/>} 
                                        selected={modelChoice === 'skip'}
                                        onClick={() => { setModelChoice('skip'); setModelImage(null); }}
                                    />
                                </div>
                                
                                {modelChoice === 'upload' && (
                                    <div className="animate-fadeIn">
                                        <CompactUpload label="Model Photo" image={modelImage} onUpload={handleUpload(setModelImage)} onClear={() => setModelImage(null)} icon={<UploadTrayIcon className="w-6 h-6 text-blue-400"/>} />
                                    </div>
                                )}

                                {modelChoice === 'generate' && (
                                    <div className="animate-fadeIn space-y-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                                        <SelectionGrid label="Composition" options={compositionTypes} value={modelComposition} onChange={(val) => { setModelComposition(val); autoScroll(); }} />
                                        {modelComposition && <SelectionGrid label="Model Type" options={modelTypes} value={modelType} onChange={(val) => { setModelType(val); autoScroll(); }} />}
                                        {modelType && <SelectionGrid label="Region" options={modelRegions} value={modelRegion} onChange={(val) => { setModelRegion(val); autoScroll(); }} />}
                                        {modelRegion && <SelectionGrid label="Skin Tone" options={skinTones} value={skinTone} onChange={(val) => { setSkinTone(val); autoScroll(); }} />}
                                        {skinTone && <SelectionGrid label="Body Type" options={bodyTypes} value={bodyType} onChange={(val) => { setBodyType(val); autoScroll(); }} />}
                                        {bodyType && <SelectionGrid label="Shot Type" options={shotTypes} value={modelFraming} onChange={(val) => { setModelFraming(val); autoScroll(); }} />}
                                    </div>
                                )}
                            </div>

                            {/* Step 2: Property */}
                            <div className="border-t border-gray-100 pt-6">
                                <div className="flex items-center gap-2 mb-3 ml-1">
                                    <span className="bg-indigo-100 text-indigo-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Property Asset</label>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <StepCard 
                                        title="Upload Site Photo" 
                                        description="Enhance existing photo." 
                                        icon={<UploadTrayIcon className="w-5 h-5"/>} 
                                        selected={propertyChoice === 'upload'}
                                        onClick={() => setPropertyChoice('upload')}
                                    />
                                    <StepCard 
                                        title="Generate New" 
                                        description="Create from Reference vibe." 
                                        icon={<SparklesIcon className="w-5 h-5"/>} 
                                        selected={propertyChoice === 'generate'}
                                        onClick={() => { setPropertyChoice('generate'); setPropertyImage(null); }}
                                    />
                                </div>
                                {propertyChoice === 'upload' && (
                                    <div className="animate-fadeIn">
                                        <CompactUpload label="Site/Interior Photo" image={propertyImage} onUpload={handleUpload(setPropertyImage)} onClear={() => setPropertyImage(null)} icon={<BuildingIcon className="w-6 h-6 text-indigo-400"/>} />
                                    </div>
                                )}
                            </div>

                            {/* Step 3: Reference */}
                            <div className="border-t border-gray-100 pt-6">
                                <div className="flex items-center gap-2 mb-3 ml-1">
                                    <span className="bg-indigo-100 text-indigo-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reference Style</label>
                                </div>
                                <CompactUpload label="Reference Image (Required)" image={referenceImage} onUpload={handleUpload(setReferenceImage)} onClear={() => setReferenceImage(null)} icon={<LightbulbIcon className="w-6 h-6 text-yellow-500"/>} heightClass="h-40" />
                            </div>

                            {/* Step 4: Details */}
                            <div className="border-t border-gray-100 pt-6">
                                <div className="flex items-center gap-2 mb-3 ml-1">
                                    <span className="bg-indigo-100 text-indigo-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">4</span>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ad Details</label>
                                </div>
                                
                                <div className="mb-4">
                                    <CompactUpload label="Brand Logo" image={logoImage} onUpload={handleUpload(setLogoImage)} onClear={() => setLogoImage(null)} icon={<SparklesIcon className="w-6 h-6 text-purple-400"/>} optional={true} heightClass="h-24" />
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <InputField label="Headline / Project Name" placeholder="e.g. Luxury 3BHK Homes" value={texts.headline} onChange={(e: any) => setTexts({...texts, headline: e.target.value})} />
                                    <div className="grid grid-cols-2 gap-3">
                                        <InputField label="Sub-Headline" placeholder="e.g. Move-in Ready" value={texts.subHeadline} onChange={(e: any) => setTexts({...texts, subHeadline: e.target.value})} />
                                        <InputField label="Location" placeholder="e.g. Downtown, Mumbai" value={texts.location} onChange={(e: any) => setTexts({...texts, location: e.target.value})} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <InputField label="Price (Opt)" placeholder="e.g. Starts ₹1.5 Cr" value={texts.price} onChange={(e: any) => setTexts({...texts, price: e.target.value})} />
                                        <InputField label="RERA (Opt)" placeholder="e.g. P518000..." value={texts.rera} onChange={(e: any) => setTexts({...texts, rera: e.target.value})} />
                                    </div>
                                    <InputField label="Contact / Website (Opt)" placeholder="e.g. Call 9899... or www.site.com" value={texts.contact} onChange={(e: any) => setTexts({...texts, contact: e.target.value})} />
                                </div>
                            </div>

                        </div>
                    )
                }
            />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClose={() => setMilestoneBonus(undefined)} />}
            {showMagicEditor && resultImage && (
                <MagicEditorModal 
                    imageUrl={resultImage} 
                    onClose={() => setShowMagicEditor(false)} 
                    onSave={handleEditorSave}
                    deductCredit={handleDeductEditCredit}
                />
            )}
        </>
    );
};
