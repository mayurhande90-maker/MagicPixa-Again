
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { ApparelIcon, UploadIcon, XIcon, UserIcon, SparklesIcon, CreditCoinIcon, PixaTryOnIcon, CameraIcon } from '../components/icons';
import { FeatureLayout, SelectionGrid, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { generateApparelTryOn } from '../services/apparelService';
import { saveCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';

export const MagicApparel: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [personImage, setPersonImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [topGarment, setTopGarment] = useState<{ url: string; base64: Base64File } | null>(null);
    const [bottomGarment, setBottomGarment] = useState<{ url: string; base64: Base64File } | null>(null);
    const [tuck, setTuck] = useState('Untucked');
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);

    const cost = appConfig?.featureCosts['Pixa TryOn'] || 8;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setter({ url: URL.createObjectURL(file), base64 });
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!personImage || !auth.user) return;
        if (!topGarment && !bottomGarment) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }

        setLoading(true);
        setResultImage(null);
        try {
            const res = await generateApparelTryOn(
                personImage.base64.base64, 
                personImage.base64.mimeType, 
                topGarment ? topGarment.base64 : null, 
                bottomGarment ? bottomGarment.base64 : null, 
                undefined, 
                { tuck }, 
                auth.user.brandKit
            );
            const blobUrl = await base64ToBlobUrl(res, 'image/png');
            setResultImage(blobUrl);
            
            const finalImageUrl = `data:image/png;base64,${res}`;
            const creationId = await saveCreation(auth.user.uid, finalImageUrl, 'Pixa TryOn');
            setLastCreationId(creationId);
            
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa TryOn');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e: any) {
            console.error(e);
            alert("Try-on failed.");
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

    const canGenerate = !!personImage && (!!topGarment || !!bottomGarment) && !isLowCredits;

    return (
        <>
            <FeatureLayout 
                title="Pixa TryOn" description="Virtual dressing room. Try clothes on any person instantly." icon={<PixaTryOnIcon className="size-full"/>} rawIcon={true} creditCost={cost} isGenerating={loading} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={resultImage} onResetResult={resultImage ? undefined : handleGenerate} onNewSession={() => { setPersonImage(null); setTopGarment(null); setBottomGarment(null); setResultImage(null); }}
                activeBrandKit={auth.user?.brandKit}
                resultOverlay={resultImage ? <ResultToolbar onNew={() => setPersonImage(null)} onRegen={handleGenerate} onEdit={() => {}} onReport={() => setShowRefundModal(true)} /> : null}
                leftContent={
                    <div className="grid grid-cols-1 gap-4 w-full h-full">
                        <div onClick={() => document.getElementById('apparel-model-upload')?.click()} className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 cursor-pointer hover:border-blue-400 overflow-hidden">
                            {personImage ? <img src={personImage.url} className="max-w-full max-h-full object-contain" /> : <div className="text-center opacity-40"><UserIcon className="w-16 h-16 mx-auto mb-2 text-gray-300" /><p className="text-xs font-bold">Person Photo</p></div>}
                            <input id="apparel-model-upload" type="file" className="hidden" onChange={handleUpload(setPersonImage)} />
                        </div>
                    </div>
                }
                rightContent={
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div onClick={() => document.getElementById('top-upload')?.click()} className="relative h-40 flex items-center justify-center p-2 bg-white rounded-2xl border border-dashed border-gray-200 cursor-pointer hover:border-indigo-400 overflow-hidden">
                                {topGarment ? <img src={topGarment.url} className="max-w-full max-h-full object-contain" /> : <div className="text-center opacity-40"><ApparelIcon className="w-8 h-8 mx-auto mb-1 text-gray-300" /><p className="text-[10px] font-bold">Top</p></div>}
                                <input id="top-upload" type="file" className="hidden" onChange={handleUpload(setTopGarment)} />
                            </div>
                            <div onClick={() => document.getElementById('bottom-upload')?.click()} className="relative h-40 flex items-center justify-center p-2 bg-white rounded-2xl border border-dashed border-gray-200 cursor-pointer hover:border-indigo-400 overflow-hidden">
                                {bottomGarment ? <img src={bottomGarment.url} className="max-w-full max-h-full object-contain" /> : <div className="text-center opacity-40"><ApparelIcon className="w-8 h-8 mx-auto mb-1 text-gray-300" /><p className="text-[10px] font-bold">Bottom</p></div>}
                                <input id="bottom-upload" type="file" className="hidden" onChange={handleUpload(setBottomGarment)} />
                            </div>
                        </div>
                        <SelectionGrid label="Fit Style" options={['Untucked', 'Tucked In']} value={tuck} onChange={setTuck} />
                    </div>
                }
            />
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="TryOn" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};
