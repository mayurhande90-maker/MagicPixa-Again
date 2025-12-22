
import React from 'react';
import { Page, AuthProps, View, AppConfig } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
// Fix: Added ArrowRightIcon to imports and changed UserIcon alias to standard name to match usage
import { 
  SparklesIcon, CheckIcon, StarIcon, PhotoStudioIcon, UsersIcon, PaletteIcon, CaptionIcon, HomeIcon, MockupIcon, ProjectsIcon, DashboardIcon, UserIcon, ArrowRightIcon, BrandKitIcon, LightbulbIcon, ThumbnailIcon, ApparelIcon, MagicAdsIcon, BuildingIcon, UploadTrayIcon, PixaProductIcon, PixaEcommerceIcon, PixaTogetherIcon, PixaRestoreIcon, PixaCaptionIcon, PixaInteriorIcon, PixaTryOnIcon, PixaMockupIcon, PixaHeadshotIcon, ShieldCheckIcon, CampaignStudioIcon, LightningIcon, CubeIcon
} from './components/icons';
import { ProfessionalHomeStyles as styles } from './styles/ProfessionalHome.styles';

interface ProfessionalHomePageProps {
  navigateTo: (page: Page, view?: View, sectionId?: string) => void;
  auth: AuthProps;
  appConfig: AppConfig | null;
}

const DEPARTMENTS = [
    {
        title: "Photography Dept.",
        icon: <PhotoStudioIcon className="w-8 h-8" />,
        features: [
            { id: 'studio', name: 'Product Shots', desc: 'Studio grade without the lighting rig.' },
            { id: 'headshot', name: 'Headshot Pro', desc: 'LinkedIn ready in 10 seconds.' },
            { id: 'colour', name: 'Restore', desc: 'Archive & revitalize assets.' }
        ]
    },
    {
        title: "Marketing Dept.",
        icon: <MagicAdsIcon className="w-8 h-8" />,
        features: [
            { id: 'brand_stylist', name: 'AdMaker', desc: 'High-conversion visual creative.' },
            { id: 'brand_kit', name: 'Ecommerce Kit', desc: 'Full listing packs in one click.' },
            { id: 'thumbnail_studio', name: 'Thumbnails', desc: 'CTR-engineered social assets.' }
        ]
    },
    {
        title: "Design & Strategy",
        icon: <CampaignStudioIcon className="w-8 h-8" />,
        features: [
            { id: 'campaign_studio', name: 'Campaign Planner', desc: 'Monthly content, automated.' },
            { id: 'interior', name: 'Interior Design', desc: 'Visualizing spaces realistically.' },
            { id: 'mockup', name: 'Mockups', desc: 'Logos on physical inventory.' }
        ]
    }
];

const PERSONAS = [
    {
        title: "Startup Founders",
        hook: "Go to market today.",
        desc: "Save ₹50,000+ on initial photography and design retainers. Launch with world-class visuals from your smartphone.",
        icon: <LightningIcon className="w-6 h-6 text-yellow-500" />
    },
    {
        title: "Agency Owners",
        hook: "Scale output, not payroll.",
        desc: "White-label quality for a fraction of the cost. Handle 5x more clients without hiring more retouching staff.",
        icon: <BuildingIcon className="w-6 h-6 text-blue-500" />
    },
    {
        title: "Freelancers",
        hook: "Ship 10x faster.",
        desc: "Automate the tedious 48-hour design cycle. Spend more time on strategy and less time clicking pen tools.",
        icon: <UserIcon className="w-6 h-6 text-purple-500" />
    }
];

const ProfessionalHome: React.FC<ProfessionalHomePageProps> = ({ navigateTo, auth, appConfig }) => {
  const currentPlan = auth.user?.plan || 'Free';

  return (
    <>
      <Header navigateTo={navigateTo} auth={auth} />
      <main className={styles.main}>
        
        {/* HERO: The Powerhouse Section */}
        <section className={styles.heroWrapper}>
            <div className={styles.heroContainer}>
                <div className={styles.heroBadge}>
                    <SparklesIcon className="w-3 h-3" />
                    <span>The Design Department for High-Growth Teams</span>
                </div>
                <h1 className={styles.heroTitle}>
                    No Retainers. No Designers. <br/>
                    <span className="text-indigo-600">No Prompts.</span>
                </h1>
                <p className={styles.heroSubtitle}>
                    MagicPixa replaces the 48-hour design wait with a 10-second AI production engine. 
                    Commercial-grade visuals for Founders and Agencies who value ROI over overhead.
                </p>
                <div className={styles.heroActionGroup}>
                    <button 
                        onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()}
                        className={styles.primaryButton}
                    >
                        Start Creating (50 Free Credits)
                    </button>
                    <button 
                        onClick={() => navigateTo('home', undefined, 'roi')}
                        className={styles.secondaryButton}
                    >
                        Calculate ROI
                    </button>
                </div>
                
                {/* Product Preview - Split Screen concept in text/visual */}
                <div className={styles.heroPreview}>
                    <div className={styles.previewLabel}>Raw Input</div>
                    <div className={styles.previewArrow}>→</div>
                    <div className={styles.previewLabelActive}>Pixa Production</div>
                </div>
            </div>
        </section>

        {/* ROI CALCULATOR SECTION */}
        <section id="roi" className={styles.sectionPadding}>
            <div className={styles.contentWrapper}>
                <div className="text-center mb-16">
                    <h2 className={styles.sectionTitle}>Stop Learning "Prompt Engineering"</h2>
                    <p className={styles.sectionSubtitle}>Start generating business results. MagicPixa speaks business, not math.</p>
                </div>

                <div className={styles.roiGrid}>
                    <div className={styles.roiCard}>
                        <h3 className="font-bold text-gray-500 uppercase tracking-widest text-[10px] mb-4">Traditional Designer</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                <span className="text-sm font-medium">Wait Time</span>
                                <span className="text-sm font-bold text-red-500">24-48 Hours</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                <span className="text-sm font-medium">Average Cost</span>
                                <span className="text-sm font-bold text-red-500">₹1,500 / Image</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm font-medium">Iteration</span>
                                <span className="text-sm font-bold text-red-500">Manual Revisions</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.roiCardPixa}>
                        <div className="absolute top-0 right-0 p-3 bg-indigo-600 text-white rounded-bl-2xl">
                            <LightningIcon className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-indigo-200 uppercase tracking-widest text-[10px] mb-4">MagicPixa Agency Suite</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between border-b border-white/10 pb-2">
                                <span className="text-sm font-medium text-white">Wait Time</span>
                                <span className="text-sm font-bold text-[#6EFACC]">10 Seconds</span>
                            </div>
                            <div className="flex justify-between border-b border-white/10 pb-2">
                                <span className="text-sm font-medium text-white">Average Cost</span>
                                <span className="text-sm font-bold text-[#6EFACC]">₹10 / Image</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm font-medium text-white">Iteration</span>
                                <span className="text-sm font-bold text-[#6EFACC]">Prompt-less Auto-Correction</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* DEPARTMENTAL NAVIGATION */}
        <section className={styles.deptSection}>
            <div className={styles.contentWrapper}>
                <div className="text-center mb-16">
                    <h2 className={styles.sectionTitle}>Built for Professionals</h2>
                    <p className={styles.sectionSubtitle}>Everything your creative agency needs, minus the agency fees.</p>
                </div>

                <div className={styles.deptGrid}>
                    {DEPARTMENTS.map((dept, i) => (
                        <div key={i} className={styles.deptCard}>
                            <div className={styles.deptHeader}>
                                <div className={styles.deptIcon}>{dept.icon}</div>
                                <h3 className="text-lg font-black text-gray-900">{dept.title}</h3>
                            </div>
                            <div className="space-y-3">
                                {dept.features.map(f => (
                                    <button 
                                        key={f.id}
                                        onClick={() => navigateTo('dashboard', f.id as View)}
                                        className={styles.featureItem}
                                    >
                                        <div className="flex-1 text-left">
                                            <p className="font-bold text-sm text-gray-800">{f.name}</p>
                                            <p className="text-[10px] text-gray-400 font-medium">{f.desc}</p>
                                        </div>
                                        <ArrowRightIcon className="w-3 h-3 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* BUILT FOR PERSONAS */}
        <section className={styles.sectionPadding}>
            <div className={styles.contentWrapper}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {PERSONAS.map((p, i) => (
                        <div key={i} className={styles.personaCard}>
                            <div className="p-3 bg-gray-50 rounded-2xl w-fit mb-6">{p.icon}</div>
                            <h3 className="text-xl font-black text-gray-900 mb-1">{p.title}</h3>
                            <p className="text-indigo-600 font-bold text-xs uppercase tracking-widest mb-4">{p.hook}</p>
                            <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-32 px-4 bg-[#1A1A1E] text-white text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent"></div>
            <div className="max-w-4xl mx-auto relative z-10">
                <h2 className="text-4xl md:text-5xl font-black mb-8">Ready to fire your designer?</h2>
                <button 
                    onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-5 rounded-2xl font-black text-lg transition-all shadow-2xl hover:scale-105 active:scale-95"
                >
                    Create Your First Campaign
                </button>
                <p className="mt-8 text-gray-500 font-medium text-sm">Join 5,000+ startups and agency owners already scaling with MagicPixa.</p>
            </div>
        </section>

      </main>
      <Footer navigateTo={navigateTo} />
    </>
  );
};

export default ProfessionalHome;
