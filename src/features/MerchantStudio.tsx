
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, SelectionGrid, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { PixaEcommerceIcon, UploadIcon, XIcon, SparklesIcon, CreditCoinIcon, CheckIcon, CameraIcon, ApparelIcon, CubeIcon } from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { generateMerchantBatch } from '../services/merchantService';
import { saveCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { ResultToolbar } from '../components/ResultToolbar';
import ToastNotification from '../components/ToastNotification';

export const MerchantStudio: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [type, setType] = useState<'apparel' | 'product'>('product');
    const [mainImage, setMainImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [packSize, setPackSize] = useState<5 | 7 | 10>(5);
    const [results, setResults] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    const costMap = { 5: 25, 7: 35, 10: 50 };
    const cost = costMap[packSize];
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setMainImage({ url: URL.createObjectURL(file), base64 });
            setResults([]);
        }
    };

    const handleGenerate = async () => {
        if (!mainImage || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }

        setLoading(true);
        setResults([]);
        try {
            const resBatch = await generateMerchantBatch({
                type,
                mainImage: mainImage.base64,
                packSize,
            }, auth.user.brandKit);
            
            const blobUrls = await Promise.all(resBatch.map(b64 => base64ToBlobUrl(b64, 'image/png')));
            setResults(blobUrls);
            
            for (const b64 of resBatch) {
                await saveCreation(auth.user.uid, `data:image/png;base64,${b64}`, 'Pixa Ecommerce Pack');
            }
            
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Ecommerce Kit');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            setNotification({ msg: `Successfully generated ${packSize} assets!`, type: 'success' });
        } catch (e: any) {
            console.error(e);
            alert("Pack generation failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleNewSession = () => { setMainImage(null); setResults([]); };

    const canGenerate = !!mainImage && !isLowCredits;

    return (
        <>
            <FeatureLayout
                title="Pixa Ecommerce Kit" description="The ultimate e-commerce engine. Generate 5, 7, or 10 listing-ready assets in one click." icon={<PixaEcommerceIcon className="size-full" />} rawIcon={true} creditCost={cost} isGenerating={loading} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={null} onNewSession={handleNewSession} hideGenerateButton={isLowCredits} resultHeightClass="h-[850px]"
                leftContent={
                    <div className="w-full h-full space-y-6">
                        <div onClick={() => document.getElementById('merchant-upload')?.click()} className="relative aspect-square w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 cursor-pointer hover:border-indigo-400 overflow-hidden">
                            {mainImage ? <img src={mainImage.url} className="max-w-full max-h-full object-contain" /> : <div className="text-center opacity-40"><CameraIcon className="w-16 h-16 mx-auto mb-2 text-gray-300" /><p className="text-xs font-bold">Upload Hero Shot</p></div>}
                            <input id="merchant-upload" type="file" className="hidden" onChange={handleUpload} />
                        </div>
                        {results.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-10">
                                {results.map((url, idx) => (
                                    <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all">
                                        <img src={url} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button onClick={() => window.open(url, '_blank')} className="bg-white p-2 rounded-full shadow-lg"><SparklesIcon className="w-5 h-5 text-indigo-600"/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                }
                rightContent={
                    <div className="space-y-6">
                        <SelectionGrid label="Category" options={['product', 'apparel']} value={type} onChange={(v: any) => setType(v)} />
                        <SelectionGrid label="Pack Size" options={[5, 7, 10] as any} value={packSize as any} onChange={(v: any) => setPackSize(parseInt(v) as any)} />
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                             <p className="text-xs text-indigo-800 leading-relaxed"><strong>Auto-Production</strong>: We will generate Hero Shots, Side Profiles, Lifestyle Mockups, and Macro Detail shots in one automated batch.</p>
                        </div>
                    </div>
                }
            />
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};
