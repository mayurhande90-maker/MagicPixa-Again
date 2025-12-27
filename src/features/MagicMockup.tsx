
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, InputField, MilestoneSuccessModal, checkMilestone, SelectionGrid } from '../components/FeatureLayout';
import { PixaMockupIcon, UploadIcon, XIcon, SparklesIcon, CreditCoinIcon, CheckIcon, CubeIcon } from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { generateMagicMockup } from '../services/mockupService';
import { saveCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';

export const MagicMockup: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [design, setDesign] = useState<{ url: string; base64: Base64File } | null>(null);
    const [targetObject, setTargetObject] = useState('T-Shirt');
    const [material, setMaterial] = useState('Standard Ink');
    const [sceneVibe, setSceneVibe] = useState('Studio Clean');
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);

    const cost = appConfig?.featureCosts['Pixa Mockups'] || 8;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setDesign({ url: URL.createObjectURL(file), base64 });
            setResultImage(null);
            setLastCreationId(null);
        }
    };

    const handleGenerate = async () => {
        if (!design || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }

        setLoading(true);
        setResultImage(null);
        try {
            const res = await generateMagicMockup(
                design.base64.base64, 
                design.base64.mimeType, 
                targetObject, 
                material, 
                sceneVibe, 
                undefined, 
                auth.user.brandKit
            );
            const blobUrl = await base64ToBlobUrl(res, 'image/png');
            setResultImage(blobUrl);
            
            const finalImageUrl = `data:image/png;base64,${res}`;
            const creationId = await saveCreation(auth.user.uid, finalImageUrl, 'Pixa Mockups');
            setLastCreationId(creationId);
            
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Mockups');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e: any) {
            console.error(e);
            alert("Mockup generation failed.");
        } finally {
            setLoading(false);
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
            alert(e.message);
        } finally {
            setIsRefunding(false);
        }
    };

    const canGenerate = !!design && !isLowCredits;

    return (
        <>
            <FeatureLayout 
                title="Pixa Mockups" description="The Reality Engine. Turn flat designs into photorealistic physical objects with accurate material physics." icon={<PixaMockupIcon className="size-full"/>} rawIcon={true} creditCost={cost} isGenerating={loading} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={resultImage} creationId={lastCreationId}
                onNewSession={() => { setDesign(null); setResultImage(null); }}
                resultOverlay={resultImage ? <ResultToolbar onNew={() => setDesign(null)} onRegen={handleGenerate} onEdit={() => {}} onReport={() => setShowRefundModal(true)} /> : null}
                leftContent={
                    <div onClick={() => document.getElementById('mockup-upload')?.click()} className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 cursor-pointer hover:border-indigo-400 overflow-hidden">
                        {design ? <img src={design.url} className="max-w-full max-h-full object-contain" /> : <div className="text-center opacity-40"><CubeIcon className="w-16 h-16 mx-auto mb-2 text-gray-300" /><p className="text-xs font-bold">Upload Design/Logo</p></div>}
                        <input id="mockup-upload" type="file" className="hidden" onChange={handleUpload} />
                    </div>
                }
                rightContent={
                    <div className="space-y-6">
                        <SelectionGrid label="Target Object" options={['T-Shirt', 'Coffee Mug', 'Hoodie', 'Notebook', 'iPhone Box']} value={targetObject} onChange={setTargetObject} />
                        <SelectionGrid label="Material Physics" options={['Standard Ink', 'Embroidery', 'Gold Foil', 'Deboss']} value={material} onChange={setMaterial} />
                        <SelectionGrid label="Environmental Style" options={['Studio Clean', 'Lifestyle', 'Cinematic', 'Nature']} value={sceneVibe} onChange={setSceneVibe} />
                    </div>
                }
            />
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="Mockup" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};
