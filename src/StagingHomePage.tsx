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
        logic: "Dynamic Shadows + Ray-Tracing",
        description: "Transform raw smartphone photos into luxury studio catalog assets with one click."
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
        description: "Damaged vintage memories recovered with flawless resolution and accurate color."
    },
    {
        id: 'admaker',
        label: 'AdMaker',
        icon: MagicAdsIcon,
        before: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop",
        after: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?q=80&w=2070&auto=format&fit=crop",
        logic: "AIDA Layout + Narrative Lighting",
        description: "Simple photos converted into agency-grade 'Summer Sale' ad creatives."
    },
    {
        id: 'headshot',
        label: 'Headshot Pro',
        icon: PixaHeadshotIcon,
        before: "https://i.pravatar.cc/1000?u=headshot_before",
        after: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1974&auto=format&fit=crop",
        logic: "Executive Biometrics + Studio Relighting",
        description: "Casual outdoor selfies replaced with powerful, executive-grade LinkedIn portraits."
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

                {/* 2. WORKFLOW SECTION (MATCHED) */}
                <section className="py-24 px-4 bg-white">
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
                            ].map((item, i) => (
                                <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200/80 transition-all flex flex-col items-center text-center">
                                    <div className="w-16 h-16 bg-[#F6F7FA] rounded-2xl flex items-center justify-center mb-6 text-indigo-600">
                                        {item.icon}
                                    </div>
                                    <h3 className="text-xl font-bold text-[#1A1A1E] mb-3"><span className="text-indigo-200 mr-1">{item.step}.</span> {item.title}</h3>
                                    <p className="text-[#5F6368] text-sm leading-relaxed font-medium">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 3. REFINED TRANSFORMATION LAB */}
                <section className="py-24 px-4 bg-[#F6F7FA] border-y border-gray-100">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-[#1A1A1E] mb-3">The Transformation Lab</h2>
                            <p className="text-lg text-[#5F6368] font-medium mb-10">See how Pixa Vision re-engineers reality for every category.</p>
                            
                            {/* Centered Pill Tabs */}
                            <div className="inline-flex flex-wrap justify-center gap-2 p-1.5 bg-gray-200/50 rounded-2xl border border-gray-200 shadow-inner">
                                {TRANSFORMATIONS.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setActiveTab(t)}
                                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                                            activeTab.id === t.id 
                                            ? 'bg-white text-indigo-600 shadow-sm border border-indigo-100' 
                                            : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        <t.icon className={`w-4 h-4 ${activeTab.id === t.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                                        <span>{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Lab Canvas Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                            {/* Left Info Panel */}
                            <div className="lg:col-span-4 space-y-6">
                                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200/80 animate-fadeIn">
                                    <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                            <ShieldCheckIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1.5">Feature Mode</p>
                                            <p className="text-lg font-bold text-[#1A1A1E]">{activeTab.label}</p>
                                        </div>
                                    </div>

                                    <p className="text-[#5F6368] text-base leading-relaxed font-medium mb-8">
                                        {activeTab.description}
                                    </p>
                                    
                                    <div className="bg-[#F6F7FA] p-5 rounded-2xl border border-gray-100 mb-8">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                                            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Pixa Vision Logic</span>
                                        </div>
                                        <p className="text-sm font-bold text-gray-800">{activeTab.logic}</p>
                                    </div>

                                    <button 
                                        onClick={() => auth.isAuthenticated ? navigateTo('dashboard', activeTab.id as View) : auth.openAuthModal()}
                                        className="w-full flex items-center justify-center gap-2 py-4 bg-[#1A1A1E] text-white font-bold rounded-xl hover:bg-black transition-all group"
                                    >
                                        Try this tool
                                        <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>

                            {/* Right Image Canvas */}
                            <div className="lg:col-span-8">
                                <div className="bg-white p-3 rounded-[2.8rem] shadow-xl border border-gray-200/80">
                                    <BeforeAfterSlider 
                                        beforeImage={activeTab.before}
                                        afterImage={activeTab.after}
                                        beforeLabel="Raw Input"
                                        afterLabel="Studio Output"
                                        className="rounded-[2.2rem]"
                                    />
                                </div>
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