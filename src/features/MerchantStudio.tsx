
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig } from '../types';
import { FeatureLayout, SelectionGrid, MilestoneSuccessModal, checkMilestone, InputField } from '../components/FeatureLayout';
import { 
    ApparelIcon, 
    CubeIcon, 
    UploadTrayIcon, 
    SparklesIcon, 
    CreditCardIcon, 
    UserIcon, 
    XIcon, 
    DownloadIcon,
    ArrowUpCircleIcon,
    CheckIcon
} from '../components/icons';
import { fileToBase64, Base64File, downloadImage } from '../utils/imageUtils';
import { generateMerchantBatch } from '../services/merchantService';
import { saveCreation, deductCredits } from '../firebase';

// Helper Card for Mode Selection
const ModeCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    selected: boolean;
    onClick: () => void;
    color: string;
}> = ({ title, description, icon, selected, onClick, color }) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all w-full group relative overflow-hidden text-center h-32 ${
            selected 
            ? `border-${color}-500 bg-${color}-50 shadow-md` 
            : `border-gray-100 bg-white hover:border-${color}-200 hover:bg-gray-50`
        }`}
    >
        <div className={`mb-2 transition-transform group-hover:scale-110 ${selected ? `text-${color}-600` : `text-gray-400`}`}>
            {icon}
        </div>
        <h3 className={`font-bold text-sm mb-0.5 ${selected ? `text-${color}-900` : 'text-gray-700'}`}>{title}</h3>
        <p className={`text-[10px] ${selected ? `text-${color}-700` : 'text-gray-400'}`}>{description}</p>
        
        {/* Checkmark for selected */}
        {selected && (
            <div className={`absolute top-2 right-2 bg-${color}-500 text-white p-0.5 rounded-full`}>
                <CheckIcon className="w-3 h-3" />
            </div>
        )}
    </button>
);

const CompactUpload: React.FC<{
    label: string;
    subLabel?: string;
    image: { url: string } | null; 
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    onClear: () => void;
    icon: React.ReactNode;
    heightClass?: string;
}> = ({ label, subLabel, image, onUpload, onClear, icon, heightClass = "h-32" }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="relative w-full group h-full">
            <div className="mb-2 ml-1 flex justify-between items-end">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
                {subLabel && <span className="text-[10px] text-gray-400">{subLabel}</span>}
            </div>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-white rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm group-hover:border-blue-300 transition-colors`}>
                    <img src={image.url} className="max-w-full max-h-full object-contain p-2" alt={label} />
                    <button
                        onClick={(e) => { e.stopPropagation(); onClear(); }}
                        className="absolute top-2 right-2 bg-white p-1.5 rounded-full shadow-sm hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors z-10 border border-gray-100"
                    >
                        <XIcon className="w-3 h-3"/>
                    </button>
                </div>
            ) : (
                <div
                    onClick={() => inputRef.current?.click()}
                    className={`w-full ${heightClass} border-2 border-dashed border-gray-200 hover:border-blue-400 bg-gray-50 hover:bg-blue-50/10 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm`}
                >
                    <div className="p-2 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                        {icon}
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 group-hover:text-blue-500 uppercase tracking-wide text-center px-2">Click to Upload</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
    );
};

export const MerchantStudio: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    // Mode
    const [mode, setMode] = useState<'apparel' | 'product' | null>(null);

    // Assets
    const [mainImage, setMainImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [backImage, setBackImage] = useState<{ url: string; base64: Base64File } | null>(null); // Apparel only
    const [modelImage, setModelImage] = useState<{ url: string; base64: Base64File } | null>(null); // Apparel (User Model)

    // Config - Apparel
    const [modelSource, setModelSource] = useState<'ai' | 'upload'>('ai');
    const [aiGender, setAiGender] = useState('Female');
    const [aiEthnicity, setAiEthnicity] = useState('International');
    
    // Config - Product
    const [productType, setProductType] = useState('');
    const [productVibe, setProductVibe] = useState('Clean Studio');

    // Results
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<string[]>([]); // Array of 5 data URLs
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);

    // Cost: 15 Credits for 5 Images
    const cost = 15;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setter({ url: URL.createObjectURL(file), base64 });
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!mainImage || !mode || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }

        setLoading(true);
        setResults([]); 

        try {
            // Deduct Credits First
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Merchant Studio');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);

            const outputImages = await generateMerchantBatch({
                type: mode,
                mainImage: mainImage.base64,
                backImage: backImage?.base64,
                modelImage: modelSource === 'upload' ? modelImage?.base64 : undefined,
                modelParams: modelSource === 'ai' ? {
                    gender: aiGender,
                    ethnicity: aiEthnicity,
                    age: 'Young Adult'
                } : undefined,
                productType: productType,
                productVibe: productVibe
            });

            // Process results (Add Base64 prefix)
            const processedResults = outputImages.map(img => `data:image/png;base64,${img}`);
            setResults(processedResults);

            // Save to history (Batch save or individually? Let's save individually)
            for (let i = 0; i < processedResults.length; i++) {
                const typeName = mode === 'apparel' 
                    ? ['Long Shot', 'Stylized', 'Side', 'Back', 'Texture'][i]
                    : ['Hero 45', 'Hero Front', 'Lifestyle', 'Creative', 'Macro'][i];
                saveCreation(auth.user.uid, processedResults[i], `Merchant: ${typeName}`);
            }

            if (updatedUser.lifetimeGenerations) {
                const bonus = checkMilestone(updatedUser.lifetimeGenerations);
                if (bonus !== false) setMilestoneBonus(bonus);
            }

        } catch (e) {
            console.error(e);
            alert("Generation process had issues. Some images might not have generated.");
        } finally {
            setLoading(false);
        }
    };

    const handleNewSession = () => {
        setMainImage(null);
        setBackImage(null);
        setModelImage(null);
        setResults([]);
        setMode(null);
    };

    const handleDownloadAll = async () => {
        if (results.length === 0) return;
        for (let i = 0; i < results.length; i++) {
            downloadImage(results[i], `merchant-asset-${i+1}.png`);
            await new Promise(r => setTimeout(r, 500)); // Stagger downloads
        }
    };

    const getLabel = (index: number, currentMode: 'apparel' | 'product') => {
        if (currentMode === 'apparel') {
            return ['Full Body', 'Lifestyle', 'Side Profile', 'Back View', 'Fabric Detail'][index];
        }
        return ['Hero Shot (45°)', 'Hero Shot (Front)', 'Lifestyle Context', 'Creative Ad', 'Macro Detail'][index];
    };

    const canGenerate = !!mainImage && !isLowCredits;

    return (
        <>
            <FeatureLayout
                title="Merchant Studio"
                description="The ultimate e-commerce engine. Generate 5 listing-ready assets in one click."
                icon={<UploadTrayIcon className="w-6 h-6 text-indigo-500" />}
                creditCost={cost}
                isGenerating={loading}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                resultImage={null}
                onNewSession={handleNewSession}
                hideGenerateButton={isLowCredits}
                resultHeightClass="h-[850px]"
                generateButtonStyle={{
                    className: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 border-none hover:scale-[1.02]",
                    hideIcon: true,
                    label: `Generate 5 Images (${cost} Credits)`
                }}
                scrollRef={scrollRef}
                
                // LEFT CONTENT: Canvas / Results
                leftContent={
                    <div className="h-full w-full flex flex-col bg-gray-50/50 rounded-3xl overflow-hidden border border-gray-100">
                        {/* Header Toolbar */}
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-white">
                            <div className="flex items-center gap-2">
                                <CubeIcon className="w-5 h-5 text-gray-400"/>
                                <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Asset Gallery</h3>
                            </div>
                            {(results.length > 0) && (
                                <button 
                                    onClick={handleDownloadAll} 
                                    className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
                                >
                                    <DownloadIcon className="w-3.5 h-3.5"/> Download All
                                </button>
                            )}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                            {loading ? (
                                // Skeleton Loader
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                                    <div className="lg:col-span-2 lg:row-span-2 bg-white rounded-2xl border border-gray-100 p-8 flex flex-col items-center justify-center animate-pulse">
                                         <div className="w-16 h-16 bg-gray-100 rounded-full mb-4"></div>
                                         <div className="h-4 w-32 bg-gray-100 rounded mb-2"></div>
                                         <p className="text-xs text-gray-400 font-medium">Generating Hero Shot...</p>
                                    </div>
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="bg-white rounded-xl border border-gray-100 h-40 animate-pulse"></div>
                                    ))}
                                </div>
                            ) : results.length > 0 && mode ? (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                                    
                                    {/* Main Hero Image (Takes up 2/3 width) */}
                                    <div className="lg:col-span-2 lg:row-span-2 relative group rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-white min-h-[400px]">
                                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full z-10 border border-white/10 uppercase tracking-wider">
                                            {getLabel(0, mode)}
                                        </div>
                                        <img src={results[0]} className="w-full h-full object-contain p-4" alt="Hero" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                             <button onClick={() => downloadImage(results[0], 'merchant-hero.png')} className="bg-white text-gray-900 px-5 py-2.5 rounded-full font-bold text-xs shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all pointer-events-auto hover:scale-105 flex items-center gap-2">
                                                <DownloadIcon className="w-4 h-4"/> Download
                                             </button>
                                        </div>
                                    </div>

                                    {/* Grid for the rest */}
                                    <div className="flex flex-col gap-4 h-full">
                                        {results.slice(1).map((res, idx) => (
                                            <div key={idx} className="relative flex-1 group rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-white min-h-[140px]">
                                                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-gray-600 text-[9px] font-bold px-2 py-1 rounded-md z-10 border border-gray-100">
                                                    {getLabel(idx + 1, mode)}
                                                </div>
                                                <img src={res} className="w-full h-full object-cover" alt={`Variant ${idx+1}`} />
                                                <button 
                                                    onClick={() => downloadImage(res, `merchant-variant-${idx+1}.png`)}
                                                    className="absolute bottom-2 right-2 bg-white p-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all hover:text-blue-600 hover:scale-110"
                                                    title="Download"
                                                >
                                                    <DownloadIcon className="w-3.5 h-3.5"/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                // Empty State
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
                                    <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CubeIcon className="w-10 h-10 text-indigo-300" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-400">Ready to Create</h3>
                                    <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto leading-relaxed">
                                        Select a mode on the right and upload your product to generate a full listing pack.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                }
                
                // RIGHT CONTENT: Control Deck
                rightContent={
                    isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100">
                            <CreditCardIcon className="w-16 h-16 text-red-400 mb-4" />
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                            <p className="text-gray-500 mb-6 max-w-xs text-sm">
                                The Full Pack generation requires 15 credits.
                            </p>
                            <button onClick={() => (window as any).navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] shadow-lg">Recharge</button>
                        </div>
                    ) : (
                        <div className="space-y-8 p-1 animate-fadeIn">
                            
                            {/* 1. Mode Selection */}
                            {!mode && (
                                <div className="grid grid-cols-2 gap-4">
                                    <ModeCard 
                                        title="Apparel" 
                                        description="Virtual Model Shoot" 
                                        icon={<ApparelIcon className="w-8 h-8"/>}
                                        selected={mode === 'apparel'}
                                        onClick={() => setMode('apparel')}
                                        color="blue"
                                    />
                                    <ModeCard 
                                        title="Product" 
                                        description="E-com Pack" 
                                        icon={<CubeIcon className="w-8 h-8"/>}
                                        selected={mode === 'product'}
                                        onClick={() => setMode('product')}
                                        color="purple"
                                    />
                                </div>
                            )}

                            {mode && (
                                <div className="animate-fadeIn space-y-6">
                                    <div className="flex items-center justify-between">
                                        <button onClick={() => setMode(null)} className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1">
                                            ← BACK TO MODE
                                        </button>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${mode === 'apparel' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                                            {mode} Mode
                                        </span>
                                    </div>

                                    {/* MAIN UPLOAD */}
                                    <CompactUpload
                                        label={mode === 'apparel' ? "Cloth Photo (Flat Lay)" : "Product Photo"}
                                        image={mainImage}
                                        onUpload={handleUpload(setMainImage)}
                                        onClear={() => setMainImage(null)}
                                        icon={<UploadTrayIcon className="w-6 h-6 text-indigo-500"/>}
                                    />

                                    {/* APPAREL SPECIFIC FLOW */}
                                    {mode === 'apparel' && (
                                        <>
                                            {/* Back View Option */}
                                            <CompactUpload
                                                label="Back View"
                                                subLabel="Optional"
                                                image={backImage}
                                                onUpload={handleUpload(setBackImage)}
                                                onClear={() => setBackImage(null)}
                                                icon={<UploadTrayIcon className="w-5 h-5 text-gray-400"/>}
                                                heightClass="h-24"
                                            />

                                            {/* Model Selection */}
                                            <div className="border-t border-gray-100 pt-6">
                                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Model Selection</label>
                                                <div className="flex bg-gray-50 p-1 rounded-xl mb-4 border border-gray-200">
                                                    <button onClick={() => setModelSource('ai')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${modelSource === 'ai' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>AI Model</button>
                                                    <button onClick={() => setModelSource('upload')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${modelSource === 'upload' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>My Model</button>
                                                </div>

                                                {modelSource === 'ai' ? (
                                                    <div className="space-y-4">
                                                        <SelectionGrid label="Gender" options={['Female', 'Male']} value={aiGender} onChange={setAiGender} />
                                                        <SelectionGrid label="Ethnicity" options={['International', 'Indian', 'Asian', 'African']} value={aiEthnicity} onChange={setAiEthnicity} />
                                                    </div>
                                                ) : (
                                                    <CompactUpload
                                                        label="Your Model"
                                                        image={modelImage}
                                                        onUpload={handleUpload(setModelImage)}
                                                        onClear={() => setModelImage(null)}
                                                        icon={<UserIcon className="w-6 h-6 text-blue-400"/>}
                                                    />
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {/* PRODUCT SPECIFIC FLOW */}
                                    {mode === 'product' && (
                                        <div className="border-t border-gray-100 pt-6 space-y-4">
                                            <InputField label="Product Type" placeholder="e.g. Headphones, Serum Bottle" value={productType} onChange={(e: any) => setProductType(e.target.value)} />
                                            <SelectionGrid label="Visual Vibe" options={['Clean Studio', 'Luxury', 'Organic/Nature', 'Tech/Neon', 'Lifestyle']} value={productVibe} onChange={setProductVibe} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                }
            />
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload(setMainImage)} />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClose={() => setMilestoneBonus(undefined)} />}
        </>
    );
};
