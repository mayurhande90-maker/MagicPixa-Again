import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, InputField, MilestoneSuccessModal, checkMilestone, SelectionGrid } from '../components/FeatureLayout';
import { LightbulbIcon, UploadTrayIcon, XIcon, SparklesIcon, CreditCoinIcon, BrandKitIcon, MagicWandIcon, CopyIcon, MagicAdsIcon, PlusIcon, CloudUploadIcon, ArrowRightIcon, ReplicaIcon, ReimagineIcon, CreditCardIcon } from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl, urlToBase64 } from '../utils/imageUtils';
import { generateAdCreative, AdMakerInputs } from '../services/adMakerService';
import { deductCredits, saveCreation, claimMilestoneBonus } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';
import { AdMakerStyles as styles } from '../styles/features/PixaAdMaker.styles';

const CompactUpload: React.FC<{ 
    label: string; 
    image: { url: string } | null; 
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    onClear: () => void; 
    icon: React.ReactNode; 
    heightClass?: string; 
    optional?: boolean;
    uploadText?: string;
}> = ({ label, image, onUpload, onClear, icon, heightClass = "h-32", optional, uploadText }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="relative w-full group h-full">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">{label} {optional && <span className="text-gray-300 font-normal opacity-50 ml-1">(Optional)</span>}</label>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-white rounded-2xl border border-blue-100 flex items-center justify-center overflow-hidden shadow-sm group-hover:shadow-md transition-all`}>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>
                    <img src={image.url} className="max-w-full max-h-full object-contain p-2 relative z-10" alt={label} />
                    <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow-sm hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors z-20 border border-gray-100"><XIcon className="w-3 h-3"/></button>
                </div>
            ) : (
                <div onClick={() => inputRef.current?.click()} className={`w-full ${heightClass} border border-dashed border-gray-300 hover:border-blue-400 bg-gray-50/50 hover:bg-blue-50/30 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-white opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="p-2.5 bg-white rounded-xl shadow-sm mb-2 group-hover:scale-110 transition-transform relative z-10 border border-gray-100">{icon}</div>
                    <p className="text-[10px] font-bold text-gray-400 group-hover:text-blue-600 uppercase tracking-wider text-center px-2 relative z-10">{uploadText || `Upload ${label}`}</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
    );
};

export const BrandStylistAI: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [productImage, setProductImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [logoImage, setLogoImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [industry, setIndustry] = useState<AdMakerInputs['industry']>('ecommerce');
    const [tone, setTone] = useState('Modern');
    const [productName, setProductName] = useState('');
    const [offer, setOffer] = useState('');
    const [description, setDescription] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '9:16'>('1:1');
    
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    const cost = appConfig?.featureCosts['Pixa AdMaker'] || 10;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    // Brand Kit Sync
    useEffect(() => {
        if (auth.user?.brandKit) {
            const kit = auth.user.brandKit;
            setProductName(kit.companyName || '');
            if (kit.logos.primary) {
                urlToBase64(kit.logos.primary).then(base64 => {
                    setLogoImage({ url: kit.logos.primary!, base64 });
                }).catch(e => console.warn("Auto-logo load failed", e));
            }
        }
    }, [auth.user?.brandKit?.id]);

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setter({ url: URL.createObjectURL(file), base64 });
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!productImage || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }
        
        setLoading(true);
        setResultImage(null);
        setLastCreationId(null);
        
        try {
            const res = await generateAdCreative({
                industry,
                mainImage: productImage.base64,
                logoImage: logoImage?.base64,
                productName,
                offer,
                description,
                tone,
                aspectRatio
            }, auth.user.brandKit);
            
            const blobUrl = await base64ToBlobUrl(res, 'image/png');
            setResultImage(blobUrl);
            
            const finalImageUrl = `data:image/png;base64,${res}`;
            const creationId = await saveCreation(auth.user.uid, finalImageUrl, 'Pixa AdMaker');
            setLastCreationId(creationId);
            
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa AdMaker');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            
            setNotification({ msg: "Ad created successfully!", type: 'success' });
        } catch (e: any) {
            console.error(e);
            setNotification({ msg: `Generation failed: ${e.message}`, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleNewSession = () => {
        setProductImage(null);
        setLogoImage(null);
        setResultImage(null);
        setProductName('');
        setOffer('');
        setDescription('');
    };

    const handleEditorSave = (newUrl: string) => {
        setResultImage(newUrl);
        if (auth.user) {
            saveCreation(auth.user.uid, newUrl, 'Pixa AdMaker (Edited)');
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

    const canGenerate = !!productImage && !!productName && !isLowCredits;

    return (
        <>
            <FeatureLayout
                title="Pixa AdMaker" 
                description="Intelligent ad creation. Supports Instagram Reels, Stories, and Feeds with safe-zone logic." 
                icon={<MagicAdsIcon className="size-full" />} 
                rawIcon={true} 
                creditCost={cost}
                isGenerating={loading}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                resultImage={resultImage}
                creationId={lastCreationId}
                onNewSession={handleNewSession}
                onEdit={() => setShowMagicEditor(true)}
                activeBrandKit={auth.user?.brandKit}
                resultOverlay={resultImage ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null}
                leftContent={
                    <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                        {loading ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                <p className="text-gray-400 text-sm font-bold animate-pulse uppercase tracking-widest">Designing Ad...</p>
                            </div>
                        ) : (
                            <div className="text-center opacity-40">
                                <MagicAdsIcon className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-400 font-bold">Ad Preview Canvas</p>
                            </div>
                        )}
                    </div>
                }
                rightContent={
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <CompactUpload 
                                label="Product" 
                                image={productImage} 
                                onUpload={handleUpload(setProductImage)} 
                                onClear={() => setProductImage(null)} 
                                icon={<UploadTrayIcon className="w-6 h-6 text-blue-500" />} 
                            />
                            <CompactUpload 
                                label="Logo" 
                                image={logoImage} 
                                onUpload={handleUpload(setLogoImage)} 
                                onClear={() => setLogoImage(null)} 
                                icon={<BrandKitIcon className="w-6 h-6 text-orange-500" />} 
                                optional 
                            />
                        </div>

                        <div className="space-y-4 pt-4 border-t border-gray-100">
                            <InputField label="Brand Name" value={productName} onChange={(e: any) => setProductName(e.target.value)} placeholder="e.g. Acme Corp" />
                            <InputField label="Offer Text" value={offer} onChange={(e: any) => setOffer(e.target.value)} placeholder="e.g. 50% OFF" />
                            <InputField label="Context" value={description} onChange={(e: any) => setDescription(e.target.value)} placeholder="e.g. Fresh summer collection" />
                            
                            <SelectionGrid 
                                label="Target Platform" 
                                options={['1:1', '4:5', '9:16']} 
                                value={aspectRatio} 
                                onChange={(val: any) => setAspectRatio(val)} 
                            />
                            
                            <SelectionGrid 
                                label="Visual Tone" 
                                options={['Modern', 'Luxury', 'Minimal', 'Vibrant']} 
                                value={tone} 
                                onChange={setTone} 
                            />
                        </div>
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
                    featureName="Ad Creative" 
                />
            )}

            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};