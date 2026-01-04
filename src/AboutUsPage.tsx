import React from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import { Page, View, AuthProps } from './types';
import { 
    SparklesIcon, 
    CheckIcon, 
    ThumbnailIcon, 
    PixaProductIcon, 
    PixaCaptionIcon, 
    BrandKitIcon, 
    BuildingIcon,
    ArrowRightIcon,
    ShieldCheckIcon,
    LightningIcon,
    ClockIcon,
    CreditCoinIcon,
    FlagIcon,
    MagicAdsIcon,
    UploadTrayIcon,
    CursorClickIcon,
    // Fix: Import missing XIcon
    XIcon
} from './components/icons';

interface AboutUsPageProps {
    navigateTo: (page: Page, view?: View, sectionId?: string) => void;
    auth: AuthProps;
}

const AboutUsPage: React.FC<AboutUsPageProps> = ({ navigateTo, auth }) => {
    return (
        <div className="min-h-screen bg-white flex flex-col font-sans selection:bg-indigo-100">
            <Header navigateTo={navigateTo} auth={auth} />
            
            <main className="flex-grow">
                {/* Hero Section - Re-hooked for Prompt-less USP */}
                <section className="text-center py-20 px-4">
                    <div className="relative max-w-5xl mx-auto bg-white p-8 sm:p-12 md:p-20 rounded-3xl shadow-sm border border-gray-200/80 overflow-hidden">
                        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl opacity-50"></div>
                        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-100/50 rounded-full blur-3xl opacity-50"></div>
                        
                        <div className="relative z-10 max-w-4xl mx-auto">
                            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 border border-transparent px-4 py-1.5 rounded-full mb-8 shadow-sm">
                                <SparklesIcon className="w-4 h-4 text-white" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white">The Zero-Prompt Standard</span>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-black text-[#1A1A1E] mb-6 leading-tight tracking-tight">
                                Professional Visuals. <br/>
                                <span className="text-[#4D7CFF]">Zero Prompts Required.</span>
                            </h1>
                            <p className="text-lg md:text-xl text-[#5F6368] max-w-3xl mx-auto leading-relaxed font-medium">
                                While other AI tools force you to learn "Prompt Engineering," <span className="text-indigo-600 font-bold">MagicPixa uses Pixa Vision</span> to see your product and understand your needs instantly.
                            </p>
                            <div className="mt-8 flex flex-wrap justify-center gap-4">
                                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full border border-gray-100 shadow-inner">
                                    <CheckIcon className="w-4 h-4 text-green-500" />
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">No Typing</span>
                                </div>
                                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full border border-gray-100 shadow-inner">
                                    <CheckIcon className="w-4 h-4 text-green-500" />
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">No Keywords</span>
                                </div>
                                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full border border-gray-100 shadow-inner">
                                    <CheckIcon className="w-4 h-4 text-green-500" />
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Studio Precision</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* The Workflow Section - Visual Proof of No Prompts */}
                <section className="py-20 px-4">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold text-[#1A1A1E] mb-3">The MagicPixa Workflow</h2>
                            <p className="text-lg text-[#5F6368] font-medium">Drop your assets, we do the engineering.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                            {/* Connection Lines (Desktop Only) */}
                            <div className="hidden md:block absolute top-1/3 left-1/3 w-1/3 h-0.5 border-t-2 border-dashed border-indigo-100 -z-10"></div>
                            <div className="hidden md:block absolute top-1/3 right-1/3 w-1/3 h-0.5 border-t-2 border-dashed border-indigo-100 -z-10"></div>

                            {[
                                { step: "01", title: "Upload Asset", icon: <UploadTrayIcon className="w-10 h-10"/>, desc: "Drop your raw product photo or brand logo. Pixa Vision begins a forensic audit immediately." },
                                { step: "02", title: "Select Strategy", icon: <CursorClickIcon className="w-10 h-10"/>, desc: "Choose from pre-engineered visual archetypes (Luxury, Lifestyle, Tech). No text boxes involved." },
                                { step: "03", title: "Download 8K", icon: <SparklesIcon className="w-10 h-10"/>, desc: "Our engine renders a high-fidelity masterpiece with accurate lighting and shadows." }
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col items-center text-center group">
                                    <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl border border-gray-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform relative">
                                        <div className="absolute -top-2 -left-2 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-black shadow-lg">
                                            {item.step}
                                        </div>
                                        <div className="text-indigo-600">
                                            {item.icon}
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-[#1A1A1E] mb-3">{item.title}</h3>
                                    <p className="text-[#5F6368] text-sm leading-relaxed max-w-xs">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Comparison Section - The Moat */}
                <section className="py-24 px-4 bg-[#F6F7FA]">
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold text-[#1A1A1E] mb-3">Why Logic Beats Prompts</h2>
                            <p className="text-lg text-[#5F6368] font-medium">MagicPixa is an expert photographer, not a chat bot.</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8 items-stretch">
                            {/* Traditional AI */}
                            <div className="bg-white p-10 rounded-[2.5rem] border border-gray-200 shadow-sm opacity-60">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="p-2 bg-red-50 text-red-500 rounded-lg"><XIcon className="w-5 h-5"/></div>
                                    <h4 className="font-black text-xs uppercase tracking-widest text-red-700">Traditional AI Tools</h4>
                                </div>
                                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-6 font-mono text-[11px] text-gray-400 leading-relaxed italic">
                                    "Hyper-realistic 8k studio lighting, cinematic shadows, bokeh background, marble table, high-end commercial photography, intricate details, phase one camera, lens flare, award winning..."
                                </div>
                                <p className="text-sm text-gray-500 font-medium">Requires you to learn technical terminology and spend hours "prompting" until it looks right.</p>
                            </div>

                            {/* MagicPixa Way */}
                            <div className="bg-white p-10 rounded-[2.5rem] border-2 border-indigo-600 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-lg"><SparklesIcon className="w-5 h-5"/></div>
                                        <h4 className="font-black text-xs uppercase tracking-widest text-indigo-600">The MagicPixa Way</h4>
                                    </div>
                                    <div className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-full">Intelligent</div>
                                </div>
                                <div className="flex justify-center py-6 mb-6">
                                    <button className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl flex items-center gap-3">
                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                        LUXURY MODE
                                    </button>
                                </div>
                                <p className="text-sm text-gray-700 font-bold leading-relaxed">Pixa Vision audits your product's physics and material to apply the perfect rig automatically.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* What Is MagicPixa - Feature Cards matching Home */}
                <section className="py-20 px-4 bg-white">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold text-[#1A1A1E] mb-3">Pixa Vision Capabilities</h2>
                            <p className="text-lg text-[#5F6368] font-medium">One-click production for every industry.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[
                                { title: "Visual Cataloging", icon: <PixaProductIcon className="w-10 h-10"/>, text: "Convert raw mobile photos into catalog-ready assets without ever typing a scene description." },
                                { title: "Ad Archetypes", icon: <MagicAdsIcon className="w-10 h-10"/>, text: "Pre-engineered marketing blueprints that identify your industry and apply the winning visual formula." },
                                { title: "Identity Locking", icon: <ShieldCheckIcon className="w-10 h-10"/>, text: "Pixa locks onto your product's labels and geometry. It creates a studio environment around the item, never changing it." },
                                { title: "Creative Sourcing", icon: <BrandKitIcon className="w-10 h-10"/>, text: "Design your brand kit once. Pixa applies your colors and tone to every generation automatically." },
                                { title: "Social Domination", icon: <ThumbnailIcon className="w-10 h-10"/>, text: "High-CTR thumbnails and viral captions engineered for organic reach, using 2025 trend research." }
                            ].map((item, i) => (
                                <div key={i} className="bg-[#F6F7FA] p-8 rounded-2xl shadow-sm border border-gray-200/80 hover:shadow-md transition-all group">
                                    <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm">
                                        {item.icon}
                                    </div>
                                    <h3 className="text-xl font-bold text-[#1A1A1E] mb-3">{item.title}</h3>
                                    <p className="text-[#5F6368] text-sm leading-relaxed font-medium">{item.text}</p>
                                </div>
                            ))}
                            {/* Final Speed Block - Darker Gradient Blue to Purple */}
                            <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 p-8 rounded-2xl shadow-xl border-none flex flex-col justify-center text-white relative overflow-hidden group hover:shadow-2xl transition-all">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                                <LightningIcon className="w-10 h-10 text-[#F9D230] mb-4" />
                                <h3 className="text-xl font-bold mb-2">Cognitive Speed</h3>
                                <p className="text-blue-100 text-sm leading-relaxed font-medium">MagicPixa saves brain power. Stop thinking about prompts and start focusing on growth.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Who Built MagicPixa - Studio Section */}
                <section className="py-24 px-4 bg-[#F6F7FA]">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex flex-col md:flex-row items-center gap-12">
                            <div className="md:w-1/2">
                                <div className="inline-flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-lg mb-6">
                                    <BuildingIcon className="w-4 h-4 text-indigo-600" />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">The Studio Background</span>
                                </div>
                                <h2 className="text-3xl font-bold text-[#1A1A1E] mb-6 tracking-tight">Who Built MagicPixa?</h2>
                                <p className="text-[#5F6368] font-medium leading-relaxed mb-6 text-lg">
                                    MagicPixa is built and owned by <span className="text-indigo-600 font-bold">Magic Peacock Studios</span>, a creative studio and media production company known for storytelling, design, and digital marketing.
                                </p>
                                <p className="text-[#5F6368] font-medium leading-relaxed mb-6">
                                    Working with brands, creators, real estate companies, architects and businesses across India, Magic Peacock Studios created MagicPixa to solve a simple problem:
                                </p>
                                <div className="bg-white p-6 rounded-2xl border-l-4 border-[#F9D230] shadow-sm">
                                    <p className="text-[#1A1A1E] font-bold italic text-lg leading-relaxed">
                                        "Most businesses need constant content — but design, editing and production are expensive, slow and complicated."
                                    </p>
                                </div>
                            </div>
                            <div className="md:w-1/2 w-full">
                                <div className="bg-white p-10 rounded-[3rem] border border-gray-200 flex flex-col items-center text-center shadow-lg">
                                    <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-gray-200/50">
                                        <BuildingIcon className="w-10 h-10 text-indigo-600" />
                                    </div>
                                    <h4 className="text-xl font-bold text-[#1A1A1E] mb-2 uppercase tracking-tight">Magic Peacock Studios</h4>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-6">India's Leading Production House</p>
                                    <div className="w-full space-y-4">
                                        {['Branding & Identity', 'Advertising Visuals', 'Video Production', 'Content Strategy'].map(service => (
                                            <div key={service} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                                                <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                                                    <CheckIcon className="w-3 h-3 text-indigo-600" />
                                                </div>
                                                <span className="text-sm font-bold text-gray-700">{service}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Mission & Vision - Two Columns */}
                <section className="py-24 px-4 bg-white">
                    <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12">
                        <div className="bg-[#F6F7FA] p-10 rounded-3xl shadow-sm border border-gray-200/80 space-y-6">
                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                                <FlagIcon className="w-7 h-7" />
                            </div>
                            <h2 className="text-3xl font-bold text-[#1A1A1E]">Our Mission</h2>
                            <p className="text-[#5F6368] font-medium text-lg leading-relaxed">
                                To make powerful creative tools available to <span className="text-indigo-600 font-bold">every business, creator and entrepreneur</span> — so they can build their brand, tell their story, and grow online without limitations.
                            </p>
                            <p className="text-[#5F6368] font-medium">
                                We believe creativity should not be restricted by budget, skills or time. MagicPixa exists to <span className="font-bold text-[#1A1A1E]">remove those barriers.</span>
                            </p>
                        </div>
                        <div className="bg-[#F6F7FA] p-10 rounded-3xl shadow-sm border border-gray-200/80 space-y-6">
                            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                                <ShieldCheckIcon className="w-7 h-7" />
                            </div>
                            <h2 className="text-3xl font-bold text-[#1A1A1E]">Our Vision</h2>
                            <p className="text-[#5F6368] font-medium text-lg leading-relaxed">
                                To become the most trusted AI creative platform for content creation, branding and marketing — <span className="text-emerald-600 font-bold">empowering millions of people</span> to build strong digital identities and successful online businesses.
                            </p>
                            <p className="text-[#5F6368] font-medium">
                                We envision a world where anyone can <span className="font-bold text-[#1A1A1E]">create, market and scale</span> their brand with confidence.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Why Section - The Team Replacement */}
                <section className="py-24 px-4 bg-white">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <div>
                                <h2 className="text-4xl font-bold text-[#1A1A1E] mb-6 tracking-tight">Why MagicPixa Exists</h2>
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

                {/* Final CTA - Matching Home Style */}
                <section className="py-32 px-4 text-center bg-[#F6F7FA] border-t border-gray-200/50">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-4xl md:text-5xl font-bold text-[#1A1A1E] mb-6 leading-tight tracking-tight">
                            Built for speed. For growth. For impact.
                        </h2>
                        <p className="text-lg text-[#5F6368] mb-12 font-medium">Ready to transform your creative workflow?</p>
                        <button 
                            onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()}
                            className="bg-[#F9D230] text-[#1A1A1E] font-bold py-5 px-12 rounded-2xl hover:bg-[#dfbc2b] transition-all shadow-xl shadow-yellow-500/30 hover:scale-105 active:scale-95 text-lg flex items-center gap-3 mx-auto"
                        >
                            Start Creating Now
                            <ArrowRightIcon className="w-6 h-6" />
                        </button>
                        <p className="text-sm text-gray-500 mt-6 font-medium">Get 50 free credits on sign up!</p>
                    </div>
                </section>
            </main>
            
            <Footer navigateTo={navigateTo} />
        </div>
    );
};

export default AboutUsPage;
