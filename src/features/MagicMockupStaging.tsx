
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuthProps, AppConfig, Page, View, BrandKit } from '../types';
import { FeatureLayout, InputField, MilestoneSuccessModal, checkMilestone, SelectionGrid } from '../components/FeatureLayout';
// FIX: Added missing icon imports DocumentTextIcon, BuildingIcon, and CloudUploadIcon
import { 
    PixaMockupIcon, UploadIcon, XIcon, SparklesIcon, CreditCoinIcon, CheckIcon, PlusCircleIcon, 
    BrandKitIcon, HomeIcon, LightbulbIcon, MagicWandIcon, TrashIcon, UserIcon, ApparelIcon, 
    CubeIcon, MockupIcon, ArrowRightIcon, CameraIcon, ShieldCheckIcon, EngineIcon, PaletteIcon,
    RefreshIcon, DownloadIcon, DocumentTextIcon, BuildingIcon, CloudUploadIcon
} from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { generateMagicMockup, analyzeMockupSuggestions, MockupSuggestion } from '../services/mockupService';
import { saveCreation, updateCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';
import { MockupStagingStyles as styles } from '../styles/features/MagicMockupStaging.styles';
import { PixaTogetherStyles } from '../styles/features/PixaTogether.styles';

// --- MOCK DATA FOR MATERIAL PREVIEWS ---
const MATERIAL_PREVIEWS = [
    { id: 'Standard Ink', name: 'Ink Print', url: 'https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?q=80&w=400&auto=format&fit=crop', desc: 'Flat matte finish' },
    { id: 'Embroidery', name: 'Embroidery', url: 'https://images.unsplash.com/photo-1613941455500-1c49b95147be?q=80&w=400&auto=format&fit=crop', desc: '3D Thread stitches' },
    { id: 'Gold Foil', name: 'Gold Foil', url: 'https://images.unsplash.com/photo-1614292244585-6901844976c6?q=80&w=400&auto=format&fit=crop', desc: 'Premium metallic shine' },
    { id: 'Deboss', name: 'Leather Press', url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=400&auto=format&fit=crop', desc: 'Pressed into texture' },
    { id: 'Laser Etch', name: 'Laser Etch', url: 'https://images.unsplash.com/photo-1599395279644-8c8266453181?q=80&w=400&auto=format&fit=crop', desc: 'Precision etching' },
    { id: 'Smart Object', name: 'Screen UI', url: 'https://images.unsplash.com/photo-1510511459019-5dee997dd0df?q=80&w=400&auto=format&fit=crop', desc: 'Realistic digital glow' },
];

const PLACEMENT_PRESETS = [
    { id: 'chest', label: 'Center Chest', top: '35%', left: '50%' },
    { id: 'pocket', label: 'Left Pocket', top: '30%', left: '35%' },
    { id: 'sleeve', label: 'Right Sleeve', top: '40%', left: '75%' },
    { id: 'front', label: 'Main Face', top: '50%', left: '50%' },
    { id: 'corner', label: 'Top Left', top: '20%', left: '20%' },
];

export const MagicMockupStaging: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    // 1. ASSET STATE
    const [designImage, setDesignImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [suggestions, setSuggestions] = useState<MockupSuggestion[]>([]);
    
    // 2. CONFIG STATE
    const [targetObject, setTargetObject] = useState('');
    const [material, setMaterial] = useState('');
    const [sceneVibe, setSceneVibe] = useState('Studio Clean');
    const [placement, setPlacement] = useState('chest');
    const [objectColor, setObjectColor] = useState('White');

    // 3. UI STATE
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    const cost = 8;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = designImage && userCredits < cost;
    const scrollRef = useRef<HTMLDivElement>(null);

    // Dynamic Loading Sequence
    useEffect(() => { 
        let interval: any; 
        if (loading) { 
            const steps = [
                "Pixa is extracting visual anchors...", 
                "Simulating material physical properties...", 
                "Mapping design curvature onto object...", 
                "Calculating environmental ray-tracing...", 
                "Finalizing realistic output..."
            ]; 
            let step = 0; 
            setLoadingText(steps[0]); 
            interval = setInterval(() => { 
                step = (step + 1) % steps.length; 
                setLoadingText(steps[step]); 
            }, 2000); 
        } 
        return () => clearInterval(interval); 
    }, [loading]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setDesignImage({ url: URL.createObjectURL(file), base64 });
            setResultImage(null);
            setSuggestions([]);
        }
        e.target.value = '';
    };

    const handleAutoSuggest = async () => {
        if (!designImage) return;
        setIsAnalyzing(true);
        setLoadingText("Pixa AI is analyzing your design...");
        try {
            const list = await analyzeMockupSuggestions(designImage.base64.base64, designImage.base64.mimeType, auth.activeBrandKit);
            setSuggestions(list);
            setNotification({ msg: "Success! Pixa found 3 ideal matches.", type: 'success' });
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const applySuggestion = (s: MockupSuggestion) => {
        setTargetObject(s.targetObject);
        setMaterial(s.material);
        setSceneVibe(s.sceneVibe);
        setObjectColor(s.objectColor);
        setNotification({ msg: `Applied: ${s.title} Strategy`, type: 'info' });
    };

    const handleGenerate = async () => {
        if (!designImage || !targetObject || !material || !auth.user) return;
        if (isLowCredits) return;
        
        setLoading(true); setResultImage(null); setLastCreationId(null);
        
        try {
            // Include placement in the prompt logic
            const placementText = PLACEMENT_PRESETS.find(p => p.id === placement)?.label || 'Center';
            const res = await generateMagicMockup(
                designImage.base64.base64, 
                designImage.base64.mimeType, 
                `${targetObject} (Placement: ${placementText})`, 
                material, 
                sceneVibe, 
                objectColor, 
                auth.activeBrandKit
            );
            
            const blobUrl = await base64ToBlobUrl(res, 'image/png'); setResultImage(blobUrl);
            const dataUri = `data:image/png;base64,${res}`; 
            const creationId = await saveCreation(auth.user.uid, dataUri, 'Pixa Mockup Staging'); 
            setLastCreationId(creationId);
            
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Mockup Staging'); 
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e) {
            console.error(e);
            alert("Generation failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleNewSession = () => {
        setDesignImage(null);
        setResultImage(null);
        setSuggestions([]);
        setTargetObject('');
        setMaterial('');
        setPlacement('chest');
    };

    // FIX: Added missing handleEditorSave to handle Magic Editor results
    const handleEditorSave = async (newUrl: string) => { 
        setResultImage(newUrl); 
        if (lastCreationId && auth.user) {
            await updateCreation(auth.user.uid, lastCreationId, newUrl);
        } else if (auth.user) {
            const id = await saveCreation(auth.user.uid, newUrl, 'Pixa Mockup Staging');
            setLastCreationId(id);
        }
    };

    const canGenerate = !!designImage && !!targetObject && !!material && !isLowCredits;

    const objects = [
        { id: 'T-Shirt', icon: <ApparelIcon className="w-5 h-5"/>, label: 'Apparel' },
        { id: 'iPhone 15', icon: <MockupIcon className="w-5 h-5"/>, label: 'Tech' },
        { id: 'Coffee Mug', icon: <CubeIcon className="w-5 h-5"/>, label: 'Packaging' },
        { id: 'Notebook', icon: <DocumentTextIcon className="w-5 h-5"/>, label: 'Office' },
        { id: 'Wall Sign', icon: <BuildingIcon className="w-5 h-5"/>, label: 'Signage' },
        { id: 'Other', icon: <PlusCircleIcon className="w-5 h-5"/>, label: 'Custom' }
    ];

    return (
        <>
            <FeatureLayout
                title="Pro-Mockup Lab (Staging)"
                description="The next generation of AI Prototyping. Physically anchor your designs to 3D objects with advanced texture mapping."
                icon={<PixaMockupIcon className="w-14 h-14"/>}
                rawIcon={true}
                creditCost={cost}
                isGenerating={loading}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                resultImage={resultImage}
                creationId={lastCreationId}
                onNewSession={handleNewSession}
                onEdit={() => setShowMagicEditor(true)}
                activeBrandKit={auth.activeBrandKit}
                isBrandCritical={true}
                resultHeightClass="h-[850px]"
                scrollRef={scrollRef}
                leftContent={
                    <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 overflow-hidden group mx-auto shadow-sm">
                         {loading && (
                            <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-8"></div>
                                <p className="text-sm font-black text-white tracking-[0.2em] uppercase animate-pulse">{loadingText}</p>
                            </div>
                        )}

                        {designImage ? (
                            <div className="relative w-full h-full flex items-center justify-center animate-fadeIn">
                                {/* BACKGROUND BLURRED SILHOUETTE */}
                                <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
                                    <MockupIcon className="w-[80%] h-[80%]" />
                                </div>

                                <div className="relative max-w-[80%] max-h-[80%] flex items-center justify-center">
                                    <img src={designImage.url} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" alt="Uploaded Design" />
                                    
                                    {/* INTERACTIVE PLACEMENT SYSTEM */}
                                    <div className={styles.silhouetteOverlay}>
                                        {PLACEMENT_PRESETS.map(p => (
                                            <button 
                                                key={p.id}
                                                onClick={() => setPlacement(p.id)}
                                                className={`${styles.placementDot} ${placement === p.id ? styles.placementDotSelected : ''}`}
                                                style={{ top: p.top, left: p.left }}
                                                title={`Anchor to ${p.label}`}
                                            >
                                                {placement === p.id ? <CheckIcon className="w-3 h-3"/> : <span className="text-[8px] font-black uppercase">P</span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Identity Lock Indicator */}
                                <div className="absolute top-6 left-6 z-40">
                                    <div className={styles.statusBadge}>
                                        <div className={styles.statusDot}></div>
                                        <span className={styles.statusText}>Identity Locked</span>
                                    </div>
                                </div>

                                <button onClick={handleNewSession} className="absolute top-6 right-6 p-3 bg-white/90 rounded-2xl shadow-xl text-gray-400 hover:text-red-500 transition-all z-40 backdrop-blur-sm"><XIcon className="w-6 h-6"/></button>
                            </div>
                        ) : (
                            <div onClick={() => document.getElementById('mockup-staging-upload')?.click()} className="h-full w-full flex flex-col items-center justify-center cursor-pointer group">
                                <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center mb-8 transition-all group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-indigo-500/20 group-hover:bg-indigo-100">
                                    <CloudUploadIcon className="w-10 h-10 text-indigo-400 group-hover:text-indigo-600" />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Upload Your Design</h3>
                                <p className="text-gray-400 text-sm mt-2">Drop your logo or graphic to start prototyping</p>
                                <div className="mt-8 px-6 py-2 rounded-full bg-gray-50 border border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">Select File</div>
                                <input id="mockup-staging-upload" type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                            </div>
                        )}
                    </div>
                }
                rightContent={
                    <div className={styles.container}>
                        {/* MAGIC SUGGEST BUTTON */}
                        {designImage && !suggestions.length && (
                            <button 
                                onClick={handleAutoSuggest}
                                disabled={isAnalyzing}
                                className={styles.suggestBtn}
                            >
                                <SparklesIcon className={styles.suggestIcon}/>
                                <span>{isAnalyzing ? 'Analyzing Aesthetics...' : 'Pixa Magic Suggest'}</span>
                            </button>
                        )}

                        {/* AI SUGGESTION FEED */}
                        {suggestions.length > 0 && (
                            <div className="animate-fadeIn mb-8">
                                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4 block px-1">AI Recommendation (Blueprints)</label>
                                <div className="grid grid-cols-1 gap-3">
                                    {suggestions.map((s, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => applySuggestion(s)}
                                            className="group flex items-center justify-between p-4 bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl text-white shadow-xl hover:scale-[1.02] transition-all"
                                        >
                                            <div className="text-left">
                                                <h4 className="font-black text-sm">{s.title}</h4>
                                                <p className="text-[10px] opacity-70 font-medium">{s.reasoning}</p>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                                <ArrowRightIcon className="w-4 h-4"/>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 1. SELECT OBJECT BENTO */}
                        <div>
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block px-1">1. Choose Product Silhouette</label>
                             <div className={styles.objectGrid}>
                                {objects.map(obj => {
                                    const isSelected = targetObject === obj.id;
                                    return (
                                        <button 
                                            key={obj.id}
                                            onClick={() => setTargetObject(obj.id)}
                                            className={`${styles.objectCard} ${isSelected ? styles.objectCardSelected : styles.objectCardInactive}`}
                                        >
                                            <div className={`${styles.iconBox} ${isSelected ? styles.iconBoxActive : ''}`}>
                                                {obj.icon}
                                            </div>
                                            <span className={styles.label}>{obj.label}</span>
                                        </button>
                                    )
                                })}
                             </div>
                        </div>

                        {/* 2. MATERIAL VISUAL GALLERY */}
                        <div>
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block px-1">2. Physic Material Selection</label>
                             <div className={styles.materialGrid}>
                                {MATERIAL_PREVIEWS.map(mat => {
                                    const isSelected = material === mat.id;
                                    return (
                                        <div 
                                            key={mat.id}
                                            onClick={() => setMaterial(mat.id)}
                                            className={`${styles.materialCard} ${isSelected ? styles.materialCardSelected : styles.materialCardInactive}`}
                                        >
                                            <img src={mat.url} className={styles.materialThumb} alt={mat.name} />
                                            <div className={styles.materialInfo}>
                                                <span className={styles.materialName}>{mat.name}</span>
                                                <span className="text-[8px] text-white/60 font-bold uppercase">{mat.desc}</span>
                                            </div>
                                            {isSelected && (
                                                <div className="absolute top-2 right-2 p-1 bg-indigo-600 rounded-full text-white shadow-lg animate-scaleIn">
                                                    <CheckIcon className="w-2.5 h-2.5"/>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                             </div>
                        </div>

                        {/* 3. SCENE SETTINGS */}
                        <div className="pt-4 border-t border-gray-100 space-y-6">
                            <SelectionGrid label="3. Environment Lighting" options={['Studio Clean', 'Lifestyle', 'Cinematic', 'Nature', 'Urban']} value={sceneVibe} onChange={setSceneVibe} />
                            
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block px-1">4. Product Coloration</label>
                                <div className="flex gap-3">
                                    {['White', 'Black', 'Navy', 'Olive', 'Charcoal'].map(c => (
                                        <button 
                                            key={c}
                                            onClick={() => setObjectColor(c)}
                                            className={`w-8 h-8 rounded-full border-2 transition-all transform hover:scale-125 ${objectColor === c ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110' : 'border-gray-200'}`}
                                            style={{ backgroundColor: c.toLowerCase() }}
                                            title={c}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                }
            />
            
            {/* SUCCESS MODAL */}
            {lastCreationId && resultImage && (
                <ToastNotification message="Mockup engineered successfully! Saved to your lab." type="success" onClose={() => {}} />
            )}

            {showMagicEditor && resultImage && (
                <MagicEditorModal 
                    imageUrl={resultImage} 
                    onClose={() => setShowMagicEditor(false)} 
                    onSave={handleEditorSave}
                    deductCredit={async () => {}}
                />
            )}

            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};
