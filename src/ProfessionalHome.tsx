
import React, { useEffect, useState } from 'react';
import { Page, AuthProps, View, AppConfig } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
import { 
  SparklesIcon, CheckIcon, StarIcon, PhotoStudioIcon, UsersIcon, PaletteIcon, CaptionIcon, HomeIcon, MockupIcon, ProjectsIcon, DashboardIcon, UserIcon, ArrowRightIcon, BrandKitIcon, LightbulbIcon, ThumbnailIcon, ApparelIcon, MagicAdsIcon, BuildingIcon, UploadTrayIcon, PixaProductIcon, PixaEcommerceIcon, PixaTogetherIcon, PixaRestoreIcon, PixaCaptionIcon, PixaInteriorIcon, PixaTryOnIcon, PixaMockupIcon, PixaHeadshotIcon, ShieldCheckIcon, CampaignStudioIcon, LightningIcon, CubeIcon, GlobeIcon, ChartBarIcon
} from './components/icons';
import { ProfessionalHomeStyles as styles } from './styles/ProfessionalHome.styles';

interface ProfessionalHomePageProps {
  navigateTo: (page: Page, view?: View, sectionId?: string) => void;
  auth: AuthProps;
  appConfig: AppConfig | null;
}

const SHOWREEL_IMAGES = [
    { label: "Elite Product Shots", url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop" },
    { label: "Pixa Headshot Pro", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop" },
    { label: "Lifestyle Commerce", url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1999&auto=format&fit=crop" },
    { label: "Interior Engine", url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2000&auto=format&fit=crop" },
    { label: "High-End Mockups", url: "https://images.unsplash.com/photo-1586717791821-3f44a563cc4c?q=80&w=2070&auto=format&fit=crop" },
    { label: "Photo Restoration", url: "https://images.unsplash.com/photo-1554048612-b6a482bc67e5?q=80&w=2070&auto=format&fit=crop" }
];

const DEPARTMENTS = [
    {
        title: "Production Dept.",
        icon: <PixaProductIcon className="w-7 h-7" />,
        colSpan: "lg:col-span-4",
        features: [
            { id: 'studio', name: 'Elite Product Shots', desc: 'Studio-Grade Optics' },
            { id: 'headshot', name: 'Executive Headshots', desc: 'Identity Cloning' },
            { id: 'colour', name: 'Archive Restore', desc: 'Forensic Repair' }
        ]
    },
    {
        title: "Marketing Dept.",
        icon: <MagicAdsIcon className="w-7 h-7" />,
        colSpan: "lg:col-span-4",
        features: [
            { id: 'brand_stylist', name: 'Pixa AdMaker', desc: 'Conversion Engineering' },
            { id: 'brand_kit', name: 'Ecommerce Packs', desc: 'Listing Automation' },
            { id: 'thumbnail_studio', name: 'Thumbnail Pro', desc: 'CTR Optimization' }
        ]
    },
    {
        title: "Strategy & Design",
        icon: <CampaignStudioIcon className="w-7 h-7" />,
        colSpan: "lg:col-span-4",
        features: [
            { id: 'campaign_studio', name: 'Campaign Studio', desc: 'Annual Content Engine' },
            { id: 'interior', name: 'Interior Design', desc: 'Spatial Visualization' },
            { id: 'mockup', name: 'Pixa Mockups', desc: 'Physical Prototyping' }
        ]
    }
];

const ProfessionalHome: React.FC<ProfessionalHomePageProps> = ({ navigateTo, auth, appConfig }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={styles.main}>
      <Header navigateTo={navigateTo} auth={auth} />
      
      {/* LUXURY BACKGROUND LAYERS */}
      <div className={styles.meshGradient}></div>
      <div className={styles.grainTexture}></div>

      <main className="relative">
        
        {/* HERO SECTION: THE MISSION CONTROL */}
        <section className={styles.heroWrapper}>
            <div className={styles.heroContainer}>
                <div className={styles.heroBadge}>
                    <SparklesIcon className="w-3 h-3 animate-pulse" />
                    <span>The Design Department for High-Growth Brands</span>
                </div>
                
                <h1 className={styles.heroTitle}>
                    Design at the Speed <br/>
                    <span className="text-indigo-600">of Thought.</span>
                </h1>
                
                <p className={styles.heroSubtitle}>
                    Pixa replaces weeks of photography and design delay with an instant generative production engine. 
                    Commercial-grade visuals engineered for founders who value ROI over retainers.
                </p>

                <div className={styles.heroActionGroup}>
                    <button 
                        onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()}
                        className={styles.primaryButton}
                    >
                        <span className="relative z-10 flex items-center gap-3 font-black">
                          Start Creating (50 Free Credits) <ArrowRightIcon className="w-5 h-5"/>
                        </span>
                        <div className={styles.buttonGlow}></div>
                    </button>
                    <button 
                        onClick={() => navigateTo('home', undefined, 'showreel')}
                        className={styles.secondaryButton}
                    >
                        Explore Showreel
                    </button>
                </div>
            </div>

            {/* VISUAL SHOWREEL: THE PROOF */}
            <div id="showreel" className={styles.showreelGrid}>
                {SHOWREEL_IMAGES.map((img, i) => (
                    <div key={i} className={styles.showreelItem} style={{ animationDelay: `${i * 100}ms` }}>
                        <img src={img.url} className="w-full h-full object-cover" alt={img.label} />
                        <div className={styles.showreelLabel}>{img.label}</div>
                    </div>
                ))}
            </div>
        </section>

        {/* COMPARISON: THE ROI ENGINE */}
        <section className={styles.sectionPadding}>
            <div className={styles.contentWrapper}>
                <div className="text-center mb-20">
                    <h2 className={styles.sectionTitle}>Kill the Overhead.</h2>
                    <p className={styles.sectionSubtitle}>Why wait for designers to finish their morning coffee when Pixa is already rendering your campaign?</p>
                </div>

                <div className={styles.comparisonTable}>
                    <div className={styles.compRow}>
                        <div className={styles.compCell + " border-r border-slate-100"}>
                            <span className={styles.compHeader}>Standard Design Firm</span>
                            <div className="space-y-6">
                                <div className="flex justify-between items-end border-b border-slate-100 pb-3">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Wait Time</p>
                                    <p className="text-lg font-black text-rose-500">48-72 Hours</p>
                                </div>
                                <div className="flex justify-between items-end border-b border-slate-100 pb-3">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cost Per Asset</p>
                                    <p className="text-lg font-black text-rose-500">₹2,500+</p>
                                </div>
                                <div className="flex justify-between items-end">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Process</p>
                                    <p className="text-sm font-bold text-slate-600">Manual Emails</p>
                                </div>
                            </div>
                        </div>
                        <div className={styles.compCell + " bg-indigo-50/20"}>
                            <span className={styles.compHeader + " text-indigo-600"}>Pixa Agency Suite</span>
                            <div className="space-y-6">
                                <div className="flex justify-between items-end border-b border-indigo-100/50 pb-3">
                                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Wait Time</p>
                                    <p className="text-xl font-black text-indigo-600">10 Seconds</p>
                                </div>
                                <div className="flex justify-between items-end border-b border-indigo-100/50 pb-3">
                                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Cost Per Asset</p>
                                    <p className="text-xl font-black text-indigo-600">₹10</p>
                                </div>
                                <div className="flex justify-between items-end">
                                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Process</p>
                                    <p className="text-sm font-bold text-indigo-900 flex items-center gap-1"><LightningIcon className="w-3 h-3"/> One-Click Production</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* BENTO DEPARTMENTS: THE CAPABILITIES */}
        <section className={styles.sectionPadding}>
            <div className={styles.contentWrapper}>
                <div className="text-center mb-24">
                    <h2 className={styles.sectionTitle}>Everything In-House.</h2>
                    <p className={styles.sectionSubtitle}>A full suite of creative departments, integrated with your Brand Kit.</p>
                </div>

                <div className={styles.bentoGrid}>
                    {DEPARTMENTS.map((dept, i) => (
                        <div key={i} className={`${dept.colSpan} ${styles.glassCard} p-10`}>
                            <div className={styles.deptHeader}>
                                <div className={styles.deptIcon}>{dept.icon}</div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{dept.title}</h3>
                            </div>
                            
                            <div className={styles.featureList}>
                                {dept.features.map(f => (
                                    <button 
                                        key={f.id}
                                        onClick={() => navigateTo('dashboard', f.id as View)}
                                        className={styles.featureItem}
                                    >
                                        <div className="text-left">
                                            <p className={styles.featureName}>{f.name}</p>
                                            <p className={styles.featureDesc}>{f.desc}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-50 opacity-0 group-hover/item:opacity-100 transition-all">
                                            <ArrowRightIcon className="w-4 h-4 text-indigo-600" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* PERSOANAS: BUILT FOR THE SHAKERS */}
        <section className={styles.sectionPadding}>
            <div className={styles.contentWrapper}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { title: "Founders", hook: "Go to Market in Hours.", desc: "Save ₹50,000+ on design retainers. Launch with world-class visuals from raw prototype photos.", icon: <LightningIcon className="w-6 h-6"/> },
                        { title: "Agencies", hook: "Output at Scale.", desc: "White-label quality for a fraction of the cost. Handle 5x more clients without hiring more staff.", icon: <BuildingIcon className="w-6 h-6"/> },
                        { title: "Freelancers", hook: "Capacity Unlocked.", desc: "Automate the tedious 48-hour design cycle. Focus on strategy, not clicking pen tools.", icon: <UserIcon className="w-6 h-6"/> }
                    ].map((p, i) => (
                        <div key={i} className={styles.glassCard + " p-12 text-center"}>
                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-8 mx-auto shadow-inner text-slate-400 group-hover:text-indigo-600 transition-colors">
                                {p.icon}
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">{p.title}</h3>
                            <p className="text-indigo-600 font-black text-[10px] uppercase tracking-widest mb-6">{p.hook}</p>
                            <p className="text-sm text-slate-500 leading-relaxed font-medium">{p.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* FINAL CTA: THE CALL TO SCALE */}
        <section className="py-48 px-4 text-center relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-full bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="max-w-3xl mx-auto relative z-10">
                <h2 className="text-5xl md:text-[84px] font-black mb-12 tracking-tighter text-slate-950 leading-[0.9]">
                    Fire your <br/> designer.
                </h2>
                <button 
                    onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()}
                    className={styles.primaryButton}
                >
                    <span className="relative z-10 flex items-center gap-3 font-black">
                      Join 5,000+ High-Growth Teams <ArrowRightIcon className="w-5 h-5"/>
                    </span>
                    <div className={styles.buttonGlow}></div>
                </button>
                <p className="mt-10 text-slate-400 font-black text-[10px] uppercase tracking-[0.4em]">No Retainers • No Contracts • No Prompts</p>
            </div>
        </section>

      </main>
      
      <Footer navigateTo={navigateTo} />
    </div>
  );
};

export default ProfessionalHome;
