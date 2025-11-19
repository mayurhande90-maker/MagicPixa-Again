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
    analyzeVideoFrames // Imported for video analysis
} from './services/geminiService';
import { fileToBase64, Base64File } from './utils/imageUtils';
import { extractFramesFromVideo } from './utils/videoUtils'; // Imported for local video processing
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
    ArrowRightIcon
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
    <div>
        {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
        <input id={id} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0079F2] focus:outline-none" {...props} />
    </div>
);

const ImageModal: React.FC<{ imageUrl: string; onClose: () => void }> = ({ imageUrl, onClose }) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="relative max-w-4xl max-h-full">
            <button onClick={onClose} className="absolute -top-10 right-0 text-white hover:text-gray-300"><XIcon className="w-8 h-8" /></button>
            <img src={imageUrl} alt="Full view" className="max-w-full max-h-[80vh] rounded-lg shadow-2xl" />
        </div>
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
        <div className="p-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><PhotoStudioIcon className="w-6 h-6 text-blue-500"/> Magic Photo Studio</h2>
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50" onClick={() => document.getElementById('studio-upload')?.click()}>
                        {image ? <img src={image.url} className="max-h-64 mx-auto rounded-lg" /> : <div className="py-10 text-gray-500"><UploadIcon className="w-10 h-10 mx-auto mb-2"/>Upload Image</div>}
                        <input id="studio-upload" type="file" className="hidden" accept="image/*" onChange={async (e) => { if (e.target.files?.[0]) setImage({ url: URL.createObjectURL(e.target.files[0]), base64: await fileToBase64(e.target.files[0]) }) }} />
                    </div>
                    <InputField label="Style / Theme (Optional)" placeholder="e.g. Professional studio lighting, dark background..." value={prompt} onChange={(e: any) => setPrompt(e.target.value)} />
                    <button onClick={handleGenerate} disabled={loading || !image} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">{loading ? <SparklesIcon className="w-5 h-5 animate-spin"/> : <SparklesIcon className="w-5 h-5"/>} Generate</button>
                </div>
                <div className="bg-gray-100 rounded-xl flex items-center justify-center min-h-[300px]">
                    {result ? <img src={result} className="max-h-full rounded-lg shadow-lg" /> : <p className="text-gray-400">Result will appear here</p>}
                </div>
            </div>
        </div>
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
        <div className="p-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><HomeIcon className="w-6 h-6 text-orange-500"/> Magic Interior</h2>
             <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50" onClick={() => document.getElementById('interior-upload')?.click()}>
                        {image ? <img src={image.url} className="max-h-64 mx-auto rounded-lg" /> : <div className="py-10 text-gray-500"><UploadIcon className="w-10 h-10 mx-auto mb-2"/>Upload Room Photo</div>}
                        <input id="interior-upload" type="file" className="hidden" accept="image/*" onChange={async (e) => { if (e.target.files?.[0]) setImage({ url: URL.createObjectURL(e.target.files[0]), base64: await fileToBase64(e.target.files[0]) }) }} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <select className="px-4 py-2 border rounded-lg" value={style} onChange={e => setStyle(e.target.value)}>
                            {['Modern', 'Japanese', 'American', 'Coastal', 'Futuristic'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                         <select className="px-4 py-2 border rounded-lg" value={roomType} onChange={e => setRoomType(e.target.value)}>
                            {['Living Room', 'Bedroom', 'Kitchen', 'Office'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <button onClick={handleGenerate} disabled={loading || !image} className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2">{loading ? 'Designing...' : 'Redesign Room'}</button>
                </div>
                <div className="bg-gray-100 rounded-xl flex items-center justify-center min-h-[300px]">
                    {result ? <img src={result} className="max-h-full rounded-lg shadow-lg" /> : <p className="text-gray-400">Result will appear here</p>}
                </div>
            </div>
        </div>
    );
};

// ... Other simplified feature components ...
const MagicPhotoColour: React.FC<any> = ({auth, appConfig}) => <div className="p-6 text-center">Feature coming soon...</div>;
const MagicSoul: React.FC<any> = ({auth, appConfig}) => <div className="p-6 text-center">Feature coming soon...</div>;
const MagicApparel: React.FC<any> = ({auth, appConfig}) => <div className="p-6 text-center">Feature coming soon...</div>;
const MagicMockup: React.FC<any> = ({auth, appConfig}) => <div className="p-6 text-center">Feature coming soon...</div>;
const CaptionAI: React.FC<any> = ({auth, appConfig}) => <div className="p-6 text-center">Feature coming soon...</div>;
const ProductStudio: React.FC<any> = ({auth, appConfig}) => <div className="p-6 text-center">Feature coming soon...</div>;
const BrandStylistAI: React.FC<any> = ({auth, appConfig}) => <div className="p-6 text-center">Feature coming soon...</div>;


const ThumbnailStudio: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; appConfig: AppConfig | null; }> = ({ auth, navigateTo, appConfig }) => {
    const [activeTab, setActiveTab] = useState<'photo' | 'video'>('photo');
    const [category, setCategory] = useState<string | null>(null);
    
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
        <div className='p-6 pb-24'>
            <div className='max-w-7xl mx-auto'>
                <h2 className="text-3xl font-bold text-[#1E1E1E] flex items-center justify-center gap-2 mb-8"><ThumbnailIcon className="w-8 h-8 text-red-500" /> Thumbnail Studio</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Left Column: Inputs */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
                        
                        {/* 1. Category */}
                        <div>
                            <h3 className="font-bold mb-3 text-gray-800">1. Select Category</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {categories.map(cat => (
                                    <button key={cat.id} onClick={() => setCategory(cat.id)} className={`p-3 rounded-xl border-2 flex flex-col items-center transition-all ${category === cat.id ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-200 hover:border-red-200'}`}>
                                        {cat.icon}<span className="text-xs font-bold mt-1">{cat.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {category && (
                            <>
                                {/* 2. Content Input (Photo vs Video Tabs) */}
                                <div>
                                    <h3 className="font-bold mb-3 text-gray-800">2. Upload Content</h3>
                                    <div className="flex border-b border-gray-200 mb-4">
                                        <button 
                                            onClick={() => setActiveTab('photo')}
                                            className={`flex-1 py-2 text-sm font-bold ${activeTab === 'photo' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500'}`}
                                        >
                                            Upload Photo
                                        </button>
                                        <button 
                                            onClick={() => setActiveTab('video')}
                                            className={`flex-1 py-2 text-sm font-bold ${activeTab === 'video' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500'}`}
                                        >
                                            Smart Video Scan
                                        </button>
                                    </div>

                                    {activeTab === 'photo' ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50" onClick={() => subjectAInputRef.current?.click()}>
                                                {subjectA ? <img src={subjectA.url} className="w-full h-full object-cover rounded-lg"/> : <><UploadIcon className="w-8 h-8 text-gray-400"/><span className="text-xs text-gray-500 mt-2 font-medium">Main Subject</span></>}
                                                <input type="file" ref={subjectAInputRef} className="hidden" accept="image/*" onChange={e => handleFileChange(e, 'A')} />
                                            </div>
                                            {category === 'podcast' && (
                                                <div className="aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50" onClick={() => subjectBInputRef.current?.click()}>
                                                    {subjectB ? <img src={subjectB.url} className="w-full h-full object-cover rounded-lg"/> : <><UploadIcon className="w-8 h-8 text-gray-400"/><span className="text-xs text-gray-500 mt-2 font-medium">Guest (Optional)</span></>}
                                                    <input type="file" ref={subjectBInputRef} className="hidden" accept="image/*" onChange={e => handleFileChange(e, 'B')} />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Video Uploader */}
                                            <div className="border-2 border-dashed border-red-200 bg-red-50 rounded-xl p-6 text-center cursor-pointer hover:bg-red-100 transition-colors" onClick={() => videoInputRef.current?.click()}>
                                                {isScanningVideo ? (
                                                    <div className="flex flex-col items-center">
                                                        <SparklesIcon className="w-8 h-8 animate-spin text-red-500 mb-2"/>
                                                        <span className="text-sm font-bold text-red-600">Scanning Video...</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <VideoCameraIcon className="w-8 h-8 text-red-500 mx-auto mb-2"/>
                                                        <span className="text-sm font-bold text-gray-700">Upload Local Video</span>
                                                        <p className="text-xs text-gray-500 mt-1">We'll extract the best frames automatically</p>
                                                    </>
                                                )}
                                                <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={handleVideoUpload} />
                                            </div>

                                            {/* Scanned Results */}
                                            {scannedFrames.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-bold text-gray-500 mb-2">SELECT BEST FRAME:</p>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {scannedFrames.map((frame, idx) => (
                                                            <div 
                                                                key={idx} 
                                                                onClick={() => setSubjectA(frame)}
                                                                className={`aspect-video rounded-lg overflow-hidden cursor-pointer border-2 ${subjectA?.base64.base64 === frame.base64.base64 ? 'border-red-500 ring-2 ring-red-200' : 'border-transparent'}`}
                                                            >
                                                                <img src={frame.url} className="w-full h-full object-cover" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                             {suggestedTitles.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-bold text-gray-500 mb-2">AI SUGGESTED TITLES:</p>
                                                    <div className="flex flex-col gap-2">
                                                        {suggestedTitles.map((t, i) => (
                                                            <button key={i} onClick={() => setVideoTitle(t)} className="text-left text-xs p-2 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 truncate">
                                                                {t}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* 3. Title */}
                                <div>
                                    <h3 className="font-bold mb-3 text-gray-800">3. Video Title</h3>
                                    <InputField 
                                        value={videoTitle} 
                                        onChange={(e:any) => setVideoTitle(e.target.value)} 
                                        placeholder="e.g., I Tried iPhone 16..." 
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Tip: Be descriptive. The AI uses this to generate relevant backgrounds.</p>
                                </div>

                                {/* 4. Reference */}
                                <div>
                                    <h3 className="font-bold mb-3 text-gray-800">4. Reference Style</h3>
                                    <div className="aspect-video border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50" onClick={() => referenceInputRef.current?.click()}>
                                        {referenceImage ? <img src={referenceImage.url} className="w-full h-full object-cover rounded-lg"/> : <><UploadIcon className="w-8 h-8 text-gray-400"/><span className="text-xs text-gray-500 mt-2 font-medium">Upload Reference Image</span></>}
                                        <input type="file" ref={referenceInputRef} className="hidden" accept="image/*" onChange={e => handleFileChange(e, 'Ref')} />
                                    </div>
                                </div>

                                {/* Generate Button */}
                                <button onClick={handleGenerate} disabled={isGenerating} className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white py-4 rounded-xl font-bold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 flex flex-col items-center justify-center gap-1">
                                    {isGenerating ? (
                                        <>
                                            <SparklesIcon className="w-6 h-6 animate-spin" />
                                            <span className="text-sm">{statusMessage || "Generating..."}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="flex items-center gap-2 text-lg"><SparklesIcon className="w-5 h-5"/> Generate Viral Thumbnail</span>
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                        {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}
                    </div>

                    {/* Right Column: Result */}
                    <div className="lg:col-span-3 bg-gray-50 p-6 rounded-2xl shadow-inner border border-gray-200 flex flex-col items-center justify-center min-h-[600px]">
                         {generatedThumbnail ? (
                             <div className="w-full flex flex-col items-center">
                                 <div className="relative w-full shadow-2xl rounded-xl overflow-hidden group">
                                     <img src={generatedThumbnail} className="w-full h-auto"/>
                                     <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                 </div>
                                 <div className="flex gap-4 mt-8">
                                    <button onClick={() => { const a = document.createElement('a'); a.href=generatedThumbnail; a.download='viral-thumb.png'; a.click(); }} className="flex items-center gap-2 bg-[#1E1E1E] text-white px-8 py-3 rounded-full font-bold hover:bg-black transition-colors shadow-lg">
                                        <DownloadIcon className="w-5 h-5"/> Download HD
                                    </button>
                                    <button onClick={() => setGeneratedThumbnail(null)} className="flex items-center gap-2 bg-white text-gray-700 px-6 py-3 rounded-full font-bold hover:bg-gray-100 transition-colors shadow-sm border border-gray-300">
                                        Create Another
                                    </button>
                                 </div>
                             </div>
                         ) : (
                             <div className="text-center text-gray-400 max-w-md">
                                 {isGenerating ? (
                                     <div className="flex flex-col items-center">
                                         <div className="w-24 h-24 relative mb-6">
                                             <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                                             <div className="absolute inset-0 border-4 border-red-500 rounded-full border-t-transparent animate-spin"></div>
                                             <SparklesIcon className="absolute inset-0 m-auto w-10 h-10 text-red-500 animate-pulse"/>
                                         </div>
                                         <h3 className="text-xl font-bold text-gray-700 mb-2">Creating Magic...</h3>
                                         <p className="text-sm">{statusMessage}</p>
                                     </div>
                                 ) : (
                                     <>
                                        <ThumbnailIcon className="w-24 h-24 mx-auto mb-6 opacity-20"/>
                                        <h3 className="text-xl font-bold text-gray-500 mb-2">Ready to go viral?</h3>
                                        <p className="text-sm">Select a category and upload your content to generate a high-CTR thumbnail.</p>
                                     </>
                                 )}
                             </div>
                         )}
                    </div>
                </div>
            </div>
        </div>
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