
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, SelectionGrid, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { PixaInteriorIcon, UploadIcon, XIcon, SparklesIcon, CreditCoinIcon, CheckIcon, HomeIcon, CameraIcon } from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { generateInteriorDesign } from '../services/interiorService';
import { saveCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';

export const MagicInterior: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [style, setStyle] = useState('Modern');
    const [spaceType, setSpaceType] = useState<'home' | 'office'>('home');
    const [roomType, setRoomType] = useState('Living Room');
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);

    const cost = appConfig?.featureCosts['Pixa Interior Design'] || 8;
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
            const res = await generateInteriorDesign(image.base64.base64, image.base64.mimeType, style, spaceType, roomType, auth.user.brandKit);
            const blobUrl = await base64ToBlobUrl(res, 'image/png');
            setResultImage(blobUrl);
            
            const finalImageUrl = `data:image/png;base64,${res}`;
            const creationId = await saveCreation(auth.user.uid, finalImageUrl, 'Pixa Interior Design');
            setLastCreationId(creationId);
            
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Interior Design');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e: any) {
            console.error(e);
            alert("Interior redesign failed.");
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
                title="Pixa Interior Design" description="Redesign any room in seconds. Pixa calculates depth and physics to transform your space realistically." icon={<PixaInteriorIcon className="size-full"/>} rawIcon={true} creditCost={cost} isGenerating={loading} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={resultImage} creationId={lastCreationId}
                onNewSession={() => { setImage(null); setResultImage(null); }}
                resultOverlay={resultImage ? <ResultToolbar onNew={() => setImage(null)} onRegen={handleGenerate} onEdit={() => {}} onReport={() => setShowRefundModal(true)} /> : null}
                leftContent={
                    <div onClick={() => document.getElementById('interior-upload')?.click()} className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 cursor-pointer hover:border-indigo-400 overflow-hidden">
                        {image ? <img src={image.url} className="max-w-full max-h-full object-contain" /> : <div className="text-center opacity-40"><CameraIcon className="w-16 h-16 mx-auto mb-2 text-gray-300" /><p className="text-xs font-bold">Upload Room Photo</p></div>}
                        <input id="interior-upload" type="file" className="hidden" onChange={handleUpload} />
                    </div>
                }
                rightContent={
                    <div className="space-y-6">
                        <SelectionGrid label="Space Type" options={['home', 'office']} value={spaceType} onChange={(v: any) => setSpaceType(v)} />
                        <SelectionGrid label="Room / Area" options={['Living Room', 'Bedroom', 'Kitchen', 'Workspace', 'Reception']} value={roomType} onChange={setRoomType} />
                        <SelectionGrid label="Interior Style" options={['Modern', 'Minimalist', 'Japanese', 'Coastal', 'Industrial']} value={style} onChange={setStyle} />
                    </div>
                }
            />
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="Interior Design" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};
