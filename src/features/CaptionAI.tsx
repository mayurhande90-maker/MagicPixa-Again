
import React, { useState, useRef } from 'react';
import { AuthProps, AppConfig } from '../types';
import { generateCaptions } from '../services/geminiService';
import { deductCredits } from '../firebase';
import { fileToBase64, Base64File } from '../utils/imageUtils';
import { FeatureLayout, UploadPlaceholder, SelectionGrid } from '../components/FeatureLayout';
import { CaptionIcon, CopyIcon } from '../components/icons';

export const CaptionAI: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [loading, setLoading] = useState(false);
    const [captions, setCaptions] = useState<{caption: string; hashtags: string}[]>([]);
    const [language, setLanguage] = useState('English');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setImage({ url: URL.createObjectURL(file), base64 });
            setCaptions([]);
        }
    };

    const handleGenerate = async () => {
        if (!image || !auth.user) return;
        
        const cost = appConfig?.featureCosts['CaptionAI'] || 1;
        // FIX: Strict credit check with fallback for undefined
        if ((auth.user.credits || 0) < cost) {
            alert("Insufficient credits. Please purchase a pack to continue.");
            return;
        }

        setLoading(true);
        try {
            const res = await generateCaptions(image.base64.base64, image.base64.mimeType, language);
            setCaptions(res);
            const updatedUser = await deductCredits(auth.user.uid, cost, 'CaptionAI');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e) {
            console.error(e);
            alert("Generation failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <FeatureLayout
                title="CaptionAI"
                description="Get viral captions in your language."
                icon={<CaptionIcon className="w-6 h-6 text-amber-500"/>}
                creditCost={appConfig?.featureCosts['CaptionAI'] || 1}
                isGenerating={loading}
                canGenerate={!!image}
                onGenerate={handleGenerate}
                resultImage={null}
                resultHeightClass="h-[400px]"
                leftContent={
                    image ? (
                        <div className="relative h-full w-full flex items-center justify-center">
                            <img src={image.url} className="max-h-full max-w-full rounded-lg shadow-md" alt="Caption Source" />
                        </div>
                    ) : <UploadPlaceholder label="Upload Image" onClick={() => fileInputRef.current?.click()} />
                }
                rightContent={
                    <div className="space-y-4 h-full overflow-y-auto p-1">
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Select Language</label>
                            <div className="flex gap-2">
                                {['English', 'Hindi', 'Marathi'].map(lang => (
                                    <button
                                        key={lang}
                                        onClick={() => setLanguage(lang)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                                            language === lang
                                            ? 'bg-amber-500 text-white border-amber-500 shadow-md scale-105'
                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        {lang}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {captions.map((c, i) => (
                            <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                <p className="text-sm text-gray-800 mb-3 leading-relaxed">{c.caption}</p>
                                <p className="text-xs text-blue-600 font-medium">{c.hashtags}</p>
                                <button onClick={() => navigator.clipboard.writeText(`${c.caption} ${c.hashtags}`)} className="mt-3 text-xs font-bold text-gray-400 hover:text-amber-600 flex items-center gap-1 transition-colors">
                                    <CopyIcon className="w-3 h-3"/> Copy Text
                                </button>
                            </div>
                        ))}
                    </div>
                }
            />
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} accept="image/*" />
        </>
    );
};
