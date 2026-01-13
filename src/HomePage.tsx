import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Page, AuthProps, View, AppConfig } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
import { 
  SparklesIcon, CheckIcon, StarIcon, PhotoStudioIcon, UsersIcon, PaletteIcon, CaptionIcon, HomeIcon, MockupIcon, ProjectsIcon, DashboardIcon, UserIcon as AvatarUserIcon, BrandKitIcon, LightbulbIcon, ThumbnailIcon, ApparelIcon, MagicAdsIcon, BuildingIcon, UploadTrayIcon, PixaProductIcon, PixaEcommerceIcon, PixaTogetherIcon, PixaRestoreIcon, PixaCaptionIcon, PixaInteriorIcon, PixaTryOnIcon, PixaMockupIcon, PixaHeadshotIcon, ShieldCheckIcon, ClockIcon, CreditCoinIcon, ArrowRightIcon, CursorClickIcon, XIcon, PencilIcon, EyeIcon, CameraIcon
} from './components/icons';
import { HomeStyles } from './styles/Home.styles';
import { triggerCheckout } from './services/paymentService';
import { PaymentSuccessModal } from './components/PaymentSuccessModal';
import { BeforeAfterSlider } from './components/BeforeAfterSlider';
import { subscribeToLabConfig, subscribeToLabCollections } from './firebase';

interface HomePageProps {
  navigateTo: (page: Page, view?: View, sectionId?: string) => void;
  auth: AuthProps;
  appConfig: AppConfig | null;
}

// Plan Hierarchy Definition (Matches Billing.tsx)
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
        id: 'apparel',
        label: 'Pixa TryOn',
        icon: PixaTryOnIcon,
        before: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=2000&auto=format&fit=crop",
        after: "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=2000&auto=format&fit=crop",
        logic: "AR Silhouette Mapping + Fabric Physics",
        description: "Virtually try on any garment with realistic texture mapping and physical drape simulation."
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

const features = [
    {
        id: 'studio',
        icon: <PixaProductIcon className="w-16 h-16" />,
        title: "Pixa Product Shots",
        description: "Transform simple photos into professional, studio-quality product shots in one click.",
        color: "",
        disabled: false,
    },
    {
        id: 'headshot',
        icon: <PixaHeadshotIcon className="w-16 h-16" />,
        title: "Pixa Headshot Pro",
        description: "Create studio-quality professional headshots from selfies for LinkedIn and resumes.",
        color: "",
        disabled: false,
    },
    {
        id: 'brand_kit',
        icon: <PixaEcommerceIcon className="w-16 h-16" />,
        title: "Pixa Ecommerce Kit",
        description: "Generate complete E-commerce product packs (Hero, Lifestyle, Detail) in one go.",
        color: "",
        disabled: false,
    },
    {
        id: 'brand_stylist',
        icon: <MagicAdsIcon className="w-16 h-16" />,
        title: "Pixa AdMaker",
        description: "Generate high-converting ad creatives instantly for any industry (Product, Realty, Food, SaaS).",
        color: "",
        disabled: false,
    },
    {
        id: 'thumbnail_studio',
        icon: <ThumbnailIcon className="w-16 h-16" />,
        title: "Pixa Thumbnail Pro",
        description: "Create click-worthy YouTube thumbnails in seconds. No design skills needed.",
        color: "",
        disabled: false,
    },
    {
        id: 'soul',
        icon: <PixaTogetherIcon className="w-16 h-16" />,
        title: "Pixa Together",
        description: "Combine two people into one hyper-realistic photo, choosing a theme and environment.",
        color: "",
        disabled: false,
    },
    {
        id: 'colour',
        icon: <PixaRestoreIcon className="w-16 h-16" />,
        title: "Pixa Photo Restore",
        description: "Breathe new life into vintage photos. Convert old black and white images into spotless, high-resolution color.",
        color: "",
        disabled: false,
    },
    {
        id: 'caption',
        icon: <PixaCaptionIcon className="w-16 h-16" />,
        title: "Pixa Caption Pro",
        description: "Upload a photo and instantly get engaging, copy-paste-ready captions and hashtags for social media.",
        color: "",
        disabled: false,
    },
    {
        id: 'interior',
        icon: <PixaInteriorIcon className="w-16 h-16" />,
        title: "Pixa Interior Design",
        description: "Upload a photo of your home or office and our AI will generate a fully furnished interior in your chosen style.",
        color: "",
        disabled: false,
    },
    {
        id: 'apparel',
        icon: <PixaTryOnIcon className="w-16 h-16" />,
        title: "Pixa TryOn",
        description: "Virtually try on any clothing on a person from a photo, creating a realistic look in seconds.",
        color: "",
        disabled: false,
    }
];

const reviews = [
    {
        name: "Priya Sharma",
        location: "Bangalore",
        review: "MagicPixa has revolutionized my design workflow. The AI is incredibly intuitive. I can generate stunning product shots in minutes, not hours. A must-have for any e-commerce owner!",
    },
    {
        name: "Rohan Mehta",
        location: "Mumbai",
        review: "As a freelance photographer, I'm always looking for tools to enhance my work. The image upscaler is just magical! The quality is pristine. My clients are happier than ever.",
    },
    {
        name: "Anjali Desai",
        location: "Delhi",
        review: "I run a small boutique and creating marketing content was always a struggle. Pixa Product Shots is a lifesaver. It’s so easy to use, and the results are incredibly professional.",
    },
     {
        name: "Vikram Singh",
        location: "Chennai",
        review: "The background remover is the best I've ever used. Clean edges, super fast, and saved me a ton of time on tedious editing. The monthly credits are generous too!",
    },
];

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

const FeatureCarousel: React.FC<{ items: any[]; navigateTo: any; auth: AuthProps }> = ({ items, navigateTo, auth }) => {
    // Double the array for seamless infinite scroll
    const carouselItems = [...items, ...items];

    return (
        <div className="w-full bg-white py-10 border-b border-gray-100 relative">
            {/* Vignette Overlays - The Faded Vignette Approach */}
            <div className="absolute left-0 top-0 bottom-0 w-20 md:w-64 bg-gradient-to-r from-white via-white/80 to-transparent z-20 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-20 md:w-64 bg-gradient-to-l from-white via-white/80 to-transparent z-20 pointer-events-none"></div>
            
            <div className="overflow-hidden">
                <div className="flex gap-6 animate-marquee hover:[animation-play-state:paused]">
                    {carouselItems.map((item, idx) => (
                        <div 
                            key={`${item.id}-${idx}`}
                            onClick={() => auth.isAuthenticated ? navigateTo('dashboard', item.id as View) : auth.openAuthModal()}
                            className="relative shrink-0 w-[clamp(280px,30vw,400px)] aspect-[16/10] rounded-3xl overflow-hidden cursor-pointer group shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1"
                        >
                            <img 
                                src={item.after} 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                alt={item.label}
                            />
                            {/* Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            
                            {/* Label Badge */}
                            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center z-10 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                                <div className="bg-white/20 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-full flex items-center gap-2 shadow-xl">
                                    {item.icon ? <item.icon className="w-4 h-4 text-white" /> : <SparklesIcon className="w-4 h-4 text-white" />}
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{item.label}</span>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg text-indigo-600">
                                    <ArrowRightIcon className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 40s linear infinite;
                    display: flex;
                    width: max-content;
                }
            `}</style>
        </div>
    );
};

// --- Magnetic Feature Card Component ---
const MagneticCard: React.FC<{ 
    children: React.ReactNode; 
    onClick?: () => void; 
    className?: string;
    disabled?: boolean;
}> = ({ children, onClick, className, disabled }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState({});
    const [spotlight, setSpotlight] = useState({ opacity: 0, x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (disabled || !cardRef.current) return;
        
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Spotlight position
        setSpotlight({ opacity: 1, x, y });
        
        // Magnetic Tilt
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / 25;
        const rotateY = (centerX - x) / 25;
        
        setStyle({
            transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
            transition: 'none'
        });
    };

    const handleMouseLeave = () => {
        setStyle({
            transform: `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`,
            transition: 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)'
        });
        setSpotlight(prev => ({ ...prev, opacity: 0 }));
    };

    return (
        <div 
            ref={cardRef}
            onClick={onClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={style}
            className={`${className} relative overflow-hidden`}
        >
            {/* Spotlight Overlay */}
            <div 
                className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
                style={{
                    opacity: spotlight.opacity,
                    background: `radial-gradient(400px circle at ${spotlight.x}px ${spotlight.y}px, rgba(77, 124, 255, 0.08), transparent 80%)`
                }}
            />
            {children}
        </div>
    );
};

// --- Intersection Observer Hook for Reveals ---
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

const HomeMobileNav: React.FC<{ navigateTo: (page: Page, view?: View) => void; auth: AuthProps; }> = ({ navigateTo, auth }) => {
    const handleNav = (view: View) => {
        if (!auth.isAuthenticated) {
            auth.openAuthModal();
        } else {
            navigateTo('dashboard', 'dashboard' as View);
        }
    };

    const navItems: { view: View; label: string; icon: React.FC<{ className?: string }>; disabled?: boolean; }[] = [
        { view: 'home_dashboard' as View, label: 'Home', icon: HomeIcon },
        { view: 'dashboard', label: 'Features', icon: DashboardIcon },
        { view: 'creations', label: 'Projects', icon: ProjectsIcon },
        { view: 'profile', label: 'Profile', icon: AvatarUserIcon },
    ];
    
    return (
        <div className="fixed bottom-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-lg border-t border-gray-200/80 z-[100] lg:hidden">
            <div className="flex justify-around items-center h-full">
                {navItems.map(item => (
                    <button key={item.label} onClick={() => handleNav(item.view as View)} disabled={item.disabled} className={`flex flex-col items-center gap-1 p-2 text-gray-500 disabled:text-gray-300`}>
                        <item.icon className="w-6 h-6" />
                        <span className="text-xs font-medium">{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};


const HomePage: React.FC<HomePageProps> = ({ navigateTo, auth, appConfig }) => {
  const [loadingPackId, setLoadingPackId] = useState<string | null>(null);
  const [successCredits, setSuccessCredits] = useState<number | null>(null);
  const [successPackName, setSuccessPackName] = useState<string>('');
  
  // Lab State
  const [labConfig, setLabConfig] = useState<Record<string, { before: string, after: string }>>({});
  const [labCollections, setLabCollections] = useState<Record<string, any[] | Record<string, any>>>({});

  // Sync dynamic lab data
  useEffect(() => {
    const unsubConfig = subscribeToLabConfig(setLabConfig);
    const unsubCollections = subscribeToLabCollections(setLabCollections);
    return () => {
        unsubConfig();
        unsubCollections();
    };
  }, []);

  // Dynamic Lists for Homepage sections
  const marqueeItems = (Array.isArray(labCollections['homepage_marquee']) && (labCollections['homepage_marquee'] as any[]).length > 0) 
    ? (labCollections['homepage_marquee'] as any[]) 
    : TRANSFORMATIONS_STATIC.map(t => ({ id: t.id, after: t.after, label: t.label, icon: t.icon }));

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
  const currentPlanWeight = PLAN_WEIGHTS[auth.user?.plan || 'Free'] || 0;

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

  const featuresWithConfig = features.map(f => {
    if (f.id && appConfig?.feature