import React, { useState, useEffect, useRef } from 'react';
import { Page, AuthProps, View, AppConfig } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
import { 
  SparklesIcon, PixaProductIcon, ThumbnailIcon, PixaRestoreIcon, MagicAdsIcon, PixaHeadshotIcon, 
  UploadTrayIcon, CursorClickIcon, ArrowRightIcon, ShieldCheckIcon, LightningIcon, 
  CheckIcon, ClockIcon, CreditCoinIcon, StarIcon, XIcon, PixaEcommerceIcon, 
  PixaTogetherIcon, PixaCaptionIcon, PixaInteriorIcon, PixaTryOnIcon, 
  DashboardIcon, HomeIcon, ProjectsIcon, UserIcon as AvatarUserIcon, CameraIcon,
  CubeIcon, PencilIcon
} from './components/icons';
import { BeforeAfterSlider } from './components/BeforeAfterSlider';
import { HomeStyles } from './styles/Home.styles';
import { triggerCheckout } from './services/paymentService';
import { PaymentSuccessModal } from './components/PaymentSuccessModal';
import { subscribeToLabConfig } from './firebase';

// --- CONFIG & CONSTANTS ---

const PLAN_WEIGHTS: Record<string, number> = {
    'Free': 0,
    'Starter Pack': 1,
    'Creator Pack': 2,
    'Studio Pack': 3,
    'Agency Pack': 4
};

const TRANSFORMATIONS_STATIC = [
    {
        id: 'studio',
        label: 'Pixa Product Shots',
        icon: PixaProductIcon,
        before: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=2000&auto=format&fit=crop",
        after: "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?q=80&w=2070&auto=format&fit=crop",
        logic: "Dynamic Shadows + Ray-Tracing",
        description: "Transform raw smartphone photos into luxury studio catalog assets with one click."
    },
    {
        id: 'thumbnail_studio',
        label: 'Pixa Thumbnail Pro',
        icon: ThumbnailIcon,
        before: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=2072&auto=format&fit=crop",
        after: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop",
        logic: "CTR Optimization + High-Pass Sharpness",
        description: "Flat video frames engineered into viral, high-contrast YouTube thumbnails."
    },
    {
        id: 'colour',
        label: 'Pixa Photo Restore',
        icon: PixaRestoreIcon,
        before: "https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?q=80&w=2070&auto=format&fit=crop",
        after: "https://images.unsplash.com/photo-1542362567-b051c63b9a47?q=80&w=2070&auto=format&fit=crop",
        logic: "Forensic Repair + Neural Colorization",
        description: "Damaged vintage memories recovered with flawless resolution and accurate color."
    },
    {
        id: 'brand_stylist',
        label: 'Pixa AdMaker',
        icon: MagicAdsIcon,
        before: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop",
        after: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?q=80&w=2070&auto=format&fit=crop",
        logic: "AIDA Layout + Narrative Lighting",
        description: "Simple photos converted into agency-grade 'Summer Sale' ad creatives."
    },
    {
        id: 'headshot',
        label: 'Pixa Headshot Pro',
        icon: PixaHeadshotIcon,
        before: "https://i.pravatar.cc/1000?u=headshot_before",
        after: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1974&auto=format&fit=crop",
        logic: "Executive Biometrics + Studio Relighting",
        description: "Casual outdoor selfies replaced with powerful, executive-grade LinkedIn portraits."
    }
];

const features = [
    { id: 'studio', icon: <PixaProductIcon className="w-16 h-16" />, title: "Pixa Product Shots", description: "Transform simple photos into professional, studio-quality product shots in one click." },
    { id: 'headshot', icon: <PixaHeadshotIcon className="w-16 h-16" />, title: "Pixa Headshot Pro", description: "Create studio-quality professional headshots from selfies for LinkedIn and resumes." },
    { id: 'brand_kit', icon: <PixaEcommerceIcon className="w-16 h-16" />, title: "Pixa Ecommerce Kit", description: "Generate complete E-commerce product packs (Hero, Lifestyle, Detail) in one go." },
    { id: 'brand_stylist', icon: <MagicAdsIcon className="w-16 h-16" />, title: "Pixa AdMaker", description: "Generate high-converting ad creatives instantly for any industry (Product, Realty, Food, SaaS)." },
    { id: 'thumbnail_studio', icon: <ThumbnailIcon className="w-16 h-16" />, title: "Pixa Thumbnail Pro", description: "Create click-worthy YouTube thumbnails in seconds. No design skills needed." },
    { id: 'soul', icon: <PixaTogetherIcon className="w-16 h-16" />, title: "Pixa Together", description: "Combine two people into one hyper-realistic photo, choosing a theme and environment." },
    { id: 'colour', icon: <PixaRestoreIcon className="w-16 h-16" />, title: "Pixa Photo Restore", description: "Breathe new life into vintage photos. Convert old black and white images into spotless, high-resolution color." },
    { id: 'caption', icon: <PixaCaptionIcon className="w-16 h-16" />, title: "Pixa Caption Pro", description: "Upload a photo and instantly get engaging, copy-paste-ready captions and hashtags for social media." },
    { id: 'interior', icon: <PixaInteriorIcon className="w-16 h-16" />, title: "Pixa Interior Design", description: "Upload a photo of your home or office and our AI will generate a fully furnished interior in your chosen style." },
    { id: 'apparel', icon: <PixaTryOnIcon className="w-16 h-16" />, title: "Pixa TryOn", description: "Virtually try on any clothing on a person from a photo, creating a realistic look in seconds." }
];

const reviews = [
    { name: "Priya Sharma", location: "Bangalore", review: "MagicPixa has revolutionized my design workflow. The AI is incredibly intuitive. I can generate stunning product shots in minutes, not hours." },
    { name: "Rohan Mehta", location: "Mumbai", review: "As a freelance photographer, I'm always looking for tools to enhance my work. The image upscaler is just magical! The quality is pristine." },
    { name: "Anjali Desai", location: "Delhi", review: "I run a small boutique and creating marketing content was always a struggle. Pixa Product Shots is a lifesaver." },
    { name: "Vikram Singh", location: "Chennai", review: "The background remover is the best I've ever used. Clean edges, super fast, and saved me a ton of time." }
];

// --- COMPONENTS ---

const MagneticCard: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string; disabled?: boolean; }> = ({ children, onClick, className, disabled }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState({});
    const [spotlight, setSpotlight] = useState({ opacity: 0, x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (disabled || !cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setSpotlight({ opacity: 1, x, y });
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / 25;
        const rotateY = (centerX - x) / 25;
        setStyle({ transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`, transition: 'none' });
    };

    const handleMouseLeave = () => {
        setStyle({ transform: `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`, transition: 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)' });
        setSpotlight(prev => ({ ...prev, opacity: 0 }));
    };

    return (
        <div ref={cardRef} onClick={onClick} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} style={style} className={`${className} relative overflow-hidden`}>
            <div className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300" style={{ opacity: spotlight.opacity, background: `radial-gradient(400px circle at ${spotlight.x}px ${spotlight.y}px, rgba(77, 124, 255, 0.08), transparent 80%)` }} />
            {children}
        </div>
    );
};

const useReveal = (delay: number = 0) => {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setTimeout(() => setVisible(true), delay);
                observer.unobserve(entry.target);
            }
        }, { threshold: 0.15 });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [delay]);

    return { ref, visible };
};

export const StagingHomePage: React.FC<{ navigateTo: (page: Page, view?: View, sectionId?: string) => void; auth: AuthProps; appConfig: AppConfig | null }> = ({ navigateTo, auth, appConfig }) => {
    const [labConfig, setLabConfig] = useState<Record<string, { before: string, after: string }>>({});
    const [activeTabId, setActiveTabId] = useState(TRANSFORMATIONS_STATIC[0].id);
    const [loadingPackId, setLoadingPackId] = useState<string | null>(null);
    const [successCredits, setSuccessCredits] = useState<number | null>(null);
    const [successPackName, setSuccessPackName] = useState<string>('');

    // Fetch dynamic before/after config
    useEffect(() => {
        const unsubscribe = subscribeToLabConfig(setLabConfig);
        return () => unsubscribe();
    }, []);

    const transformations = TRANSFORMATIONS_STATIC.map(t => ({
        ...t,
        before: labConfig[t.id]?.before || t.before,
        after: labConfig[t.id]?.after || t.after
    }));

    const activeTab = transformations.find(t => t.id === activeTabId) || transformations[0];

    const creditPacks = appConfig?.creditPacks || [];
    const currentPlanWeight = PLAN_WEIGHTS[auth.user?.plan || 'Free'] || 0;

    const handleCheckout = (pack: any) => {
        if (!auth.isAuthenticated) { auth.openAuthModal(); return; }
        if (!auth.user) return;
        setLoadingPackId(pack.name);
        triggerCheckout({
            user: auth.user, pkg: pack, type: 'plan',
            onSuccess: (updatedUser, totalCredits, packName) => {
                setSuccessPackName(packName);
                setSuccessCredits(totalCredits);
                auth.setUser(updatedUser);
                setLoadingPackId(null);
            },
            onCancel: () => setLoadingPackId(null),
            onError: (err) => { alert(err); setLoadingPackId(null); }
        });
    };

    return (
        <div className="min-h-screen bg-white">
            <style>{`
                @keyframes mouse-move-logic-v2 { 0% { transform: translate(140px, 140px); opacity: 0; } 10% { opacity: 1; } 30% { transform: translate(-104px, -44px); } 40% { transform: translate(-104px, -44px) scale(0.85); } 45% { transform: translate(-104px, -44px) scale(1); } 65% { transform: translate(0px, 44px); } 70% { transform: translate(0px, 44px) scale(0.85); } 75% { transform: translate(0px, 44px) scale(1); } 90% { opacity: 1; } 100% { transform: translate(140px, 140px); opacity: 0; } }
                @keyframes btn-product-logic-v2 { 0%, 30% { background-color: #ffffff; color: #9ca3af; border-color: #f3f4f6; opacity: 0.65; transform: scale(1); } 31%, 90% { background-color: #4D7CFF; color: #ffffff; border-color: transparent; opacity: 1; transform: scale(1.05); box-shadow: 0 10px 25px -5px rgba(77, 124, 255, 0.4); } 91%, 100% { background-color: #ffffff; color: #9ca3af; border-color: #f3f4f6; opacity: 0.65; transform: scale(1); } }
                @keyframes btn-generate-logic-v2 { 0%, 70% { background-color: #f9fafb; color: #d1d5db; border-color: #f3f4f6; opacity: 0.6; transform: scale(1); } 71%, 90% { background-color: #F9D230; color: #1A1A1E; border-color: transparent; opacity: 1; transform: scale(1.05); box-shadow: 0 10px 25px -5px rgba(249, 210, 48, 0.4); } 91%, 100% { background-color: #f9fafb; color: #d1d5db; border-color: #f3f4f6; opacity: 0.6; transform: scale(1); } }
                @keyframes celebration-burst-v2 { 0%, 72% { transform: scale(0); opacity: 0; } 73% { transform: scale(1); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
                @keyframes result-popup-v2 { 0%, 74% { transform: translateY(20px) scale(0); opacity: 0; } 80% { transform: translateY(-30px) scale(1.1) rotate(5deg); opacity: 1; } 95% { transform: translateY(-40px) scale(1) rotate(2deg); opacity: 0; } 100% { opacity: 0; } }
                .animate-mouse-logic-v2 { animation: mouse-move-logic-v2 5s infinite cubic-bezier(0.4, 0, 0.2, 1); }
                .animate-btn-logic-product-v2 { animation: btn-product-logic-v2 5s infinite; }
                .animate-btn-logic-generate-v2 { animation: btn-generate-logic-v2 5s infinite; }
                .animate-burst-v2 { animation: celebration-burst-v2 5s infinite; }
                .animate-result-v2 { animation: result-popup-v2 5s infinite; }
                .reveal-item { opacity: 0; transform: translateY(30px); transition: all 0.8s cubic-bezier(0.23, 1, 0.32, 1); }
                .reveal-item.visible { opacity: 1; transform: translateY(0); }
            `}</style>
            
            <Header navigateTo={navigateTo} auth={auth} />
            
            <main>
                {/* 1. HERO SECTION */}
                <section className="pt-20 pb-32 px-4 text-center">
                    <div className="max-w-4xl mx-auto">
                        <h1 className="text-4xl md:text-6xl font-bold text-[#1A1A1E] mb-6 tracking-tight leading-tight">
                            Create Stunning Visuals, <br/>
                            <span className="text-[#4D7CFF]">No Prompt Required</span>
                        </h1>
                        <p className="text-lg md:text-xl text-[#5F6368] max-w-2xl mx-auto mb-10 font-medium">
                            MagicPixa understands what you need. Turn simple photos into masterpieces effortlessly using Pixa Vision.
                        </p>
                        <button onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()} className="bg-[#F9D230] text-[#1A1A1E] font-bold px-10 py-4 rounded-xl text-lg shadow-lg hover:scale-105 transition-all">
                            Start Creating for Free
                        </button>
                    </div>
                </section>

                {/* 2. WORKFLOW SECTION */}
                <section className="py-24 px-4 bg-white border-y border-gray-50">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold text-[#1A1A1E] mb-3">The MagicPixa Workflow</h2>
                            <p className="text-lg text-[#5F6368] font-medium">Drop your assets, we do the engineering.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            {[
                                { step: "01", title: "Upload Asset", icon: <UploadTrayIcon className="w-10 h-10"/>, desc: "Drop your raw product photo. Pixa Vision begins a forensic audit immediately." },
                                { step: "02", title: "Select Strategy", icon: <CursorClickIcon className="w-10 h-10"/>, desc: "Choose from pre-engineered visual archetypes. No text boxes involved." },
                                { step: "03", title: "Download 8K", icon: <SparklesIcon className="w-10 h-10"/>, desc: "Our engine renders a high-fidelity masterpiece with accurate lighting." }
                            ].map((item, i) => {
                                const { ref, visible } = useReveal(i * 200);
                                return (
                                    <div key={i} ref={ref} className={`reveal-item ${visible ? 'visible' : ''} bg-white p-8 rounded-3xl shadow-sm border border-gray-200/80 transition-all flex flex-col items-center text-center`}>
                                        <div className="w-16 h-16 bg-[#F6F7FA] rounded-2xl flex items-center justify-center mb-6 text-indigo-600">
                                            {item.icon}
                                        </div>
                                        <h3 className="text-xl font-bold text-[#1A1A1E] mb-3"><span className="text-indigo-200 mr-1">{item.step}.</span> {item.title}</h3>
                                        <p className="text-[#5F6368] text-sm leading-relaxed font-medium">{item.desc}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* 3. REFINED TRANSFORMATION LAB */}
                <section className="py-24 px-4 bg-[#F6F7FA]">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-[#1A1A1E] mb-3">The Transformation Lab</h2>
                            <p className="text-lg text-[#5F6368] font-medium mb-10">See how Pixa Vision re-engineers reality for every category.</p>
                            
                            <div className="inline-flex flex-wrap justify-center gap-2 p-1.5 bg-gray-200/50 rounded-2xl border border-gray-200 shadow-inner mb-12">
                                {transformations.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setActiveTabId(t.id)}
                                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                                            activeTabId === t.id 
                                            ? 'bg-white text-indigo-600 shadow-sm border border-indigo-100' 
                                            : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        <t.icon className={`w-4 h-4 ${activeTabId === t.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                                        <span>{t.label.replace('Pixa ', '')}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                            <div className="lg:col-span-4 flex flex-col">
                                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-200/80 animate-fadeIn flex flex-col h-full">
                                    <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100 shrink-0">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100/50">
                                            <activeTab.icon className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1.5">Feature Mode</p>
                                            <p className="text-lg font-bold text-[#1A1A1E] tracking-tight">{activeTab.label}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 space-y-6">
                                        <p className="text-[#5F6368] text-base leading-relaxed font-medium">{activeTab.description}</p>
                                        
                                        {/* PRODUCTION BLUEPRINT SECTION */}
                                        <div className="bg-gray-50/80 border border-gray-100 p-6 rounded-3xl">
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Production Blueprint</span>
                                            </div>
                                            
                                            <div className="space-y-3">
                                                {[
                                                    { label: "0 Words Typed", icon: PencilIcon, strike: true },
                                                    { label: "Forensic Physics Audit", icon: CubeIcon },
                                                    { label: "Studio Lighting Rig", icon: LightningIcon },
                                                    { label: "Render: 1 Click Only", icon: CursorClickIcon }
                                                ].map((pill, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-gray-100/50 shadow-sm animate-fadeIn" style={{ animationDelay: `${idx * 100}ms` }}>
                                                        <div className="w-7 h-7 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                                                            <pill.icon className="w-3.5 h-3.5" />
                                                        </div>
                                                        <span className={`text-xs font-bold ${pill.strike ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{pill.label}</span>
                                                        <div className="ml-auto w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                                            <CheckIcon className="w-2.5 h-2.5 text-white" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => auth.isAuthenticated ? navigateTo('dashboard', activeTab.id as View) : auth.openAuthModal()} 
                                        className="w-full flex items-center justify-center gap-3 py-5 bg-[#F9D230] text-[#1A1A1E] font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-[#dfbc2b] transition-all shadow-xl shadow-yellow-500/20 active:scale-95 group mt-8 shrink-0"
                                    >
                                        Try this tool <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>
                            <div className="lg:col-span-8 flex items-stretch">
                                <div className="bg-white p-2 rounded-[3.5rem] shadow-2xl border border-gray-200/60 w-full flex items-center overflow-hidden h-full">
                                    <BeforeAfterSlider 
                                        key={activeTab.id} 
                                        beforeImage={activeTab.before}
                                        afterImage={activeTab.after}
                                        beforeLabel="Raw Input"
                                        afterLabel="MagicPixa Output"
                                        className="rounded-[2.8rem] h-full"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. COMPARISON SECTION */}
                <section className="py-24 px-4 bg-white">
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold text-[#1A1A1E] mb-3">Why Logic Beats Prompts</h2>
                            <p className="text-lg text-[#5F6368] font-medium">MagicPixa is an expert photographer, not a chat bot.</p>
                        </div>
                        <div className="grid md:grid-cols-2 gap-8 items-stretch">
                            <div className="bg-white p-10 rounded-[2.5rem] border border-gray-200 shadow-sm opacity-85">
                                <div className="flex items-center gap-3 mb-8"><div className="p-2 bg-red-50 text-red-500 rounded-lg"><XIcon className="w-5 h-5"/></div><h4 className="font-bold text-xs uppercase tracking-widest text-red-700">Traditional AI Tools</h4></div>
                                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-6 font-mono text-[11px] text-gray-400 leading-relaxed italic border-dashed">"Hyper-realistic 8k studio lighting, cinematic shadows..."</div>
                                <p className="text-sm text-gray-500 font-medium">Requires you to learn technical terminology and spend hours prompting.</p>
                            </div>
                            <div className="bg-white p-10 rounded-[2.5rem] border border-indigo-200 shadow-lg relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-12 -mt-12 blur-2xl opacity-50"></div>
                                <div className="flex items-center justify-between mb-8"><div className="flex items-center gap-3"><div className="p-2 bg-indigo-600 text-white rounded-lg shadow-lg"><SparklesIcon className="w-5 h-5"/></div><h4 className="font-bold text-xs uppercase tracking-widest text-indigo-600">The MagicPixa Way</h4></div><div className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-widest rounded-full">Intelligent</div></div>
                                <div className="relative flex flex-col items-center justify-center py-6 mb-6 gap-6 min-h-[180px]">
                                    <div className="flex gap-2">
                                        <div className="animate-btn-logic-product-v2 border border-gray-200 bg-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all shadow-sm">Product Shot</div>
                                        <div className="opacity-40 bg-gray-50 border border-gray-200 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider text-gray-400">Luxury Vibe</div>
                                    </div>
                                    <div className="relative">
                                        <div className="animate-btn-logic-generate-v2 border border-gray-200 px-14 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] relative transition-all shadow-sm">Generate
                                            <div className="absolute inset-0 z-10 flex items-center justify-center"><div className="w-12 h-12 rounded-full border-4 border-yellow-400 animate-burst-v2 absolute"></div></div>
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 bg-white p-1 rounded-lg shadow-2xl border-2 border-white animate-result-v2 z-20"><img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&auto=format&fit=crop" className="w-full h-full object-cover rounded-md" /></div>
                                        </div>
                                        <div className="absolute top-0 left-0 w-10 h-10 z-40 animate-mouse-logic-v2 drop-shadow-2xl"><svg viewBox="0 0 24 24" fill="white" stroke="black" strokeWidth="1.5" className="w-full h-full"><path d="M5.5,2l13,11l-5,1l5,7l-3,1l-5-7l-5,4V2z" /></svg></div>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-700 font-bold leading-relaxed">Pixa Vision audits your product's physics and material to apply the perfect rig automatically.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 5. WHY MAGICPIXA? */}
                <section className="py-24 px-4 bg-[#F6F7FA]">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <div>
                                <h2 className="text-4xl font-bold text-[#1A1A1E] mb-6 tracking-tight">Why MagicPixa?</h2>
                                <p className="text-[#5F6368] text-lg font-medium mb-12 leading-relaxed">
                                    Creating professional content traditionally requires an entire team. <span className="text-indigo-600 font-bold">MagicPixa replaces all of that with a single platform.</span>
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {['Designers', 'Editors', 'Copywriters', 'Agencies'].map((role, i) => (
                                        <div key={i} className="flex items-center gap-4 group bg-white p-4 rounded-2xl border border-gray-100 transition-all hover:shadow-md">
                                            <div className="w-6 h-6 rounded-full border-2 border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-400 group-hover:bg-red-500 group-hover:text-white transition-all">{i+1}</div>
                                            <span className="text-base font-bold text-gray-500 group-hover:text-gray-400 line-through decoration-gray-400 decoration-2">{role}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-6">
                                {[
                                    { title: "Saves Time", icon: <ClockIcon className="w-6 h-6"/>, desc: "Instantly turn ideas into ready-to-use content.", bg: "bg-blue-50", color: "text-blue-600" },
                                    { title: "Saves Cost", icon: <CreditCoinIcon className="w-6 h-6"/>, desc: "Eliminate expensive freelance retainers forever.", bg: "bg-amber-50", color: "text-amber-600" }
                                ].map((box, i) => (
                                    <div key={i} className="flex items-start gap-6 bg-white p-8 rounded-3xl shadow-sm border border-gray-200/80 transition-all hover:shadow-md">
                                        <div className={`w-12 h-12 ${box.bg} ${box.color} rounded-2xl flex items-center justify-center shrink-0`}>{box.icon}</div>
                                        <div><h4 className="text-xl font-bold text-[#1A1A1E] mb-2">{box.title}</h4><p className="text-[#5F6368] font-medium text-sm leading-relaxed">{box.desc}</p></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* 6. FEATURES GRID */}
                <section className="py-24 px-4 bg-white">
                    <div className="max-w-6xl mx-auto text-center">
                        <h2 className="text-3xl font-bold text-[#1A1A1E] mb-3">Everything You Need to Create</h2>
                        <p className="text-lg text-[#5F6368] mb-12">One powerful toolkit for all your creative needs.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {features.map((feature, index) => (
                                <MagneticCard key={index} onClick={() => navigateTo('dashboard', feature.id as View)} className="bg-[#F6F7FA] p-8 rounded-3xl border border-gray-200/80 text-left transition-transform duration-300 transform hover:-translate-y-2 cursor-pointer">
                                    <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-6">{feature.icon}</div>
                                    <h3 className="text-xl font-bold text-[#1A1A1E] mb-2">{feature.title}</h3>
                                    <p className="text-[#5F6368] text-sm font-medium leading-relaxed">{feature.description}</p>
                                </MagneticCard>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 7. REVIEWS */}
                <section className="py-24 px-4 bg-[#F6F7FA]">
                    <div className="max-w-6xl mx-auto text-center">
                        <h2 className="text-3xl font-bold text-[#1A1A1E] mb-12">Loved by Creators Everywhere</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {reviews.map((rev, i) => (
                                <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 text-left shadow-sm">
                                    <div className="flex gap-1 mb-4">{[...Array(5)].map((_, j) => <StarIcon key={j} className="w-4 h-4 text-yellow-400" />)}</div>
                                    <p className="text-[#5F6368] text-sm italic mb-6">"{rev.review}"</p>
                                    <div><p className="font-bold text-gray-900">{rev.name}</p><p className="text-xs text-gray-400">{rev.location}</p></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 8. PRICING */}
                <section className="py-24 px-4 bg-white">
                    <div className="max-w-6xl mx-auto text-center">
                        <h2 className="text-3xl font-bold text-[#1A1A1E] mb-3">Upgrade Membership</h2>
                        <p className="text-lg text-[#5F6368] mb-12">Unlock higher tiers for more perks and bulk savings.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                            {creditPacks.map((pack, i) => {
                                const isCurrent = pack.name === auth.user?.plan;
                                const isLoading = loadingPackId === pack.name;
                                return (
                                    <div key={i} className={`bg-white p-6 rounded-[2rem] border-2 flex flex-col transition-all duration-300 transform hover:-translate-y-2 relative ${isCurrent ? 'border-indigo-600 bg-indigo-50/10' : 'border-gray-100'}`}>
                                        {isCurrent && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">Current Plan</div>}
                                        <h3 className="text-xl font-bold text-gray-900 mb-2">{pack.name}</h3>
                                        <p className="text-gray-500 text-xs mb-4 h-10">{pack.tagline}</p>
                                        <div className="mb-4"><span className="text-4xl font-black text-gray-900">{pack.totalCredits}</span><span className="text-gray-400 text-xs uppercase font-bold ml-1">Credits</span></div>
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6"><span className="text-2xl font-bold text-gray-900">₹{pack.price}</span></div>
                                        <button onClick={() => handleCheckout(pack)} disabled={isLoading || isCurrent} className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${isCurrent ? 'bg-gray-100 text-gray-400' : 'bg-[#F9D230] text-[#1A1A1E] hover:bg-[#dfbc2b] shadow-lg shadow-yellow-500/20'}`}>
                                            {isLoading ? <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" /> : isCurrent ? "Active" : "Buy Now"}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* 9. IMPACT CTA */}
                <section className="py-32 px-4 text-center bg-[#F6F7FA] border-t border-gray-100">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-4xl md:text-5xl font-bold text-[#1A1A1E] mb-6 tracking-tight">Built for speed. For growth. For impact.</h2>
                        <button onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()} className="bg-[#F9D230] text-[#1A1A1E] font-bold py-5 px-12 rounded-2xl hover:scale-105 transition-all shadow-xl shadow-yellow-500/30 text-lg flex items-center gap-3 mx-auto">
                            Start Creating Now <ArrowRightIcon className="w-6 h-6" />
                        </button>
                        <p className="text-sm text-gray-500 mt-6 font-medium">Get 50 free credits on sign up!</p>
                    </div>
                </section>
            </main>

            <Footer navigateTo={navigateTo} />
            {successCredits !== null && <PaymentSuccessModal creditsAdded={successCredits} packName={successPackName} onClose={() => { setSuccessCredits(null); navigateTo('dashboard'); }} />}
        </div>
    );
};

export default StagingHomePage;