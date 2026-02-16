import React, { useState, useEffect, useMemo } from 'react';
import { Page, AuthProps, View, AppConfig } from '../types';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { 
  SparklesIcon, ArrowRightIcon, XIcon, ClockIcon, CreditCoinIcon, CheckIcon, 
  UploadTrayIcon, CursorClickIcon, StarIcon, PixaProductIcon, PixaHeadshotIcon, 
  PixaTryOnIcon, ThumbnailIcon, MagicAdsIcon, ChevronDownIcon, ShieldCheckIcon,
  GlobeIcon, LightningIcon, CubeIcon, CameraIcon, GoogleIcon
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
    { id: 'apparel', label: 'Pixa TryOn', before: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1000", after: "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=1000" },
    { id: 'soul', label: 'Pixa Together', before: "https://images.unsplash.com/photo-1516575394826-d312a4c8c24e?q=80&w=1000", after: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000" },
    { id: 'thumbnail_studio', label: 'Thumbnail Pro', before: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=2072", after: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1000" },
    { id: 'brand_kit', label: 'Ecommerce Kit', before: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000", after: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000" },
    { id: 'colour', label: 'Photo Restore', before: "https://images.unsplash.com/photo-1493612276216-ee3925520721?q=80&w=1000", after: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=1000" }
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
            <div className="absolute top-4 left-4 z-40">
                <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-lg">
                    <span className="text-[9px] font-black text-white uppercase tracking-widest leading-none">{item.label}</span>
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

    useEffect(() => {
        const unsubCollections = subscribeToLabCollections(setLabCollections);
        const handleScroll = () => {
            setShowSticky(window.scrollY > 400);
        };
        window.addEventListener('scroll', handleScroll);
        return () => {
            unsubCollections();
            window.removeEventListener('scroll', handleScroll);
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
            `}</style>

            {showSplash && <MobileSplashScreen onComplete={() => setShowSplash(false)} />}

            <Header navigateTo={navigateTo} auth={auth} />

            {/* Sync with Desktop Hero Style */}
            <section className="px-6 py-12 bg-white relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(to_bottom,white_90%,transparent)]"></div>
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-200/50 rounded-full blur-3xl animate-blob"></div>
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-200/50 rounded-full blur-3xl animate-blob animation-delay-2000"></div>

                <div className="relative z-10 text-center">
                    <h1 className="text-[2.8rem] font-black text-[#1A1A1E] leading-[1.05] mb-4 tracking-tight">
                        Create Stunning Visuals, <span className="text-[#4D7CFF]">No Prompt Required</span>
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
            <section className="py-20 px-6 bg-white">
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

                <div className="mt-12 flex justify-center">
                    <button 
                        onClick={() => auth.openAuthModal()} 
                        className="bg-[#1A1A1E] text-white font-bold py-4 px-8 rounded-2xl active:scale-95 transition-all text-sm flex items-center gap-3 shadow-xl"
                    >
                        Try MagicPixa <ArrowRightIcon className="w-5 h-5" />
                    </button>
                </div>
            </section>

            {/* Bento Hub: The Feature Grid */}
            <section className="px-6 py-20 bg-white">
                <div className="mb-10 px-2">
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
            <section className="px-6 py-20 bg-gray-50">
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
            <section className="px-6 py-24 bg-gray-900 text-center relative overflow-hidden rounded-t-[3rem]">
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
                <div className="bg-white/90 backdrop-blur-2xl border border-white/20 p-3 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex items-center justify-between gap-4">
                    {/* Left: Social Proof & Reward Context */}
                    <div className="flex items-center gap-3 pl-2 overflow-hidden">
                        {/* Overlapping Avatars */}
                        <div className="flex -space-x-2 shrink-0">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                                    <img src={`https://i.pravatar.cc/100?u=user${i + 10}`} className="w-full h-full object-cover" alt="User" />
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1">
                                <span className="text-[11px] font-black text-indigo-900 whitespace-nowrap">50 Credits Waiting</span>
                            </div>
                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest truncate">Used by 1.2k+ today</p>
                        </div>
                    </div>

                    {/* Right: Premium Value Button */}
                    <button 
                        onClick={() => auth.openAuthModal()}
                        className="relative bg-indigo-600 text-white px-5 py-3 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center gap-2 overflow-hidden active:scale-95 transition-all animate-button-glow"
                    >
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 animate-capsule-shimmer pointer-events-none"></div>
                        
                        <GoogleIcon className="w-3.5 h-3.5" />
                        <span className="relative z-10">Claim Now</span>
                    </button>
                </div>
            </div>

            <Footer navigateTo={navigateTo} />
        </div>
    );
};

export default MobileHomePage;
