
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, SelectionGrid, MilestoneSuccessModal, checkMilestone, InputField } from '../components/FeatureLayout';
import { PixaTogetherIcon, UploadIcon, XIcon, UserIcon, CheckIcon, CreditCoinIcon, SparklesIcon, CameraIcon } from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { generateMagicSoul } from '../services/imageToolsService';
import { saveCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';

export const PixaTogether: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [personA, setPersonA] = useState<{ url: string; base64: Base64File } | null>(null);
    const [personB, setPersonB] = useState<{ url: string; base64: Base64File } | null>(null);
    const [mode, setMode] = useState<'creative' | 'reenact' | 'professional'>('creative');
    const [relationship, setRelationship] = useState('Friends');
    const [mood, setMood] = useState('Happy');
    const [environment, setEnvironment] = useState('Outdoor Park');
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);

    const cost = appConfig?.featureCosts['Pixa Together'] || 8;
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
            const res = await generateMagicSoul(
                personA.base64.base64, 
                personA.base64.mimeType, 
                personB?.base64.base64, 
                personB?.base64.mimeType, 
                {
                    mode,
                    relationship,
                    mood,
                    environment,
                    faceStrength: 1,
                    clothingMode: 'Match Vibe',
                    locks: { age: true, hair: true, accessories: false },
                    autoFix: true
                },
                auth.user.brandKit
            );
            const blobUrl = await base64ToBlobUrl(res, 'image/png');
            setResultImage(blobUrl);
            
            const finalImageUrl = `data:image/png;base64,${res}`;
            const creationId = await saveCreation(auth.user.uid, finalImageUrl, 'Pixa Together');
            setLastCreationId(creationId);
            
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Together');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e: any) {
            console.error(e);
            alert("Together generation failed.");
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
                title="Pixa Together" description="Merge people into one hyper-realistic photo. Create team shots, couple photos, or creative portraits." icon={<PixaTogetherIcon className="size-full"/>} rawIcon={true} creditCost={cost} isGenerating={loading} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={resultImage} creationId={lastCreationId}
                onNewSession={() => { setPersonA(null); setPersonB(null); setResultImage(null); }}
                resultOverlay={resultImage ? <ResultToolbar onNew={() => setPersonA(null)} onRegen={handleGenerate} onEdit={() => {}} onReport={() => setShowRefundModal(true)} /> : null}
                leftContent={
                    <div className="grid grid-cols-1 gap-4 w-full h-full">
                        <div onClick={() => document.getElementById('together-upload-a')?.click()} className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 cursor-pointer hover:border-indigo-400 overflow-hidden">
                            {personA ? <img src={personA.url} className="max-w-full max-h-full object-contain" /> : <div className="text-center opacity-40"><CameraIcon className="w-16 h-16 mx-auto mb-2 text-gray-300" /><p className="text-xs font-bold">Person A Photo</p></div>}
                            <input id="together-upload-a" type="file" className="hidden" onChange={handleUpload(setPersonA)} />
                        </div>
                        <div onClick={() => document.getElementById('together-upload-b')?.click()} className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 cursor-pointer hover:border-purple-400 overflow-hidden">
                            {personB ? <img src={personB.url} className="max-w-full max-h-full object-contain" /> : <div className="text-center opacity-40"><UserIcon className="w-16 h-16 mx-auto mb-2 text-gray-300" /><p className="text-xs font-bold">Person B Photo</p></div>}
                            <input id="together-upload-b" type="file" className="hidden" onChange={handleUpload(setPersonB)} />
                        </div>
                    </div>
                }
                rightContent={
                    <div className="space-y-6">
                        <SelectionGrid label="Together Mode" options={['creative', 'professional']} value={mode} onChange={(v: any) => setMode(v)} />
                        <SelectionGrid label="Relationship" options={['Friends', 'Couple', 'Family', 'Co-workers']} value={relationship} onChange={setRelationship} />
                        <SelectionGrid label="Mood" options={['Happy', 'Cinematic', 'Romantic', 'Professional']} value={mood} onChange={setMood} />
                        <SelectionGrid label="Environment" options={['Outdoor Park', 'Beach', 'Luxury Rooftop', 'City Street', 'Modern Studio']} value={environment} onChange={setEnvironment} />
                    </div>
                }
            />
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="Together Photo" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};
