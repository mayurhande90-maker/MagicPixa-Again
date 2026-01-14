
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Page, AuthProps, View, AppConfig } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
import { 
  SparklesIcon, CheckIcon, StarIcon, PhotoStudioIcon, UsersIcon, PaletteIcon, CaptionIcon, HomeIcon, MockupIcon, ProjectsIcon, DashboardIcon, UserIcon as AvatarUserIcon, BrandKitIcon, LightbulbIcon, ThumbnailIcon, ApparelIcon, MagicAdsIcon, BuildingIcon, UploadTrayIcon, PixaProductIcon, PixaEcommerceIcon, PixaTogetherIcon, PixaRestoreIcon, PixaCaptionIcon, PixaInteriorIcon, PixaTryOnIcon, PixaMockupIcon, PixaHeadshotIcon, ShieldCheckIcon, ClockIcon, CreditCoinIcon, ArrowRightIcon, CursorClickIcon, XIcon, PencilIcon, EyeIcon, CameraIcon
} from './components/icons';
// Import missing Theme object
import { Theme } from './styles/theme';
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
    if (f.id && appConfig?.featureToggles && f.id in appConfig.featureToggles) {
        return { ...f, disabled: !appConfig.featureToggles[f.id] };
    }
    return f;
  });

  return (
    <>
      <style>{`
        @keyframes mouse-move-logic-v2 {
          0% { transform: translate(140px, 140px); opacity: 0; }
          10% { opacity: 1; }
          30% { transform: translate(-104px, -44px); } /* Precise on Product Shot */
          40% { transform: translate(-104px, -44px) scale(0.85); } /* Press */
          45% { transform: translate(-104px, -44px) scale(1); }
          65% { transform: translate(0px, 44px); } /* Precise on Generate */
          70% { transform: translate(0px, 44px) scale(0.85); } /* Press */
          75% { transform: translate(0px, 44px) scale(1); }
          90% { opacity: 1; }
          100% { transform: translate(140px, 140px); opacity: 0; }
        }
        @keyframes btn-product-logic-v2 {
          0%, 30% { background-color: #ffffff; color: #9ca3af; border-color: #f3f4f6; opacity: 0.65; transform: scale(1); }
          31%, 90% { background-color: #4D7CFF; color: #ffffff; border-color: transparent; opacity: 1; transform: scale(1.05); box-shadow: 0 10px 25px -5px rgba(77, 124, 255, 0.4); }
          91%, 100% { background-color: #ffffff; color: #9ca3af; border-color: #f3f4f6; opacity: 0.65; transform: scale(1); }
        }
        @keyframes btn-generate-logic-v2 {
          0%, 70% { background-color: #f9fafb; color: #d1d5db; border-color: #f3f4f6; opacity: 0.6; transform: scale(1); }
          71%, 90% { background-color: #F9D230; color: #1A1A1E; border-color: transparent; opacity: 1; transform: scale(1.05); box-shadow: 0 10px 25px -5px rgba(249, 210, 48, 0.4); }
          91%, 100% { background-color: #f9fafb; color: #d1d5db; border-color: #f3f4f6; opacity: 0.6; transform: scale(1); }
        }
        @keyframes celebration-burst-v2 {
          0%, 72% { transform: scale(0); opacity: 0; }
          73% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes result-popup-v2 {
          0%, 74% { transform: translateY(20px) scale(0); opacity: 0; }
          80% { transform: translateY(-30px) scale(1.1) rotate(5deg); opacity: 1; }
          95% { transform: translateY(-40px) scale(1) rotate(2deg); opacity: 0; }
          100% { opacity: 0; }
        }
        .animate-mouse-logic-v2 { animation: mouse-move-logic-v2 5s infinite cubic-bezier(0.4, 0, 0.2, 1); }
        .animate-btn-logic-product-v2 { animation: btn-product-logic-v2 5s infinite; }
        .animate-btn-logic-generate-v2 { animation: btn-generate-logic-v2 5s infinite; }
        .animate-burst-v2 { animation: celebration-burst-v2 5s infinite; }
        .animate-result-v2 { animation: result-popup-v2 5s infinite; }
        
        .reveal-item {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.8s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .reveal-item.visible {
            opacity: 1;
            transform: translateY(0);
        }
      `}</style>
      <Header navigateTo={navigateTo} auth={auth} />
      <main className={HomeStyles.main}>
        {/* Hero Section */}
        <section id="home" className={HomeStyles.heroSection}>
            <div className={HomeStyles.heroContainer}>
                <div className={HomeStyles.heroBackgroundGrid}></div>
                
                <div className={HomeStyles.heroBlob1}></div>
                <div className={HomeStyles.heroBlob2}></div>
                
                <div className={HomeStyles.heroContent}>
                    <h1 className={HomeStyles.heroTitle}>
                        Create Stunning Visuals, <span className="text-[#4D7CFF]">No Prompt Required</span>
                    </h1>
                    <p className={HomeStyles.heroSubtitle}>
                        MagicPixa understands what you need. Turn your simple photos into masterpieces effortlessly.
                    </p>
                    
                    <button 
                      onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()} 
                      className="bg-[#F9D230] text-[#1A1A1E] rounded-xl font-semibold transition-all duration-300 transform active:scale-95 py-5 px-12 text-lg hover:scale-105 hover:shadow-xl shadow-lg shadow-yellow-500/20 hover:bg-[#dfbc2b]"
                    >
                        Start Creating for Free
                    </button>
                    <p className="text-sm text-gray-500 mt-4">Get 50 free credits on sign up!</p>
                </div>
            </div>
        </section>

        {/* 2. SHOWCASE CAROUSEL */}
        <FeatureCarousel items={marqueeItems} navigateTo={navigateTo} auth={auth} />

        {/* 3. THE TRANSFORMATION GALLERY */}
        <section className="py-24 px-4 bg-white">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-[#1A1A1E] mb-3 tracking-tight">The Transformation Gallery</h2>
                    <p className="text-lg text-[#5F6368] font-medium">From raw asset to professional masterpiece in one click.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {galleryItems.map((item, i) => (
                        <AutoWipeBox key={item.id} item={item} delay={i * 800} />
                    ))}
                </div>

                <div className="mt-16 flex justify-center">
                    <button 
                        onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()} 
                        className="bg-[#1A1A1E] text-white font-bold py-5 px-12 rounded-2xl hover:scale-105 transition-all shadow-xl hover:bg-black text-lg flex items-center gap-3"
                    >
                        Try MagicPixa <ArrowRightIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </section>

        {/* Sections below are hidden on mobile to provide a focused, non-scrolling experience */}
        <div className="hidden lg:block">
            {/* The Workflow Section - 3 Steps matching the feature cards style */}
            <section className="py-20 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-[#1A1A1E] mb-3">The MagicPixa Workflow</h2>
                        <p className="text-lg text-[#5F6368] font-medium">Drop your assets, we do the engineering.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                        {[
                            { step: "01", title: "Upload Asset", icon: <UploadTrayIcon className="w-10 h-10"/>, desc: "Drop your raw product photo or brand logo. Pixa Vision begins a forensic audit immediately." },
                            { step: "02", title: "Select Strategy", icon: <CursorClickIcon className="w-10 h-10"/>, desc: "Choose from pre-engineered visual archetypes (Luxury, Lifestyle, Tech). No text boxes involved." },
                            { step: "03", title: "Download 8K", icon: <SparklesIcon className="w-10 h-10"/>, desc: "Our engine renders a high-fidelity masterpiece with accurate lighting and shadows." }
                        ].map((item, i) => {
                            const { ref, visible } = useReveal(i * 200);
                            return (
                                <div key={i} ref={ref} className={`reveal-item ${visible ? 'visible' : ''} bg-white p-8 rounded-3xl shadow-sm border border-gray-200/80 hover:shadow-md transition-all flex flex-col items-center text-center relative z-10`}>
                                    <div className="w-16 h-16 bg-[#F6F7FA] rounded-2xl flex items-center justify-center mb-6 text-indigo-600">
                                        {item.icon}
                                    </div>
                                    <h3 className="text-xl font-bold text-[#1A1A1E] mb-3"><span className="text-indigo-200 mr-1">{item.step}.</span> {item.title}</h3>
                                    <p className={Theme.colors.textSecondary}>{item.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Comparison Section - Why Logic Beats Prompts */}
            <section className="py-24 px-4 bg-[#F6F7FA]">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-[#1A1A1E] mb-3">Why Logic Beats Prompts</h2>
                        <p className="text-lg text-[#5F6368] font-medium">MagicPixa is an expert photographer, not a chat bot.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 items-stretch">
                        {/* Traditional AI */}
                        <div className="bg-white p-10 rounded-[2.5rem] border border-gray-200 shadow-sm opacity-85">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2 bg-red-50 text-red-500 rounded-lg"><XIcon className="w-5 h-5"/></div>
                                <h4 className="font-bold text-xs uppercase tracking-widest text-red-700">Traditional AI Tools</h4>
                            </div>
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-6 font-mono text-[11px] text-gray-400 leading-relaxed italic border-dashed">
                                "Hyper-realistic 8k studio lighting, cinematic shadows, bokeh background, marble table, high-end commercial photography, intricate details, phase one camera..."
                            </div>
                            <p className="text-sm text-gray-500 font-medium">Requires you to learn technical terminology and spend hours "prompting" until it looks right.</p>
                        </div>

                        {/* MagicPixa Way */}
                        <div className="bg-white p-10 rounded-[2.5rem] border border-indigo-200 shadow-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-12 -mt-12 blur-2xl opacity-50"></div>
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-lg"><SparklesIcon className="w-5 h-5"/></div>
                                    <h4 className="font-bold text-xs uppercase tracking-widest text-indigo-600">The MagicPixa Way</h4>
                                </div>
                                <div className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-widest rounded-full">Intelligent</div>
                            </div>
                            
                            {/* Animated Interaction Container */}
                            <div className="relative flex flex-col items-center justify-center py-6 mb-6 gap-6 min-h-[180px]">
                                {/* Top Row: Options */}
                                <div className="flex gap-2">
                                    <div className="animate-btn-logic-product-v2 border border-gray-200 bg-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all shadow-sm">Product Shot</div>
                                    <div className="opacity-40 bg-gray-50 border border-gray-200 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider text-gray-400">Luxury Vibe</div>
                                    <div className="opacity-40 bg-gray-50 border border-gray-200 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider text-gray-400">Lifestyle Shot</div>
                                </div>

                                {/* Bottom Button: Generate */}
                                <div className="relative">
                                    <div className="animate-btn-logic-generate-v2 border border-gray-200 px-14 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] relative overflow-visible transition-all shadow-sm">
                                        Generate
                                        
                                        {/* CELEBRATION BURST */}
                                        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                                            <div className="w-12 h-12 rounded-full border-4 border-yellow-400 animate-burst-v2 absolute"></div>
                                            <div className="w-8 h-8 rounded-full border-2 border-indigo-400 animate-burst-v2 absolute" style={{ animationDelay: '0.1s' }}></div>
                                        </div>

                                        {/* RESULT POPUP */}
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 bg-white p-1 rounded-lg shadow-2xl border-2 border-white animate-result-v2 z-20 pointer-events-none">
                                             <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&auto=format&fit=crop" className="w-full h-full object-cover rounded-md" />
                                        </div>
                                    </div>
                                    
                                    {/* Animated Cursor */}
                                    <div className="absolute top-0 left-0 w-10 h-10 z-40 pointer-events-none animate-mouse-logic-v2 drop-shadow-2xl">
                                        <svg viewBox="0 0 24 24" fill="white" stroke="black" strokeWidth="1.5" className="w-full h-full">
                                            <path d="M5.5,2l13,11l-5,1l5,7l-3,1l-5-7l-5,4V2z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <p className="text-sm text-gray-700 font-bold leading-relaxed">Pixa Vision audits your product's physics and material to apply the perfect rig automatically. No typing required.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Why MagicPixa Section - Positioned above Features */}
            <section className="py-24 px-4 bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-4xl font-bold text-[#1A1A1E] mb-6 tracking-tight">Why MagicPixa?</h2>
                            <p className="text-[#5F6368] text-lg font-medium mb-12 leading-relaxed">
                                Creating professional content traditionally requires an entire team of specialists. <span className="text-indigo-600 font-bold">MagicPixa replaces all of that with a single intelligent platform.</span>
                            </p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {['Designers', 'Editors', 'Copywriters', 'Social Media Managers', 'Marketing Agencies'].map((role, i) => (
                                    <div key={i} className="flex items-center gap-4 group bg-[#F6F7FA] p-4 rounded-2xl border border-gray-100 transition-all hover:bg-white hover:shadow-md">
                                        <div className="w-6 h-6 rounded-full border-2 border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-400 group-hover:bg-red-500 group-hover:border-red-500 group-hover:text-white transition-all">{i+1}</div>
                                        <span className="text-base font-bold text-gray-500 group-hover:text-gray-400 line-through decoration-gray-400 decoration-2">{role}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-6">
                            {[
                                { title: "Saves Time", icon: <ClockIcon className="w-6 h-6"/>, desc: "Instantly turn ideas into ready-to-use content.", color: "text-blue-600", bg: "bg-blue-50" },
                                { title: "Saves Cost", icon: <CreditCoinIcon className="w-6 h-6"/>, desc: "Eliminate expensive freelance retainers forever.", color: "text-amber-600", bg: "bg-amber-50" },
                                { title: "Pro Consistency", icon: <CheckIcon className="w-6 h-6"/>, desc: "Consistent, professional output on every single run.", color: "text-green-600", bg: "bg-green-50" }
                            ].map((box, i) => (
                                <div key={i} className="flex items-start gap-6 bg-white p-8 rounded-3xl shadow-sm border border-gray-200/80 transition-all hover:shadow-md">
                                    <div className={`w-12 h-12 ${box.bg} ${box.color} rounded-2xl flex items-center justify-center shrink-0 shadow-inner`}>
                                        {box.icon}
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-[#1A1A1E] mb-2">{box.title}</h4>
                                        <p className="text-[#5F6368] font-medium text-sm leading-relaxed">{box.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className={HomeStyles.featuresSection}>
                <div className={HomeStyles.featuresContainer}>
                    <h2 className={HomeStyles.sectionHeader}>Everything You Need to Create</h2>
                    <p className={HomeStyles.sectionSubheader}>One powerful toolkit for all your creative needs.</p>
                    <div className={HomeStyles.featureGrid}>
                        {featuresWithConfig.map((feature, index) => (
                            <MagneticCard 
                                key={index} 
                                onClick={() => !feature.disabled && feature.id && navigateTo('dashboard', feature.id as View)}
                                disabled={feature.disabled}
                                className={`${HomeStyles.featureCard} ${feature.disabled ? HomeStyles.featureCardDisabled : HomeStyles.featureCardEnabled}`}
                            >
                                {feature.disabled && (
                                    <div className="absolute top-4 right-4 bg-gray-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                        Coming Soon
                                    </div>
                                )}
                                <div className={`${HomeStyles.featureIconContainer} ${feature.color}`}>
                                    {feature.icon}
                                </div>
                                <h3 className={HomeStyles.featureTitle}>{feature.title}</h3>
                                <p className={HomeStyles.featureDescription}>{feature.description}</p>
                            </MagneticCard>
                        ))}
                    </div>
                </div>
            </section>

            {/* Reviews Section */}
            <section id="reviews" className={HomeStyles.reviewsSection}>
                <div className={HomeStyles.reviewsContainer}>
                    <h2 className={HomeStyles.sectionHeader}>Loved by Creators Everywhere</h2>
                    <p className={HomeStyles.sectionSubheader}>Don't just take our word for it. Here's what our users say.</p>
                    <div className={HomeStyles.reviewsGrid}>
                        {reviews.map((review, index) => (
                            <div key={index} className={HomeStyles.reviewCard}>
                                <div className="flex items-center mb-4">
                                    {[...Array(5)].map((_, i) => <StarIcon key={i} className="w-5 h-5 text-yellow-400" />)}
                                </div>
                                <p className="text-[#5F6368] mb-6 italic">"{review.review}"</p>
                                <div>
                                    <p className="font-bold text-[#1A1A1E]">{review.name}</p>
                                    <p className="text-sm text-[#5F6368]">{review.location}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className={HomeStyles.pricingSection}>
                <div className={HomeStyles.reviewsContainer}>
                    <h2 className={HomeStyles.sectionHeader}>Upgrade Membership</h2>
                    <p className={HomeStyles.sectionSubheader}>Unlock higher tiers for more perks and bulk savings.</p>
                    
                    <div className={HomeStyles.pricingGrid}>
                        {creditPacks.map((pack, index) => {
                            // Calculate Logic based on Auth Status
                            const packWeight = PLAN_WEIGHTS[pack.name] || 0;
                            
                            let isUpgrade = true;
                            let isCurrent = false;
                            let isDowngrade = false;

                            if (auth.isAuthenticated && auth.user) {
                                isUpgrade = packWeight > currentPlanWeight;
                                isCurrent = packWeight === currentPlanWeight;
                                isDowngrade = packWeight < currentPlanWeight;
                            }

                            const isLoading = loadingPackId === pack.name;

                            return (
                                <div 
                                    key={index} 
                                    className={`
                                        ${HomeStyles.pricingCard} 
                                        ${isCurrent 
                                            ? HomeStyles.pricingCardActive 
                                            : (pack.popular && !isDowngrade ? HomeStyles.pricingCardPopular : HomeStyles.pricingCardStandard)
                                        } 
                                        ${!isUpgrade && !isCurrent && auth.isAuthenticated ? 'opacity-70 bg-gray-50' : ''}
                                    `}
                                >
                                    {/* ACTIVE PLAN BADGE */}
                                    {isCurrent && <div className={HomeStyles.activeBadge}>Current Plan</div>}

                                    {/* POPULAR BADGE (Only if not current AND not a downgrade) */}
                                    {pack.popular && !isCurrent && !isDowngrade && <p className="text-center bg-black text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase -mt-9 mb-4 mx-auto shadow-sm">Best Value</p>}
                                    
                                    {/* Spacer if active to handle badge overlap visually */}
                                    {isCurrent && <div className="h-2"></div>}

                                    <h3 className={HomeStyles.featureTitle}>{pack.name}</h3>
                                    <p className="text-[#5F6368] text-sm mb-4 h-10">{pack.tagline}</p>
                                    
                                    <div className="my-2">
                                        <span className="text-4xl font-bold text-[#1A1A1E]">
                                            {pack.totalCredits}
                                        </span>
                                        <span className="text-[#5F6368] ml-1">Credits</span>
                                    </div>
                                    <div className="h-5 mb-4">
                                      {pack.bonus > 0 && (
                                          <p className="text-sm font-semibold text-emerald-500">
                                              {pack.credits} + {pack.bonus} Bonus!
                                          </p>
                                      )}
                                    </div>
                                    
                                    <div className="bg-gray-50 border border-gray-200/80 rounded-lg p-3 text-center mb-6">
                                        <span className="text-2xl font-bold text-[#1A1A1E]">₹{pack.price}</span>
                                        <p className="text-xs text-gray-500">One-time payment</p>
                                    </div>
                                    
                                    <button 
                                        onClick={() => {
                                            if (!auth.isAuthenticated) {
                                                auth.openAuthModal();
                                            } else if (isUpgrade) {
                                                handleCheckout(pack);
                                            }
                                        }}
                                        disabled={(auth.isAuthenticated && !isUpgrade) || isLoading}
                                        className={`
                                            ${HomeStyles.pricingButton} 
                                            ${auth.isAuthenticated 
                                                ? (isCurrent 
                                                    ? HomeStyles.pricingButtonActive
                                                    : (isUpgrade 
                                                        ? (pack.popular && !isDowngrade ? HomeStyles.pricingButtonPopular : HomeStyles.pricingButtonStandard)
                                                        : 'bg-gray-200 text-gray-500 cursor-default hover:bg-gray-200'))
                                                : (pack.popular ? HomeStyles.pricingButtonPopular : HomeStyles.pricingButtonStandard)
                                            }
                                        `}
                                    >
                                        {isLoading ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : auth.isAuthenticated 
                                            ? (isCurrent ? <><CheckIcon className="w-4 h-4"/> Active</> : isDowngrade ? "Included" : "Upgrade")
                                            : "Buy Now"
                                        }
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Impact CTA Section - Updated for premium black look */}
            <section className="py-32 px-4 text-center bg-[#F6F7FA] border-t border-gray-200/50">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-bold text-[#1A1A1E] mb-6 leading-tight tracking-tight">
                        Built for speed. For growth. For impact.
                    </h2>
                    <p className="text-lg text-[#5F6368] mb-12 font-medium">Ready to transform your creative workflow?</p>
                    <button 
                        onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()}
                        className="bg-[#1A1A1E] text-white font-bold py-5 px-12 rounded-2xl hover:bg-black transition-all shadow-xl shadow-gray-900/20 hover:scale-105 active:scale-95 text-lg flex items-center gap-3 mx-auto"
                    >
                        Start Creating Now
                        <ArrowRightIcon className="w-6 h-6" />
                    </button>
                    <p className="text-sm text-gray-500 mt-6 font-medium">Get 50 free credits on sign up!</p>
                </div>
            </section>
        </div>
      </main>
      <HomeMobileNav navigateTo={navigateTo} auth={auth} />
      <div className="hidden lg:block">
        <Footer navigateTo={navigateTo} />
      </div>
      {successCredits !== null && (
          <PaymentSuccessModal 
            creditsAdded={successCredits} 
            packName={successPackName}
            onClose={() => {
                setSuccessCredits(null);
                navigateTo('dashboard');
            }} 
          />
      )}
    </>
  );
};

export default HomePage;
