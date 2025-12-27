
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, SelectionGrid, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { PixaCaptionIcon, UploadIcon, XIcon, SparklesIcon, CreditCoinIcon, CheckIcon, CopyIcon, CameraIcon } from '../components/icons';
import { fileToBase64, Base64File } from '../utils/imageUtils';
import { generateCaptions } from '../services/captionService';
import { deductCredits, claimMilestoneBonus } from '../firebase';
import ToastNotification from '../components/ToastNotification';

export const CaptionAI: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [tone, setTone] = useState('Friendly');
    const [language, setLanguage] = useState('English');
    const [results, setResults] = useState<{ caption: string; hashtags: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    const cost = appConfig?.featureCosts['Pixa Caption Pro'] || 2;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setImage({ url: URL.createObjectURL(file), base64 });
            setResults([]);
        }
    };

    const handleGenerate = async () => {
        if (!image || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }

        setLoading(true);
        try {
            const data = await generateCaptions(image.base64.base64, image.base64.mimeType, language, tone, 'SEO Friendly', auth.user.brandKit);
            setResults(data);
            
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Caption Pro');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e: any) {
            console.error(e);
            alert("Caption generation failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
        setNotification({ msg: "Caption copied to clipboard!", type: 'success' });
    };

    const handleNewSession = () => { setImage(null); setResults([]); };

    const canGenerate = !!image && !isLowCredits;

    return (
        <>
            <FeatureLayout
                title="Pixa Caption Pro" description="Get viral, research-backed captions optimized for engagement and organic reach." icon={<PixaCaptionIcon className="size-full"/>} rawIcon={true} creditCost={cost} isGenerating={loading} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={null} onNewSession={handleNewSession} resultHeightClass="h-[600px]" hideGenerateButton={isLowCredits}
                leftContent={
                    <div className="w-full h-full space-y-6">
                        <div onClick={() => document.getElementById('caption-upload')?.click()} className="relative aspect-video w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 cursor-pointer hover:border-blue-400 overflow-hidden">
                            {image ? <img src={image.url} className="max-w-full max-h-full object-contain" /> : <div className="text-center opacity-40"><CameraIcon className="w-16 h-16 mx-auto mb-2 text-gray-300" /><p className="text-xs font-bold">Upload Scene Photo</p></div>}
                            <input id="caption-upload" type="file" className="hidden" onChange={handleUpload} />
                        </div>
                        {results.length > 0 && (
                            <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {results.map((res, idx) => (
                                    <div key={idx} className="bg-gray-50 p-5 rounded-2xl border border-gray-100 shadow-sm relative group animate-fadeIn">
                                        <p className="text-sm text-gray-700 leading-relaxed mb-3">{res.caption}</p>
                                        <p className="text-xs text-indigo-500 font-mono italic mb-4">{res.hashtags}</p>
                                        <button 
                                            onClick={() => handleCopy(`${res.caption}\n\n${res.hashtags}`, idx)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${copiedIndex === idx ? 'bg-green-100 text-green-700' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-500 hover:text-indigo-600 shadow-sm'}`}
                                        >
                                            {copiedIndex === idx ? <><CheckIcon className="w-4 h-4"/> Copied</> : <><CopyIcon className="w-4 h-4"/> Copy Caption</>}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                }
                rightContent={
                    <div className="space-y-6">
                        <SelectionGrid label="Language" options={['English', 'Hindi', 'Marathi', 'Spanish', 'French']} value={language} onChange={setLanguage} />
                        <SelectionGrid label="Tone" options={['Friendly', 'Funny', 'Chill', 'Hype/Exciting', 'Professional', 'Marketing']} value={tone} onChange={setTone} />
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                             <p className="text-xs text-blue-800 leading-relaxed">Pixa will use Google Search to find current trending hashtags and high-converting hooks for your specific niche.</p>
                        </div>
                    </div>
                }
            />
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};
