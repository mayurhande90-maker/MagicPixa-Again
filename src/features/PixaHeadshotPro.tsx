
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, SelectionGrid, MilestoneSuccessModal, checkMilestone, InputField } from '../components/FeatureLayout';
import { PixaHeadshotIcon, UploadIcon, XIcon, UserIcon, CheckIcon, CreditCardIcon, SparklesIcon, CameraIcon } from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { generateProfessionalHeadshot } from '../services/headshotService';
import { saveCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';

export const PixaHeadshotPro: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [personA, setPersonA] = useState<{ url: string; base64: Base64File } | null>(null);
    const [personB, setPersonB] = useState<{ url: string; base64: Base64File } | null>(null);
    const [archetype, setArchetype] = useState('Executive');
    const [background, setBackground] = useState('Studio Grey');
    const [customDetails, setCustomDetails] = useState("");
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);

    const cost = appConfig?.featureCosts['Pixa Headshot Pro'] || 10;
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
        if (!personA || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }

        setLoading(true);
        setResultImage(null);
        try {
            const res = await generateProfessionalHeadshot(
                personA.base64.base64, 
                personA.base64.mimeType, 
                archetype, 
                background, 
                customDetails, 
                personB?.base64.base64, 
                personB?.base64.mimeType
            );
            const blobUrl = await base64ToBlobUrl(res, 'image/png');
            setResultImage(blobUrl);
            
            const finalImageUrl = `data:image/png;base64,${res}`;
            const creationId = await saveCreation(auth.user.uid, finalImageUrl, 'Pixa Headshot Pro');
            setLastCreationId(creationId);
            
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Headshot Pro');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e: any) {
            console.error(e);
            alert("Headshot generation failed.");
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

    const canGenerate = !!personA && !isLowCredits;

    return (
        <>
            <FeatureLayout 
                title="Pixa Headshot Pro" 
                description="Create studio-quality professional headshots instantly." 
                icon={<PixaHeadshotIcon className="size-full"/>} 
                rawIcon={true} 
                creditCost={cost} 
                isGenerating={loading} 
                canGenerate={canGenerate} 
                onGenerate={handleGenerate} 
                resultImage={resultImage}
                creationId={lastCreationId}
                onNewSession={() => { setPersonA(null); setPersonB(null); setResultImage(null); }}
                resultOverlay={resultImage ? <ResultToolbar onNew={() => setPersonA(null)} onRegen={handleGenerate} onEdit={() => {}} onReport={() => setShowRefundModal(true)} /> : null}
                leftContent={
                    <div className="grid grid-cols-1 gap-4 w-full h-full">
                        <div onClick={() => document.getElementById('headshot-upload-a')?.click()} className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 cursor-pointer hover:border-blue-400 overflow-hidden">
                            {personA ? <img src={personA.url} className="max-w-full max-h-full object-contain" /> : <div className="text-center opacity-40"><CameraIcon className="w-16 h-16 mx-auto mb-2" /><p className="text-xs font-bold">Upload Selfie (Person A)</p></div>}
                            <input id="headshot-upload-a" type="file" className="hidden" onChange={handleUpload(setPersonA)} />
                        </div>
                        <div onClick={() => document.getElementById('headshot-upload-b')?.click()} className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 cursor-pointer hover:border-purple-400 overflow-hidden">
                            {personB ? <img src={personB.url} className="max-w-full max-h-full object-contain" /> : <div className="text-center opacity-40"><UserIcon className="w-16 h-16 mx-auto mb-2" /><p className="text-xs font-bold">Partner Selfie (Optional)</p></div>}
                            <input id="headshot-upload-b" type="file" className="hidden" onChange={handleUpload(setPersonB)} />
                        </div>
                    </div>
                }
                rightContent={
                    <div className="space-y-6">
                        <SelectionGrid label="Career Persona" options={['Executive', 'Tech', 'Creative', 'Medical', 'Legal', 'Realtor']} value={archetype} onChange={setArchetype} />
                        <SelectionGrid label="Studio Background" options={['Studio Grey', 'Modern Office', 'City Skyline', 'Library', 'Outdoor Garden', 'Custom']} value={background} onChange={setBackground} />
                        <InputField label="Additional Details" value={customDetails} onChange={(e: any) => setCustomDetails(e.target.value)} placeholder="e.g. wearing a blue tie, smiling confidently" />
                    </div>
                }
            />
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="Headshot" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};
