
import React, { useState, useEffect, useMemo } from 'react';
import { Page, AuthProps, View, AppConfig } from '../types';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { 
  SparklesIcon, ArrowRightIcon, XIcon, ClockIcon, CreditCoinIcon, CheckIcon, 
  UploadTrayIcon, CursorClickIcon, StarIcon, PixaProductIcon, PixaHeadshotIcon, 
  PixaTryOnIcon, ThumbnailIcon, MagicAdsIcon, ChevronDownIcon, ShieldCheckIcon,
  GlobeIcon, LightningIcon, CubeIcon
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
    { id: 'thumbnail_studio', label: 'Thumbnail Pro', before: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1000", after: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1000" },
    { id: 'brand_kit', label: 'Ecommerce Kit', before: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000", after: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000" },
    { id: 'colour', label: 'Photo Restore', before: "https://images.unsplash.com/photo-1493612276216-ee3925520721?q=80&w=1000", after: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=1000" }
];

const FAQ_ITEMS = [
    { q: "Can I use this on my phone?", a: "Yes! MagicPixa is fully optimized for mobile browsers. You can upload photos directly from your camera roll." },
    { q: "Are the exports high-res?", a: "Every creation is delivered in 4K high-fidelity, perfect for premium marketing and social media." },
    { q: "How do credits work?", a: "MagicPixa uses a pay-as-you-go system. Buy credits once, use them whenever. They never expire." },
    { q: "Do I need design skills?", a: "Zero skills required. Our Pixa Vision AI handles the art direction and physics automatically." }
];

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
                @keyframes magic-sweep {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes neural-trace {
                    0% { transform: translateY(-100%); opacity: 0; }
                    20% { opacity: 0.5; }
                    80% { opacity: 0.5; }
                    100% { transform: translateY(500%); opacity: 0; }
                }
                @keyframes story-scan {
                    0% { top: 0; }
                    100% { top: 100%; }
                }
                .magic-sweep-text {
                    background: linear-gradient(90deg, #4D7CFF, #6EFACC, #4D7CFF);
                    background-size: 200% auto;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: magic-sweep 3s linear infinite;
                }
                .neural-trace-line {
                    position: absolute;
                    width: 100%;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(77, 124, 255, 0.4), transparent);
                    animation: neural-trace 6s linear infinite;
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {showSplash && <MobileSplashScreen onComplete={() => setShowSplash(false)} />}

            <Header navigateTo={navigateTo} auth={auth} />

            {/* Enhanced Hero Section */}
            <section className="px-6 py-16 text-center bg-white overflow-hidden relative">
                <div className="neural-trace-line" style={{ top: '20%' }}></div>
                <div className="neural-trace-line" style={{ top: '50%', animationDelay: '2s' }}></div>
                <div className="neural-trace-line" style={{ top: '80%', animationDelay: '4s' }}></div>
                
                <div className="absolute top-0 right-0 w-72 h-72 bg-blue-100/40 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-100/40 rounded-full blur-3xl -ml-32 -mb-32"></div>
                
                <div className="relative z-10">
                    <h1 className="text-[2.8rem] font-black text-[#1A1A1E] leading-[1.05] mb-6 tracking-tight">
                        Professional <span className="magic-sweep-text">Magic</span>,<br/>
                        <span className="text-[#4D7CFF]">No Prompt</span> Required
                    </h1>
                    <p className="text-base text-gray-500 font-medium mb-10 leading-relaxed px-2">
                        Pixa Vision AI understands your product's physics. From raw photo to studio asset in one tap.
                    </p>
                    
                    <button 
                      onClick={() => auth.openAuthModal()} 
                      className="w-full bg-[#F9D230] text-[#1A1A1E] py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-yellow-500/20 active:scale-95 transition-all text-sm"
                    >
                        Start Creating Free
                    </button>
                    <div className="mt-5 flex items-center justify-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <CheckIcon className="w-3.5 h-3.5 text-green-500" />
                        <span>50 FREE CREDITS ON SIGN UP</span>
                    </div>
                </div>
            </section>

            {/* Horizontal Snap Gallery */}
            <section className="py-12 bg-white">
                <div className="px-6 mb-6 flex justify-between items-end">
                    <div>
                        <h2 className="text-xl font-black text-[#1A1A1E] tracking-tight uppercase">Visual Proof</h2>
                        <div className="h-1 w-8 bg-[#4D7CFF] rounded-full mt-1"></div>
                    </div>
                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest animate-pulse">Swipe to see magic</span>
                </div>
                
                <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x px-6 pb-6">
                    {galleryItems.map((item, i) => (
                        <div key={item.id} className="min-w-[85vw] snap-center transform transition-transform active:scale-[0.98]">
                            <AutoWipeBox item={item} delay={i * 800} />
                        </div>
                    ))}
                </div>
            </section>

            {/* Vertical Storyboard Comparison */}
            <section className="px-6 py-20 bg-gray-50">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-black text-[#1A1A1E] tracking-tight">The Storyboard</h2>
                    <p className="text-sm text-gray-500 font-medium mt-2">How we transform your business.</p>
                </div>

                <div className="space-y-12 relative">
                    {/* Step 1: Raw */}
                    <div className="relative">
                        <div className="bg-white p-4 rounded-[2rem] shadow-lg border border-gray-100 overflow-hidden group">
                            <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-white text-[9px] font-black uppercase">Phase 1: Raw Capture</div>
                            <img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000" className="w-full aspect-square object-cover rounded-2xl grayscale opacity-40" />
                            <div className="absolute inset-x-4 top-0 h-1 bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.8)] z-30 animate-[story-scan_4s_infinite] pointer-events-none"></div>
                        </div>
                        <div className="absolute left-1/2 -bottom-8 -translate-x-1/2 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg z-10 border-4 border-gray-50">
                            <ArrowRightIcon className="w-4 h-4 rotate-90" />
                        </div>
                    </div>

                    {/* Step 2: Analysis */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-sm text-center">
                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
                            <ShieldCheckIcon className="w-7 h-7" />
                        </div>
                        <h4 className="text-lg font-black text-gray-900">Pixa Vision Audit</h4>
                        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                            We don't just "guess." Our AI identifies labels, geometry, and material physics to anchor your identity.
                        </p>
                    </div>

                    {/* Step 3: Result */}
                    <div className="relative">
                        <div className="bg-white p-4 rounded-[2rem] shadow-2xl border-2 border-indigo-100 overflow-hidden">
                            <div className="absolute top-4 left-4 z-20 bg-indigo-600 px-3 py-1 rounded-lg text-white text-[9px] font-black uppercase shadow-lg">Phase 2: Pro Result</div>
                            <img src="https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?q=80&w=1000" className="w-full aspect-square object-cover rounded-2xl animate-fadeIn" />
                        </div>
                    </div>
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
                        { label: 'Headshot', id: 'headshot', icon: PixaHeadshotIcon, bg: 'bg-amber-50', text: 'text-amber-500' },
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

            {/* Sticky Bottom Footer CTA */}
            <div className={`fixed bottom-0 left-0 right-0 z-[100] transition-all duration-500 transform ${showSticky ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="bg-white/80 backdrop-blur-xl border-t border-indigo-100 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex items-center gap-3">
                    <div className="flex flex-col flex-1">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-black text-gray-900">Start Creating</span>
                            <div className="bg-indigo-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase">50 Free</div>
                        </div>
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">No credit card required</p>
                    </div>
                    <button 
                        onClick={() => auth.openAuthModal()}
                        className="bg-indigo-600 text-white px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-200 active:scale-95"
                    >
                        Sign In with Google
                    </button>
                </div>
            </div>

            <Footer navigateTo={navigateTo} />
        </div>
    );
};

export default MobileHomePage;
