
import React, { useState, useRef } from 'react';
import { AuthProps, AppConfig } from '../types';
import { FeatureLayout, UploadPlaceholder, InputField } from '../components/FeatureLayout';
import { BrandKitIcon } from '../components/icons';
import { fileToBase64, Base64File } from '../utils/imageUtils';
import { generateBrandKitPlan } from '../services/brandKitService';
import { deductCredits } from '../firebase';

export const BrandKitAI: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [productName, setProductName] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null); // JSON plan
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setImage({ url: URL.createObjectURL(file), base64 });
            setResult(null);
        }
    };

    const handleGenerate = async () => {
        if (!image || !auth.user) return;
        
        const cost = appConfig?.featureCosts['BrandKit AI'] || 5;
        // FIX: Strict credit check with fallback for undefined
        if ((auth.user.credits || 0) < cost) {
            alert("Insufficient credits. Please purchase a pack to continue.");
            return;
        }

        setLoading(true);
        try {
            const res = await generateBrandKitPlan([image.base64.base64], productName, "A great product", { colors: [], fonts: []}, "", []);
            setResult(res);
            const updatedUser = await deductCredits(auth.user.uid, cost, 'BrandKit AI');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e) {
            console.error(e);
            alert("Failed to generate plan.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <FeatureLayout
            title="BrandKit AI"
            description="Generate a full marketing pack."
            icon={<BrandKitIcon className="w-6 h-6 text-green-500"/>}
            creditCost={appConfig?.featureCosts['BrandKit AI'] || 5}
            isGenerating={loading}
            canGenerate={!!image && !!productName}
            onGenerate={handleGenerate}
            resultImage={null} // Result is text/JSON
            resultHeightClass="h-[400px]"
            leftContent={
                image ? (
                    <div className="relative h-full w-full flex items-center justify-center">
                        <img src={image.url} className="max-h-full max-w-full rounded-lg" alt="Product Source" />
                    </div>
                ) : <UploadPlaceholder label="Upload Product" onClick={() => fileInputRef.current?.click()} />
            }
            rightContent={
                <div className="space-y-4 h-full flex flex-col">
                    <InputField label="Product Name" value={productName} onChange={(e: any) => setProductName(e.target.value)} />
                    {result && (
                        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 rounded-xl text-xs font-mono">
                            <pre>{JSON.stringify(result, null, 2)}</pre>
                        </div>
                    )}
                </div>
            }
        />
    );
};
