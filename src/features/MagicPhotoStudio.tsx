import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, InputField, MilestoneSuccessModal, checkMilestone, SelectionGrid } from '../components/FeatureLayout';
import { PixaProductIcon, UploadIcon, XIcon, SparklesIcon, CreditCoinIcon, MagicWandIcon, ArrowRightIcon, CameraIcon } from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl, urlToBase64 } from '../utils/imageUtils';
import { editImageWithPrompt, analyzeProductImage } from '../services/photoStudioService';
import { deductCredits, saveCreation, claimMilestoneBonus } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';

export const MagicPhotoStudio: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [customPrompt, setCustomPrompt] = useState("");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    const cost = appConfig?.featureCosts['Pixa Product Shots'] || 10;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setImage({ url: URL.createObjectURL(file), base64 });
            setResultImage(null);
            setLastCreationId(null);
            
            // Auto-analyze
            setIsAnalyzing(true);
            try {
                const ideas = await analyzeProductImage(base64.base64, base64.mimeType, auth.user?.brandKit);
                setSuggestions(ideas);
            } catch (err) { console.error(err); }
            setIsAnalyzing(false);
        }
    };

    const handleGenerate = async () => {
        if (!image || !auth.user || !customPrompt) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }

        setLoading(true);
        setResultImage(null);
        try {
            const res = await editImageWithPrompt(image.base64.base64, image.base64.mimeType, customPrompt, auth.user.brandKit);
            const blobUrl = await base64ToBlobUrl(res, 'image/png');
            setResultImage(blobUrl);
            
            const finalImageUrl = `data:image/png;base64,${res}`;
            const creationId = await saveCreation(auth.user.uid, finalImageUrl, 'Pixa Product Shots');
            setLastCreationId(creationId);
            
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Product Shots');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e: any) {
            console.error(e);
            alert("Generation failed.");
        } finally {
            setLoading(false);
        }
    };

    // Fix: Added missing handleEditorSave function to handle MagicEditor results
    const handleEditorSave = (newUrl: string) => {
        setResultImage(newUrl);
        if (auth.user) {
            saveCreation(auth.user.uid, newUrl, 'Pixa Product Shots (Edited)');
        }
    };

    const handleDeductEditCredit = async () => {
        if (auth.user) {
            const updatedUser = await deductCredits(auth.user.uid, 2, 'Magic Eraser');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        }
    };

    const handleRefundRequest = async (reason: string) => {
        if (!auth.user || !resultImage) return;
        setIsRefunding(true);
        try {
            const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, resultImage, lastCreationId || undefined);
            if (res.success) {
                if (res.type === 'refund') {
                    auth.setUser(prev => prev ? { ...prev, credits: prev.credits + cost } : null);
                    setResultImage(null);
                    setNotification({ msg: res.message, type: 'success' });
                } else {
                    setNotification({ msg: res.message, type: 'info' });
                }
            }
            setShowRefundModal(false);
        } catch (e: any) {
            alert("Refund processing failed: " + e.message);
        } finally {
            setIsRefunding(false);
        }
    };

    return (
        <>
            <FeatureLayout 
                title="Pixa Product Shots"
                description="Transform simple photos into professional, studio-quality product shots or lifelike model images."
                icon={<PixaProductIcon className="size-full"/>}
                rawIcon={true}
                creditCost={cost}
                isGenerating={loading}
                canGenerate={!!image && !!customPrompt && !isLowCredits}
                onGenerate={handleGenerate}
                resultImage={resultImage}
                creationId={lastCreationId}
                onNewSession={() => { setImage(null); setResultImage(null); setCustomPrompt(""); }}
                onEdit={() => setShowMagicEditor(true)}
                activeBrandKit={auth.user?.brandKit}
                resultOverlay={resultImage ? <ResultToolbar onNew={() => setImage(null)} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null}
                leftContent={
                    <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                        {loading ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                <p className="text-gray-400 text-sm font-bold animate-pulse uppercase tracking-widest">Rendering Product...</p>
                            </div>
                        ) : image ? (
                            <img src={image.url} className="max-w-full max-h-full object-contain" alt="Original" />
                        ) : (
                            <div onClick={() => document.getElementById('studio-upload')?.click()} className="text-center opacity-40 cursor-pointer">
                                <CameraIcon className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-400 font-bold">Upload Product Image</p>
                            </div>
                        )}
                        <input id="studio-upload" type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                    </div>
                }
                rightContent={
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Scene Instructions</label>
                            <textarea 
                                value={customPrompt} 
                                onChange={(e) => setCustomPrompt(e.target.value)} 
                                className="w-full p-4 bg-white border border-gray-100 rounded-2xl h-32 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                                placeholder="Describe the background and lighting..."
                            />
                        </div>
                        {suggestions.length > 0 && (
                            <div className="animate-fadeIn">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">AI Suggestions</label>
                                <div className="flex flex-wrap gap-2">
                                    {suggestions.map((s, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => setCustomPrompt(s)}
                                            className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full border border-indigo-100 hover:bg-indigo-100 transition-all"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                }
            />
            {showMagicEditor && resultImage && (
                <MagicEditorModal 
                    imageUrl={resultImage} 
                    onClose={() => setShowMagicEditor(false)} 
                    onSave={handleEditorSave}
                    deductCredit={handleDeductEditCredit}
                />
            )}
            {showRefundModal && (
                <RefundModal 
                    onClose={() => setShowRefundModal(false)} 
                    onConfirm={handleRefundRequest} 
                    isProcessing={isRefunding} 
                    featureName="Product Shot" 
                />
            )}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};