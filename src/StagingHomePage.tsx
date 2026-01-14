import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Page, AuthProps, View, AppConfig } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
import { 
  SparklesIcon, PixaProductIcon, ThumbnailIcon, MagicAdsIcon, PixaHeadshotIcon, 
  UploadTrayIcon, CursorClickIcon, ArrowRightIcon, ShieldCheckIcon, LightningIcon, 
  CheckIcon, ClockIcon, CreditCoinIcon, StarIcon, XIcon, PixaEcommerceIcon, 
  PixaTogetherIcon, PixaCaptionIcon, PixaInteriorIcon, PixaTryOnIcon, 
  DashboardIcon, HomeIcon, ProjectsIcon, UserIcon as AvatarUserIcon, CameraIcon,
  CubeIcon, PencilIcon, EyeIcon
} from './components/icons';
import { BeforeAfterSlider } from './components/BeforeAfterSlider';
import { HomeStyles } from './styles/Home.styles';
import { triggerCheckout } from './services/paymentService';
import { PaymentSuccessModal } from './components/PaymentSuccessModal';
import { subscribeToLabConfig, subscribeToLabCollections } from './firebase';

// --- CONFIG & CONSTANTS ---

const TRANSFORMATIONS_STATIC = [
    {
        id: 'studio',
        label: 'Product Shots',
        category: 'Tech & Luxury',
        icon: PixaProductIcon,
        before: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=2000&auto=format&fit=crop",
        after: "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?q=80&w=2070&auto=format&fit=crop",
    },
    {
        id: 'thumbnail_studio',
        label: 'Thumbnail Pro',
        category: 'Digital Media',
        icon: ThumbnailIcon,
        before: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=2072&auto=format&fit=crop",
        after: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop",
    },
    {
        id: 'apparel',
        label: 'Pixa TryOn',
        category: 'Fashion',
        icon: PixaTryOnIcon,
        before: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=2000&auto=format&fit=crop",
        after: "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=2000&auto=format&fit=crop",
    },
    {
        id: 'brand_stylist',
        label: 'AdMaker',
        category: 'Marketing',
        icon: MagicAdsIcon,
        before: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop",
        after: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?q=80&w=2070&auto=format&fit=crop",
    },
    {
        id: 'headshot',
        label: 'Headshot Pro',
        category: 'Corporate',
        icon: PixaHeadshotIcon,
        before: "https://i.pravatar.cc/1000?u=headshot_before",
        after: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1974&auto=format&fit=crop",
    },
    {
        id: 'interior',
        label: 'Interior Design',
        category: 'Real Estate',
        icon: PixaInteriorIcon,
        before: "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=2069&auto=format&fit=crop",
        after: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2000&auto=format&fit=crop",
    }
];

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
    {
        id: 'studio',
        label: 'Product Shots',
        before: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=2000&auto=format&fit=crop",
        after: "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?q=80&w=2070&auto=format&fit=crop",
    },
    {
        id: 'headshot',
        label: 'Headshot Pro',
        before: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=2000&auto=format&fit=crop",
        after: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1974&auto=format&fit=crop",
    },
    {
        id: 'interior',
        label: 'Interior Design',
        before: "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=2069&auto=format&fit=crop",
        after: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2000&auto=format&fit=crop",
    },
    {
        id: 'brand_stylist',
        label: 'AdMaker',
        before: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop",
        after: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?q=80&w=2070&auto=format&fit=crop",
    },
    {
        id: 'apparel',
        label: 'Pixa TryOn',
        before: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=2000&auto=format&fit=crop",
        after: "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=2000&auto=format&fit=crop",
    },
    {
        id: 'soul',
        label: 'Pixa Together',
        before: "https://images.unsplash.com/photo-1516575394826-d312a4c8c24e?q=80&w=2000&auto=format&fit=crop",
        after: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=2000&auto=format&fit=crop",
    },
    {
        id: 'thumbnail_studio',
        label: 'Thumbnail Pro',
        before: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=2072&auto=format&fit=crop",
        after: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop",
    },
    {
        id: 'brand_kit',
        label: 'Ecommerce Kit',
        before: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=2000&auto=format&fit=crop",
        after: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=2000&auto=format&fit=crop",
    },
    {
        id: 'colour',
        label: 'Photo Restore',
        before: "https://images.unsplash.com/photo-1493612276216-ee3925520721?q=80&w=2000&auto=format&fit=crop",
        after: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=2000&auto=format&fit=crop",
    }
];

// --- COMPONENTS ---

const AutoWipeBox: React.FC<{ item: any; delay: number }> = ({ item, delay }) => {
    return (
        <div className="group relative aspect-[4/3] rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm bg-gray-50 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10">
            {/* Before Image */}
            <img src={item.before} className="absolute inset-0 w-full h-full object-cover brightness-95" alt="Before" />
            
            {/* After Image with Wipe Animation */}
            <div 
                className="absolute inset-0 w-full h-full z-10"
                style={{ 
                    animation: `auto-wipe 8s ease-in-out infinite`,
                    animationDelay: `${delay}ms` 
                }}
            >
                <img src={item.after} className="absolute inset-0 w-full h-full object-cover" alt="After" />
            </div>

            {/* Wipe Handle Bar */}
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

            {/* Label */}
            <div className="absolute top-4 left-4 z-40">
                <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-lg">
                    <span className="text-[9px] font-black text-white uppercase tracking-widest leading-none">{item.label}</span>
                </div>
            </div>

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
            `}</style>
        </div>
    );
};

/**
 * OPTION A: INDUSTRY-CURATED RIBBONS
 */
const CuratedRibbon: React.FC<{ items: any[]; navigateTo: any; auth: AuthProps }> = ({ items, navigateTo, auth }) => {
    // Split into two curated industries for visual variety and reduced randomness
    const products = items.filter(i => ['studio', 'thumbnail_studio', 'brand_kit', 'realty'].includes(i.id));
    const lifestyle = items.filter(i => ['headshot', 'apparel', 'soul', 'interior', 'colour'].includes(i.id));

    const RenderTrack = ({ list, speed, reverse = false }: { list: any[], speed: string, reverse?: boolean }) => {
        // Triple the list to ensure seamless looping without gaps on large screens
        const doubleList = [...list, ...list, ...list, ...list]; 
        return (
            <div className="overflow-hidden py-6 flex">
                <div 
                    className={`flex gap-8 whitespace-nowrap animate-curated-marquee hover:[animation-play-state:paused] ${reverse ? 'flex-row-reverse' : ''}`}
                    style={{ animationDuration: speed }}
                >
                    {doubleList.map((item, idx) => (
                        <div 
                            key={`${item.id}-${idx}`}
                            onClick={() => auth.isAuthenticated ? navigateTo('dashboard', item.id as View) : auth.openAuthModal()}
                            className="relative group shrink-0 w-[260px] md:w-[360px] aspect-[4/5] rounded-[3rem] overflow-hidden cursor-pointer shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-white/40 bg-white transition-all duration-700 hover:shadow-2xl hover:-translate-y-3"
                        >
                            <img 
                                src={item.after} 
                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                                alt={item.label}
                                loading="lazy"
                            />
                            
                            {/* Inner Soft Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
                            
                            {/* Permanent Premium Glass Pill Label */}
                            <div className="absolute bottom-8 left-8 right-8 z-10">
                                <div className="bg-white/80 backdrop-blur-2xl border border-white/60 px-6 py-4 rounded-2xl flex items-center justify-between shadow-[0_12px_40px_rgba(0,0,0,0.15)] group-hover:bg-white transition-all duration-300">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg transform -rotate-3 group-hover:rotate-0 transition-transform">
                                            {item.icon ? <item.icon className="w-5 h-5" /> : <SparklesIcon className="w-5 h-5" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1.5 opacity-80">{item.category || 'Creative'}</p>
                                            <p className="text-sm font-black text-gray-900 leading-none truncate">{item.label}</p>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                                        <ArrowRightIcon className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>

                            {/* Inner Glow Polish */}
                            <div className="absolute inset-0 border border-white/20 rounded-[3rem] pointer-events-none"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <section className="w-full bg-[#FAFAFB] py-32 border-y border-gray-100 overflow-hidden relative">
            {/* Edge Vignetters for that "Cinematic Ribbon" feel */}
            <div className="absolute left-0 top-0 bottom-0 w-32 md:w-96 bg-gradient-to-r from-[#FAFAFB] via-[#FAFAFB]/60 to-transparent z-20 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-32 md:w-96 bg-gradient-to-l from-[#FAFAFB] via-[#FAFAFB]/60 to-transparent z-20 pointer-events-none"></div>

            <div className="space-y-12">
                {/* Track 1: Product Focus (Faster, Normal) */}
                <div className="relative">
                    <div className="absolute -top-12 left-10 text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] pointer-events-none">Product & Tech Showcase</div>
                    <RenderTrack list={products} speed="70s" />
                </div>

                {/* Track 2: Lifestyle Focus (Slower, Reverse) */}
                <div className="relative">
                    <div className="absolute -top-12 right-10 text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] pointer-events-none text-right">Fashion & Lifestyle Showcase</div>
                    <RenderTrack list={lifestyle} speed="95s" reverse={true} />
                </div>
            </div>

            <style>{`
                @keyframes curated-marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-33.33%); }
                }
                .animate-curated-marquee {
                    animation-name: curated-marquee;
                    animation-timing-function: linear;
                    animation-iteration-count: infinite;
                    will-change: transform;
                }
            `}</style>
        </section>
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
    const [labCollections, setLabCollections] = useState<Record<string, any[] | Record<string, any>>>({});
    const [loadingPackId, setLoadingPackId] = useState<string | null>(null);
    const [successCredits, setSuccessCredits] = useState<number | null>(null);
    const [successPackName, setSuccessPackName] = useState<string>('');

    // Sync Lab Data
    useEffect(() => {
        const unsubConfig = subscribeToLabConfig(setLabConfig);
        const unsubCollections = subscribeToLabCollections(setLabCollections);
        return () => {
            unsubConfig();
            unsubCollections();
        };
    }, []);

    const transformations = TRANSFORMATIONS_STATIC.map(t => ({
        ...t,
        before: labConfig[t.id]?.before || t.before,
        after: labConfig[t.id]?.after || t.after
    }));

    // Dynamic Lists for Homepage sections
    const marqueeItems = useMemo(() => {
        const coll = (Array.isArray(labCollections['homepage_marquee']) && (labCollections['homepage_marquee'] as any[]).length > 0) 
            ? (labCollections['homepage_marquee'] as any[]) 
            : transformations.map(t => ({ id: t.id, after: t.after, label: t.label, icon: t.icon, category: t.category }));
        
        // Ensure every item has a valid category for the ribbon logic
        return coll.map(item => ({
            ...item,
            category: item.category || TRANSFORMATIONS_STATIC.find(s => s.id === item.id)?.category || 'Creative'
        }));
    }, [labCollections['homepage_marquee'], labConfig]);

    // Map Slot-based Gallery items
    const galleryItems = useMemo(() => {
        const slotData = (labCollections['homepage_gallery'] as Record<string, any>) || {};
        return GALLERY_ITEMS_DEFINITION.map(def => {
            const uploaded = slotData[def.id] || {};
            const staticDefault = GALLERY_ITEMS_STATIC.find(s => s.id === def.id) || GALLERY_ITEMS_STATIC[0];
            return {
                id: def.id,
                label: def.label,
                before: uploaded.before || staticDefault.before,
                after: uploaded.after || staticDefault.after
            };
        });
    }, [labCollections['homepage_gallery']]);

    const creditPacks = appConfig?.creditPacks || [];

    const handleCheckout = (pack: any) => {
        if (!auth.isAuthenticated) {
            auth.openAuthModal();
            return;
        }
        if (!auth.user) return;

        setLoadingPackId(pack.name);
        triggerCheckout({
            user: auth.user,
            pkg: pack,
            type: 'plan',
            onSuccess: (updatedUser, totalCredits, packName) => {
                setSuccessPackName(packName);
                setSuccessCredits(totalCredits);
                auth.setUser(updatedUser);
                setLoadingPackId(null);
            },
            onCancel: () => setLoadingPackId(null),
            onError: (err) => {
                alert(err);
                setLoadingPackId(null);
            }
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
                <section className="pt-24 pb-20 px-4 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(77,124,255,0.05)_0%,transparent_70%)] pointer-events-none"></div>
                    <div className="max-w-5xl mx-auto relative z-10">
                        <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-10 text-indigo-600 shadow-sm">
                            <SparklesIcon className="w-3 h-3" />
                            <span>Generative Production for Pros</span>
                        </div>
                        <h1 className="text-6xl md:text-9xl font-black text-[#1A1A1E] mb-8 tracking-tighter leading-[0.85]">
                            Elite Visuals. <br/>
                            <span className="text-[#4D7CFF]">No Prompt Required.</span>
                        </h1>
                        <p className="text-lg md:text-2xl text-[#5F6368] max-w-3xl mx-auto mb-12 font-medium leading-relaxed">
                            Stop wasting hours on prompt engineering. MagicPixa's Pixa Vision engine understands your product and brand instantly.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <button onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()} className="bg-[#1A1A1E] text-white font-black px-14 py-6 rounded-[2rem] text-xl shadow-2xl hover:scale-105 transition-all hover:bg-black active:scale-95 flex items-center gap-3">
                                Start Production <ArrowRightIcon className="w-6 h-6" />
                            </button>
                            <button onClick={() => navigateTo('dashboard', 'billing')} className="text-[#1A1A1E] font-black text-lg hover:opacity-70 transition-opacity flex items-center gap-2">
                                View Pricing
                            </button>
                        </div>
                    </div>
                </section>

                {/* 2. OPTION A: INDUSTRY-CURATED RIBBONS */}
                <CuratedRibbon items={marqueeItems} navigateTo={navigateTo} auth={auth} />

                {/* 3. THE TRANSFORMATION GALLERY */}
                <section className="py-40 px-4 bg-white">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-24">
                            <h2 className="text-5xl md:text-7xl font-black text-[#1A1A1E] mb-6 tracking-tighter">The Transformation Lab</h2>
                            <p className="text-xl text-[#5F6368] font-medium max-w-2xl mx-auto">Witness the physical realism of our Pixa Vision engine across every industry.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
                            {galleryItems.map((item, i) => (
                                <AutoWipeBox key={item.id} item={item} delay={i * 800} />
                            ))}
                        </div>

                        <div className="mt-24 flex justify-center">
                            <button 
                                onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()} 
                                className="bg-[#1A1A1E] text-white font-black py-7 px-20 rounded-[3rem] hover:scale-105 transition-all shadow-2xl hover:bg-black text-2xl flex items-center gap-6 group"
                            >
                                Launch All Tools <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-2 transition-transform"><ArrowRightIcon className="w-5 h-5" /></div>
                            </button>
                        </div>
                    </div>
                </section>

                {/* 4. WORKFLOW SECTION */}
                <section className="py-40 px-4 bg-[#F8F9FA] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-200 to-transparent"></div>
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-24">
                            <h2 className="text-5xl font-black text-[#1A1A1E] mb-6 tracking-tight">One-Click Production</h2>
                            <p className="text-xl text-[#5F6368] font-medium">From raw file to marketing masterpiece in 30 seconds.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
                            {[
                                { step: "01", title: "Asset Ingestion", icon: <UploadTrayIcon className="w-16 h-16"/>, desc: "Drop your raw product photo. Pixa Vision begins a material and lighting audit immediately." },
                                { step: "02", title: "Strategy Selection", icon: <CursorClickIcon className="w-16 h-16"/>, desc: "Select an industry-optimized visual archetype. No complex typing or prompts required." },
                                { step: "03", title: "Instant Masterpiece", icon: <SparklesIcon className="w-16 h-16"/>, desc: "Our engine renders a high-fidelity asset with accurate physics and commercial lighting." }
                            ].map((item, i) => {
                                const { ref, visible } = useReveal(i * 200);
                                return (
                                    <div key={i} ref={ref} className={`reveal-item ${visible ? 'visible' : ''} bg-white p-16 rounded-[4rem] shadow-[0_10px_50px_rgba(0,0,0,0.03)] border border-gray-100 transition-all flex flex-col items-center text-center group hover:shadow-2xl hover:border-indigo-100 hover:-translate-y-2`}>
                                        <div className="w-24 h-24 bg-[#F0F2F5] rounded-[2rem] flex items-center justify-center mb-10 text-indigo-600 group-hover:scale-110 transition-transform shadow-inner">
                                            {item.icon}
                                        </div>
                                        <h3 className="text-3xl font-black text-[#1A1A1E] mb-6"><span className="text-indigo-200 mr-2">{item.step}.</span> {item.title}</h3>
                                        <p className="text-[#5F6368] text-lg leading-relaxed font-medium">{item.desc}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* 5. COMPARISON SECTION */}
                <section className="py-40 px-4 bg-white">
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-24">
                            <h2 className="text-5xl font-black text-[#1A1A1E] mb-6 tracking-tight">Engineered for Accuracy</h2>
                            <p className="text-xl text-[#5F6368] font-medium">MagicPixa is built by photographers and agency leads, not just developers.</p>
                        </div>
                        <div className="grid md:grid-cols-2 gap-12 items-stretch">
                            <div className="bg-white p-16 rounded-[4rem] border border-gray-100 shadow-sm opacity-60 grayscale hover:grayscale-0 transition-all flex flex-col justify-center">
                                <div className="flex items-center gap-3 mb-10"><div className="p-3 bg-red-50 text-red-500 rounded-xl"><XIcon className="w-6 h-6"/></div><h4 className="font-bold text-sm uppercase tracking-widest text-red-700">Generic AI Tools</h4></div>
                                <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 mb-8 font-mono text-xs text-gray-400 leading-relaxed italic border-dashed">"Write 500 words to describe lighting, background, focal length, and depth..."</div>
                                <p className="text-lg text-gray-500 font-medium leading-relaxed">Requires technical mastery and endless trial-and-error to get a usable result.</p>
                            </div>
                            <div className="bg-white p-16 rounded-[4rem] border-2 border-indigo-600 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>
                                <div className="flex items-center justify-between mb-12"><div className="flex items-center gap-4"><div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><SparklesIcon className="w-6 h-6"/></div><h4 className="font-bold text-sm uppercase tracking-widest text-indigo-600">The MagicPixa Standard</h4></div><div className="px-5 py-2 bg-green-100 text-green-700 text-xs font-black uppercase tracking-[0.2em] rounded-full">AI Vision Locked</div></div>
                                <div className="relative flex flex-col items-center justify-center py-10 mb-12 gap-10 min-h-[300px]">
                                    <div className="flex gap-4">
                                        <div className="animate-btn-logic-product-v2 border border-indigo-100 bg-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-md">Product Shot</div>
                                        <div className="opacity-30 bg-gray-50 border border-gray-200 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-gray-400">Luxury Vibe</div>
                                    </div>
                                    <div className="relative">
                                        <div className="animate-btn-logic-generate-v2 border-2 border-transparent px-24 py-7 rounded-[2.5rem] font-black text-2xl uppercase tracking-[0.3em] relative transition-all shadow-xl">Generate
                                            <div className="absolute inset-0 z-10 flex items-center justify-center"><div className="w-20 h-20 rounded-full border-[8px] border-yellow-400 animate-burst-v2 absolute"></div></div>
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 bg-white p-2 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border-2 border-white animate-result-v2 z-20 overflow-hidden"><img src="https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?q=80&w=200&auto=format&fit=crop" className="w-full h-full object-cover" /></div>
                                        </div>
                                        <div className="absolute top-0 left-0 w-16 h-16 z-40 animate-mouse-logic-v2 drop-shadow-2xl"><svg viewBox="0 0 24 24" fill="white" stroke="black" strokeWidth="1.2" className="w-full h-full"><path d="M5.5,2l13,11l-5,1l5,7l-3,1l-5-7l-5,4V2z" /></svg></div>
                                    </div>
                                </div>
                                <p className="text-xl text-gray-800 font-bold leading-relaxed">Pixa Vision performs an automated physics audit on your asset to ensure lighting and reflections are physically accurate.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 10. PRICING */}
                <section className="py-40 px-4 bg-[#F8F9FA]">
                    <div className="max-w-7xl mx-auto text-center">
                        <h2 className="text-6xl font-black text-[#1A1A1E] mb-6 tracking-tighter">Predictable Pricing</h2>
                        <p className="text-2xl text-[#5F6368] mb-24 font-medium">No recurring fees. Pay once, use forever.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                            {creditPacks.map((pack, i) => {
                                const isCurrent = pack.name === auth.user?.plan;
                                const isLoading = loadingPackId === pack.name;
                                const isPopular = pack.popular;
                                return (
                                    <div key={i} className={`bg-white p-12 rounded-[4rem] border-2 flex flex-col transition-all duration-500 transform hover:-translate-y-2 relative ${isCurrent ? 'border-indigo-600 bg-indigo-50/20' : isPopular ? 'border-gray-900 shadow-2xl' : 'border-gray-100 shadow-sm'}`}>
                                        {isCurrent && <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-black px-8 py-2.5 rounded-full uppercase tracking-widest shadow-xl">Active Plan</div>}
                                        {isPopular && !isCurrent && <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#F9D230] text-black text-xs font-black px-8 py-2.5 rounded-full uppercase tracking-widest shadow-xl">Agency Choice</div>}
                                        
                                        <h3 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">{pack.name}</h3>
                                        <p className="text-gray-500 text-base mb-12 h-12 font-medium leading-tight">{pack.tagline}</p>
                                        
                                        <div className="mb-12">
                                            <div className="flex items-baseline justify-center gap-2">
                                                <span className="text-7xl font-black text-gray-900 tracking-tighter">{pack.totalCredits}</span>
                                                <span className="text-gray-400 text-sm uppercase font-black tracking-widest">Credits</span>
                                            </div>
                                            {pack.bonus > 0 && <p className="text-emerald-500 text-sm font-black uppercase mt-3">+{pack.bonus} Bonus Included</p>}
                                        </div>

                                        <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 mb-10 flex flex-col items-center">
                                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">One-Time Fee</span>
                                            <span className="text-4xl font-black text-gray-900">₹{pack.price}</span>
                                        </div>

                                        <button onClick={() => handleCheckout(pack)} disabled={isLoading || isCurrent} className={`w-full py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-sm transition-all flex items-center justify-center gap-3 ${isCurrent ? 'bg-gray-100 text-gray-400' : 'bg-[#1A1A1E] text-white hover:bg-black shadow-xl hover:shadow-indigo-500/10'}`}>
                                            {isLoading ? <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" /> : isCurrent ? "Current" : "Purchase Pack"}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* 11. IMPACT CTA */}
                <section className="py-48 px-4 text-center bg-white">
                    <div className="max-w-4xl mx-auto relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none"></div>
                        <h2 className="text-7xl md:text-[120px] font-black text-[#1A1A1E] mb-16 tracking-[calc(-0.06em)] leading-[0.8] relative z-10">
                            Upgrade your <br/> production.
                        </h2>
                        <button onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()} className="bg-[#1A1A1E] text-white font-black py-8 px-24 rounded-[3rem] hover:scale-105 transition-all shadow-[0_30px_70px_rgba(0,0,0,0.25)] text-3xl relative z-10 hover:bg-black active:scale-95">
                            Start Creating Now
                        </button>
                        <p className="text-gray-400 text-base mt-16 font-bold uppercase tracking-[0.5em] relative z-10">Professional Results • Zero Delay • Instant 8K</p>
                    </div>
                </section>
            </main>

            <Footer navigateTo={navigateTo} />
            {successCredits !== null && <PaymentSuccessModal creditsAdded={successCredits} packName={successPackName} onClose={() => { setSuccessCredits(null); navigateTo('dashboard'); }} />}
        </div>
    );
};

export default StagingHomePage;