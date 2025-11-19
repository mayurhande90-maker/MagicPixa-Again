import React, { useState, useEffect, useRef } from 'react';
import { User, Page, View, AuthProps, AppConfig, Creation } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Billing from './components/Billing';
import { AdminPanel } from './components/AdminPanel';
import { 
    getCreations, 
    saveCreation, 
    deleteCreation, 
    deductCredits 
} from './firebase';
import { 
    generateInteriorDesign, 
    colourizeImage, 
    generateMagicSoul, 
    generateApparelTryOn, 
    generateMockup, 
    generateCaptions, 
    generateProductPackPlan, 
    editImageWithPrompt,
    generateBrandStylistImage,
    generateThumbnail,
    startLiveSession,
    analyzeVideoFrames
} from './services/geminiService';
import { fileToBase64, Base64File } from './utils/imageUtils';
import { extractFramesFromVideo } from './utils/videoUtils';
import { 
    PhotoStudioIcon, 
    UploadIcon, 
    SparklesIcon, 
    DownloadIcon, 
    TrashIcon, 
    ProjectsIcon,
    MicrophoneIcon,
    CubeIcon,
    UsersIcon,
    VideoCameraIcon,
    LightbulbIcon,
    ArrowUpCircleIcon,
    ThumbnailIcon,
    PaletteIcon,
    HomeIcon,
    MockupIcon,
    CaptionIcon,
    ProductStudioIcon,
    DashboardIcon,
    XIcon,
    AudioWaveIcon,
    ArrowRightIcon,
    GarmentTopIcon,
    GarmentTrousersIcon,
    CopyIcon
} from './components/icons';
import { LiveServerMessage, Blob } from '@google/genai';
import { encode, decode, decodeAudioData } from './utils/audioUtils';

interface DashboardPageProps {
    navigateTo: (page: Page, view?: View, sectionId?: string) => void;
    auth: AuthProps;
    activeView: View;
    setActiveView: (view: View) => void;
    openEditProfileModal: () => void;
    isConversationOpen: boolean;
    setIsConversationOpen: (isOpen: boolean) => void;
    appConfig: AppConfig | null;
    setAppConfig: (config: AppConfig) => void;
}

const InputField: React.FC<any> = ({ label, id, ...props }) => (
    <div className="mb-4">
        {label && <label htmlFor={id} className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{label}</label>}
        <input id={id} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all" {...props} />
    </div>
);

const SelectField: React.FC<any> = ({ label, children, ...props }) => (
    <div className="mb-4">
         {label && <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{label}</label>}
         <div className="relative">
            <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl appearance-none focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all" {...props}>
                {children}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
         </div>
    </div>
);

const ImageModal: React.FC<{ imageUrl: string; onClose: () => void }> = ({ imageUrl, onClose }) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4" onClick={onClose}>
        <div className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center">
            <button onClick={onClose} className="absolute -top-12 right-0 text-white hover:text-yellow-400 transition-colors"><XIcon className="w-8 h-8" /></button>
            <img src={imageUrl} alt="Full view" className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain" />
        </div>
    </div>
);

// --- Standardized Layout Component ---
const FeatureLayout: React.FC<{
    title: string;
    icon: React.ReactNode;
    leftContent: React.ReactNode; // The Upload/Preview Area
    rightContent: React.ReactNode; // The Controls Area
    onGenerate: () => void;
    isGenerating: boolean;
    canGenerate: boolean;
    creditCost: number;
    resultImage: string | null;
    onResetResult?: () => void;
}> = ({ title, icon, leftContent, rightContent, onGenerate, isGenerating, canGenerate, creditCost, resultImage, onResetResult }) => {
    return (
        <div className="h-full flex flex-col p-4 lg:p-8 max-w-[1600px] mx-auto">
            <div className="mb-6 flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                    {icon}
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[600px]">
                {/* LEFT SIDE: Canvas / Visuals */}
                <div className="lg:col-span-8 bg-gray-100 rounded-3xl border border-gray-200 overflow-hidden relative group">
                    {resultImage ? (
                        <div className="w-full h-full flex items-center justify-center bg-[#1E1E1E] relative">
                             <img src={resultImage} className="max-w-full max-h-full object-contain shadow-2xl" />
                             <div className="absolute top-4 right-4 flex gap-2">
                                <button onClick={() => { const a = document.createElement('a'); a.href=resultImage; a.download='magicpixa-creation.png'; a.click(); }} className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white p-3 rounded-xl transition-all border border-white/20">
                                    <DownloadIcon className="w-6 h-6"/>
                                </button>
                                {onResetResult && (
                                    <button onClick={onResetResult} className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white p-3 rounded-xl transition-all border border-white/20">
                                        <XIcon className="w-6 h-6"/>
                                    </button>
                                )}
                             </div>
                        </div>
                    ) : (
                        <div className="w-full h-full p-4 sm:p-8 flex flex-col justify-center">
                            {leftContent}
                        </div>
                    )}
                </div>

                {/* RIGHT SIDE: Control Panel */}
                <div className="lg:col-span-4 flex flex-col h-full">
                    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm flex-1 flex flex-col">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">Controls</h3>
                        
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {rightContent}
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <button 
                                onClick={onGenerate} 
                                disabled={isGenerating || !canGenerate}
                                className="w-full bg-[#f9d230] hover:bg-[#eec51f] text-black text-lg font-bold py-4 rounded-xl shadow-lg shadow-yellow-400/20 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
                            >
                                {isGenerating ? (
                                    <>
                                        <SparklesIcon className="w-6 h-6 animate-spin"/> Generating...
                                    </>
                                ) : (
                                    <>
                                        <SparklesIcon className="w-6 h-6"/> Generate
                                    </>
                                )}
                            </button>
                            <p className="text-center text-xs font-medium text-gray-400 mt-3 flex items-center justify-center gap-1">
                                Cost: <span className="text-gray-600 font-bold">{creditCost} Credits</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Upload Placeholder Component ---
const UploadPlaceholder: React.FC<{ label: string; onClick: () => void; icon?: React.ReactNode }> = ({ label, onClick, icon }) => (
    <div 
        onClick={onClick}
        className="w-full h-full min-h-[300px] border-3 border-dashed border-gray-300 bg-gray-50 hover:bg-white hover:border-yellow-400 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all group"
    >
        <div className="p-4 bg-white rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
            {icon || <UploadIcon className="w-8 h-8 text-gray-400 group-hover:text-yellow-500 transition-colors" />}
        </div>
        <p className="text-gray-500 font-semibold group-hover:text-gray-800 transition-colors">{label}</p>
        <p className="text-xs text-gray-400 mt-2">Supports JPG, PNG</p>
    </div>
);


// --- Feature Components ---

const MagicPhotoStudio: React.FC<{ auth: AuthProps; navigateTo: any; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!image || !auth.user) return;
        setLoading(true);
        try {
            const res = await editImageWithPrompt(image.base64.base64, image.base64.mimeType, prompt || 'automatic');
            const url = `data:image/png;base64,${res}`;
            setResult(url);
            saveCreation(auth.user.uid, url, 'Magic Photo Studio');
            const updated = await deductCredits(auth.user.uid, appConfig?.featureCosts['Magic Photo Studio'] || 2, 'Magic Photo Studio');
            auth.setUser(prev => prev ? { ...prev, credits: updated.credits } : null);
        } catch (e) {
            console.error(e);
            alert('Generation failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <FeatureLayout 
            title="Magic Photo Studio"
            icon={<PhotoStudioIcon className="w-6 h-6 text-blue-500"/>}
            creditCost={appConfig?.featureCosts['Magic Photo Studio'] || 2}
            isGenerating={loading}
            canGenerate={!!image}
            onGenerate={handleGenerate}
            resultImage={result}
            onResetResult={() => setResult(null)}
            leftContent={
                image ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <img src={image.url} className="max-w-full max-h-full rounded-lg shadow-lg" />
                        <button onClick={() => setImage(null)} className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-md hover:bg-red-50 text-red-500"><TrashIcon className="w-5 h-5"/></button>
                    </div>
                ) : (
                    <>
                        <UploadPlaceholder label="Upload Product Photo" onClick={() => document.getElementById('studio-upload')?.click()} />
                        <input id="studio-upload" type="file" className="hidden" accept="image/*" onChange={async (e) => { if (e.target.files?.[0]) setImage({ url: URL.createObjectURL(e.target.files[0]), base64: await fileToBase64(e.target.files[0]) }) }} />
                    </>
                )
            }
            rightContent={
                <div className="space-y-6">
                    <InputField 
                        label="Describe Desired Look" 
                        placeholder="e.g. Cinematic lighting, neon background, luxury podium..." 
                        value={prompt} 
                        onChange={(e: any) => setPrompt(e.target.value)} 
                    />
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <h4 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2"><LightbulbIcon className="w-4 h-4"/> Pro Tip</h4>
                        <p className="text-xs text-blue-600 leading-relaxed">
                            For best results, upload a photo with good lighting. If you leave the description blank, our AI will automatically enhance the photo for a professional studio look.
                        </p>
                    </div>
                </div>
            }
        />
    );
};

const MagicInterior: React.FC<{ auth: AuthProps; navigateTo: any; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [style, setStyle] = useState('Modern');
    const [roomType, setRoomType] = useState('Living Room');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!image || !auth.user) return;
        setLoading(true);
        try {
            const res = await generateInteriorDesign(image.base64.base64, image.base64.mimeType, style, 'home', roomType);
            const url = `data:image/png;base64,${res}`;
            setResult(url);
            saveCreation(auth.user.uid, url, 'Magic Interior');
            const updated = await deductCredits(auth.user.uid, appConfig?.featureCosts['Magic Interior'] || 2, 'Magic Interior');
            auth.setUser(prev => prev ? { ...prev, credits: updated.credits } : null);
        } catch (e) {
            console.error(e);
            alert('Generation failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <FeatureLayout 
            title="Magic Interior"
            icon={<HomeIcon className="w-6 h-6 text-orange-500"/>}
            creditCost={appConfig?.featureCosts['Magic Interior'] || 2}
            isGenerating={loading}
            canGenerate={!!image}
            onGenerate={handleGenerate}
            resultImage={result}
            onResetResult={() => setResult(null)}
            leftContent={
                image ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <img src={image.url} className="max-w-full max-h-full rounded-lg shadow-lg" />
                        <button onClick={() => setImage(null)} className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-md hover:bg-red-50 text-red-500"><TrashIcon className="w-5 h-5"/></button>
                    </div>
                ) : (
                    <>
                        <UploadPlaceholder label="Upload Room Photo" onClick={() => document.getElementById('interior-upload')?.click()} />
                        <input id="interior-upload" type="file" className="hidden" accept="image/*" onChange={async (e) => { if (e.target.files?.[0]) setImage({ url: URL.createObjectURL(e.target.files[0]), base64: await fileToBase64(e.target.files[0]) }) }} />
                    </>
                )
            }
            rightContent={
                <div className="space-y-6">
                    <SelectField label="Design Style" value={style} onChange={(e: any) => setStyle(e.target.value)}>
                        {['Modern', 'Japanese', 'American', 'Coastal', 'Futuristic', 'Traditional Indian', 'Arabic', 'Industrial', 'Minimalist'].map(s => <option key={s} value={s}>{s}</option>)}
                    </SelectField>
                    <SelectField label="Room Type" value={roomType} onChange={(e: any) => setRoomType(e.target.value)}>
                        {['Living Room', 'Bedroom', 'Kitchen', 'Office', 'Bathroom', 'Dining Room'].map(s => <option key={s} value={s}>{s}</option>)}
                    </SelectField>
                </div>
            }
        />
    );
};

const MagicPhotoColour: React.FC<{ auth: AuthProps; navigateTo: any; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [mode, setMode] = useState<'restore' | 'colourize_only'>('restore');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!image || !auth.user) return;
        setLoading(true);
        try {
            const res = await colourizeImage(image.base64.base64, image.base64.mimeType, mode);
            const url = `data:image/png;base64,${res}`;
            setResult(url);
            saveCreation(auth.user.uid, url, 'Magic Photo Colour');
            const updated = await deductCredits(auth.user.uid, appConfig?.featureCosts['Magic Photo Colour'] || 2, 'Magic Photo Colour');
            auth.setUser(prev => prev ? { ...prev, credits: updated.credits } : null);
        } catch (e) {
            console.error(e);
            alert('Generation failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <FeatureLayout 
            title="Magic Photo Colour"
            icon={<PaletteIcon className="w-6 h-6 text-rose-500"/>}
            creditCost={appConfig?.featureCosts['Magic Photo Colour'] || 2}
            isGenerating={loading}
            canGenerate={!!image}
            onGenerate={handleGenerate}
            resultImage={result}
            onResetResult={() => setResult(null)}
            leftContent={
                image ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <img src={image.url} className="max-w-full max-h-full rounded-lg shadow-lg" />
                        <button onClick={() => setImage(null)} className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-md hover:bg-red-50 text-red-500"><TrashIcon className="w-5 h-5"/></button>
                    </div>
                ) : (
                    <>
                        <UploadPlaceholder label="Upload B&W Photo" onClick={() => document.getElementById('colour-upload')?.click()} />
                        <input id="colour-upload" type="file" className="hidden" accept="image/*" onChange={async (e) => { if (e.target.files?.[0]) setImage({ url: URL.createObjectURL(e.target.files[0]), base64: await fileToBase64(e.target.files[0]) }) }} />
                    </>
                )
            }
            rightContent={
                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Enhancement Mode</label>
                        <div className="grid grid-cols-1 gap-3">
                            <button onClick={() => setMode('restore')} className={`p-4 rounded-xl border-2 text-left transition-all ${mode === 'restore' ? 'border-rose-500 bg-rose-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                <div className="font-bold text-gray-900">Restore & Colourize</div>
                                <div className="text-xs text-gray-500 mt-1">Fixes scratches, noise, and adds color.</div>
                            </button>
                            <button onClick={() => setMode('colourize_only')} className={`p-4 rounded-xl border-2 text-left transition-all ${mode === 'colourize_only' ? 'border-rose-500 bg-rose-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                <div className="font-bold text-gray-900">Colourize Only</div>
                                <div className="text-xs text-gray-500 mt-1">Adds color without repairing damage.</div>
                            </button>
                        </div>
                    </div>
                </div>
            }
        />
    );
};

const MagicSoul: React.FC<{ auth: AuthProps; navigateTo: any; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [personA, setPersonA] = useState<{ url: string; base64: Base64File } | null>(null);
    const [personB, setPersonB] = useState<{ url: string; base64: Base64File } | null>(null);
    const [style, setStyle] = useState('Cinematic');
    const [env, setEnv] = useState('Coffee Shop');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!personA || !personB || !auth.user) return;
        setLoading(true);
        try {
            const res = await generateMagicSoul(personA.base64.base64, personA.base64.mimeType, personB.base64.base64, personB.base64.mimeType, style, env);
            const url = `data:image/png;base64,${res}`;
            setResult(url);
            saveCreation(auth.user.uid, url, 'Magic Soul');
            const updated = await deductCredits(auth.user.uid, appConfig?.featureCosts['Magic Soul'] || 3, 'Magic Soul');
            auth.setUser(prev => prev ? { ...prev, credits: updated.credits } : null);
        } catch (e) {
            console.error(e);
            alert('Generation failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <FeatureLayout 
            title="Magic Soul"
            icon={<UsersIcon className="w-6 h-6 text-pink-500"/>}
            creditCost={appConfig?.featureCosts['Magic Soul'] || 3}
            isGenerating={loading}
            canGenerate={!!personA && !!personB}
            onGenerate={handleGenerate}
            resultImage={result}
            onResetResult={() => setResult(null)}
            leftContent={
                <div className="h-full flex flex-col gap-4">
                     <div className="flex-1 relative rounded-xl overflow-hidden border-2 border-dashed border-gray-300 bg-white hover:border-pink-400 transition-colors group cursor-pointer" onClick={() => document.getElementById('soul-a-upload')?.click()}>
                        {personA ? (
                             <>
                                <img src={personA.url} className="w-full h-full object-cover" />
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 text-center">Subject A</div>
                             </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full">
                                <UploadIcon className="w-8 h-8 text-gray-300 group-hover:text-pink-500 mb-2"/>
                                <span className="text-sm font-bold text-gray-500 group-hover:text-gray-700">Upload Subject A</span>
                            </div>
                        )}
                        <input id="soul-a-upload" type="file" className="hidden" accept="image/*" onChange={async (e) => { if (e.target.files?.[0]) setPersonA({ url: URL.createObjectURL(e.target.files[0]), base64: await fileToBase64(e.target.files[0]) }) }} />
                     </div>
                     <div className="flex-1 relative rounded-xl overflow-hidden border-2 border-dashed border-gray-300 bg-white hover:border-pink-400 transition-colors group cursor-pointer" onClick={() => document.getElementById('soul-b-upload')?.click()}>
                        {personB ? (
                             <>
                                <img src={personB.url} className="w-full h-full object-cover" />
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 text-center">Subject B</div>
                             </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full">
                                <UploadIcon className="w-8 h-8 text-gray-300 group-hover:text-pink-500 mb-2"/>
                                <span className="text-sm font-bold text-gray-500 group-hover:text-gray-700">Upload Subject B</span>
                            </div>
                        )}
                        <input id="soul-b-upload" type="file" className="hidden" accept="image/*" onChange={async (e) => { if (e.target.files?.[0]) setPersonB({ url: URL.createObjectURL(e.target.files[0]), base64: await fileToBase64(e.target.files[0]) }) }} />
                     </div>
                </div>
            }
            rightContent={
                <div className="space-y-6">
                     <InputField 
                        label="Environment" 
                        value={env} 
                        onChange={(e: any) => setEnv(e.target.value)} 
                        placeholder="e.g., Paris Cafe, Beach at Sunset..."
                    />
                    <InputField 
                        label="Art Style" 
                        value={style} 
                        onChange={(e: any) => setStyle(e.target.value)} 
                        placeholder="e.g., Cinematic, Oil Painting, Anime..."
                    />
                </div>
            }
        />
    );
};

const MagicApparel: React.FC<{ auth: AuthProps; navigateTo: any; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [model, setModel] = useState<{ url: string; base64: Base64File } | null>(null);
    const [garment, setGarment] = useState<{ url: string; base64: Base64File } | null>(null);
    const [type, setType] = useState('top');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!model || !garment || !auth.user) return;
        setLoading(true);
        try {
            const res = await generateApparelTryOn(model.base64.base64, model.base64.mimeType, [{ type, base64: garment.base64.base64, mimeType: garment.base64.mimeType }]);
            const url = `data:image/png;base64,${res}`;
            setResult(url);
            saveCreation(auth.user.uid, url, 'Magic Apparel');
            const updated = await deductCredits(auth.user.uid, appConfig?.featureCosts['Magic Apparel'] || 3, 'Magic Apparel');
            auth.setUser(prev => prev ? { ...prev, credits: updated.credits } : null);
        } catch (e) {
            console.error(e);
            alert('Try-on failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <FeatureLayout 
            title="Magic Apparel"
            icon={<UsersIcon className="w-6 h-6 text-teal-500"/>}
            creditCost={appConfig?.featureCosts['Magic Apparel'] || 3}
            isGenerating={loading}
            canGenerate={!!model && !!garment}
            onGenerate={handleGenerate}
            resultImage={result}
            onResetResult={() => setResult(null)}
            leftContent={
                <div className="h-full flex flex-col gap-4">
                     <div className="flex-1 relative rounded-xl overflow-hidden border-2 border-dashed border-gray-300 bg-white hover:border-teal-400 transition-colors group cursor-pointer" onClick={() => document.getElementById('apparel-model')?.click()}>
                        {model ? (
                             <>
                                <img src={model.url} className="w-full h-full object-cover" />
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 text-center">Model</div>
                             </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full">
                                <UploadIcon className="w-8 h-8 text-gray-300 group-hover:text-teal-500 mb-2"/>
                                <span className="text-sm font-bold text-gray-500 group-hover:text-gray-700">Upload Model</span>
                            </div>
                        )}
                        <input id="apparel-model" type="file" className="hidden" accept="image/*" onChange={async (e) => { if (e.target.files?.[0]) setModel({ url: URL.createObjectURL(e.target.files[0]), base64: await fileToBase64(e.target.files[0]) }) }} />
                     </div>
                     <div className="flex-1 relative rounded-xl overflow-hidden border-2 border-dashed border-gray-300 bg-white hover:border-teal-400 transition-colors group cursor-pointer" onClick={() => document.getElementById('apparel-garment')?.click()}>
                        {garment ? (
                             <>
                                <img src={garment.url} className="w-full h-full object-contain" />
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 text-center">Garment</div>
                             </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full">
                                <UploadIcon className="w-8 h-8 text-gray-300 group-hover:text-teal-500 mb-2"/>
                                <span className="text-sm font-bold text-gray-500 group-hover:text-gray-700">Upload Cloth</span>
                            </div>
                        )}
                        <input id="apparel-garment" type="file" className="hidden" accept="image/*" onChange={async (e) => { if (e.target.files?.[0]) setGarment({ url: URL.createObjectURL(e.target.files[0]), base64: await fileToBase64(e.target.files[0]) }) }} />
                     </div>
                </div>
            }
            rightContent={
                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Garment Type</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setType('top')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${type === 'top' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                <GarmentTopIcon className="w-8 h-8"/>
                                <span className="font-bold text-sm">Top</span>
                            </button>
                            <button onClick={() => setType('bottom')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${type === 'bottom' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                <GarmentTrousersIcon className="w-8 h-8"/>
                                <span className="font-bold text-sm">Bottom</span>
                            </button>
                        </div>
                    </div>
                </div>
            }
        />
    );
};

const MagicMockup: React.FC<{ auth: AuthProps; navigateTo: any; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [type, setType] = useState('T-Shirt');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!image || !auth.user) return;
        setLoading(true);
        try {
            const res = await generateMockup(image.base64.base64, image.base64.mimeType, type);
            const url = `data:image/png;base64,${res}`;
            setResult(url);
            saveCreation(auth.user.uid, url, 'Magic Mockup');
            const updated = await deductCredits(auth.user.uid, appConfig?.featureCosts['Magic Mockup'] || 2, 'Magic Mockup');
            auth.setUser(prev => prev ? { ...prev, credits: updated.credits } : null);
        } catch (e) {
            console.error(e);
            alert('Generation failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
         <FeatureLayout 
            title="Magic Mockup"
            icon={<MockupIcon className="w-6 h-6 text-indigo-500"/>}
            creditCost={appConfig?.featureCosts['Magic Mockup'] || 2}
            isGenerating={loading}
            canGenerate={!!image}
            onGenerate={handleGenerate}
            resultImage={result}
            onResetResult={() => setResult(null)}
            leftContent={
                image ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <img src={image.url} className="max-w-full max-h-full rounded-lg shadow-lg" />
                        <button onClick={() => setImage(null)} className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-md hover:bg-red-50 text-red-500"><TrashIcon className="w-5 h-5"/></button>
                    </div>
                ) : (
                    <>
                        <UploadPlaceholder label="Upload Logo / Design" onClick={() => document.getElementById('mockup-upload')?.click()} />
                        <input id="mockup-upload" type="file" className="hidden" accept="image/*" onChange={async (e) => { if (e.target.files?.[0]) setImage({ url: URL.createObjectURL(e.target.files[0]), base64: await fileToBase64(e.target.files[0]) }) }} />
                    </>
                )
            }
            rightContent={
                <div className="space-y-6">
                    <SelectField label="Product Type" value={type} onChange={(e: any) => setType(e.target.value)}>
                        {['T-Shirt', 'Mug', 'Tote Bag', 'Phone Case', 'Notebook', 'Laptop'].map(t => <option key={t} value={t}>{t}</option>)}
                    </SelectField>
                </div>
            }
        />
    );
};

const CaptionAI: React.FC<{ auth: AuthProps; navigateTo: any; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [loading, setLoading] = useState(false);
    const [captions, setCaptions] = useState<{caption: string, hashtags: string}[]>([]);

    const handleGenerate = async () => {
        if (!image || !auth.user) return;
        setLoading(true);
        try {
            const res = await generateCaptions(image.base64.base64, image.base64.mimeType);
            setCaptions(res);
            const updated = await deductCredits(auth.user.uid, appConfig?.featureCosts['CaptionAI'] || 1, 'CaptionAI');
            auth.setUser(prev => prev ? { ...prev, credits: updated.credits } : null);
        } catch (e) {
            console.error(e);
            alert('Generation failed.');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Copied!');
    };

    return (
        <FeatureLayout 
            title="CaptionAI"
            icon={<CaptionIcon className="w-6 h-6 text-amber-500"/>}
            creditCost={appConfig?.featureCosts['CaptionAI'] || 1}
            isGenerating={loading}
            canGenerate={!!image}
            onGenerate={handleGenerate}
            resultImage={null} // Caption AI uses a text result list instead of an image
            leftContent={
                 image ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <img src={image.url} className="max-w-full max-h-full rounded-lg shadow-lg" />
                        <button onClick={() => setImage(null)} className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-md hover:bg-red-50 text-red-500"><TrashIcon className="w-5 h-5"/></button>
                    </div>
                ) : (
                    <>
                        <UploadPlaceholder label="Upload Photo" onClick={() => document.getElementById('caption-upload')?.click()} />
                        <input id="caption-upload" type="file" className="hidden" accept="image/*" onChange={async (e) => { if (e.target.files?.[0]) setImage({ url: URL.createObjectURL(e.target.files[0]), base64: await fileToBase64(e.target.files[0]) }) }} />
                    </>
                )
            }
            rightContent={
                 <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Generated Captions</h3>
                    {captions.length > 0 ? captions.map((c, i) => (
                        <div key={i} className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm relative group hover:bg-white transition-all">
                             <p className="text-gray-800 font-medium mb-2 leading-relaxed">"{c.caption}"</p>
                             <p className="text-blue-600 text-sm font-mono">{c.hashtags}</p>
                             <button onClick={() => copyToClipboard(`${c.caption} ${c.hashtags}`)} className="absolute top-2 right-2 p-2 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-lg border border-gray-200 shadow-sm"><CopyIcon className="w-4 h-4"/></button>
                        </div>
                    )) : <div className="h-32 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">Captions will appear here...</div>}
                </div>
            }
        />
    );
};

const ProductStudio: React.FC<{ auth: AuthProps; navigateTo: any; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [productImage, setProductImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [productName, setProductName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [resultPlan, setResultPlan] = useState<any | null>(null);

    const handleGenerate = async () => {
        if (!productImage || !auth.user) return;
        setLoading(true);
        try {
            const res = await generateProductPackPlan(
                [productImage.base64.base64], 
                productName, 
                description, 
                { colors: [], fonts: [] }, // Simplified for this view
                '', 
                []
            );
            setResultPlan(res);
            const updated = await deductCredits(auth.user.uid, appConfig?.featureCosts['Product Studio'] || 5, 'Product Studio');
            auth.setUser(prev => prev ? { ...prev, credits: updated.credits } : null);
        } catch (e) {
            console.error(e);
            alert('Generation failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <FeatureLayout 
            title="Product Studio"
            icon={<ProductStudioIcon className="w-6 h-6 text-green-500"/>}
            creditCost={appConfig?.featureCosts['Product Studio'] || 5}
            isGenerating={loading}
            canGenerate={!!productImage}
            onGenerate={handleGenerate}
            resultImage={null}
            leftContent={
                 resultPlan ? (
                    <div className="h-full overflow-y-auto pr-2 custom-scrollbar space-y-6">
                         <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900">Strategy Plan</h3>
                            <button onClick={() => setResultPlan(null)} className="text-sm text-gray-500 hover:text-gray-900">Reset</button>
                         </div>
                         <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                             <h4 className="font-bold text-blue-600 mb-4 flex items-center gap-2"><SparklesIcon className="w-4 h-4"/> SEO & Copy</h4>
                             <div className="space-y-4">
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase">SEO Title</p>
                                    <p className="text-lg font-semibold text-gray-800">{resultPlan.textAssets.seoTitle}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase">Keywords</p>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {resultPlan.textAssets.keywords.map((k: string) => <span key={k} className="px-2 py-1 bg-gray-100 rounded-md text-sm text-gray-600 border border-gray-200">{k}</span>)}
                                    </div>
                                </div>
                             </div>
                         </div>
                         <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                             <h4 className="font-bold text-purple-600 mb-4 flex items-center gap-2"><PaletteIcon className="w-4 h-4"/> Visual Strategy</h4>
                             <div className="space-y-3">
                                {Object.entries(resultPlan.imageGenerationPrompts).map(([key, prompt]: any) => (
                                    <div key={key} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                                        <p className="text-sm text-gray-700 italic leading-relaxed">"{prompt}"</p>
                                    </div>
                                ))}
                             </div>
                         </div>
                    </div>
                ) : (
                    productImage ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                            <img src={productImage.url} className="max-w-full max-h-full rounded-lg shadow-lg" />
                            <button onClick={() => setProductImage(null)} className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-md hover:bg-red-50 text-red-500"><TrashIcon className="w-5 h-5"/></button>
                        </div>
                    ) : (
                        <>
                            <UploadPlaceholder label="Upload Product" onClick={() => document.getElementById('prod-upload')?.click()} />
                            <input id="prod-upload" type="file" className="hidden" accept="image/*" onChange={async (e) => { if (e.target.files?.[0]) setProductImage({ url: URL.createObjectURL(e.target.files[0]), base64: await fileToBase64(e.target.files[0]) }) }} />
                        </>
                    )
                )
            }
            rightContent={
                 <div className="space-y-6">
                    <InputField label="Product Name" value={productName} onChange={(e: any) => setProductName(e.target.value)} />
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Description</label>
                        <textarea 
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all min-h-[100px]"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        ></textarea>
                    </div>
                </div>
            }
        />
    );
};

const BrandStylistAI: React.FC<{ auth: AuthProps; navigateTo: any; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [refImage, setRefImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!refImage || !auth.user) return;
        setLoading(true);
        try {
            const res = await generateBrandStylistImage(refImage.base64.base64, prompt);
            const url = `data:image/png;base64,${res}`;
            setResult(url);
            saveCreation(auth.user.uid, url, 'Brand Stylist AI');
            const updated = await deductCredits(auth.user.uid, appConfig?.featureCosts['Brand Stylist AI'] || 4, 'Brand Stylist AI');
            auth.setUser(prev => prev ? { ...prev, credits: updated.credits } : null);
        } catch (e) {
            console.error(e);
            alert('Generation failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
         <FeatureLayout 
            title="Brand Stylist AI"
            icon={<LightbulbIcon className="w-6 h-6 text-yellow-500"/>}
            creditCost={appConfig?.featureCosts['Brand Stylist AI'] || 4}
            isGenerating={loading}
            canGenerate={!!refImage}
            onGenerate={handleGenerate}
            resultImage={result}
            onResetResult={() => setResult(null)}
            leftContent={
                refImage ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <img src={refImage.url} className="max-w-full max-h-full rounded-lg shadow-lg" />
                        <button onClick={() => setRefImage(null)} className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-md hover:bg-red-50 text-red-500"><TrashIcon className="w-5 h-5"/></button>
                         <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-xs">Reference Style</div>
                    </div>
                ) : (
                    <>
                        <UploadPlaceholder label="Upload Style Reference" onClick={() => document.getElementById('brand-upload')?.click()} />
                        <input id="brand-upload" type="file" className="hidden" accept="image/*" onChange={async (e) => { if (e.target.files?.[0]) setRefImage({ url: URL.createObjectURL(e.target.files[0]), base64: await fileToBase64(e.target.files[0]) }) }} />
                    </>
                )
            }
            rightContent={
                <div className="space-y-6">
                    <InputField 
                        label="Creation Prompt" 
                        placeholder="e.g. A coffee cup on a wooden table" 
                        value={prompt} 
                        onChange={(e: any) => setPrompt(e.target.value)} 
                    />
                     <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                        <p className="text-xs text-yellow-800 leading-relaxed">
                            Upload an image that has the <strong>exact style</strong> you want to copy (lighting, colors, texture). Then describe what new object you want to create in that style.
                        </p>
                    </div>
                </div>
            }
        />
    );
};


const ThumbnailStudio: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; appConfig: AppConfig | null; }> = ({ auth, navigateTo, appConfig }) => {
    const [activeTab, setActiveTab] = useState<'photo' | 'video'>('photo');
    const [category, setCategory] = useState<string>('podcast');
    
    // Media States
    const [subjectA, setSubjectA] = useState<{ file?: File; url: string; base64: Base64File } | null>(null);
    const [subjectB, setSubjectB] = useState<{ file?: File; url: string; base64: Base64File } | null>(null);
    const [referenceImage, setReferenceImage] = useState<{ file?: File; url: string; base64: Base64File } | null>(null);
    const [videoTitle, setVideoTitle] = useState('');
    
    // Smart Video Scan States
    const [isScanningVideo, setIsScanningVideo] = useState(false);
    const [scannedFrames, setScannedFrames] = useState<{ url: string; base64: Base64File }[]>([]);
    const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
    
    // Generation States
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState("");
    
    const subjectAInputRef = useRef<HTMLInputElement>(null);
    const subjectBInputRef = useRef<HTMLInputElement>(null);
    const referenceInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

    const categories = [
        { id: 'podcast', label: 'Podcast', icon: <MicrophoneIcon className="w-6 h-6" /> },
        { id: 'unboxing', label: 'Unboxing', icon: <CubeIcon className="w-6 h-6" /> },
        { id: 'gaming', label: 'Gaming', icon: <UsersIcon className="w-6 h-6" /> },
        { id: 'vlog', label: 'Vlog', icon: <VideoCameraIcon className="w-6 h-6" /> },
        { id: 'informative', label: 'Informative', icon: <LightbulbIcon className="w-6 h-6" /> },
    ];

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, type: 'A' | 'B' | 'Ref') => {
        const file = event.target.files?.[0];
        if (file) {
             if (!file.type.startsWith('image/')) {
                setError('Please upload a valid image file.');
                return;
            }
            const base64 = await fileToBase64(file);
            const data = { file, url: URL.createObjectURL(file), base64 };
            
            if (type === 'A') setSubjectA(data);
            else if (type === 'B') setSubjectB(data);
            else setReferenceImage(data);
            
            setError(null);
        }
    };

    const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        
        setIsScanningVideo(true);
        setScannedFrames([]);
        setSuggestedTitles([]);
        setStatusMessage("Scanning video for best frames...");
        setError(null);

        try {
            // 1. Extract Frames Client-Side
            const frames = await extractFramesFromVideo(file, 6); // Extract 6 frames
            setScannedFrames(frames);

            // 2. AI Analysis
            setStatusMessage("AI is analyzing content & generating titles...");
            const analysis = await analyzeVideoFrames(frames);
            
            setSuggestedTitles(analysis.titles);
            
            // Auto-select the best frame if available
            if (analysis.bestFrameIndex >= 0 && analysis.bestFrameIndex < frames.length) {
                setSubjectA(frames[analysis.bestFrameIndex]);
            }
            
            setStatusMessage("");
        } catch (err: any) {
            console.error(err);
            setError("Failed to scan video. Please try a shorter video or different format.");
        } finally {
            setIsScanningVideo(false);
        }
    };

    const handleGenerate = async () => {
        if (!referenceImage || !subjectA || !videoTitle.trim()) {
            setError("Please provide all required inputs (Category, Content, Title, Reference).");
            return;
        }
        setIsGenerating(true);
        setError(null);
        try {
            setStatusMessage("Researching viral trends for this topic...");
            
            const resultBase64 = await generateThumbnail({
                category: category || 'general',
                title: videoTitle,
                referenceImage: referenceImage.base64.base64,
                subjectA: subjectA.base64.base64,
                subjectB: subjectB?.base64.base64
            });
            
            const imageUrl = `data:image/png;base64,${resultBase64}`;
            setGeneratedThumbnail(imageUrl);
            
             if (auth.user) {
                 saveCreation(auth.user.uid, imageUrl, 'Thumbnail Studio');
                 const updatedProfile = await deductCredits(auth.user.uid, 2, 'Thumbnail Studio');
                 auth.setUser(prev => prev ? { ...prev, credits: updatedProfile.credits } : null);
            }
        } catch (err: any) {
            setError(err.message || "Failed to generate thumbnail.");
        } finally {
            setIsGenerating(false);
            setStatusMessage("");
        }
    };

    return (
        <FeatureLayout 
            title="Thumbnail Studio"
            icon={<ThumbnailIcon className="w-6 h-6 text-red-500"/>}
            creditCost={appConfig?.featureCosts['Thumbnail Studio'] || 2}
            isGenerating={isGenerating}
            canGenerate={!!referenceImage && !!subjectA && !!videoTitle}
            onGenerate={handleGenerate}
            resultImage={generatedThumbnail}
            onResetResult={() => setGeneratedThumbnail(null)}
            leftContent={
                <div className="h-full w-full overflow-y-auto custom-scrollbar p-4">
                    {/* This section acts as the "Canvas" showing all inputs visually */}
                     <div className="grid grid-cols-2 gap-4 h-full">
                         {/* Subject A */}
                        <div className="aspect-video bg-white border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center relative cursor-pointer hover:border-red-400" onClick={() => subjectAInputRef.current?.click()}>
                            {subjectA ? (
                                <img src={subjectA.url} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                                <div className="text-center p-4">
                                    <UsersIcon className="w-8 h-8 text-gray-300 mx-auto mb-2"/>
                                    <span className="text-xs font-bold text-gray-500">Main Subject</span>
                                </div>
                            )}
                            <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded">Required</div>
                        </div>

                        {/* Reference */}
                        <div className="aspect-video bg-white border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center relative cursor-pointer hover:border-red-400" onClick={() => referenceInputRef.current?.click()}>
                             {referenceImage ? (
                                <img src={referenceImage.url} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                                <div className="text-center p-4">
                                    <LightbulbIcon className="w-8 h-8 text-gray-300 mx-auto mb-2"/>
                                    <span className="text-xs font-bold text-gray-500">Style Reference</span>
                                </div>
                            )}
                            <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded">Required</div>
                        </div>

                        {/* Subject B (Conditional) */}
                        {category === 'podcast' && (
                            <div className="aspect-video bg-white border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center relative cursor-pointer hover:border-red-400" onClick={() => subjectBInputRef.current?.click()}>
                                {subjectB ? (
                                    <img src={subjectB.url} className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                    <div className="text-center p-4">
                                        <UsersIcon className="w-8 h-8 text-gray-300 mx-auto mb-2"/>
                                        <span className="text-xs font-bold text-gray-500">Guest (Optional)</span>
                                    </div>
                                )}
                            </div>
                        )}

                         {/* Scanned Frames Display (If Video) */}
                         {scannedFrames.length > 0 && (
                             <div className="col-span-2 mt-4">
                                 <p className="text-xs font-bold text-gray-500 mb-2">VIDEO FRAMES (Click to Select)</p>
                                 <div className="flex gap-2 overflow-x-auto pb-2">
                                     {scannedFrames.map((frame, idx) => (
                                         <div key={idx} onClick={() => setSubjectA(frame)} className={`w-24 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 cursor-pointer ${subjectA?.base64.base64 === frame.base64.base64 ? 'border-red-500' : 'border-transparent'}`}>
                                             <img src={frame.url} className="w-full h-full object-cover" />
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         )}
                     </div>

                     {/* Hidden Inputs */}
                    <input type="file" ref={subjectAInputRef} className="hidden" accept="image/*" onChange={e => handleFileChange(e, 'A')} />
                    <input type="file" ref={subjectBInputRef} className="hidden" accept="image/*" onChange={e => handleFileChange(e, 'B')} />
                    <input type="file" ref={referenceInputRef} className="hidden" accept="image/*" onChange={e => handleFileChange(e, 'Ref')} />
                </div>
            }
            rightContent={
                <div className="space-y-6">
                    {/* Category */}
                    <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">1. Category</label>
                         <div className="grid grid-cols-3 gap-2">
                            {categories.map(cat => (
                                <button key={cat.id} onClick={() => setCategory(cat.id)} className={`p-2 rounded-xl border-2 flex flex-col items-center transition-all ${category === cat.id ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-200 hover:border-red-200'}`}>
                                    {cat.icon}<span className="text-[10px] font-bold mt-1">{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                     {/* Input Method Switch */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">2. Input Source</label>
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button onClick={() => setActiveTab('photo')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'photo' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Photo Upload</button>
                            <button onClick={() => setActiveTab('video')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'video' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Smart Video Scan</button>
                        </div>
                        {activeTab === 'video' && (
                            <div className="mt-3">
                                 <div className="border-2 border-dashed border-red-200 bg-red-50 rounded-xl p-4 text-center cursor-pointer hover:bg-red-100 transition-colors" onClick={() => videoInputRef.current?.click()}>
                                    {isScanningVideo ? (
                                        <span className="text-sm font-bold text-red-600 flex items-center justify-center gap-2"><SparklesIcon className="animate-spin w-4 h-4"/> Scanning...</span>
                                    ) : (
                                        <span className="text-sm font-bold text-gray-700 flex items-center justify-center gap-2"><VideoCameraIcon className="w-4 h-4"/> Upload Video File</span>
                                    )}
                                    <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={handleVideoUpload} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Title */}
                    <div>
                        <InputField 
                            label="3. Video Title" 
                            value={videoTitle} 
                            onChange={(e:any) => setVideoTitle(e.target.value)} 
                            placeholder="e.g., I Tried iPhone 16..." 
                        />
                         {suggestedTitles.length > 0 && (
                            <div className="mt-2 space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">AI Suggestions:</p>
                                {suggestedTitles.slice(0, 3).map((t, i) => (
                                    <button key={i} onClick={() => setVideoTitle(t)} className="block w-full text-left text-xs p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded truncate transition-colors">
                                        {t}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
                    {isGenerating && <div className="text-xs text-center text-gray-500 animate-pulse">{statusMessage}</div>}
                </div>
            }
        />
    );
};


const Support: React.FC<{ auth: AuthProps; onClose: () => void }> = ({ auth, onClose }) => {
    const [isListening, setIsListening] = useState(false);
    const [status, setStatus] = useState("Connecting...");
    const [session, setSession] = useState<any>(null);
    
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    
    const startSession = async () => {
        try {
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const outputNode = outputAudioContextRef.current?.createGain();
            if(outputNode && outputAudioContextRef.current) outputNode.connect(outputAudioContextRef.current.destination);

            const sessionPromise = startLiveSession({
                onopen: () => {
                    setStatus("Listening...");
                    setIsListening(true);
                    
                    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                        if(!inputAudioContextRef.current) return;
                        const source = inputAudioContextRef.current.createMediaStreamSource(stream);
                        const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                        processor.onaudioprocess = (e) => {
                             const inputData = e.inputBuffer.getChannelData(0);
                             const l = inputData.length;
                             const int16 = new Int16Array(l);
                             for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
                             const pcmBlob: Blob = {
                                 data: encode(new Uint8Array(int16.buffer)),
                                 mimeType: 'audio/pcm;rate=16000',
                             };
                             sessionPromise.then(sess => sess.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(processor);
                        processor.connect(inputAudioContextRef.current.destination);
                    });
                },
                onmessage: async (msg: LiveServerMessage) => {
                    if (msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data && outputAudioContextRef.current && outputNode) {
                        const audioBuffer = await decodeAudioData(
                            decode(msg.serverContent.modelTurn.parts[0].inlineData.data),
                            outputAudioContextRef.current,
                            24000,
                            1
                        );
                        const source = outputAudioContextRef.current.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputNode);
                        source.start();
                    }
                },
                onerror: (e) => { console.error(e); setStatus("Error"); },
                onclose: (e) => { setStatus("Disconnected"); setIsListening(false); }
            });
            
            setSession(await sessionPromise);

        } catch (e) {
            console.error("Failed to start live session", e);
            setStatus("Failed to connect.");
        }
    };

    useEffect(() => {
        startSession();
        return () => {
            session?.close();
            inputAudioContextRef.current?.close();
            outputAudioContextRef.current?.close();
        }
    }, []);

    return (
        <div className="fixed bottom-4 right-4 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><AudioWaveIcon className="w-5 h-5"/> Live Support</h3>
                <button onClick={onClose}><XIcon className="w-5 h-5"/></button>
            </div>
            <div className="p-8 flex flex-col items-center justify-center text-center min-h-[200px]">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-400'}`}>
                    <MicrophoneIcon className="w-10 h-10" />
                </div>
                <p className="font-semibold text-gray-800">{status}</p>
                <p className="text-xs text-gray-500 mt-2">Speak to interact with Pixa AI.</p>
            </div>
        </div>
    );
};

const Profile: React.FC<{ auth: AuthProps; openEditProfileModal: () => void; }> = ({ auth, openEditProfileModal }) => (
    <div className="p-6 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">My Profile</h2>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600">
                    {auth.user?.avatar}
                </div>
                <div>
                    <h3 className="text-xl font-bold">{auth.user?.name}</h3>
                    <p className="text-gray-500">{auth.user?.email}</p>
                </div>
            </div>
            <button onClick={openEditProfileModal} className="bg-gray-100 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200">Edit Profile</button>
        </div>
    </div>
);

const Creations: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; }> = ({ auth, navigateTo }) => {
    const [creations, setCreations] = useState<Creation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    useEffect(() => {
        if (auth.user) {
            setIsLoading(true);
            getCreations(auth.user.uid)
                .then((res) => setCreations(res as Creation[]))
                .catch(console.error)
                .finally(() => setIsLoading(false));
        }
    }, [auth.user]);

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><ProjectsIcon className="w-6 h-6"/> My Creations</h2>
            {isLoading ? <div className="text-center py-10">Loading...</div> : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {creations.map(c => (
                        <div key={c.id} className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer" onClick={() => setSelectedImage(c.imageUrl)}>
                            <img src={c.imageUrl} className="w-full h-full object-cover" loading="lazy"/>
                             <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                                 <span className="text-white text-xs font-bold">{c.feature}</span>
                                 <div className="flex gap-2">
                                    <button onClick={(e) => {e.stopPropagation(); const a = document.createElement('a'); a.href=c.imageUrl; a.download='img.png'; a.click(); }} className="text-white"><DownloadIcon className="w-4 h-4"/></button>
                                    <button onClick={async (e) => {e.stopPropagation(); if(auth.user) { await deleteCreation(auth.user.uid, c); setCreations(creations.filter(x => x.id !== c.id)); }}} className="text-red-400"><TrashIcon className="w-4 h-4"/></button>
                                 </div>
                             </div>
                        </div>
                    ))}
                </div>
            )}
            {selectedImage && <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />}
        </div>
    );
};

const MobileHomeDashboard: React.FC<{ user: User | null; setActiveView: (view: View) => void; }> = ({ user, setActiveView }) => (
    <div className="p-4 pb-24">
         <div className="flex items-center justify-between mb-6">
             <div>
                 <h1 className="text-2xl font-bold text-gray-900">Hello, {user?.name.split(' ')[0] || 'Creator'} 👋</h1>
                 <p className="text-sm text-gray-500">What will you create today?</p>
             </div>
             <div className="bg-yellow-100 px-3 py-1 rounded-full text-yellow-800 text-sm font-bold flex items-center gap-1">
                 <SparklesIcon className="w-4 h-4"/> {user?.credits || 0}
             </div>
         </div>
         <div className="grid grid-cols-2 gap-4">
             {[
                 { id: 'studio', label: 'Photo Studio', icon: PhotoStudioIcon, color: 'bg-blue-100 text-blue-600' },
                 { id: 'thumbnail_studio', label: 'Thumbnails', icon: ThumbnailIcon, color: 'bg-red-100 text-red-600' },
                 { id: 'interior', label: 'Interior', icon: HomeIcon, color: 'bg-orange-100 text-orange-600' },
                 { id: 'soul', label: 'Magic Soul', icon: UsersIcon, color: 'bg-pink-100 text-pink-600' },
             ].map(item => (
                 <button key={item.id} onClick={() => setActiveView(item.id as View)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2">
                     <div className={`p-3 rounded-full ${item.color}`}><item.icon className="w-6 h-6"/></div>
                     <span className="font-semibold text-sm text-gray-700">{item.label}</span>
                 </button>
             ))}
         </div>
    </div>
);

const Dashboard: React.FC<any> = ({ user, navigateTo, setActiveView, creations }) => {
    const tools = [
        { id: 'studio', label: 'Magic Photo Studio', desc: 'Pro product photography.', icon: PhotoStudioIcon, color: 'bg-blue-500', bg: 'bg-blue-50' },
        { id: 'thumbnail_studio', label: 'Thumbnail Studio', desc: 'Viral YouTube thumbnails.', icon: ThumbnailIcon, color: 'bg-red-500', bg: 'bg-red-50' },
        { id: 'product_studio', label: 'Product Studio', desc: 'Full product marketing packs.', icon: ProductStudioIcon, color: 'bg-indigo-500', bg: 'bg-indigo-50' },
        { id: 'brand_stylist', label: 'Brand Stylist', desc: 'Style transfer for brands.', icon: LightbulbIcon, color: 'bg-yellow-500', bg: 'bg-yellow-50' },
        { id: 'interior', label: 'Magic Interior', desc: 'Redesign any room instantly.', icon: HomeIcon, color: 'bg-orange-500', bg: 'bg-orange-50' },
        { id: 'soul', label: 'Magic Soul', desc: 'Merge people into one photo.', icon: UsersIcon, color: 'bg-pink-500', bg: 'bg-pink-50' },
        { id: 'apparel', label: 'Magic Apparel', desc: 'Virtual clothing try-on.', icon: UsersIcon, color: 'bg-teal-500', bg: 'bg-teal-50' },
        { id: 'colour', label: 'Photo Colourize', desc: 'Restore vintage photos.', icon: PaletteIcon, color: 'bg-rose-500', bg: 'bg-rose-50' },
        { id: 'caption', label: 'CaptionAI', desc: 'Social media captions.', icon: CaptionIcon, color: 'bg-amber-500', bg: 'bg-amber-50' },
        { id: 'mockup', label: 'Magic Mockup', desc: 'Realistic product mockups.', icon: MockupIcon, color: 'bg-cyan-500', bg: 'bg-cyan-50' },
    ];

    const recentCreations = creations?.slice(0, 4) || [];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-12">
            {/* Welcome Banner */}
            <div className="relative overflow-hidden bg-gradient-to-r from-[#1E1E1E] to-[#2d2d2d] rounded-3xl p-8 sm:p-12 text-white shadow-2xl">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl"></div>
                 <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
                        <p className="text-gray-400 text-lg">Ready to create something amazing today?</p>
                    </div>
                    <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                        <div className="p-3 bg-yellow-400/20 rounded-full">
                            <SparklesIcon className="w-8 h-8 text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400 font-medium">Available Credits</p>
                            <p className="text-2xl font-bold">{user?.credits || 0}</p>
                        </div>
                        <button onClick={() => setActiveView('billing')} className="ml-4 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black text-sm font-bold rounded-lg transition-colors">
                            Top Up
                        </button>
                    </div>
                 </div>
            </div>

            {/* Recent Creations */}
            {recentCreations.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <ProjectsIcon className="w-5 h-5 text-gray-500" /> Recent Projects
                        </h2>
                        <button onClick={() => setActiveView('creations')} className="text-blue-600 text-sm font-semibold hover:underline">View All</button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {recentCreations.map((c: any) => (
                            <div key={c.id} className="group relative aspect-square rounded-xl overflow-hidden border border-gray-200 cursor-pointer" onClick={() => setActiveView('creations')}>
                                <img src={c.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                    <span className="text-white text-xs font-medium truncate">{c.feature}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tools Grid */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">All Creative Tools</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {tools.map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => setActiveView(item.id as View)} 
                            className="group bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all text-left flex flex-col h-full"
                        >
                            <div className="flex items-start justify-between w-full mb-4">
                                <div className={`p-3.5 rounded-xl ${item.bg} ${item.color.replace('bg-', 'text-')} group-hover:scale-110 transition-transform duration-300`}>
                                    <item.icon className="w-7 h-7"/>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300">
                                    <ArrowRightIcon className="w-5 h-5"/>
                                </div>
                            </div>
                            <h3 className="font-bold text-gray-900 mb-1">{item.label}</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const DashboardPage: React.FC<DashboardPageProps> = ({ navigateTo, auth, activeView, setActiveView, openEditProfileModal, isConversationOpen, setIsConversationOpen, appConfig, setAppConfig }) => {
  const [creations, setCreations] = useState<Creation[]>([]);

   useEffect(() => {
    if (auth.user) {
      getCreations(auth.user.uid).then((res) => setCreations(res as Creation[])).catch(console.error);
    }
  }, [auth.user]);

  const renderContent = () => {
    switch (activeView) {
      case 'home_dashboard': return <MobileHomeDashboard user={auth.user} setActiveView={setActiveView} />;
      case 'dashboard': return <Dashboard user={auth.user} navigateTo={navigateTo} setActiveView={setActiveView} creations={creations} />;
      case 'studio': return <MagicPhotoStudio auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
      case 'interior': return <MagicInterior auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
      case 'colour': return <MagicPhotoColour auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
      case 'soul': return <MagicSoul auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
      case 'apparel': return <MagicApparel auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
      case 'mockup': return <MagicMockup auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
      case 'caption': return <CaptionAI auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
      case 'product_studio': return <ProductStudio auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
      case 'brand_stylist': return <BrandStylistAI auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
      case 'thumbnail_studio': return <ThumbnailStudio auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
      case 'creations': return <Creations auth={auth} navigateTo={navigateTo} />;
      case 'billing': return <Billing user={auth.user!} setUser={auth.setUser} appConfig={appConfig} />;
      case 'profile': return <Profile auth={auth} openEditProfileModal={openEditProfileModal} />;
      case 'admin': return <AdminPanel auth={auth} appConfig={appConfig} onConfigUpdate={setAppConfig} />;
      default: return <Dashboard user={auth.user} navigateTo={navigateTo} setActiveView={setActiveView} creations={creations} />;
    }
  };

  const dashboardAuthProps = {
      ...auth,
      setActiveView,
      openConversation: () => setIsConversationOpen(true),
      isDashboard: true,
      showBackButton: activeView !== 'dashboard' && activeView !== 'home_dashboard',
      handleBack: () => setActiveView('dashboard'),
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      <Header navigateTo={navigateTo} auth={dashboardAuthProps} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar user={auth.user} activeView={activeView} setActiveView={setActiveView} navigateTo={navigateTo} appConfig={appConfig} />
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
      {isConversationOpen && <Support auth={auth} onClose={() => setIsConversationOpen(false)} />}
    </div>
  );
};

export default DashboardPage;