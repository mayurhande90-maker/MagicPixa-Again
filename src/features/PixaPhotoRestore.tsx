
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, SelectionGrid, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { PixaRestoreIcon, UploadIcon, XIcon, SparklesIcon, CreditCoinIcon, CheckIcon, MagicWandIcon, CameraIcon } from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { colourizeImage } from '../services/imageToolsService';
import { saveCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';

export const PixaPhotoRestore: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [mode, setMode] = useState<'restore_color' | 'restore_only'>('restore_color');
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);

    const cost = appConfig?.featureCosts['Pixa Photo Restore'] || 5;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setImage({ url: URL.createObjectURL(file), base64 });
            setResultImage(null);
            setLastCreationId(null);
        }
    };

    const handleGenerate = async () => {
        if (!image || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }

        setLoading(true);
        setResultImage(null);
        try {
            const res = await colourizeImage(image.base64.base64, image.base64.mimeType, mode, auth.user.brandKit);
            const blobUrl = await base64ToBlobUrl(res, 'image/png');
            setResultImage(blobUrl);
            
            const finalImageUrl = `data:image/png;base64,${res}`;
            const creationId = await saveCreation(auth.user.uid, finalImageUrl, 'Pixa Photo Restore');
            setLastCreationId(creationId);
            
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Photo Restore');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e: any) {
            console.error(e);
            alert("Restoration failed.");
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

    const canGenerate = !!image && !isLowCredits;

    return (
        <>
            <FeatureLayout 
                title="Pixa Photo Restore" description="Professional restoration suite. Fix damage, enhance resolution, and optionally colorize." icon={<PixaRestoreIcon className="size-full"/>} rawIcon={true} creditCost={cost} isGenerating={loading} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={resultImage} creationId={lastCreationId}
                onNewSession={() => { setImage(null); setResultImage(null); }}
                resultOverlay={resultImage ? <ResultToolbar onNew={() => setImage(null)} onRegen={handleGenerate} onEdit={() => {}} onReport={() => setShowRefundModal(true)} /> : null}
                leftContent={
                    <div onClick={() => document.getElementById('restore-upload')?.click()} className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 cursor-pointer hover:border-indigo-400 overflow-hidden">
                        {image ? <img src={image.url} className="max-w-full max-h-full object-contain" /> : <div className="text-center opacity-40"><CameraIcon className="w-16 h-16 mx-auto mb-2 text-gray-300" /><p className="text-xs font-bold">Upload Vintage Photo</p></div>}
                        <input id="restore-upload" type="file" className="hidden" onChange={handleUpload} />
                    </div>
                }
                rightContent={
                    <div className="space-y-6">
                        <SelectionGrid label="Restoration Mode" options={['restore_color', 'restore_only']} value={mode} onChange={(v: any) => setMode(v)} />
                        <p className="text-xs text-gray-500 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                            <strong>Restore Color</strong>: Converts B&W to color and fixes damage.<br/><br/>
                            <strong>Restore Only</strong>: Sharpens and removes damage but keeps the original color (or lack thereof).
                        </p>
                    </div>
                }
            />
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="Photo Restoration" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};
