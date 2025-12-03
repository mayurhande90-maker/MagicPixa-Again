
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig } from '../types';
import { HomeIcon, UploadIcon, XIcon, ArrowUpCircleIcon, CreditCardIcon, SparklesIcon, PixaInteriorIcon } from '../components/icons';
import { FeatureLayout, SelectionGrid, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { generateInteriorDesign } from '../services/interiorService';
import { saveCreation, deductCredits } from '../firebase';

export const MagicInterior: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [result, setResult] = useState<string | null>(null);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    
    // Inputs
    const [spaceType, setSpaceType] = useState<'home' | 'office'>('home');
    const [roomType, setRoomType] = useState('');
    const [style, setStyle] = useState('');
    
    // UI States
    const [isDragging, setIsDragging] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const redoFileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Cost calculation
    const cost = appConfig?.featureCosts['Pixa Interior Design'] || appConfig?.featureCosts['Magic Interior'] || 2;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = image && userCredits < cost;

    // Options
    const homeRooms = ['Living Room', 'Bedroom', 'Kitchen', 'Dining Room', 'Bathroom', 'Home Office', 'Balcony/Patio', 'Gaming Room'];
    const officeRooms = ['Open Workspace', 'Private Office', 'Conference Room', 'Reception / Lobby', 'Break Room', 'Meeting Pod'];

    // Must match keys in interiorService.ts
    const homeStyles = ['Modern', 'Minimalist', 'Japanese', 'American', 'Coastal', 'Traditional Indian', 'Arabic', 'Futuristic', 'African'];
    const officeStyles = ['Modern Corporate', 'Minimalist', 'Industrial', 'Creative / Artistic', 'Luxury Executive', 'Biophilic / Nature-Inspired', 'Tech Futuristic', 'Traditional Indian'];

    const activeRoomOptions = spaceType === 'home' ? homeRooms : officeRooms;
    const activeStyleOptions = spaceType === 'home' ? homeStyles : officeStyles;

    // Animation Timer
    useEffect(() => {
        let interval: any;
        if (loading) {
            const steps = ["Pixa Vision scanning structure...", "Pixa is mapping perspective...", "Pixa is applying style...", "Pixa is rendering furniture...", "Pixa is finalizing lighting..."];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
            }, 1500);
        }
        return () => clearInterval(interval);
    }, [loading]);

    // Cleanup blob URL
    useEffect(() => {
        return () => {
            if (result) URL.revokeObjectURL(result);
        };
    }, [result]);

    const autoScroll = () => {
        if (scrollRef.current) {
            setTimeout(() => {
                const element = scrollRef.current;
                if (element) {
                    element.scrollTo({
                        top: element.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            }, 100); 
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            handleNewSession();
            setImage({ url: URL.createObjectURL(file), base64 });
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging) setIsDragging(true);
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging) setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                const base64 = await fileToBase64(file);
                handleNewSession();
                setImage({ url: URL.createObjectURL(file), base64 });
            } else {
                alert("Please drop a valid image file.");
            }
        }
    };

    const handleGenerate = async () => {
        if (!image || !auth.user) return;
        
        if (isLowCredits) {
            alert("Insufficient credits.");
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const res = await generateInteriorDesign(
                image.base64.base64,
                image.base64.mimeType,
                style,
                spaceType,
                roomType
            );
            
            const blobUrl = await base64ToBlobUrl(res, 'image/png');
            setResult(blobUrl);
            
            const dataUri = `data:image/png;base64,${res}`;
            saveCreation(auth.user.uid, dataUri, 'Pixa Interior Design');
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Interior Design');
            
            if (updatedUser.lifetimeGenerations) {
                const bonus = checkMilestone(updatedUser.lifetimeGenerations);
                if (bonus !== false) {
                    setMilestoneBonus(bonus);
                }
            }
            
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);

        } catch (e) {
            console.error(e);
            alert("Generation failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleNewSession = () => {
        setImage(null);
        setResult(null);
        setRoomType('');
        setStyle('');
    };

    const canGenerate = !!image && !isLowCredits && !!roomType && !!style;

    return (
        <>
            <FeatureLayout 
                title="Pixa Interior Design"
                description="Redesign any room in seconds. Choose a style and watch Pixa transform your space."
                icon={<PixaInteriorIcon className="w-14 h-14"/>}
                rawIcon={true}
                creditCost={cost}
                isGenerating={loading}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                resultImage={result}
                onResetResult={() => setResult(null)}
                onNewSession={handleNewSession}
                resultHeightClass="h-[600px]"
                hideGenerateButton={isLowCredits}
                generateButtonStyle={{
                    className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]",
                    hideIcon: true
                }}
                scrollRef={scrollRef}
                leftContent={
                    image ? (
                        <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                            {loading && (
                                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                    <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4">
                                        <div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                                    </div>
                                    <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p>
                                </div>
                            )}
                            
                            <img 
                                src={image.url} 
                                className={`max-w-full max-h-full rounded-xl shadow-md object-contain transition-all duration-700 ${loading ? 'scale-95 opacity-50' : ''}`} 
                            />

                            {!loading && (
                                <>
                                    <button 
                                        onClick={handleNewSession} 
                                        className="absolute top-4 right-4 bg-white p-2.5 rounded-full shadow-md hover:bg-red-50 text-gray-500 hover:text-red-500 transition-all z-40"
                                        title="Cancel"
                                    >
                                        <XIcon className="w-5 h-5"/>
                                    </button>
                                    <button 
                                        onClick={() => redoFileInputRef.current?.click()} 
                                        className="absolute top-4 left-4 bg-white p-2.5 rounded-full shadow-md hover:bg-[#4D7CFF] hover:text-white text-gray-500 transition-all z-40"
                                        title="Change Photo"
                                    >
                                        <UploadIcon className="w-5 h-5"/>
                                    </button>
                                </>
                            )}
                            <input ref={redoFileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                            <style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
                        </div>
                    ) : (
                        <div className="w-full h-full flex justify-center">
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={handleDragOver}
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`h-full w-full border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden mx-auto ${
                                    isDragging 
                                    ? 'border-indigo-600 bg-indigo-50 scale-[1.02] shadow-xl' 
                                    : 'border-indigo-300 hover:border-indigo-500 bg-white hover:-translate-y-1 hover:shadow-xl'
                                }`}
                            >
                                <div className="relative z-10 p-6 bg-indigo-50 rounded-2xl shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
                                    <HomeIcon className="w-12 h-12 text-indigo-300 group-hover:text-indigo-600 transition-colors duration-300" />
                                </div>
                                
                                <div className="relative z-10 mt-6 text-center space-y-2 px-6">
                                    <p className="text-xl font-bold text-gray-500 group-hover:text-[#1A1A1E] transition-colors duration-300 tracking-tight">Upload Room Photo</p>
                                    <div className="bg-gray-50 rounded-full px-3 py-1 inline-block">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Click to Browse</p>
                                    </div>
                                </div>

                                {isDragging && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-indigo-500/10 backdrop-blur-[2px] z-50 rounded-3xl pointer-events-none">
                                        <div className="bg-white px-6 py-3 rounded-full shadow-2xl border border-indigo-100 animate-bounce">
                                            <p className="text-lg font-bold text-indigo-600 flex items-center gap-2">
                                                <UploadIcon className="w-5 h-5"/> Drop to Upload!
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }
                rightContent={
                    !image ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-50 select-none">
                            <div className="bg-white p-4 rounded-full mb-4 border border-gray-100">
                                <ArrowUpCircleIcon className="w-8 h-8 text-gray-400"/>
                            </div>
                            <h3 className="font-bold text-gray-600 mb-2">Controls Locked</h3>
                            <p className="text-sm text-gray-400">Upload a room photo to start.</p>
                        </div>
                    ) : isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100">
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4 shadow-inner animate-bounce-slight">
                                <CreditCardIcon className="w-10 h-10 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                            <p className="text-gray-500 mb-6 max-w-xs text-sm leading-relaxed">
                                This generation requires <span className="font-bold text-gray-800">{cost} credits</span>, but you only have <span className="font-bold text-red-500">{userCredits}</span>.
                            </p>
                            <button
                                onClick={() => (window as any).navigateTo('dashboard', 'billing')}
                                className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg shadow-yellow-500/20 hover:scale-105 flex items-center gap-2"
                            >
                                <SparklesIcon className="w-5 h-5" />
                                Recharge Now
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 p-1 animate-fadeIn">
                            
                            {/* 1. Space Type Buttons */}
                            <div>
                                <div className="flex items-center justify-between mb-3 ml-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">1. Space Type</label>
                                </div>
                                <div className="flex gap-3 p-1">
                                    <button 
                                        onClick={() => { setSpaceType('home'); setRoomType(''); setStyle(''); }}
                                        className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all duration-300 transform active:scale-95 ${
                                            spaceType === 'home' 
                                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-md' 
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        🏡 Residential
                                    </button>
                                    <button 
                                        onClick={() => { setSpaceType('office'); setRoomType(''); setStyle(''); }}
                                        className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all duration-300 transform active:scale-95 ${
                                            spaceType === 'office' 
                                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-md' 
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        🏢 Commercial
                                    </button>
                                </div>
                            </div>

                            {/* 2. Room Type */}
                            <SelectionGrid 
                                label="2. Room Type" 
                                options={activeRoomOptions} 
                                value={roomType} 
                                onChange={(val) => { setRoomType(val); if(val) autoScroll(); }} 
                            />

                            {/* 3. Style */}
                            {roomType && (
                                <div className="animate-fadeIn">
                                    <SelectionGrid 
                                        label="3. Design Style" 
                                        options={activeStyleOptions} 
                                        value={style} 
                                        onChange={(val) => { setStyle(val); if(val) autoScroll(); }} 
                                    />
                                </div>
                            )}
                        </div>
                    )
                }
            />
            <input ref={redoFileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClose={() => setMilestoneBonus(undefined)} />}
        </>
    );
};