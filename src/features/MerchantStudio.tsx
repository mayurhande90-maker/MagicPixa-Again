
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, SelectionGrid, MilestoneSuccessModal, checkMilestone, ImageModal } from '../components/FeatureLayout';
import { 
    ApparelIcon, CubeIcon, UploadTrayIcon, SparklesIcon, CreditCoinIcon, UserIcon, XIcon, DownloadIcon, CheckIcon, StarIcon, PixaEcommerceIcon
} from '../components/icons';
import { fileToBase64, Base64File, downloadImage, base64ToBlobUrl } from '../utils/imageUtils';
import { generateMerchantBatch } from '../services/merchantService';
import { saveCreation, deductCredits, logApiError } from '../firebase';
import { MerchantStyles } from '../styles/features/MerchantStudio.styles';

const ModeCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    selected: boolean;
    onClick: () => void;
    color: 'blue' | 'purple';
}> = ({ title, description, icon, selected, onClick, color }) => {
    const isBlue = color === 'blue';
    const selectedClass = isBlue ? MerchantStyles.modeCardBlueSelected : MerchantStyles.modeCardPurpleSelected;
    
    return (
        <button onClick={onClick} className={`${MerchantStyles.modeCard} ${selected ? selectedClass : MerchantStyles.modeCardInactive}`}>
            <div className={`${MerchantStyles.modeIcon} ${selected ? (isBlue ? 'text-blue-600' : 'text-purple-600') : 'text-gray-400'}`}>{icon}</div>
            <h3 className={`font-bold text-sm mb-0.5 ${selected ? (isBlue ? 'text-blue-900' : 'text-purple-900') : 'text-gray-700'}`}>{title}</h3>
            <p className={`text-[10px] ${selected ? (isBlue ? 'text-blue-700' : 'text-purple-700') : 'text-gray-400'}`}>{description}</p>
            {selected && <div className={`absolute top-2 right-2 text-white p-0.5 rounded-full ${isBlue ? 'bg-blue-500' : 'bg-purple-500'}`}><CheckIcon className="w-3 h-3" /></div>}
        </button>
    );
};

const PackCard: React.FC<{ size: 5 | 7 | 10; label: string; subLabel: string; cost: number; selected: boolean; onClick: () => void; isPopular?: boolean; }> = ({ size, label, subLabel, cost, selected, onClick, isPopular }) => (
    <button onClick={onClick} className={`${MerchantStyles.packCard} ${selected ? MerchantStyles.packCardSelected : MerchantStyles.packCardInactive}`}>
        {isPopular && <div className={MerchantStyles.packPopularBadge}><StarIcon className="w-2.5 h-2.5 fill-current"/> POPULAR</div>}
        <div className="flex justify-between items-start w-full mb-1">
            <span className={`text-xs font-bold uppercase tracking-wider ${selected ? 'text-indigo-700' : 'text-gray-500'}`}>{label}</span>
            <div className={`${MerchantStyles.packPrice} ${selected ? 'text-indigo-900' : 'text-gray-700'}`}><CreditCoinIcon className="w-3 h-3 opacity-50"/> {cost}</div>
        </div>
        <div className="mt-auto"><span className="text-2xl font-black text-gray-800">{size}</span><span className="text-[10px] text-gray-400 font-bold ml-1">ASSETS</span></div>
        <p className="text-[9px] text-gray-400 mt-1 leading-tight">{subLabel}</p>
        {selected && <div className="absolute bottom-2 right-2 text-indigo-500"><CheckIcon className="w-4 h-4"/></div>}
    </button>
);

const CompactUpload: React.FC<{ label: string; subLabel?: string; image: { url: string } | null; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; onClear: () => void; icon: React.ReactNode; heightClass?: string; }> = ({ label, subLabel, image, onUpload, onClear, icon, heightClass = "h-32" }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="relative w-full group h-full">
            <div className="mb-2 ml-1 flex justify-between items-end"><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>{subLabel && <span className="text-[10px] text-gray-400">{subLabel}</span>}</div>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-white rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm group-hover:border-blue-300 transition-colors`}>
                    <img src={image.url} className="max-w-full max-h-full object-contain p-2" alt={label} />
                    <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-2 right-2 bg-white p-1.5 rounded-full shadow-sm hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors z-10 border border-gray-100"><XIcon className="w-3 h-3"/></button>
                </div>
            ) : (
                <div onClick={() => inputRef.current?.click()} className={`w-full ${heightClass} border-2 border-dashed border-gray-200 hover:border-blue-400 bg-gray-50 hover:bg-blue-50/10 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm`}>
                    <div className="p-2 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">{icon}</div>
                    <p className="text-[10px] font-bold text-gray-400 group-hover:text-blue-500 uppercase tracking-wide text-center px-2">Click to Upload</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
    );
};

export const MerchantStudio: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [mode, setMode] = useState<'apparel' | 'product' | null>(null);
    const [mainImage, setMainImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [backImage, setBackImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [modelImage, setModelImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [modelSource, setModelSource] = useState<'ai' | 'upload'>('ai');
    const [aiGender, setAiGender] = useState('Female');
    const [aiEthnicity, setAiEthnicity] = useState('International');
    const [aiSkinTone, setAiSkinTone] = useState('Fair Tone');
    const [aiBodyType, setAiBodyType] = useState('Slim Build');
    const [productType, setProductType] = useState('');
    const [productVibe, setProductVibe] = useState('Clean Studio');
    const [packSize, setPackSize] = useState<5 | 7 | 10>(5);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [results, setResults] = useState<string[]>([]);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [viewIndex, setViewIndex] = useState<number | null>(null);

    const baseCost = appConfig?.featureCosts['Pixa Ecommerce Kit'] || appConfig?.featureCosts['Merchant Studio'] || 25;
    let cost = baseCost;
    if (packSize === 5 && appConfig?.featureCosts['Pixa Ecommerce Kit (5 Assets)']) cost = appConfig.featureCosts['Pixa Ecommerce Kit (5 Assets)'];
    else if (packSize === 7) cost = appConfig?.featureCosts['Pixa Ecommerce Kit (7 Assets)'] || Math.ceil(baseCost * 1.4);
    else if (packSize === 10) cost = appConfig?.featureCosts['Pixa Ecommerce Kit (10 Assets)'] || Math.ceil(baseCost * 2.0);

    const costStandard = appConfig?.featureCosts['Pixa Ecommerce Kit (5 Assets)'] || baseCost;
    const costExtended = appConfig?.featureCosts['Pixa Ecommerce Kit (7 Assets)'] || Math.ceil(baseCost * 1.4);
    const costUltimate = appConfig?.featureCosts['Pixa Ecommerce Kit (10 Assets)'] || Math.ceil(baseCost * 2.0);

    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => { return () => { results.forEach(url => URL.revokeObjectURL(url)); }; }, [results]);
    useEffect(() => { let interval: any; if (loading) { const steps = ["Pixa Vision mapping surface...", "Pixa is simulating physics...", "Pixa is calculating reflections...", "Pixa is rendering textures...", "Pixa is polishing pixels..."]; let step = 0; setLoadingText(steps[0]); interval = setInterval(() => { step = (step + 1) % steps.length; setLoadingText(steps[step]); }, 1500); } return () => clearInterval(interval); }, [loading]);

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
        setLoading(true); results.forEach(url => URL.revokeObjectURL(url)); setResults([]);
        try {
            const outputBase64Images = await generateMerchantBatch({
                type: mode, mainImage: mainImage.base64, backImage: backImage?.base64, modelImage: modelSource === 'upload' ? modelImage?.base64 : undefined,
                modelParams: modelSource === 'ai' ? { gender: aiGender, ethnicity: aiEthnicity, age: 'Young Adult', skinTone: aiSkinTone, bodyType: aiBodyType } : undefined,
                productType: productType, productVibe: productVibe, packSize: packSize
            });
            if (!outputBase64Images || outputBase64Images.length === 0) throw new Error("Generation failed.");
            const blobUrls = await Promise.all(outputBase64Images.map(b64 => base64ToBlobUrl(b64, 'image/jpeg')));
            setResults(blobUrls);
            for (let i = 0; i < outputBase64Images.length; i++) {
                const label = getLabel(i, mode); const dataUri = `data:image/jpeg;base64,${outputBase64Images[i]}`;
                saveCreation(auth.user.uid, dataUri, `Ecommerce Kit: ${label}`);
            }
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Ecommerce Kit');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            if (updatedUser.lifetimeGenerations) { const bonus = checkMilestone(updatedUser.lifetimeGenerations); if (bonus !== false) setMilestoneBonus(bonus); }
        } catch (e: any) { console.error(e); logApiError('Pixa Ecommerce Kit UI', e.message || 'Generation Failed', auth.user?.uid); alert(`Generation failed: ${e.message}. No credits deducted.`); } finally { setLoading(false); }
    };

    const handleNewSession = () => { results.forEach(url => URL.revokeObjectURL(url)); setMainImage(null); setBackImage(null); setModelImage(null); setResults([]); setMode(null); setViewIndex(null); setPackSize(5); setModelSource('ai'); setAiGender('Female'); setAiEthnicity('International'); setAiSkinTone('Fair Tone'); setAiBodyType('Slim Build'); setProductType(''); setProductVibe('Clean Studio'); };
    const handleDownloadAll = async () => { if (results.length === 0) return; for (let i = 0; i < results.length; i++) { downloadImage(results[i], `merchant-asset-${i+1}.png`); await new Promise(r => setTimeout(r, 500)); } };
    const getLabel = (index: number, currentMode: 'apparel' | 'product') => { const labels = currentMode === 'apparel' ? ['Full Body (Hero)', 'Editorial Stylized', 'Side Profile', 'Back View', 'Fabric Detail', 'Lifestyle Alt', 'Creative Studio', 'Golden Hour', 'Action Shot', 'Minimalist'] : ['Hero Front View', 'Back View', 'Hero Shot (45°)', 'Lifestyle Usage', 'Build Quality Macro', 'Contextual Environment', 'Creative Ad', 'Flat Lay Composition', 'In-Hand Scale', 'Dramatic Vibe']; return labels[index] || `Variant ${index + 1}`; };
    const canGenerate = !!mainImage && !isLowCredits;

    return (
        <>
            <FeatureLayout
                title="Pixa Ecommerce Kit" description="The ultimate e-commerce engine. Generate 5, 7, or 10 listing-ready assets in one click." icon={<PixaEcommerceIcon className="w-14 h-14" />} rawIcon={true} creditCost={cost} isGenerating={loading} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={null} onNewSession={handleNewSession} hideGenerateButton={isLowCredits} resultHeightClass="h-[850px]"
                generateButtonStyle={{ className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]", hideIcon: true, label: `Generate ${packSize} Assets` }} scrollRef={scrollRef}
                leftContent={
                    <div className="h-full w-full flex flex-col bg-gray-50/50 rounded-3xl overflow-hidden border border-gray-100 relative group">
                        {loading && (<div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"><div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4"><div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div></div><p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p></div>)}
                        {!loading && results.length === 0 && (<div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60"><div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6"><PixaEcommerceIcon className="w-10 h-10 text-indigo-300" /></div><h3 className="text-xl font-bold text-gray-400">Ready to Create</h3><p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto leading-relaxed">Select a mode and pack size on the right to generate your assets.</p></div>)}
                        {!loading && results.length > 0 && mode && (
                            <div className="flex flex-col lg:flex-row h-full">
                                <div className={MerchantStyles.heroResultContainer} onClick={() => setViewIndex(0)}>
                                    <div className={MerchantStyles.heroLabel}>{getLabel(0, mode)}</div>
                                    <img src={results[0]} className="w-full h-full object-contain p-6 transition-transform group-hover/hero:scale-[1.02]" alt="Hero" />
                                    <div className="absolute bottom-6 right-6 pointer-events-none"><button onClick={(e) => { e.stopPropagation(); downloadImage(results[0], 'merchant-hero.png'); }} className={MerchantStyles.heroDownloadBtn}><DownloadIcon className="w-4 h-4"/> Download</button></div>
                                </div>
                                <div className={MerchantStyles.resultGridContainer}>
                                    <div className="p-4 space-y-4 pb-20">
                                        <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Asset Pack ({results.length})</span>{results.length > 0 && (<button onClick={handleDownloadAll} className="text-[10px] font-bold text-blue-600 hover:underline">Download All</button>)}</div>
                                        {results.slice(1).map((res, idx) => (<div key={idx} className={MerchantStyles.resultThumbnail} onClick={() => setViewIndex(idx + 1)}><div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-gray-600 text-[9px] font-bold px-2 py-1 rounded-md z-10 border border-gray-100">{getLabel(idx + 1, mode)}</div><div className="aspect-[4/3]"><img src={res} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt={`Variant ${idx+1}`} /></div><div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); downloadImage(res, `merchant-variant-${idx+1}.png`); }} className="bg-white p-1.5 rounded-full shadow-md text-gray-700 hover:text-blue-600"><DownloadIcon className="w-4 h-4"/></button></div></div>))}
                                    </div>
                                    <div className={MerchantStyles.scrollCue}><div className={MerchantStyles.scrollCueBadge}>Scroll for more</div></div>
                                </div>
                            </div>
                        )}
                        <style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
                    </div>
                }
                rightContent={
                    isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100"><CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" /><h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3><p className="text-gray-500 mb-6 max-w-xs text-sm">The selected pack requires {cost} credits.</p><button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge</button></div>
                    ) : (
                        <div className="space-y-8 p-1 animate-fadeIn">
                            {!mode && (<div className="grid grid-cols-2 gap-4"><ModeCard title="Apparel" description="Virtual Model Shoot" icon={<ApparelIcon className="w-8 h-8"/>} selected={mode === 'apparel'} onClick={() => setMode('apparel')} color="blue" /><ModeCard title="Product" description="E-com Pack" icon={<CubeIcon className="w-8 h-8"/>} selected={mode === 'product'} onClick={() => setMode('product')} color="purple" /></div>)}
                            {mode && (
                                <div className="animate-fadeIn space-y-6">
                                    <div className="flex items-center justify-between"><button onClick={handleNewSession} className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1">← BACK TO MODE</button><span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${mode === 'apparel' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{mode} Mode</span></div>
                                    <div className="bg-gradient-to-b from-gray-50 to-white p-4 rounded-xl border border-gray-100"><div className="flex items-center justify-between mb-4"><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Pack Size</label></div><div className="grid grid-cols-3 gap-3 h-28"><PackCard size={5} label="Standard" subLabel="Essentials (Hero, Side, Back)" cost={costStandard} selected={packSize === 5} onClick={() => setPackSize(5)} /><PackCard size={7} label="Extended" subLabel="+ Creative & Lifestyle" cost={costExtended} selected={packSize === 7} onClick={() => setPackSize(7)} /><PackCard size={10} label="Ultimate" subLabel="+ Golden Hour, Action & More" cost={costUltimate} selected={packSize === 10} onClick={() => setPackSize(10)} isPopular={true} /></div></div>
                                    <CompactUpload label={mode === 'apparel' ? "Cloth Photo (Flat Lay)" : "Product Photo"} image={mainImage} onUpload={handleUpload(setMainImage)} onClear={() => setMainImage(null)} icon={<UploadTrayIcon className="w-6 h-6 text-indigo-500"/>} />
                                    {mode === 'apparel' && (
                                        <>
                                            <CompactUpload label="Back View" subLabel="Optional" image={backImage} onUpload={handleUpload(setBackImage)} onClear={() => setBackImage(null)} icon={<UploadTrayIcon className="w-5 h-5 text-gray-400"/>} heightClass="h-24" />
                                            <div className="border-t border-gray-100 pt-6"><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Model Selection</label><div className="grid grid-cols-2 gap-3 mb-4"><button onClick={() => setModelSource('ai')} className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${modelSource === 'ai' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}><SparklesIcon className="w-5 h-5 mb-1"/><span className="text-xs font-bold">Pixa Model</span></button><button onClick={() => setModelSource('upload')} className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${modelSource === 'upload' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}><UserIcon className="w-5 h-5 mb-1"/><span className="text-xs font-bold">My Model</span></button></div>{modelSource === 'ai' ? (<div className="space-y-4 animate-fadeIn"><SelectionGrid label="Gender" options={['Female', 'Male']} value={aiGender} onChange={setAiGender} /><SelectionGrid label="Ethnicity" options={['International', 'Indian', 'Asian', 'African']} value={aiEthnicity} onChange={setAiEthnicity} /><SelectionGrid label="Skin Tone" options={['Fair Tone', 'Wheatish Tone', 'Dusky Tone']} value={aiSkinTone} onChange={setAiSkinTone} /><SelectionGrid label="Body Type" options={['Slim Build', 'Average Build', 'Athletic Build', 'Plus Size']} value={aiBodyType} onChange={setAiBodyType} /></div>) : (<CompactUpload label="Your Model" image={modelImage} onUpload={handleUpload(setModelImage)} onClear={() => setModelImage(null)} icon={<UserIcon className="w-6 h-6 text-blue-400"/>} />)}</div>
                                        </>
                                    )}
                                    {mode === 'product' && (
                                        <>
                                            <CompactUpload label="Back View" subLabel="Optional (Recommended)" image={backImage} onUpload={handleUpload(setBackImage)} onClear={() => setBackImage(null)} icon={<UploadTrayIcon className="w-5 h-5 text-purple-400"/>} heightClass="h-24" />
                                            <div className="border-t border-gray-100 pt-6 space-y-4"><div className="mb-6"><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Product Type</label><input type="text" placeholder="e.g. Headphones, Serum Bottle" value={productType} onChange={(e) => setProductType(e.target.value)} className="w-full px-5 py-4 bg-white border-2 border-gray-100 hover:border-gray-300 focus:border-[#4D7CFF] rounded-2xl outline-none transition-all font-medium text-[#1A1A1E]" /></div><SelectionGrid label="Visual Vibe" options={['Clean Studio', 'Luxury', 'Organic/Nature', 'Tech/Neon', 'Lifestyle']} value={productVibe} onChange={setProductVibe} /></div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                }
            />
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload(setMainImage)} />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClose={() => setMilestoneBonus(undefined)} />}
            {viewIndex !== null && results.length > 0 && (<ImageModal imageUrl={results[viewIndex]} onClose={() => setViewIndex(null)} onDownload={() => downloadImage(results[viewIndex], 'merchant-asset.png')} hasNext={viewIndex < results.length - 1} hasPrev={viewIndex > 0} onNext={() => setViewIndex(viewIndex + 1)} onPrev={() => setViewIndex(viewIndex - 1)} />)}
        </>
    );
};
