
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig } from '../types';
import { FeatureLayout, SelectionGrid, MilestoneSuccessModal, checkMilestone, InputField, ImageModal } from '../components/FeatureLayout';
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
    CheckIcon,
    MagicWandIcon,
    TicketIcon,
    StarIcon,
    PixaEcommerceIcon
} from '../components/icons';
import { fileToBase64, Base64File, downloadImage, base64ToBlobUrl } from '../utils/imageUtils';
import { generateMerchantBatch } from '../services/merchantService';
import { saveCreation, deductCredits, logApiError } from '../firebase';

// Helper Card for Mode Selection
// Fixed: Using static classes instead of dynamic string construction to fix Tailwind JIT bug
const ModeCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    selected: boolean;
    onClick: () => void;
    color: 'blue' | 'purple';
}> = ({ title, description, icon, selected, onClick, color }) => {
    
    // Static mapping for colors
    const colorStyles = {
        blue: {
            selected: 'border-blue-500 bg-blue-50 shadow-md',
            hover: 'hover:border-blue-200 hover:bg-gray-50',
            iconSelected: 'text-blue-600',
            textSelected: 'text-blue-900',
            descSelected: 'text-blue-700',
            badge: 'bg-blue-500'
        },
        purple: {
            selected: 'border-purple-500 bg-purple-50 shadow-md',
            hover: 'hover:border-purple-200 hover:bg-gray-50',
            iconSelected: 'text-purple-600',
            textSelected: 'text-purple-900',
            descSelected: 'text-purple-700',
            badge: 'bg-purple-500'
        }
    };

    const currentStyle = colorStyles[color];

    return (
        <button 
            onClick={onClick}
            className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all w-full group relative overflow-hidden text-center h-32 ${
                selected 
                ? currentStyle.selected
                : `border-gray-100 bg-white ${currentStyle.hover}`
            }`}
        >
            <div className={`mb-2 transition-transform group-hover:scale-110 ${selected ? currentStyle.iconSelected : `text-gray-400`}`}>
                {icon}
            </div>
            <h3 className={`font-bold text-sm mb-0.5 ${selected ? currentStyle.textSelected : 'text-gray-700'}`}>{title}</h3>
            <p className={`text-[10px] ${selected ? currentStyle.descSelected : 'text-gray-400'}`}>{description}</p>
            
            {/* Checkmark for selected */}
            {selected && (
                <div className={`absolute top-2 right-2 text-white p-0.5 rounded-full ${currentStyle.badge}`}>
                    <CheckIcon className="w-3 h-3" />
                </div>
            )}
        </button>
    );
};

// New Pack Selection Card
const PackCard: React.FC<{
    size: 5 | 7 | 10;
    label: string;
    subLabel: string;
    cost: number;
    selected: boolean;
    onClick: () => void;
    isPopular?: boolean;
}> = ({ size, label, subLabel, cost, selected, onClick, isPopular }) => (
    <button
        onClick={onClick}
        className={`relative flex flex-col items-start p-3 rounded-xl border-2 transition-all w-full text-left h-full ${
            selected
                ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
        }`}
    >
        {isPopular && (
            <div className="absolute -top-2.5 right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                <StarIcon className="w-2.5 h-2.5 fill-current"/> POPULAR
            </div>
        )}
        
        <div className="flex justify-between items-start w-full mb-1">
            <span className={`text-xs font-bold uppercase tracking-wider ${selected ? 'text-indigo-700' : 'text-gray-500'}`}>
                {label}
            </span>
            <div className={`flex items-center gap-1 text-xs font-bold ${selected ? 'text-indigo-900' : 'text-gray-700'}`}>
                <TicketIcon className="w-3 h-3 opacity-50"/> {cost}
            </div>
        </div>
        
        <div className="mt-auto">
            <span className="text-2xl font-black text-gray-800">{size}</span>
            <span className="text-[10px] text-gray-400 font-bold ml-1">ASSETS</span>
        </div>
        
        <p className="text-[9px] text-gray-400 mt-1 leading-tight">{subLabel}</p>
        
        {selected && (
            <div className="absolute bottom-2 right-2 text-indigo-500">
                <CheckIcon className="w-4 h-4"/>
            </div>
        )}
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

export const MerchantStudio: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    // Mode
    const [mode, setMode] = useState<'product' | 'apparel'>('product');
    const [packSize, setPackSize] = useState<5 | 7 | 10>(5);

    // Assets
    const [mainImage, setMainImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [backImage, setBackImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [modelImage, setModelImage] = useState<{ url: string; base64: Base64File } | null>(null);

    // Product Params
    const [productType, setProductType] = useState('');
    const [productVibe, setProductVibe] = useState('');

    // Model Params (if AI generated model is needed)
    const [useCustomModel, setUseCustomModel] = useState(false);
    const [modelParams, setModelParams] = useState({
        ethnicity: 'European',
        age: 'Adult',
        gender: 'Female',
        skinTone: 'Fair',
        bodyType: 'Slim'
    });

    // Output
    const [results, setResults] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);

    // Refs
    const scrollRef = useRef<HTMLDivElement>(null);

    // Costs
    const costs = { 5: 10, 7: 15, 10: 20 };
    const currentCost = costs[packSize];
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < currentCost;

    // Helper
    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setter({ url: URL.createObjectURL(file), base64 });
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!mainImage || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }

        setLoading(true);
        setResults([]);
        setLoadingProgress(5); // Start

        try {
            // Initiate Generation
            const batch = await generateMerchantBatch({
                type: mode,
                mainImage: mainImage.base64,
                backImage: backImage?.base64,
                modelImage: (mode === 'apparel' && useCustomModel) ? modelImage?.base64 : undefined,
                modelParams: (mode === 'apparel' && !useCustomModel) ? modelParams : undefined,
                productType,
                productVibe,
                packSize
            });

            // Process results
            const processedResults: string[] = [];
            for (let i = 0; i < batch.length; i++) {
                const blobUrl = await base64ToBlobUrl(batch[i], 'image/jpeg');
                processedResults.push(blobUrl);
                // Save individually to history
                const dataUri = `data:image/jpeg;base64,${batch[i]}`;
                await saveCreation(auth.user.uid, dataUri, `Ecommerce Kit (${mode})`);
                
                // Update progress visual
                setLoadingProgress(Math.round(((i + 1) / batch.length) * 90));
            }

            setResults(processedResults);
            setLoadingProgress(100);

            // Deduct Credits
            const updatedUser = await deductCredits(auth.user.uid, currentCost, `Ecommerce Kit (${packSize}x)`);
            
            if (updatedUser.lifetimeGenerations) {
                const bonus = checkMilestone(updatedUser.lifetimeGenerations);
                if (bonus !== false) setMilestoneBonus(bonus);
            }
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);

        } catch (e: any) {
            console.error(e);
            alert(`Generation failed: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleNewSession = () => {
        setMainImage(null);
        setBackImage(null);
        setModelImage(null);
        setResults([]);
        setLoadingProgress(0);
    };

    const canGenerate = !!mainImage && !isLowCredits;

    // Grid Options
    const vibeOptions = ['Minimalist', 'Luxury', 'Industrial', 'Nature', 'Cyberpunk', 'Pastel Pop'];
    
    return (
        <>
            <FeatureLayout
                title="Pixa Ecommerce Kit"
                description="Generate a full product photography suite (Hero, Lifestyle, Detail) in one click."
                icon={<PixaEcommerceIcon className="w-14 h-14"/>}
                rawIcon={true}
                creditCost={currentCost}
                isGenerating={loading}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                resultImage={null} // Custom Result Area Used
                onNewSession={handleNewSession}
                resultHeightClass="h-[850px]"
                hideGenerateButton={isLowCredits}
                generateButtonStyle={{
                    className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]",
                    hideIcon: true,
                    label: `Generate ${packSize} Asset Kit`
                }}
                scrollRef={scrollRef}
                
                // LEFT CONTENT: Preview & Results Grid
                leftContent={
                    <div className="w-full h-full flex flex-col gap-4">
                        {loading ? (
                            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                                <div className="w-full max-w-md text-center">
                                    <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                                        <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
                                        <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
                                        <SparklesIcon className="w-10 h-10 text-indigo-600 animate-pulse"/>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">Generating Asset Kit...</h3>
                                    <p className="text-gray-500 text-sm mb-6">Pixa is creating {packSize} unique variations.</p>
                                    
                                    {/* Progress Bar */}
                                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-indigo-600 transition-all duration-500 ease-out rounded-full" 
                                            style={{ width: `${loadingProgress}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-xs font-bold text-indigo-600 mt-2 text-right">{loadingProgress}% Complete</p>
                                </div>
                            </div>
                        ) : results.length > 0 ? (
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {results.map((url, i) => (
                                        <div key={i} className="aspect-square bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 group relative">
                                            <img src={url} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <button onClick={() => setZoomedImage(url)} className="p-2 bg-white rounded-full text-gray-800 hover:text-blue-600"><ArrowUpCircleIcon className="w-5 h-5"/></button>
                                                <button onClick={() => downloadImage(url, `pixa-kit-${i}.jpg`)} className="p-2 bg-white rounded-full text-gray-800 hover:text-green-600"><DownloadIcon className="w-5 h-5"/></button>
                                            </div>
                                            <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded">
                                                #{i+1}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => results.forEach((u, i) => downloadImage(u, `pixa-kit-${i}.jpg`))} className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg">
                                    Download All {results.length} Assets
                                </button>
                            </div>
                        ) : (
                            <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm select-none opacity-60">
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <PixaEcommerceIcon className="w-10 h-10 text-indigo-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-400">Kit Preview</h3>
                                    <p className="text-sm text-gray-300 mt-1">Generated assets will appear here.</p>
                                </div>
                            </div>
                        )}
                    </div>
                }
                
                // RIGHT CONTENT: Controls
                rightContent={
                    isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100">
                            <CreditCardIcon className="w-16 h-16 text-red-400 mb-4" />
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                            <button onClick={() => (window as any).navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge Now</button>
                        </div>
                    ) : (
                        <div className="space-y-8 p-1 animate-fadeIn">
                            
                            {/* 1. Mode Selection */}
                            <div>
                                <div className="flex items-center justify-between mb-3 ml-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">1. Select Kit Type</label>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <ModeCard 
                                        title="Physical Product" 
                                        description="Tech, Beauty, Decor" 
                                        icon={<CubeIcon className="w-6 h-6"/>} 
                                        selected={mode === 'product'} 
                                        onClick={() => setMode('product')}
                                        color="blue"
                                    />
                                    <ModeCard 
                                        title="Apparel / Fashion" 
                                        description="Clothing on Models" 
                                        icon={<ApparelIcon className="w-6 h-6"/>} 
                                        selected={mode === 'apparel'} 
                                        onClick={() => setMode('apparel')}
                                        color="purple"
                                    />
                                </div>
                            </div>

                            {/* 2. Uploads */}
                            <div>
                                <div className="flex items-center justify-between mb-3 ml-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">2. Upload Assets</label>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <CompactUpload
                                        label="Main Product (Front)"
                                        image={mainImage}
                                        onUpload={handleUpload(setMainImage)}
                                        onClear={() => setMainImage(null)}
                                        icon={<UploadTrayIcon className="w-6 h-6 text-indigo-400" />}
                                    />
                                    <CompactUpload
                                        label="Back View (Optional)"
                                        image={backImage}
                                        onUpload={handleUpload(setBackImage)}
                                        onClear={() => setBackImage(null)}
                                        icon={<CubeIcon className="w-6 h-6 text-gray-400" />}
                                        optional={true}
                                    />
                                </div>
                                
                                {mode === 'apparel' && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Model Strategy</label>
                                            <button onClick={() => setUseCustomModel(!useCustomModel)} className="text-[10px] text-blue-600 font-bold hover:underline">
                                                {useCustomModel ? "Switch to AI Model" : "Upload Own Model"}
                                            </button>
                                        </div>
                                        
                                        {useCustomModel ? (
                                            <CompactUpload
                                                label="Custom Model Reference"
                                                image={modelImage}
                                                onUpload={handleUpload(setModelImage)}
                                                onClear={() => setModelImage(null)}
                                                icon={<UserIcon className="w-6 h-6 text-purple-400" />}
                                                heightClass="h-40"
                                            />
                                        ) : (
                                            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 space-y-3">
                                                <div className="flex gap-2">
                                                    <select 
                                                        value={modelParams.gender}
                                                        onChange={(e) => setModelParams({...modelParams, gender: e.target.value})}
                                                        className="flex-1 p-2 rounded-lg text-xs border border-purple-200 focus:outline-none"
                                                    >
                                                        <option>Female</option>
                                                        <option>Male</option>
                                                        <option>Non-binary</option>
                                                    </select>
                                                    <select 
                                                        value={modelParams.ethnicity}
                                                        onChange={(e) => setModelParams({...modelParams, ethnicity: e.target.value})}
                                                        className="flex-1 p-2 rounded-lg text-xs border border-purple-200 focus:outline-none"
                                                    >
                                                        <option>European</option>
                                                        <option>Asian</option>
                                                        <option>African</option>
                                                        <option>Latino</option>
                                                        <option>Indian</option>
                                                        <option>Middle Eastern</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 3. Product Details (If Product Mode) */}
                            {mode === 'product' && (
                                <div>
                                    <div className="flex items-center justify-between mb-3 ml-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">3. Product Details</label>
                                    </div>
                                    <div className="space-y-4">
                                        <InputField placeholder="What is it? (e.g. Wireless Mouse)" value={productType} onChange={(e: any) => setProductType(e.target.value)} />
                                        <SelectionGrid label="Visual Vibe" options={vibeOptions} value={productVibe} onChange={setProductVibe} />
                                    </div>
                                </div>
                            )}

                            {/* 4. Pack Size */}
                            <div>
                                <div className="flex items-center justify-between mb-3 ml-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">4. Select Kit Size</label>
                                </div>
                                <div className="grid grid-cols-3 gap-3 h-32">
                                    <PackCard size={5} label="Starter" subLabel="Essentials" cost={10} selected={packSize === 5} onClick={() => setPackSize(5)} />
                                    <PackCard size={7} label="Pro" subLabel="Full Suite" cost={15} selected={packSize === 7} onClick={() => setPackSize(7)} isPopular />
                                    <PackCard size={10} label="Agency" subLabel="Max Variety" cost={20} selected={packSize === 10} onClick={() => setPackSize(10)} />
                                </div>
                            </div>

                        </div>
                    )
                }
            />
            {zoomedImage && <ImageModal imageUrl={zoomedImage} onClose={() => setZoomedImage(null)} onDownload={() => downloadImage(zoomedImage, 'pixa-kit.jpg')} />}
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClose={() => setMilestoneBonus(undefined)} />}
        </>
    );
};
