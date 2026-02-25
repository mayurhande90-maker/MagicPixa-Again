import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Page, AuthProps, View, AppConfig } from '../types';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { 
  SparklesIcon, ArrowRightIcon, XIcon, ClockIcon, CreditCoinIcon, CheckIcon, 
  UploadTrayIcon, CursorClickIcon, StarIcon, PixaProductIcon, PixaHeadshotIcon, 
  PixaTryOnIcon, ThumbnailIcon, MagicAdsIcon, ChevronDownIcon, ShieldCheckIcon,
  GlobeIcon, LightningIcon, CubeIcon, CameraIcon, GoogleIcon, UserIcon,
  PixaSupportIcon
} from '../components/icons';
import { subscribeToLabCollections } from '../firebase';
import { MobileSplashScreen } from './components/MobileSplashScreen';

interface MobileHomePageProps {
  navigateTo: (page: Page, view?: View, sectionId?: string) => void;
  auth: AuthProps;
  appConfig: AppConfig | null;
}

const GALLERY_ITEMS_DEFINITION = [
    { id: 'studio', label: 'Product Shots' },
    { id: 'headshot', label: 'Headshot Pro' },
    { id: 'interior', label: 'Interior Design' },
    { id: 'brand_stylist', label: 'AdMaker' },
    { id: 'apparel', label: 'Pixa TryOn' },
    { id: 'soul', label: 'Pixa Together' },
    { id: 'thumbnail_studio', label: 'Thumbnail Pro' },
    { id: 'brand_kit', label: 'Ecommerce Kit' },
    { id: 'colour', label: 'Photo Restore' }
];

const GALLERY_ITEMS_STATIC = [
    { id: 'studio', label: 'Product Shots', before: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000", after: "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?q=80&w=1000" },
    { id: 'headshot', label: 'Headshot Pro', before: "https://i.pravatar.cc/600?u=1", after: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000" },
    { id: 'interior', label: 'Interior Design', before: "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1000", after: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=1000" },
    { id: 'brand_stylist', label: 'AdMaker', before: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1000", after: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?q=80&w=1000" },
    { id: 'apparel', label: 'Pixa TryOn', before: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1000", after: "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=2000" },
    { id: 'soul', label: 'Pixa Together', before: "https://images.unsplash.com/photo-1516575394826-d312a4c8c24e?q=80&w=1000", after: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000" },
    { id: 'thumbnail_studio', label: 'Thumbnail Pro', before: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=2072", after: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1000" },
    { id: 'brand_kit', label: 'Ecommerce Kit', before: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=2000", after: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=2000" },
    { id: 'colour', label: 'Photo Restore', before: "https://images.unsplash.com/photo-1493612276216-ee3925520721?q=80&w=2000", after: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=2000" }
];

const BRAND_BENEFITS = [
    { label: 'Unlimited\nAssets', icon: SparklesIcon, bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-900', iconBg: 'bg-blue-600' },
    { label: 'No\nWatermarks', icon: CheckIcon, bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-900', iconBg: 'bg-green-600' },
    { label: 'Credits Never\nExpire', icon: LightningIcon, bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-900', iconBg: 'bg-purple-600' },
    { label: 'Priority\nSupport', icon: PixaSupportIcon, bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-900', iconBg: 'bg-indigo-600' },
    { label: 'High-Res\nOutput', icon: ShieldCheckIcon, bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-900', iconBg: 'bg-amber-600' }
];

const EFFICIENCY_DATA = [
    { 
        title: "Viral Thumbnails", 
        icon: ThumbnailIcon,
        multiplier: "10x Faster",
        traditionalStop: 25,
    },
    { 
        title: "Product Studio", 
        icon: PixaProductIcon,
        multiplier: "12x Faster",
        traditionalStop: 15,
    },
    { 
        title: "Ad Campaigns", 
        icon: MagicAdsIcon,
        multiplier: "8x Faster",
        traditionalStop: 32,
    },
    { 
        title: "Executive Headshots", 
        icon: PixaHeadshotIcon,
        multiplier: "5x Faster",
        traditionalStop: 20,
    },
];

const FAQ_ITEMS = [
    { q: "Can I use this on my phone?", a: "Yes! MagicPixa is fully optimized for mobile browsers. You can upload photos directly from your camera roll." },
    { q: "Are the exports high-res?", a: "Every creation is delivered in 4K high-fidelity, perfect for premium marketing and social media." },
    { q: "How do credits work?", a: "MagicPixa uses a pay-as-you-go system. Buy credits once, use them whenever. They never expire." },
    { q: "Do I need design skills?", a: "Zero skills required. Our Pixa Vision AI handles the art direction and physics automatically." }
];

const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

const AutoWipeBox: React.FC<{ item: any; delay: number }> = ({ item, delay }) => {
    return (
        <div className="group relative aspect-[4/3] rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm bg-gray-50 transition-all duration-500 active:scale-95">
            <img src={item.before} className="absolute inset-0 w-full h-full object-cover brightness-95" alt="Before" />
            <div 
                className="absolute inset-0 w-full h-full z-10"
                style={{ 
                    animation: `auto-wipe 8s ease-in-out infinite`,
                    animationDelay: `${delay}ms` 
                }}
            >
                <img src={item.after} className="absolute inset-0 w-full h-full object-cover" alt="After" />
            </div>
            <div 
                className="absolute top-0 bottom-0 w-0.5 bg-white/60 backdrop-blur-md z-30 flex items-center justify-center"
                style={{ 
                    animation: `auto-wipe-handle 8s ease-in-out infinite`,
                    animationDelay: `${delay}ms` 
                }}
            >
                <div className="w-8 h-8 bg-white rounded-full shadow-xl flex items-center justify-center border border-indigo-100 transform -translate-x-1/2">
                    <SparklesIcon className="w-4 h-4 text-indigo-600" />
                </div>
            </div>
            <div className="absolute bottom-3 left-3 z-40">
                <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 shadow-lg">
                    <span className="text-[7.5px] font-black text-white uppercase tracking-widest leading-none">{item.label}</span>
                </div>
            </div>
        </div>
    );
};

const EfficiencyCard: React.FC<{ item: typeof EFFICIENCY_DATA[0]; isVisible: boolean }> = ({ item, isVisible }) => {
    return (
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-5 relative overflow-hidden">
            <div className="flex items-center gap-2.5">
                <div className="text-indigo-600">
                    <item.icon className="w-5 h-5" />
                </div>
                <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">{item.title}</h4>
            </div>
            
            <div className="space-y-4">
                {/* Traditional Side */}
                <div className="space-y-1.5">
                    <div className="flex justify-between items-end">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Traditional Designer</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                        <div 
                            className={`h-full bg-gray-200 transition-all duration-[4000ms] ease-out rounded-full`}
                            style={{ width: isVisible ? `${item.traditionalStop}%` : '0%' }}
                        ></div>
                    </div>
                </div>

                {/* MagicPixa Side */}
                <div className="space-y-1.5">
                    <div className="flex justify-between items-end">
                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em]">MagicPixa AI</span>
                        <span className={`text-[10px] font-black text-indigo-900 uppercase tracking-widest transition-all duration-700 delay-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
                            {item.multiplier}
                        </span>
                    </div>
                    <div className="h-2 w-full bg-indigo-50 rounded-full overflow-hidden">
                        <div 
                            className={`h-full bg-indigo-600 transition-all duration-[800ms] cubic-bezier(0.34, 1.56, 0.64, 1) rounded-full relative`}
                            style={{ width: isVisible ? '100%' : '0%' }}
                        >
                            <div className="absolute inset-0 animate-capsule-shimmer opacity-30"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const MobileHomePage: React.FC<MobileHomePageProps> = ({ navigateTo, auth, appConfig }) => {
    const [labCollections, setLabCollections] = useState<Record<string, any[] | Record<string, any>>>({});
    const [showSticky, setShowSticky] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [showSplash, setShowSplash] = useState(true);
    const [efficiencyVisible, setEfficiencyVisible] = useState(false);
    const efficiencyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsubCollections = subscribeToLabCollections(setLabCollections);
        const handleScroll = () => {
            setShowSticky(window.scrollY > 400);
        };
        window.addEventListener('scroll', handleScroll);

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setEfficiencyVisible(true);
                }
            },
            { threshold: 0.1 }
        );

        if (efficiencyRef.current) observer.observe(efficiencyRef.current);

        return () => {
            unsubCollections();
            window.removeEventListener('scroll', handleScroll);
            observer.disconnect();
        };
    }, []);

    // Deterministic Randomness Logic for Daily Stats and Avatars
    const dailyStats = useMemo(() => {
        const today = new Date().toDateString(); // e.g. "Mon May 20 2025"
        
        // Simple hash function for seeding
        let hash = 0;
        for (let i = 0; i < today.length; i++) {
            hash = ((hash << 5) - hash) + today.charCodeAt(i);
            hash |= 0; 
        }
        const absHash = Math.abs(hash);

        // Calculate User Count (850 to 1850)
        const userCount = (absHash % 1001) + 850;
        
        // Calculate Avatar IDs
        const avatarIds = [
            (absHash % 50) + 10,
            ((absHash * 2) % 50) + 10,
            ((absHash * 3) % 50) + 10
        ];

        return { 
            countFormatted: userCount.toLocaleString(),
            avatarIds 
        };
    }, []);

    // Randomize order on memo initialization
    const shuffledDefinitions = useMemo(() => shuffleArray([...GALLERY_ITEMS_DEFINITION]), []);

    const galleryItems = useMemo(() => {
        const slotData = (labCollections['homepage_gallery'] as Record<string, any>) || {};
        return shuffledDefinitions.map(def => {
            const uploaded = slotData[def.id] || {};
            const staticDefault = GALLERY_ITEMS_STATIC.find(s => s.id === def.id) || GALLERY_ITEMS_STATIC[0];
            return {
                id: def.id,
                label: def.label,
                before: uploaded.before || staticDefault.before,
                after: uploaded.after || staticDefault.after
            };
        });
    }, [labCollections['homepage_gallery'], shuffledDefinitions]);

    return (
        <div className="pb-32 animate-fadeIn overflow-x-hidden">
            <style>{`
                @keyframes auto-wipe {
                    0%, 10% { clip-path: inset(0 100% 0 0); }
                    40%, 60% { clip-path: inset(0 0% 0 0); }
                    90%, 100% { clip-path: inset(0 100% 0 0); }
                }
                @keyframes auto-wipe-handle {
                    0%, 10% { left: 0%; opacity: 0; }
                    11% { opacity: 1; }
                    40%, 60% { left: 100%; opacity: 1; }
                    89% { opacity: 1; }
                    90%, 100% { left: 0%; opacity: 0; }
                }
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob { animation: blob 7s infinite; }
                .animation-delay-2000 { animation: delay 2s; }
                .bg-grid-slate-200 { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cpath d='M0 40L40 40M40 0L40 40' fill='none' stroke='%23e2e8f0' stroke-width='1'/%3E%3C/svg%3E"); }
                
                @keyframes capsule-shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                .animate-capsule-shimmer {
                    background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%);
                    background-size: 200% 100%;
                    animation: capsule-shimmer 3s infinite linear;
                }
                @keyframes button-glow-pulse {
                    0%, 100% { box-shadow: 0 0 10px rgba(79, 70, 229, 0.4); }
                    50% { box-shadow: 0 0 25px rgba(79, 70, 229, 0.8); }
                }
                .animate-button-glow {
                    animation: button-glow-pulse 2s infinite ease-in-out;
                }
                @keyframes marquee-scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee-scroll {
                    animation: marquee-scroll 25s linear infinite;
                }
            `}</style>

            {showSplash && <MobileSplashScreen onComplete={() => setShowSplash(false)} />}

            <Header navigateTo={navigateTo} auth={auth} />

            {/* Hero Section */}
            <section className="px-6 py-10 bg-white relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(to_bottom,white_90%,transparent)]"></div>
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-200/50 rounded-full blur-3xl animate-blob"></div>
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-200/50 rounded-full blur-3xl animate-blob animation-delay-2000"></div>

                <div className="relative z-10 text-center">
                    <h1 className="text-[2.8rem] font-black text-[#1A1A1E] leading-[1.05] mb-4 tracking-tight">
                        Create <br/> Stunning Visuals, <br/> <span className="text-[#4D7CFF]">No Prompt Required</span>
                    </h1>
                    <p className="text-base text-gray-500 font-medium mb-8 leading-relaxed px-2">
                        MagicPixa understands what you need. Turn your simple photos into masterpieces effortlessly.
                    </p>
                    
                    <button 
                      onClick={() => auth.openAuthModal()} 
                      className="w-full bg-[#F9D230] text-[#1A1A1E] py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-yellow-500/20 active:scale-95 transition-all text-sm mb-4"
                    >
                        Start Creating for Free
                    </button>
                    <p className="text-sm text-gray-500">Get 50 free credits on sign up!</p>
                </div>
            </section>

            {/* 2. THE TRANSFORMATION GALLERY (3 + GRID) */}
            <section className="py-10 px-6 bg-white">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-black text-[#1A1A1E] tracking-tight">The Transformation Gallery</h2>
                    <p className="text-sm text-gray-500 font-medium mt-2">From raw asset to professional masterpiece in one click.</p>
                </div>
                
                {/* Top 3 High-Impact Cards */}
                <div className="flex flex-col gap-6 mb-6">
                    {galleryItems.slice(0, 3).map((item, i) => (
                        <AutoWipeBox key={item.id} item={item} delay={i * 800} />
                    ))}
                </div>

                {/* Discovery Grid (Remaining Cards) */}
                <div className="grid grid-cols-2 gap-4">
                    {galleryItems.slice(3).map((item, i) => (
                        <AutoWipeBox key={item.id} item={item} delay={(i + 3) * 800} />
                    ))}
                </div>

                <div className="mt-10 flex justify-center">
                    <button 
                        onClick={() => auth.openAuthModal()} 
                        className="bg-[#1A1A1E] text-white font-bold py-4 px-8 rounded-2xl active:scale-95 transition-all text-sm flex items-center gap-3 shadow-xl"
                    >
                        Try MagicPixa <ArrowRightIcon className="w-5 h-5" />
                    </button>
                </div>
            </section>

            {/* 2.5 BENEFITS MARQUEE */}
            <div className="bg-white overflow-hidden relative py-6 border-y border-gray-50">
                <div className="flex gap-4 animate-marquee-scroll whitespace-nowrap">
                    {[...BRAND_BENEFITS, ...BRAND_BENEFITS].map((benefit, i) => (
                        <div key={i} className={`shrink-0 flex flex-col items-center gap-2 p-4 rounded-3xl ${benefit.bg} border ${benefit.border} min-w-[100px]`}>
                            <div className={`w-8 h-8 rounded-full ${benefit.iconBg} flex items-center justify-center text-white shadow-sm`}>
                                <benefit.icon className="w-4 h-4" />
                            </div>
                            <span className={`text-[10px] font-black ${benefit.text} text-center uppercase tracking-tight whitespace-pre-line leading-tight`}>
                                {benefit.label}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
                <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
            </div>

            {/* 3. THE SPEED OF PIXA: Human Speed vs Pixa Logic */}
            <section ref={efficiencyRef} className="py-10 px-6 bg-gray-50 rounded-[3.5rem]">
                <div className="mb-10 px-2 text-center">
                    <h2 className="text-3xl font-black text-[#1A1A1E] leading-tight tracking-tight">The Speed of <span className="text-indigo-600">Pixa.</span></h2>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-[0.1em] mt-3">Stop waiting. Start creating.</p>
                </div>

                <div className="flex flex-col gap-6">
                    {EFFICIENCY_DATA.map((item, i) => (
                        <EfficiencyCard key={i} item={item} isVisible={efficiencyVisible} />
                    ))}
                </div>

                <div className="mt-10 p-8 bg-white rounded-[3rem] border border-gray-100 shadow-sm text-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-1000"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-16 h-16 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center mb-5 shadow-inner">
                            <ClockIcon className="w-8 h-8" />
                        </div>
                        <h4 className="text-2xl font-black text-[#1A1A1E] mb-2 tracking-tight">Save 120+ Hours/month</h4>
                        <p className="text-[10px] text-gray-400 font-black leading-relaxed uppercase tracking-[0.25em]">Focus on Growth, Not Grids.</p>
                    </div>
                </div>
            </section>

            {/* Bento Hub: The Feature Grid */}
            <section className="px-6 py-10 bg-white">
                <div className="mb-8 px-2">
                    <h2 className="text-2xl font-black text-[#1A1A1E] tracking-tight">The Bento Toolkit</h2>
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">One Tap, Total Production</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    {[
                        { label: 'Product', id: 'studio', icon: PixaProductIcon, bg: 'bg-blue-50', text: 'text-blue-500' },
                        { label: 'AdMaker', id: 'brand_stylist', icon: MagicAdsIcon, bg: 'bg-orange-50', text: 'text-orange-500' },
                        { label: 'Headshot', id: 'headshot', icon: PixaHeadshotIcon, bg: 'bg-amber-50', text: 'text-amber-600' },
                        { label: 'Try On', id: 'apparel', icon: PixaTryOnIcon, bg: 'bg-rose-50', text: 'text-rose-500' },
                        { label: 'Thumbnail', id: 'thumbnail_studio', icon: ThumbnailIcon, bg: 'bg-red-50', text: 'text-red-500' },
                        { label: 'All Tools', id: 'dashboard', icon: SparklesIcon, bg: 'bg-indigo-50', text: 'text-indigo-500' }
                    ].map((tool, i) => (
                        <div 
                            key={i} 
                            onClick={() => auth.openAuthModal()}
                            className={`p-6 rounded-[2rem] border border-gray-100 flex flex-col justify-center items-center gap-4 active:scale-95 transition-all shadow-sm ${tool.bg}`}
                        >
                            <div className={`p-4 bg-white rounded-2xl shadow-inner ${tool.text}`}>
                                <tool.icon className="w-7 h-7" />
                            </div>
                            <span className="text-xs font-black text-gray-800 uppercase tracking-widest">{tool.label}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Minimalist FAQ Accordion */}
            <section className="px-6 py-10 bg-gray-50">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-8 text-center">Frequently Asked</h3>
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                    {FAQ_ITEMS.map((item, i) => (
                        <div key={i} className="px-6">
                            <button 
                                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                className="w-full py-5 flex items-center justify-between text-left group"
                            >
                                <span className={`text-sm font-bold transition-colors ${openFaq === i ? 'text-indigo-600' : 'text-gray-700'}`}>{item.q}</span>
                                <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${openFaq === i ? 'rotate-180 text-indigo-500' : ''}`} />
                            </button>
                            <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-32 pb-5' : 'max-h-0'}`}>
                                <p className="text-[11px] text-gray-500 leading-relaxed font-medium">{item.a}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Impact Footer */}
            <section className="px-6 py-12 bg-gray-900 text-center relative overflow-hidden rounded-t-[3rem]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -mr-20 -mt-20"></div>
                <div className="relative z-10">
                    <h2 className="text-4xl font-black text-white leading-[1.1] mb-8 tracking-tight">
                        Built for speed.<br/>Built for scale.
                    </h2>
                    <button 
                        onClick={() => auth.openAuthModal()}
                        className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all text-sm mb-6"
                    >
                        Join the Beta Now
                    </button>
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.4em] opacity-60">
                        High Fidelity • 8K Output • Identity Lock 6.0
                    </p>
                </div>
            </section>

            {/* Premium Floating Conversion Capsule */}
            <div className={`fixed bottom-4 left-4 right-4 z-[100] transition-all duration-700 transform ease-[cubic-bezier(0.34,1.56,0.64,1)] ${showSticky ? 'translate-y-0 opacity-100' : 'translate-y-32 opacity-0'}`}>
                <div className="bg-white/90 backdrop-blur-2xl border border-white/20 p-2.5 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex items-center justify-between gap-1.5">
                    {/* Left: Social Proof & Reward Context */}
                    <div className="flex items-center gap-1.5 pl-1 overflow-hidden">
                        {/* Deterministic Daily Avatars */}
                        <div className="flex -space-x-2 shrink-0">
                            {dailyStats.avatarIds.map((id, i) => (
                                <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 overflow-hidden shadow-sm">
                                    <img src={`https://i.pravatar.cc/100?u=user${id}`} className="w-full h-full object-cover" alt="User" />
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] font-black text-indigo-900 whitespace-nowrap tracking-tight">50 Credits Ready</span>
                            </div>
                            {/* Deterministic Daily User Count - Simplified for fit */}
                            <p className="text-[7.5px] font-bold text-gray-400 uppercase truncate">
                                Used by {dailyStats.countFormatted} today
                            </p>
                        </div>
                    </div>

                    {/* Right: Premium Value Button with Circular Google Anchor */}
                    <button 
                        onClick={() => auth.openAuthModal()}
                        className="relative bg-indigo-600 text-white pl-2 pr-3 py-2 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center gap-2 overflow-hidden active:scale-95 transition-all animate-button-glow shrink-0"
                    >
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 animate-capsule-shimmer pointer-events-none"></div>
                        
                        {/* Google Icon Anchor */}
                        <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm z-10">
                            <GoogleIcon className="w-3 h-3" />
                        </div>
                        <span className="relative z-10">Claim Now</span>
                    </button>
                </div>
            </div>

            <Footer navigateTo={navigateTo} />
        </div>
    );
};

export default MobileHomePage;