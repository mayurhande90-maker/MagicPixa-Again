import React, { useState } from 'react';
import { Page, AuthProps, View, AppConfig } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
import { 
  SparklesIcon, PixaProductIcon, ThumbnailIcon, PixaRestoreIcon, MagicAdsIcon, PixaHeadshotIcon, UploadTrayIcon, CursorClickIcon, ArrowRightIcon, ShieldCheckIcon, LightningIcon
} from './components/icons';
import { BeforeAfterSlider } from './components/BeforeAfterSlider';

const TRANSFORMATIONS = [
    {
        id: 'studio',
        label: 'Product Shots',
        icon: PixaProductIcon,
        before: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=2000&auto=format&fit=crop",
        after: "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?q=80&w=2070&auto=format&fit=crop",
        logic: "Dynamic Shadows + Subsurface Scattering",
        description: "Raw smartphone photography transformed into luxury studio catalog assets."
    },
    {
        id: 'thumbnail',
        label: 'Thumbnail Pro',
        icon: ThumbnailIcon,
        before: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=2072&auto=format&fit=crop",
        after: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop",
        logic: "CTR Optimization + High-Pass Sharpness",
        description: "Flat video frames engineered into viral, high-contrast YouTube thumbnails."
    },
    {
        id: 'restore',
        label: 'Photo Restore',
        icon: PixaRestoreIcon,
        before: "https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?q=80&w=2070&auto=format&fit=crop",
        after: "https://images.unsplash.com/photo-1542362567-b051c63b9a47?q=80&w=2070&auto=format&fit=crop",
        logic: "Forensic Repair + Neural Colorization",
        description: "Damaged vintage memories recovered with flawless resolution and color."
    },
    {
        id: 'admaker',
        label: 'AdMaker',
        icon: MagicAdsIcon,
        before: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop",
        after: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?q=80&w=2070&auto=format&fit=crop",
        logic: "AIDA Layout + Narrative Lighting",
        description: "Simple shoe photos converted into agency-grade 'Summer Sale' ad creatives."
    },
    {
        id: 'headshot',
        label: 'Headshot Pro',
        icon: PixaHeadshotIcon,
        before: "https://i.pravatar.cc/1000?u=headshot_before",
        after: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1974&auto=format&fit=crop",
        logic: "Executive Biometrics + Studio Relighting",
        description: "Casual outdoor selfies replaced with powerful, executive-grade portraits."
    }
];

export const StagingHomePage: React.FC<{ navigateTo: (page: Page, view?: View, sectionId?: string) => void; auth: AuthProps; appConfig: AppConfig | null }> = ({ navigateTo, auth, appConfig }) => {
    const [activeTab, setActiveTab] = useState(TRANSFORMATIONS[0]);

    return (
        <div className="min-h-screen bg-white">
            <Header navigateTo={navigateTo} auth={auth} />
            
            <main>
                {/* 1. HERO SECTION (REPLICA) */}
                <section className="pt-20 pb-32 px-4 text-center">
                    <div className="max-w-4xl mx-auto">
                        <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tighter leading-tight mb-8">
                            Create Stunning Visuals, <br/>
                            <span className="text-[#4D7CFF]">No Prompt Required</span>
                        </h1>
                        <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-12 font-medium">
                            MagicPixa understands what you need. Turn simple photos into masterpieces effortslessly using Pixa Vision.
                        </p>
                        <button onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()} className="bg-[#F9D230] text-[#1A1A1E] font-black px-10 py-5 rounded-2xl text-lg shadow-xl shadow-yellow-500/20 hover:scale-105 transition-all">
                            Start Creating for Free
                        </button>
                    </div>
                </section>

                {/* 2. WORKFLOW SECTION (REPLICA) */}
                <section className="py-24 px-4 bg-white border-y border-gray-100">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">The MagicPixa Workflow</h2>
                            <p className="text-lg text-gray-400 font-medium">Drop your assets, we do the engineering.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            {[
                                { step: "01", title: "Upload Asset", icon: <UploadTrayIcon className="w-10 h-10"/>, desc: "Drop your raw product photo. Pixa Vision begins a forensic audit immediately." },
                                { step: "02", title: "Select Strategy", icon: <CursorClickIcon className="w-10 h-10"/>, desc: "Choose from pre-engineered visual archetypes. No text boxes involved." },
                                { step: "03", title: "Download 8K", icon: <SparklesIcon className="w-10 h-10"/>, desc: "Our engine renders a high-fidelity masterpiece with accurate lighting." }
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col items-center text-center">
                                    <div className="w-16 h-16 bg-[#F6F7FA] rounded-2xl flex items-center justify-center mb-6 text-indigo-600">
                                        {item.icon}
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-3"><span className="text-indigo-200 mr-1">{item.step}.</span> {item.title}</h3>
                                    <p className="text-gray-500 text-sm leading-relaxed font-medium px-4">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 3. NEW: THE TRANSFORMATION LAB (THE CMO PIECE) */}
                <section className="py-24 px-4 bg-[#F6F7FA]">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                            <div className="text-left">
                                <div className="inline-flex items-center gap-2 bg-indigo-100 px-3 py-1 rounded-full mb-4">
                                    <LightningIcon className="w-3 h-3 text-indigo-600" />
                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Interactive Playground</span>
                                </div>
                                <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter">The Transformation Lab</h2>
                                <p className="text-lg text-gray-400 font-medium mt-2">See how MagicPixa re-engineers reality for your brand.</p>
                            </div>
                            
                            {/* Strategy Tabs */}
                            <div className="flex flex-wrap gap-2 p-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar">
                                {TRANSFORMATIONS.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setActiveTab(t)}
                                        className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                            activeTab.id === t.id 
                                            ? 'bg-indigo-600 text-white shadow-lg' 
                                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        <t.icon className="w-4 h-4" />
                                        <span>{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Lab Console */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                            {/* Left: Metadata */}
                            <div className="lg:col-span-4 space-y-8 animate-fadeIn">
                                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                                    
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                            <ShieldCheckIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Technical Mode</p>
                                            <p className="text-sm font-black text-gray-900">{activeTab.label}</p>
                                        </div>
                                    </div>

                                    <h3 className="text-2xl font-black text-gray-900 mb-4 leading-tight">{activeTab.description}</h3>
                                    
                                    <div className="space-y-4">
                                        <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></div>
                                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">Pixa Logic Protocol</span>
                                            </div>
                                            <p className="text-xs font-mono text-indigo-100 font-bold">{activeTab.logic}</p>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => auth.isAuthenticated ? navigateTo('dashboard', activeTab.id as View) : auth.openAuthModal()}
                                        className="w-full mt-8 flex items-center justify-center gap-3 py-4 bg-gray-50 border border-gray-100 text-gray-900 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-indigo-600 hover:text-white hover:border-transparent transition-all group"
                                    >
                                        Try this tool
                                        <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>

                            {/* Right: The Main Canvas */}
                            <div className="lg:col-span-8 relative">
                                <div className="absolute -inset-4 bg-indigo-500/5 rounded-[3rem] blur-3xl -z-10"></div>
                                <BeforeAfterSlider 
                                    beforeImage={activeTab.before}
                                    afterImage={activeTab.after}
                                    beforeLabel="Original Asset"
                                    afterLabel="Pixa Production"
                                />
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer navigateTo={navigateTo} />
        </div>
    );
};

export default StagingHomePage;