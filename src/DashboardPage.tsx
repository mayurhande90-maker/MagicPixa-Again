import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Page, AuthProps, View, User, Creation, AppConfig } from './types';
import { startLiveSession, editImageWithPrompt, generateInteriorDesign, colourizeImage, generateMagicSoul, generateApparelTryOn, generateMockup, generateCaptions, generateSupportResponse, generateProductPackPlan, generateStyledImage, generateVideo, getVideoOperationStatus, generateBrandStylistImage, removeElementFromImage, suggestThumbnailTitles, generateThumbnail } from './services/geminiService';
import { fileToBase64, Base64File } from './utils/imageUtils';
import { encode, decode, decodeAudioData } from './utils/audioUtils';
import { deductCredits, getOrCreateUserProfile, saveCreation, getCreations, deleteCreation } from './firebase';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Billing from './components/Billing';
import ThemeToggle from './components/ThemeToggle';
import { AdminPanel } from './components/AdminPanel'; 
import { 
    UploadIcon, SparklesIcon, DownloadIcon, RetryIcon, ProjectsIcon, ArrowUpCircleIcon, LightbulbIcon,
    PhotoStudioIcon, HomeIcon, PencilIcon, CreditCardIcon, CaptionIcon, PaletteIcon, ProductStudioIcon,
    MicrophoneIcon, StopIcon, UserIcon as AvatarUserIcon, XIcon, MockupIcon, UsersIcon, CheckIcon,
    GarmentTopIcon, GarmentTrousersIcon, AdjustmentsVerticalIcon, ChevronUpIcon, ChevronDownIcon, LogoutIcon, PlusIcon,
    DashboardIcon, CopyIcon, InformationCircleIcon, StarIcon, TicketIcon, ChevronRightIcon, HelpIcon, MinimalistIcon,
    LeafIcon, CubeIcon, DiamondIcon, SunIcon, PlusCircleIcon, CompareIcon, ChevronLeftRightIcon, ShieldCheckIcon, DocumentTextIcon, FlagIcon,
    ArrowRightIcon, ZoomInIcon, FilmIcon, VideoCameraIcon, ColorSwatchIcon, ImageIcon, TrashIcon, ThumbnailIcon
} from './components/icons';
import { Blob, LiveServerMessage } from '@google/genai';

interface DashboardPageProps {
  navigateTo: (page: Page, view?: View, sectionId?: string) => void;
  auth: AuthProps;
  activeView: View;
  setActiveView: (view: View) => void;
  openEditProfileModal: () => void;
  isConversationOpen: boolean;
  setIsConversationOpen: (isOpen: boolean) => void;
  appConfig: AppConfig | null;
  setAppConfig: React.Dispatch<React.SetStateAction<AppConfig | null>>;
}

const InputField: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  type?: string;
  placeholder?: string;
  rows?: number;
}> = ({ id, label, value, onChange, type = 'text', placeholder, rows }) => (
  <div className="w-full">
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {rows ? (
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0079F2] focus:border-transparent outline-none transition-all"
      />
    ) : (
      <input
        type={type}
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0079F2] focus:border-transparent outline-none transition-all"
      />
    )}
  </div>
);

const ImageModal: React.FC<{ imageUrl: string; onClose: () => void }> = ({ imageUrl, onClose }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button onClick={onClose} className="absolute -top-10 right-0 text-white hover:text-gray-300"><XIcon className="w-8 h-8" /></button>
            <img src={imageUrl} alt="Full size" className="w-full h-full object-contain rounded-lg shadow-2xl" />
        </div>
    </div>
);

const FeatureHeader: React.FC<{ title: string; description: string; icon: React.FC<any> }> = ({ title, description, icon: Icon }) => (
    <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-[#1E1E1E] flex items-center justify-center gap-3">
            <Icon className="w-10 h-10 text-[#0079F2]" /> {title}
        </h2>
        <p className="text-[#5F6368] mt-2">{description}</p>
    </div>
);

// --- GENERIC FEATURE COMPONENT ---
// A reusable wrapper for single-image generation features
const GenericImageFeature: React.FC<{
    title: string;
    description: string;
    icon: React.FC<any>;
    auth: AuthProps;
    featureId: string;
    creditCost: number;
    generateFunction: (base64: string, mimeType: string, ...args: any[]) => Promise<string>;
    additionalInputs?: React.ReactNode;
    getAdditionalArgs?: () => any[];
}> = ({ title, description, icon, auth, featureId, creditCost, generateFunction, additionalInputs, getAdditionalArgs }) => {
    const [imageFile, setImageFile] = useState<{ file: File; url: string; base64: Base64File } | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const base64 = await fileToBase64(file);
            setImageFile({ file, url: URL.createObjectURL(file), base64 });
            setGeneratedImage(null);
            setError(null);
        }
    };

    const handleGenerate = async () => {
        if (!imageFile) return;
        if ((auth.user?.credits || 0) < creditCost) {
            setError(`Not enough credits. Requires ${creditCost} credits.`);
            return;
        }
        
        setIsGenerating(true);
        setError(null);
        try {
            const args = getAdditionalArgs ? getAdditionalArgs() : [];
            const resultBase64 = await generateFunction(imageFile.base64.base64, imageFile.base64.mimeType, ...args);
            const imageUrl = `data:image/png;base64,${resultBase64}`;
            setGeneratedImage(imageUrl);
            
            if (auth.user) {
                saveCreation(auth.user.uid, imageUrl, title);
                const updatedProfile = await deductCredits(auth.user.uid, creditCost, title);
                auth.setUser(prev => prev ? { ...prev, credits: updatedProfile.credits } : null);
            }
        } catch (err: any) {
            setError(err.message || "Failed to generate image.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
            <FeatureHeader title={title} description={description} icon={icon} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
                     <div 
                        onClick={() => inputRef.current?.click()}
                        className={`relative w-full aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${imageFile ? 'border-transparent' : 'border-gray-300 hover:bg-gray-50 hover:border-blue-400'}`}
                    >
                        <input type="file" ref={inputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                        {imageFile ? (
                            <img src={imageFile.url} alt="Upload" className="w-full h-full object-cover rounded-xl" />
                        ) : (
                            <>
                                <UploadIcon className="w-12 h-12 text-gray-400 mb-2" />
                                <p className="text-gray-500 font-medium">Upload Image</p>
                            </>
                        )}
                         {imageFile && (
                            <button onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }} className="absolute top-2 right-2 p-2 bg-white/80 rounded-full shadow-sm text-gray-600 hover:text-black">
                                <ArrowUpCircleIcon className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                    
                    {additionalInputs}

                    {error && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg">{error}</p>}

                    <button 
                        onClick={handleGenerate} 
                        disabled={isGenerating || !imageFile}
                        className="w-full py-3 bg-[#0079F2] text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isGenerating ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"/> : <SparklesIcon className="w-5 h-5" />}
                        {isGenerating ? 'Generating...' : `Generate (${creditCost} Credits)`}
                    </button>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center min-h-[400px]">
                    {generatedImage ? (
                        <div className="relative w-full h-full">
                            <img src={generatedImage} alt="Generated" className="w-full h-full object-contain rounded-xl" />
                             <button 
                                onClick={() => { const link = document.createElement('a'); link.href = generatedImage; link.download = `magic_${Date.now()}.png`; link.click(); }}
                                className="absolute bottom-4 right-4 bg-white text-black font-bold py-2 px-4 rounded-full shadow-lg flex items-center gap-2 hover:bg-gray-100"
                            >
                                <DownloadIcon className="w-4 h-4" /> Save
                            </button>
                        </div>
                    ) : (
                         <div className="text-center text-gray-400">
                            <SparklesIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p>Your masterpiece will appear here</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


const MagicPhotoStudio: React.FC<{ auth: AuthProps; navigateTo: any; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [theme, setTheme] = useState('Professional Studio');
    return (
        <GenericImageFeature
            title="Magic Photo Studio"
            description="Turn casual photos into professional product shots."
            icon={PhotoStudioIcon}
            auth={auth}
            featureId="studio"
            creditCost={appConfig?.featureCosts['Magic Photo Studio'] || 2}
            generateFunction={editImageWithPrompt}
            additionalInputs={
                <InputField id="theme" label="Theme / Style" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="e.g., Minimalist, Nature, Industrial" />
            }
            getAdditionalArgs={() => [theme]}
        />
    );
};

const MagicInterior: React.FC<{ auth: AuthProps; navigateTo: any; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [style, setStyle] = useState('Modern');
    const [roomType, setRoomType] = useState('Living Room');
    const styles = ['Modern', 'Minimalist', 'Industrial', 'Coastal', 'Japanese', 'Traditional Indian'];
    
    return (
        <GenericImageFeature
            title="Magic Interior"
            description="Redesign any room in seconds."
            icon={HomeIcon}
            auth={auth}
            featureId="interior"
            creditCost={appConfig?.featureCosts['Magic Interior'] || 2}
            generateFunction={(b64, mime, s, r) => generateInteriorDesign(b64, mime, s, 'home', r)}
            additionalInputs={
                <div className="space-y-4">
                     <InputField id="room" label="Room Type" value={roomType} onChange={(e) => setRoomType(e.target.value)} />
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Style</label>
                        <div className="flex flex-wrap gap-2">
                            {styles.map(s => (
                                <button key={s} onClick={() => setStyle(s)} className={`px-3 py-1 rounded-full text-sm border ${style === s ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300 text-gray-600'}`}>
                                    {s}
                                </button>
                            ))}
                        </div>
                     </div>
                </div>
            }
            getAdditionalArgs={() => [style, roomType]}
        />
    );
};

const MagicPhotoColour: React.FC<{ auth: AuthProps; navigateTo: any; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [mode, setMode] = useState<'restore' | 'colourize_only'>('restore');
    return (
        <GenericImageFeature
            title="Magic Photo Colour"
            description="Restore and colourize old black & white photos."
            icon={PaletteIcon}
            auth={auth}
            featureId="colour"
            creditCost={appConfig?.featureCosts['Magic Photo Colour'] || 2}
            generateFunction={colourizeImage}
            additionalInputs={
                 <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="mode" checked={mode === 'restore'} onChange={() => setMode('restore')} className="text-blue-600" />
                        <span className="text-sm text-gray-700">Restore & Colourize</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="mode" checked={mode === 'colourize_only'} onChange={() => setMode('colourize_only')} className="text-blue-600" />
                        <span className="text-sm text-gray-700">Colourize Only</span>
                    </label>
                 </div>
            }
            getAdditionalArgs={() => [mode]}
        />
    );
};

const MagicMockup: React.FC<{ auth: AuthProps; navigateTo: any; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [type, setType] = useState('T-Shirt');
    return (
        <GenericImageFeature
            title="Magic Mockup"
            description="Place your design on real-world objects."
            icon={MockupIcon}
            auth={auth}
            featureId="mockup"
            creditCost={appConfig?.featureCosts['Magic Mockup'] || 2}
            generateFunction={generateMockup}
            additionalInputs={
                <InputField id="type" label="Mockup Item" value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g., Coffee Mug, iPhone, Hoodie" />
            }
            getAdditionalArgs={() => [type]}
        />
    );
};

const BrandStylistAI: React.FC<{ auth: AuthProps; navigateTo: any; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [prompt, setPrompt] = useState('');
    return (
        <GenericImageFeature
            title="Brand Stylist AI"
            description="Generate images in the exact style of your reference."
            icon={LightbulbIcon}
            auth={auth}
            featureId="brand_stylist"
            creditCost={appConfig?.featureCosts['Brand Stylist AI'] || 4}
            generateFunction={generateBrandStylistImage}
            additionalInputs={
                <InputField id="prompt" label="What should the new image depict?" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., A futuristic car on a neon street" />
            }
            getAdditionalArgs={() => [prompt]}
        />
    );
};

// More complex features requiring custom UI

const MagicSoul: React.FC<{ auth: AuthProps; navigateTo: any; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [fileA, setFileA] = useState<{ file: File; url: string; base64: Base64File } | null>(null);
    const [fileB, setFileB] = useState<{ file: File; url: string; base64: Base64File } | null>(null);
    const [style, setStyle] = useState('Cinematic');
    const [env, setEnv] = useState('Sunset Beach');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>, setFile: Function) => {
        if (e.target.files?.[0]) {
            const f = e.target.files[0];
            const b64 = await fileToBase64(f);
            setFile({ file: f, url: URL.createObjectURL(f), base64: b64 });
        }
    };

    const generate = async () => {
        if (!fileA || !fileB) return;
        setLoading(true); setError(null);
        try {
             const res = await generateMagicSoul(fileA.base64.base64, fileA.base64.mimeType, fileB.base64.base64, fileB.base64.mimeType, style, env);
             const url = `data:image/png;base64,${res}`;
             setResult(url);
             saveCreation(auth.user!.uid, url, 'Magic Soul');
             const updated = await deductCredits(auth.user!.uid, appConfig?.featureCosts['Magic Soul'] || 3, 'Magic Soul');
             auth.setUser(prev => prev ? { ...prev, credits: updated.credits } : null);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
            <FeatureHeader title="Magic Soul" description="Combine two people into one scene." icon={UsersIcon} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <input type="file" onChange={(e) => handleFile(e, setFileA)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                        <input type="file" onChange={(e) => handleFile(e, setFileB)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100" />
                    </div>
                    <InputField id="style" label="Style" value={style} onChange={e => setStyle(e.target.value)} />
                    <InputField id="env" label="Environment" value={env} onChange={e => setEnv(e.target.value)} />
                    <button onClick={generate} disabled={loading || !fileA || !fileB} className="w-full bg-pink-600 text-white py-3 rounded-xl font-bold disabled:opacity-50">
                        {loading ? 'Generating...' : 'Create Magic Soul'}
                    </button>
                    {error && <p className="text-red-500">{error}</p>}
                </div>
                <div className="bg-gray-100 rounded-xl flex items-center justify-center min-h-[300px]">
                    {result ? <img src={result} className="max-w-full max-h-full rounded-xl" /> : <p className="text-gray-400">Result Area</p>}
                </div>
            </div>
        </div>
    );
};

const MagicApparel: React.FC<{ auth: AuthProps; navigateTo: any; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
     const [person, setPerson] = useState<{ base64: Base64File; url: string } | null>(null);
     const [garment, setGarment] = useState<{ base64: Base64File; url: string } | null>(null);
     const [type, setType] = useState('top');
     const [result, setResult] = useState<string | null>(null);
     const [loading, setLoading] = useState(false);

     const handleFile = async (e: React.ChangeEvent<HTMLInputElement>, setFn: Function) => {
         if (e.target.files?.[0]) {
             const f = e.target.files[0];
             const b64 = await fileToBase64(f);
             setFn({ base64: b64, url: URL.createObjectURL(f) });
         }
     };

     const generate = async () => {
         if (!person || !garment) return;
         setLoading(true);
         try {
             const res = await generateApparelTryOn(person.base64.base64, person.base64.mimeType, [{ type, base64: garment.base64.base64, mimeType: garment.base64.mimeType }]);
             const url = `data:image/png;base64,${res}`;
             setResult(url);
             saveCreation(auth.user!.uid, url, 'Magic Apparel');
             await deductCredits(auth.user!.uid, appConfig?.featureCosts['Magic Apparel'] || 3, 'Magic Apparel');
         } catch (e) { console.error(e); alert("Failed"); }
         finally { setLoading(false); }
     };

     return (
         <div className="p-8 max-w-4xl mx-auto">
             <FeatureHeader title="Magic Apparel" description="Virtual Try-On" icon={UsersIcon} />
             <div className="grid grid-cols-2 gap-6 mb-6">
                 <div>
                     <p className="mb-2 font-bold">1. Person</p>
                     <input type="file" onChange={e => handleFile(e, setPerson)} />
                     {person && <img src={person.url} className="mt-2 h-32 object-cover rounded" />}
                 </div>
                 <div>
                     <p className="mb-2 font-bold">2. Garment</p>
                     <input type="file" onChange={e => handleFile(e, setGarment)} />
                     {garment && <img src={garment.url} className="mt-2 h-32 object-cover rounded" />}
                     <select value={type} onChange={e => setType(e.target.value)} className="mt-2 block w-full p-2 border rounded">
                         <option value="top">Top</option>
                         <option value="bottom">Bottom</option>
                     </select>
                 </div>
             </div>
             <button onClick={generate} disabled={loading} className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold">
                 {loading ? 'Fitting...' : 'Try On'}
             </button>
             {result && <img src={result} className="mt-6 w-full rounded-xl shadow-lg" />}
         </div>
     );
};

const CaptionAI: React.FC<{ auth: AuthProps; navigateTo: any; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [image, setImage] = useState<{ base64: Base64File; url: string } | null>(null);
    const [captions, setCaptions] = useState<{ caption: string; hashtags: string }[]>([]);
    const [loading, setLoading] = useState(false);

    const generate = async () => {
        if (!image) return;
        setLoading(true);
        try {
            const res = await generateCaptions(image.base64.base64, image.base64.mimeType);
            setCaptions(res);
            await deductCredits(auth.user!.uid, appConfig?.featureCosts['CaptionAI'] || 1, 'CaptionAI');
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <FeatureHeader title="CaptionAI" description="Generate social media captions." icon={CaptionIcon} />
            <input type="file" onChange={async (e) => { if(e.target.files?.[0]) { const f = e.target.files[0]; setImage({ base64: await fileToBase64(f), url: URL.createObjectURL(f) }); } }} className="mb-4" />
            {image && <img src={image.url} className="w-full rounded-lg mb-4" />}
            <button onClick={generate} disabled={loading} className="w-full bg-amber-500 text-white py-2 rounded-lg font-bold mb-6">{loading ? 'Thinking...' : 'Generate Captions'}</button>
            <div className="space-y-4">
                {captions.map((c, i) => (
                    <div key={i} className="bg-white p-4 rounded-lg shadow border">
                        <p className="text-gray-800">{c.caption}</p>
                        <p className="text-blue-600 text-sm mt-2">{c.hashtags}</p>
                        <button onClick={() => navigator.clipboard.writeText(`${c.caption} ${c.hashtags}`)} className="mt-2 text-xs text-gray-500 uppercase font-bold flex items-center gap-1"><CopyIcon className="w-3 h-3" /> Copy</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ProductStudio: React.FC<{ auth: AuthProps; navigateTo: any; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    // Simplified placeholder for complex product studio
    return (
        <div className="p-10 text-center">
            <FeatureHeader title="Product Studio" description="Comprehensive marketing packs." icon={ProductStudioIcon} />
            <p className="text-gray-500">This is a complex multi-step workflow. (Placeholder)</p>
        </div>
    );
};

const ThumbnailStudio: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; appConfig: AppConfig | null; }> = ({ auth, navigateTo, appConfig }) => {
    const [category, setCategory] = useState<string | null>(null);
    const [subjectA, setSubjectA] = useState<{ file: File; url: string; base64: Base64File } | null>(null);
    const [subjectB, setSubjectB] = useState<{ file: File; url: string; base64: Base64File } | null>(null);
    const [referenceImage, setReferenceImage] = useState<{ file: File; url: string; base64: Base64File } | null>(null);
    const [videoTitle, setVideoTitle] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Refs for file inputs
    const subjectAInputRef = useRef<HTMLInputElement>(null);
    const subjectBInputRef = useRef<HTMLInputElement>(null);
    const referenceInputRef = useRef<HTMLInputElement>(null);

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

    const handleGenerate = async () => {
        if (!referenceImage) {
            setError("Please upload a reference thumbnail style.");
            return;
        }
        if (!subjectA) {
            setError("Please upload at least one subject image.");
            return;
        }
        if (category === 'podcast' && !subjectB) {
             setError("Podcasts typically need two subjects. Please upload the second speaker.");
             return;
        }
        if (!videoTitle.trim()) {
            setError("Please enter a title for your thumbnail.");
            return;
        }

        setIsGenerating(true);
        setError(null);
        setGeneratedThumbnail(null);

        try {
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
                 // Assuming cost is 2 credits for now
                 const updatedProfile = await deductCredits(auth.user.uid, 2, 'Thumbnail Studio');
                 auth.setUser(prev => prev ? { ...prev, credits: updatedProfile.credits } : null);
            }

        } catch (err: any) {
            setError(err.message || "Failed to generate thumbnail.");
        } finally {
            setIsGenerating(false);
        }
    };

    const ImageUploadBox: React.FC<{
        image: { url: string } | null;
        inputRef: React.RefObject<HTMLInputElement>;
        onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        title: string;
        isWide?: boolean;
    }> = ({ image, inputRef, onFileChange, title, isWide = false }) => {
        const triggerFileInput = () => inputRef.current?.click();
        return (
            <div className={`relative w-full ${isWide ? 'aspect-video' : 'aspect-square'} bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-center transition-colors overflow-hidden ${!image ? 'hover:border-[#0079F2] hover:bg-blue-50/50 cursor-pointer' : ''}`} onClick={!image ? triggerFileInput : undefined}>
                <input type="file" ref={inputRef} onChange={onFileChange} className="hidden" accept="image/*" />
                {image ? (
                    <>
                        <img src={image.url} alt={title} className="w-full h-full object-cover" />
                        <button onClick={triggerFileInput} className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full text-gray-700 hover:text-black shadow-md" title={`Change ${title}`}><ArrowUpCircleIcon className="w-5 h-5" /></button>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-1 text-gray-500 p-2">
                        <UploadIcon className="w-8 h-8" />
                        <span className="font-semibold text-sm text-gray-700">{title}</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className='p-4 sm:p-6 lg:p-8 pb-24'>
            <div className='w-full max-w-7xl mx-auto'>
                <div className='mb-8 text-center'>
                    <h2 className="text-3xl font-bold text-[#1E1E1E] uppercase tracking-wider flex items-center justify-center gap-2">
                        <ThumbnailIcon className="w-8 h-8 text-red-500" /> Thumbnail Studio
                    </h2>
                    <p className="text-[#5F6368] mt-2">Replicate pro thumbnail styles with your own content.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    {/* Configuration Panel */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-6 space-y-6">
                        
                        {/* 1. Category Selection */}
                        <div>
                            <h3 className="text-lg font-bold text-[#1E1E1E] mb-3">1. Select Category</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => { setCategory(cat.id); setSubjectA(null); setSubjectB(null); setGeneratedThumbnail(null); }}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${category === cat.id ? 'border-[#0079F2] bg-blue-50 text-[#0079F2]' : 'border-gray-200 hover:border-blue-200 text-gray-600'}`}
                                    >
                                        {cat.icon}
                                        <span className="text-xs font-bold mt-1">{cat.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {category && (
                            <>
                                {/* 2. Content Uploads */}
                                <div className="animate-fade-in">
                                    <h3 className="text-lg font-bold text-[#1E1E1E] mb-3">2. Upload Content</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <ImageUploadBox 
                                            image={subjectA} 
                                            inputRef={subjectAInputRef} 
                                            onFileChange={(e) => handleFileChange(e, 'A')} 
                                            title={category === 'podcast' ? "Speaker 1" : "Main Subject"} 
                                        />
                                        {category === 'podcast' && (
                                            <ImageUploadBox 
                                                image={subjectB} 
                                                inputRef={subjectBInputRef} 
                                                onFileChange={(e) => handleFileChange(e, 'B')} 
                                                title="Speaker 2" 
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* 3. Title */}
                                <div className="animate-fade-in">
                                    <h3 className="text-lg font-bold text-[#1E1E1E] mb-3">3. Video Title (Influences Background)</h3>
                                    <InputField 
                                        id="thumbTitle" 
                                        label="" 
                                        value={videoTitle} 
                                        onChange={(e) => setVideoTitle(e.target.value)} 
                                        placeholder="e.g. Budget 2025 Analysis (Be Descriptive!)" 
                                    />
                                    <p className="text-xs text-gray-500 mt-1">The AI uses this title to determine the background context.</p>
                                </div>

                                {/* 4. Reference Style */}
                                <div className="animate-fade-in">
                                    <h3 className="text-lg font-bold text-[#1E1E1E] mb-3 flex items-center gap-2">
                                        4. Style Reference <span className="text-xs font-normal bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Crucial</span>
                                    </h3>
                                    <ImageUploadBox 
                                        image={referenceImage} 
                                        inputRef={referenceInputRef} 
                                        onFileChange={(e) => handleFileChange(e, 'Ref')} 
                                        title="Upload Reference Thumbnail" 
                                        isWide={true}
                                    />
                                    <p className="text-xs text-gray-500 mt-2">AI will copy the layout, lighting, and text style from this image.</p>
                                </div>

                                {/* Generate Button */}
                                <div className="pt-4 border-t border-gray-200/80 animate-fade-in">
                                    <button 
                                        onClick={handleGenerate} 
                                        disabled={isGenerating} 
                                        className="w-full flex items-center justify-center gap-3 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 px-4 rounded-xl shadow-md disabled:opacity-50 transition-transform transform active:scale-95 hover:shadow-lg"
                                    >
                                        <SparklesIcon className="w-6 h-6"/> {isGenerating ? 'Designing Magic...' : 'Generate Magic Thumbnail'}
                                    </button>
                                    <p className="text-xs text-center text-gray-500 mt-2">Costs 2 credits.</p>
                                </div>
                            </>
                        )}
                         {error && <div className="text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm">{error}</div>}
                    </div>

                    {/* Output Panel */}
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-6 min-h-[500px] flex flex-col">
                            {!generatedThumbnail && !isGenerating && (
                                <div className="flex-1 flex flex-col items-center justify-center text-center py-20 opacity-50">
                                    <ThumbnailIcon className="w-24 h-24 text-gray-300 mb-4" />
                                    <h3 className="text-xl font-bold text-gray-400">Your Masterpiece Awaits</h3>
                                    <p className="text-gray-400 mt-2">Select a category and upload a reference to start.</p>
                                </div>
                            )}
                            
                            {isGenerating && (
                                <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
                                    <div className="relative w-24 h-24 mb-6">
                                        <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                                        <div className="absolute inset-0 border-4 border-t-[#f9d230] rounded-full animate-spin"></div>
                                        <SparklesIcon className="absolute inset-0 m-auto w-8 h-8 text-[#f9d230] animate-pulse" />
                                    </div>
                                    <h3 className="text-xl font-bold text-[#1E1E1E] animate-pulse">Analyzing Context & Style...</h3>
                                    <p className="text-[#5F6368] mt-2">detecting culture • studying reference layout • preserving identity</p>
                                </div>
                            )}

                            {generatedThumbnail && (
                                <div className="animate-fade-in">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-xl font-bold text-[#1E1E1E]">Generated Result</h2>
                                        <button onClick={() => setGeneratedThumbnail(null)} className="text-sm text-gray-500 hover:text-black flex items-center gap-1"><UploadIcon className="w-4 h-4"/> New Design</button>
                                    </div>
                                    <div className="relative aspect-video w-full rounded-xl overflow-hidden shadow-xl group">
                                        <img src={generatedThumbnail} alt="AI Generated Thumbnail" className="w-full h-full object-cover" />
                                         <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                             <button 
                                                onClick={() => { const link = document.createElement('a'); link.href = generatedThumbnail; link.download = `magic_thumb_${Date.now()}.png`; link.click(); }}
                                                className="bg-white text-[#1E1E1E] font-bold py-3 px-8 rounded-full shadow-lg transform hover:scale-105 transition-transform flex items-center gap-2"
                                             >
                                                <DownloadIcon className="w-5 h-5" /> Download High-Res
                                             </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Support: React.FC<{ auth: AuthProps; }> = ({ auth }) => { return <div>Support</div> };

const Profile: React.FC<{ auth: AuthProps; openEditProfileModal: () => void; }> = ({ auth, openEditProfileModal }) => { return <div>Profile</div> };

const Creations: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; }> = ({ auth, navigateTo }) => {
    const [creations, setCreations] = useState<Creation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        if (auth.user) {
            setIsLoading(true);
            getCreations(auth.user.uid)
                .then(setCreations)
                .catch(console.error)
                .finally(() => setIsLoading(false));
        }
    }, [auth.user]);

    const handleDelete = async (creation: Creation, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!auth.user || !confirm('Are you sure you want to delete this creation?')) return;
        
        setDeletingId(creation.id);
        try {
            await deleteCreation(auth.user.uid, creation);
            setCreations(prev => prev.filter(c => c.id !== creation.id));
        } catch (error) {
            console.error("Failed to delete:", error);
            alert("Failed to delete creation.");
        } finally {
            setDeletingId(null);
        }
    };

    const handleDownload = (url: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = url;
        link.download = `magicpixa_creation_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 pb-24">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8 text-center lg:text-left flex flex-col lg:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-[#1E1E1E]">My Creations</h2>
                        <p className="text-[#5F6368] mt-1">Your generated masterpieces.</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
                         {[...Array(8)].map((_, i) => (
                            <div key={i} className="aspect-square bg-gray-200 rounded-xl"></div>
                        ))}
                    </div>
                ) : creations.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {creations.map(creation => (
                            <div 
                                key={creation.id} 
                                onClick={() => setSelectedImage(creation.imageUrl)}
                                className="group relative aspect-square bg-gray-100 rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all border border-gray-200"
                            >
                                <img src={creation.imageUrl} alt={creation.feature} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                    <p className="text-white font-bold text-sm mb-1">{creation.feature}</p>
                                    <p className="text-gray-300 text-xs mb-3">{creation.createdAt?.seconds ? new Date(creation.createdAt.seconds * 1000).toLocaleDateString() : ''}</p>
                                    <div className="flex gap-2">
                                        <button onClick={(e) => handleDownload(creation.imageUrl, e)} className="p-2 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white hover:text-black transition-colors">
                                            <DownloadIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={(e) => handleDelete(creation, e)} disabled={deletingId === creation.id} className="p-2 bg-red-500/20 backdrop-blur-sm rounded-lg text-white hover:bg-red-500 transition-colors">
                                            {deletingId === creation.id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <TrashIcon className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ProjectsIcon className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">No creations yet</h3>
                        <p className="text-gray-500 mb-6">Start using our magic tools to create something amazing.</p>
                        <button onClick={() => navigateTo('dashboard', 'dashboard')} className="px-6 py-3 bg-[#0079F2] text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
                            Go to Dashboard
                        </button>
                    </div>
                )}
            </div>
            {selectedImage && <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />}
        </div>
    );
};

const Dashboard: React.FC<{ user: User | null; navigateTo: any; openEditProfileModal: any; setActiveView: any; creations: any[]; appConfig: AppConfig | null }> = ({ user, navigateTo, openEditProfileModal, setActiveView, creations, appConfig }) => {
    const features = [
        { id: 'studio', label: 'Magic Photo Studio', icon: PhotoStudioIcon, color: 'bg-blue-500' },
        { id: 'product_studio', label: 'Product Studio', icon: ProductStudioIcon, color: 'bg-green-500' },
        { id: 'thumbnail_studio', label: 'Thumbnail Studio', icon: ThumbnailIcon, color: 'bg-red-500' },
        { id: 'brand_stylist', label: 'Brand Stylist AI', icon: LightbulbIcon, color: 'bg-yellow-500' },
        { id: 'soul', label: 'Magic Soul', icon: UsersIcon, color: 'bg-pink-500' },
        { id: 'colour', label: 'Magic Photo Colour', icon: PaletteIcon, color: 'bg-rose-500' },
        { id: 'caption', label: 'CaptionAI', icon: CaptionIcon, color: 'bg-amber-500' },
        { id: 'interior', label: 'Magic Interior', icon: HomeIcon, color: 'bg-orange-500' },
        { id: 'apparel', label: 'Magic Apparel', icon: UsersIcon, color: 'bg-teal-500' },
        { id: 'mockup', label: 'Magic Mockup', icon: MockupIcon, color: 'bg-indigo-500' },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 pb-24">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-[#1E1E1E]">Welcome back, {user?.name.split(' ')[0]}!</h2>
                        <p className="text-[#5F6368]">Ready to create something magic today?</p>
                    </div>
                    <div className="flex gap-3">
                         <button onClick={() => setActiveView('billing')} className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg font-semibold hover:bg-yellow-200 transition-colors flex items-center gap-2">
                            <SparklesIcon className="w-4 h-4" /> Get Credits
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {features.map(f => (
                        <button 
                            key={f.id} 
                            onClick={() => setActiveView(f.id)}
                            className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex flex-col items-center text-center group"
                        >
                            <div className={`w-12 h-12 ${f.color} rounded-full flex items-center justify-center mb-3 text-white group-hover:scale-110 transition-transform`}>
                                <f.icon className="w-6 h-6" />
                            </div>
                            <span className="font-bold text-gray-800">{f.label}</span>
                        </button>
                    ))}
                </div>
                
                {creations.length > 0 && (
                    <div className="mt-10">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-[#1E1E1E]">Recent Creations</h3>
                            <button onClick={() => setActiveView('creations')} className="text-blue-600 text-sm font-semibold hover:underline">View All</button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {creations.slice(0, 6).map(c => (
                                <div key={c.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                    <img src={c.imageUrl} alt="" className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const MobileHomeDashboard: React.FC<{ user: User | null; setActiveView: (view: View) => void }> = ({ user, setActiveView }) => {
    return (
        <div className="p-4 pb-24">
             <div className="bg-blue-600 rounded-2xl p-6 text-white mb-6 shadow-lg shadow-blue-200">
                 <h2 className="text-2xl font-bold">Hi {user?.name.split(' ')[0]}</h2>
                 <p className="opacity-90 mb-4">You have {user?.credits} credits available.</p>
                 <button onClick={() => setActiveView('billing')} className="bg-white text-blue-600 px-4 py-2 rounded-lg font-bold text-sm w-full">Top Up Now</button>
             </div>
             <h3 className="font-bold text-gray-800 mb-4">Quick Actions</h3>
             <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setActiveView('studio')} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center gap-2">
                     <PhotoStudioIcon className="w-8 h-8 text-blue-500" />
                     <span className="text-xs font-bold text-gray-700">Photo Studio</span>
                 </button>
                 <button onClick={() => setActiveView('thumbnail_studio')} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center gap-2">
                     <ThumbnailIcon className="w-8 h-8 text-red-500" />
                     <span className="text-xs font-bold text-gray-700">Thumbnails</span>
                 </button>
                  <button onClick={() => setActiveView('caption')} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center gap-2">
                     <CaptionIcon className="w-8 h-8 text-amber-500" />
                     <span className="text-xs font-bold text-gray-700">Captions</span>
                 </button>
                 <button onClick={() => setActiveView('interior')} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center gap-2">
                     <HomeIcon className="w-8 h-8 text-orange-500" />
                     <span className="text-xs font-bold text-gray-700">Interior</span>
                 </button>
             </div>
        </div>
    );
};

const DashboardPage: React.FC<DashboardPageProps> = ({ navigateTo, auth, activeView, setActiveView, openEditProfileModal, isConversationOpen, setIsConversationOpen, appConfig, setAppConfig }) => {
  const [creations, setCreations] = useState<Creation[]>([]);
  const [isLoadingCreations, setIsLoadingCreations] = useState(true);

   useEffect(() => {
    if (auth.user) {
      setIsLoadingCreations(true);
      getCreations(auth.user.uid)
        .then(setCreations)
        .catch(console.error)
        .finally(() => setIsLoadingCreations(false));
    }
  }, [auth.user]);

  const renderContent = () => {
    switch (activeView) {
      case 'home_dashboard':
        return <MobileHomeDashboard user={auth.user} setActiveView={setActiveView} />;
      case 'dashboard':
        return <Dashboard user={auth.user} navigateTo={navigateTo} openEditProfileModal={openEditProfileModal} setActiveView={setActiveView} creations={creations} appConfig={appConfig} />;
      case 'studio':
        return <MagicPhotoStudio auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
      case 'interior':
          return <MagicInterior auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
      case 'colour':
          return <MagicPhotoColour auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
      case 'soul':
          return <MagicSoul auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
      case 'apparel':
          return <MagicApparel auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
      case 'mockup':
          return <MagicMockup auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
      case 'caption':
          return <CaptionAI auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
      case 'product_studio':
          return <ProductStudio auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
      case 'brand_stylist':
          return <BrandStylistAI auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
       case 'thumbnail_studio':
          return <ThumbnailStudio auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
      case 'creations':
        return <Creations auth={auth} navigateTo={navigateTo} />;
      case 'billing':
        return <Billing user={auth.user!} setUser={auth.setUser} appConfig={appConfig} />;
      case 'profile':
          return <Profile auth={auth} openEditProfileModal={openEditProfileModal} />;
      case 'admin':
          return <AdminPanel auth={auth} appConfig={appConfig} onConfigUpdate={setAppConfig} />;
      default:
        return <Dashboard user={auth.user} navigateTo={navigateTo} openEditProfileModal={openEditProfileModal} setActiveView={setActiveView} creations={creations} appConfig={appConfig} />;
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
      {isConversationOpen && <Support auth={auth} />}
    </div>
  );
};

export default DashboardPage;