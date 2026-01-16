import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, SelectionGrid, MilestoneSuccessModal, checkMilestone, InputField } from '../components/FeatureLayout';
import { RefinementPanel } from '../components/RefinementPanel';
import { MockupIcon, UploadIcon, XIcon, UploadTrayIcon, SparklesIcon, CreditCoinIcon, MagicWandIcon, TrashIcon, PaletteIcon, ArrowUpCircleIcon, PixaMockupIcon, CheckIcon } from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl, urlToBase64 } from '../utils/imageUtils';
import { generateMagicMockup } from '../services/mockupService';
import { refineStudioImage } from '../services/photoStudioService';
import { saveCreation, updateCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';
import { MockupStyles } from '../styles/features/MagicMockup.styles';

export const MagicMockup: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [designImage, setDesignImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [targetObject, setTargetObject] = useState('');
    const [material, setMaterial] = useState('');
    const [sceneVibe, setSceneVibe] = useState('Studio Clean');
    const [objectColor, setObjectColor] = useState('White');
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    // Refinement State
    const [isRefineActive, setIsRefineActive] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const refineCost = 5;

    const cost = appConfig?.featureCosts['Pixa Mockups'] || 8;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = designImage && userCredits < cost;
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let interval: any;
        if (loading || isRefining) {
            const steps = isRefining ? ["Analyzing surface geometry...", "Refining material textures...", "Adjusting shadow contact...", "Polishing masterpiece..."] : ["Pixa Vision: Mapping object topology...", "Simulating material physics...", "Anchoring design to surface...", "Calculating light transport...", "Finalizing photorealistic mockup..."];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [loading, isRefining]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setDesignImage({ url: URL.createObjectURL(file), base64 });
            setResultImage(null);
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!designImage || !targetObject || !material || !auth.user) return;
        if (isLowCredits) return;
        setLoading(true); setResultImage(null); setLastCreationId(null);
        try {
            const res = await generateMagicMockup(designImage.base64.base64, designImage.base64.mimeType, targetObject, material, sceneVibe, objectColor, auth.activeBrandKit);
            const blobUrl = await base64ToBlobUrl(res, 'image/png'); setResultImage(blobUrl);
            const dataUri = `data:image/png;base64,${res}`;
            const creationId = await saveCreation(auth.user.uid, dataUri, 'Pixa Mockups');
            setLastCreationId(creationId);
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Mockups');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            if (updatedUser.lifetimeGenerations) {
                const bonus = checkMilestone(updatedUser.lifetimeGenerations);
                if (bonus !== false) setMilestoneBonus(bonus);
            }
        } catch (e: any) {
            console.error(e);
            alert("Generation failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleRefine = async (refineText: string) => {
        if (!resultImage || !refineText.trim() || !auth.user) return;
        if (userCredits < refineCost) { alert("Insufficient credits."); return; }
        setIsRefining(true); setIsRefineActive(false);
        try {
            const currentB64 = await urlToBase64(resultImage);
            const res = await refineStudioImage(currentB64.base64, currentB64.mimeType, refineText, "Product Mockup");
            const blobUrl = await base64ToBlobUrl(res, 'image/png'); setResultImage(blobUrl);
            if (lastCreationId) await updateCreation(auth.user.uid, lastCreationId, `data:image/png;base64,${res}`);
            const updatedUser = await deductCredits(auth.user.uid, refineCost, 'Pixa Refinement');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e) {
            console.error(e);
            alert("Refinement failed.");
        } finally {
            setIsRefining(false);
        }
    };

    const handleClaimBonus = async () => {
        if (!auth.user || !milestoneBonus) return;
        const updatedUser = await claimMilestoneBonus(auth.user.uid, milestoneBonus);
        auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
    };

    const handleRefundRequest = async (reason: string) => {
        if (!auth.user || !resultImage) return;
        setIsRefunding(true);
        try {
            const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, "Mockup", lastCreationId || undefined);
            if (res.success) {
                if (res.type === 'refund') {
                    auth.setUser(prev => prev ? { ...prev, credits: prev.credits + cost } : null);
                    setResultImage(null);
                }
            }
            setShowRefundModal(false);
        } catch (e: any) { alert(e.message); } finally { setIsRefunding(false); }
    };

    const handleNewSession = () => { setDesignImage(null); setResultImage(null); setTargetObject(''); setMaterial(''); };

    const handleEditorSave = async (newUrl: string) => {
        setResultImage(newUrl);
        if (lastCreationId && auth.user) await updateCreation(auth.user.uid, lastCreationId, newUrl);
    };

    const handleDeductEditCredit = async () => { if(auth.user) { const updatedUser = await deductCredits(auth.user.uid, 2, 'Magic Eraser'); auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); } };

    const canGenerate = !!designImage && !!targetObject && !!material && !isLowCredits;

    return (
        <>
            <FeatureLayout
                title="Pixa Mockups"
                description="Engineered 3D mockups. Apply your designs to products with perfect perspective and lighting."
                icon={<PixaMockupIcon className="w-14 h-14"/>}
                rawIcon={true}
                creditCost={cost}
                isGenerating={loading || isRefining}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                resultImage={resultImage}
                onNewSession={handleNewSession}
                onEdit={() => setShowMagicEditor(true)}
                activeBrandKit={auth.activeBrandKit}
                resultOverlay={resultImage ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null}
                canvasOverlay={<RefinementPanel isActive={isRefineActive && !!resultImage} isRefining={isRefining} onClose={() => setIsRefineActive(false)} onRefine={handleRefine} refineCost={refineCost} />}
                customActionButtons={resultImage ? (
                    <button 
                        onClick={() => setIsRefineActive(!isRefineActive)}
                        className={`bg-white/10 backdrop-blur-md hover:bg-white/20 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all border border-white/10 shadow-lg text-xs sm:text-sm font-medium flex items-center gap-2 group whitespace-nowrap ${isRefineActive ? 'ring-2 ring-yellow-400' : ''}`}
                    >
                        <span>Make Changes</span>
                    </button>
                ) : null}
                leftContent={
                    designImage ? (
                        <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                            {(loading || isRefining) && (<div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"><div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4"><div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div></div><p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p></div>)}
                            <img src={designImage.url} className="max-w-full max-h-full object-contain shadow-md" />
                        </div>
                    ) : (
                        <div className="w-full h-full flex justify-center"><div onClick={() => fileInputRef.current?.click()} className="h-full w-full border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-gray-50 bg-white"><div className="p-6 bg-indigo-50 rounded-2xl mb-4"><UploadIcon className="w-12 h-12 text-indigo-400"/></div><p className="text-xl font-bold text-gray-500">Upload Design</p></div></div>
                    )
                }
                rightContent={
                    <div className="space-y-6">
                        <SelectionGrid label="1. Target Object" options={['T-Shirt', 'Hoodie', 'Tote Bag', 'iPhone Case', 'Coffee Mug', 'Business Card', 'Poster']} value={targetObject} onChange={setTargetObject} />
                        <SelectionGrid label="2. Material Physics" options={['Standard Ink', 'Embroidery', 'Gold Foil', 'Deboss', 'Smart Object']} value={material} onChange={setMaterial} />
                        <SelectionGrid label="3. Scene Vibe" options={['Studio Clean', 'Lifestyle', 'Cinematic', 'Nature', 'Urban']} value={sceneVibe} onChange={setSceneVibe} />
                        <InputField label="4. Object Color" placeholder="e.g. Matte Black" value={objectColor} onChange={(e: any) => setObjectColor(e.target.value)} />
                    </div>
                }
            />
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={handleClaimBonus} onClose={() => setMilestoneBonus(undefined)} />}
            {showMagicEditor && resultImage && <MagicEditorModal imageUrl={resultImage} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={handleDeductEditCredit} />}
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="Mockup" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};
