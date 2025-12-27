import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, SelectionGrid, MilestoneSuccessModal, checkMilestone, InputField } from '../components/FeatureLayout';
import { ThumbnailIcon, UploadIcon, XIcon, SparklesIcon, CreditCoinIcon, CheckIcon, YoutubeIcon, InstagramIcon } from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { generateThumbnail } from '../services/thumbnailService';
import { saveCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';

export const ThumbnailStudio: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [format, setFormat] = useState<'landscape' | 'portrait'>('landscape');
    const [category, setCategory] = useState('Lifestyle');
    const [mood, setMood] = useState('Viral');
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState<{ url: string; base64: Base64File } | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);

    const cost = appConfig?.featureCosts['Pixa Thumbnail Pro'] || 8;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setSubject({ url: URL.createObjectURL(file), base64 });
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!auth.user || !title) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }

        setLoading(true);
        setResult(null);
        try {
            // Fix: Pass subject.base64 to match the expected { base64: string; mimeType: string } shape
            const res = await generateThumbnail({
                format,
                category,
                mood,
                title,
                subjectImage: subject?.base64 || null,
                requestId: `req_${Date.now()}`
            });
            const blobUrl = await base64ToBlobUrl(res, 'image/png');
            setResult(blobUrl);
            
            const finalImageUrl = `data:image/png;base64,${res}`;
            const creationId = await saveCreation(auth.user.uid, finalImageUrl, 'Pixa Thumbnail Pro');
            setLastCreationId(creationId);
            
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Thumbnail Pro');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e: any) {
            console.error(e);
            alert("Thumbnail generation failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleRefundRequest = async (reason: string) => {
        if (!auth.user || !result) return;
        setIsRefunding(true);
        try {
            const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, result, lastCreationId || undefined);
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

    const canGenerate = !!title && !isLowCredits;

    return (
        <>
            <FeatureLayout 
                title="Pixa Thumbnail Pro" 
                description="Create viral, high-CTR thumbnails. Analyze trends and generate hyper-realistic results." 
                icon={<ThumbnailIcon className="size-full"/>} 
                rawIcon={true} 
                creditCost={cost} 
                isGenerating={loading} 
                canGenerate={canGenerate} 
                onGenerate={handleGenerate} 
                resultImage={result} 
                creationId={lastCreationId}
                onNewSession={() => { setSubject(null); setResult(null); setTitle(""); }}
                resultOverlay={result ? <ResultToolbar onNew={() => setSubject(null)} onRegen={handleGenerate} onEdit={() => {}} onReport={() => setShowRefundModal(true)} /> : null}
                leftContent={
                    <div onClick={() => document.getElementById('thumb-upload')?.click()} className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 cursor-pointer hover:border-orange-400 overflow-hidden">
                        {subject ? <img src={subject.url} className="max-w-full max-h-full object-contain" /> : <div className="text-center opacity-40"><SparklesIcon className="w-16 h-16 mx-auto mb-2 text-gray-300" /><p className="text-xs font-bold">Upload Your Photo</p></div>}
                        <input id="thumb-upload" type="file" className="hidden" onChange={handleUpload} />
                    </div>
                }
                rightContent={
                    <div className="space-y-6">
                        <SelectionGrid label="Layout Format" options={['landscape', 'portrait']} value={format} onChange={(v: any) => setFormat(v)} />
                        <InputField label="Thumbnail Title" value={title} onChange={(e: any) => setTitle(e.target.value)} placeholder="e.g. My Morning Routine" />
                        <SelectionGrid label="Visual Vibe" options={['Viral', 'Cinematic', 'Luxury/Premium', 'Gamer']} value={mood} onChange={setMood} />
                        <SelectionGrid label="Niche" options={['Lifestyle', 'Tech', 'Education', 'Gaming', 'Finance']} value={category} onChange={setCategory} />
                    </div>
                }
            />
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="Thumbnail" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};