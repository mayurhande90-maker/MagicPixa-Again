import React, { useState, useEffect, useRef } from 'react';
import { User, Page, View, AuthProps, AppConfig, Creation } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Billing from './components/Billing';
import AdminPanel from './components/AdminPanel';
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
    startLiveSession
} from './services/geminiService';
import { fileToBase64, Base64File } from './utils/imageUtils';
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
    AudioWaveIcon
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
    const [category, setCategory] = useState<string | null>(null);
    const [subjectA, setSubjectA] = useState<{ file: File; url: string; base64: Base64File } | null>(null);
    const [subjectB, setSubjectB] = useState<{ file: File; url: string; base64: Base64File } | null>(null);
    const [referenceImage, setReferenceImage] = useState<{ file: File; url: string; base64: Base64File } | null>(null);
    const [videoTitle, setVideoTitle] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    
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
        if (!referenceImage || !subjectA || !videoTitle.trim()) {
            setError("Please provide all required inputs.");
            return;
        }
        setIsGenerating(true);
        setError(null);
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
                 const updatedProfile = await deductCredits(auth.user.uid, 2, 'Thumbnail Studio');
                 auth.setUser(prev => prev ? { ...prev, credits: updatedProfile.credits } : null);
            }
        } catch (err: any) {
            setError(err.message || "Failed to generate thumbnail.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className='p-6 pb-24'>
            <div className='max-w-7xl mx-auto'>
                <h2 className="text-3xl font-bold text-[#1E1E1E] flex items-center justify-center gap-2 mb-8"><ThumbnailIcon className="w-8 h-8 text-red-500" /> Thumbnail Studio</h2>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
                        <div>
                            <h3 className="font-bold mb-3">1. Select Category</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {categories.map(cat => (
                                    <button key={cat.id} onClick={() => setCategory(cat.id)} className={`p-3 rounded-xl border-2 flex flex-col items-center ${category === cat.id ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200'}`}>
                                        {cat.icon}<span className="text-xs font-bold mt-1">{cat.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        {category && (
                            <>
                                <div>
                                    <h3 className="font-bold mb-3">2. Upload Content</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="aspect-square border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-50" onClick={() => subjectAInputRef.current?.click()}>
                                            {subjectA ? <img src={subjectA.url} className="w-full h-full object-cover rounded-lg"/> : <UploadIcon className="w-8 h-8 text-gray-400"/>}
                                            <input type="file" ref={subjectAInputRef} className="hidden" accept="image/*" onChange={e => handleFileChange(e, 'A')} />
                                        </div>
                                        {category === 'podcast' && (
                                            <div className="aspect-square border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-50" onClick={() => subjectBInputRef.current?.click()}>
                                                {subjectB ? <img src={subjectB.url} className="w-full h-full object-cover rounded-lg"/> : <UploadIcon className="w-8 h-8 text-gray-400"/>}
                                                <input type="file" ref={subjectBInputRef} className="hidden" accept="image/*" onChange={e => handleFileChange(e, 'B')} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-bold mb-3">3. Title</h3>
                                    <InputField value={videoTitle} onChange={(e:any) => setVideoTitle(e.target.value)} placeholder="Video Title" />
                                </div>
                                <div>
                                    <h3 className="font-bold mb-3">4. Reference Style</h3>
                                    <div className="aspect-video border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-50" onClick={() => referenceInputRef.current?.click()}>
                                        {referenceImage ? <img src={referenceImage.url} className="w-full h-full object-cover rounded-lg"/> : <UploadIcon className="w-8 h-8 text-gray-400"/>}
                                        <input type="file" ref={referenceInputRef} className="hidden" accept="image/*" onChange={e => handleFileChange(e, 'Ref')} />
                                    </div>
                                </div>
                                <button onClick={handleGenerate} disabled={isGenerating} className="w-full bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 disabled:opacity-50">
                                    {isGenerating ? 'Generating...' : 'Generate Thumbnail'}
                                </button>
                            </>
                        )}
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                    </div>
                    <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center min-h-[500px]">
                         {generatedThumbnail ? (
                             <div className="w-full">
                                 <img src={generatedThumbnail} className="w-full rounded-xl shadow-lg mb-4"/>
                                 <button onClick={() => { const a = document.createElement('a'); a.href=generatedThumbnail; a.download='thumb.png'; a.click(); }} className="flex items-center gap-2 bg-gray-900 text-white px-6 py-2 rounded-full mx-auto"><DownloadIcon className="w-5 h-5"/> Download</button>
                             </div>
                         ) : (
                             <div className="text-center text-gray-400">
                                 {isGenerating ? <SparklesIcon className="w-16 h-16 animate-pulse mx-auto mb-4 text-yellow-400"/> : <ThumbnailIcon className="w-16 h-16 mx-auto mb-4"/>}
                                 <p>{isGenerating ? "Creating magic..." : "Result will appear here"}</p>
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

const Dashboard: React.FC<any> = ({ navigateTo, setActiveView }) => (
    <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center mb-10">
             <h2 className="text-3xl font-bold text-gray-900">Your Creative Dashboard</h2>
             <p className="text-gray-500">Select a tool to get started.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {[
                 { id: 'studio', label: 'Magic Photo Studio', desc: 'Pro product shots.', icon: PhotoStudioIcon, color: 'bg-blue-500' },
                 { id: 'thumbnail_studio', label: 'Thumbnail Studio', desc: 'Viral YouTube thumbs.', icon: ThumbnailIcon, color: 'bg-red-500' },
                 { id: 'interior', label: 'Magic Interior', desc: 'Redesign any room.', icon: HomeIcon, color: 'bg-orange-500' },
                 { id: 'soul', label: 'Magic Soul', desc: 'Merge people into one.', icon: UsersIcon, color: 'bg-pink-500' },
                 { id: 'creations', label: 'My Creations', desc: 'View your gallery.', icon: ProjectsIcon, color: 'bg-purple-500' },
                 { id: 'billing', label: 'Billing', desc: 'Manage credits.', icon: LightbulbIcon, color: 'bg-green-500' },
             ].map(item => (
                 <button key={item.id} onClick={() => setActiveView(item.id as View)} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all text-left flex items-start gap-4 group">
                     <div className={`p-4 rounded-xl text-white ${item.color} group-hover:scale-110 transition-transform`}>
                         <item.icon className="w-6 h-6"/>
                     </div>
                     <div>
                         <h3 className="font-bold text-lg text-gray-900">{item.label}</h3>
                         <p className="text-sm text-gray-500">{item.desc}</p>
                     </div>
                 </button>
             ))}
        </div>
    </div>
);

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
      default: return <Dashboard user={auth.user} navigateTo={navigateTo} setActiveView={setActiveView} />;
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