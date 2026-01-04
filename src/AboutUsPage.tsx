import React from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import { Page, View, AuthProps } from './types';
import { 
    SparklesIcon, 
    CheckIcon, 
    StarIcon, 
    ThumbnailIcon, 
    PixaProductIcon, 
    PixaCaptionIcon, 
    PaletteIcon, 
    BuildingIcon,
    ArrowRightIcon,
    ShieldCheckIcon,
    LightningIcon,
    UsersIcon,
    ClockIcon,
    CreditCoinIcon,
    FlagIcon
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
                {/* Hero Section */}
                <section className="py-24 px-4 bg-[#F6F7FA] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] -mr-48 -mt-48"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] -ml-48 -mb-48"></div>
                    
                    <div className="max-w-4xl mx-auto text-center relative z-10">
                        <div className="inline-flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-full mb-8 shadow-sm">
                            <SparklesIcon className="w-4 h-4 text-indigo-600" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">The Creative Standard</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-[#1A1A1E] mb-8 tracking-tighter leading-tight">
                            About <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">MagicPixa</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-[#5F6368] max-w-3xl mx-auto leading-relaxed font-medium">
                            MagicPixa is an AI-powered creative platform built for people who need stunning designs, videos, content and visuals — <span className="text-[#1A1A1E] font-bold">without spending hours, hiring multiple freelancers, or learning complicated software.</span>
                        </p>
                    </div>
                </section>

                {/* All-in-One Engine Section */}
                <section className="py-24 px-4 bg-white">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-black text-[#1A1A1E] mb-4">What Is MagicPixa?</h2>
                            <p className="text-[#5F6368] font-medium text-lg">Your all-in-one AI design and content engine.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[
                                { title: "YouTube & Social", icon: <ThumbnailIcon className="w-10 h-10"/>, color: "orange", text: "Generate high-CTR thumbnails and banners instantly." },
                                { title: "Professional Shots", icon: <PixaProductIcon className="w-10 h-10"/>, color: "blue", text: "Produce studio-quality visuals for products and brands." },
                                { title: "Viral Copywriting", icon: <PixaCaptionIcon className="w-10 h-10"/>, color: "indigo", text: "Generate reels ideas, scripts, captions and ad copies." },
                                { title: "Marketing Kits", icon: <BuildingIcon className="w-10 h-10"/>, color: "purple", text: "Create posters, banners, and full promotional creatives." },
                                { title: "Brand Identity", icon: <PaletteIcon className="w-10 h-10"/>, color: "pink", text: "Design brand visuals without any design or editing skills." },
                                { title: "High Speed", icon: <LightningIcon className="w-10 h-10"/>, color: "yellow", text: "Designed for speed, simplicity and professional results." }
                            ].map((item, i) => (
                                <div key={i} className="p-8 bg-[#F8FAFC] rounded-[2rem] border border-gray-100 hover:border-indigo-200 transition-all group">
                                    <div className={`w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform`}>
                                        {item.icon}
                                    </div>
                                    <h3 className="text-xl font-bold text-[#1A1A1E] mb-3">{item.title}</h3>
                                    <p className="text-[#5F6368] font-medium text-sm leading-relaxed">{item.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Studio Section */}
                <section className="py-24 px-4 bg-[#F8FAFC]">
                    <div className="max-w-5xl mx-auto">
                        <div className="bg-white p-10 md:p-16 rounded-[3rem] shadow-xl border border-gray-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                            
                            <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
                                <div>
                                    <h2 className="text-3xl font-black text-[#1A1A1E] mb-6">Who Built MagicPixa?</h2>
                                    <p className="text-gray-600 font-medium leading-relaxed mb-6">
                                        MagicPixa is built and owned by <span className="text-indigo-600 font-bold">Magic Peacock Studios</span>, a creative studio and media production company working with brands, creators, and businesses across India.
                                    </p>
                                    <p className="text-gray-600 font-medium leading-relaxed">
                                        With years of experience in branding and content strategy, we created MagicPixa to solve a simple problem: <span className="text-[#1A1A1E] font-bold italic">professional production is often too expensive, slow, and complicated.</span> We've made it accessible to everyone.
                                    </p>
                                </div>
                                <div className="bg-[#F6F7FA] p-8 rounded-[2rem] border border-indigo-50">
                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-6 shadow-sm">
                                        <BuildingIcon className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <h4 className="text-lg font-black text-[#1A1A1E] mb-2 uppercase tracking-tight">Magic Peacock Studios</h4>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-4">Production • Design • Digital Marketing</p>
                                    <div className="h-px bg-gray-200 w-12 mb-4"></div>
                                    <p className="text-sm text-gray-600 italic">"Making professional creative production accessible to everyone."</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Mission & Vision */}
                <section className="py-24 px-4 bg-white">
                    <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12">
                        <div className="space-y-6">
                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                                <FlagIcon className="w-7 h-7" />
                            </div>
                            <h2 className="text-3xl font-black text-[#1A1A1E]">Our Mission</h2>
                            <p className="text-gray-600 font-medium text-lg leading-relaxed">
                                To make powerful creative tools available to <span className="text-indigo-600 font-bold">every business, creator and entrepreneur</span> — so they can build their brand, tell their story, and grow online without limitations.
                            </p>
                        </div>
                        <div className="space-y-6">
                            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                                <ShieldCheckIcon className="w-7 h-7" />
                            </div>
                            <h2 className="text-3xl font-black text-[#1A1A1E]">Our Vision</h2>
                            <p className="text-gray-600 font-medium text-lg leading-relaxed">
                                To become the most trusted AI creative platform for content creation, branding and marketing — <span className="text-emerald-600 font-bold">empowering millions of people</span> to build strong digital identities and successful businesses.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Why Section */}
                <section className="py-24 px-4 bg-[#1A1A1E] text-white">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <div>
                                <h2 className="text-4xl font-black mb-8 tracking-tight">Why MagicPixa Exists</h2>
                                <p className="text-gray-400 text-lg font-medium mb-12">
                                    Traditional content creation requires an entire team. MagicPixa replaces the heavy lifting with a single intelligent platform.
                                </p>
                                
                                <div className="space-y-4">
                                    {['Designers', 'Editors', 'Copywriters', 'Social Media Managers', 'Marketing Agencies'].map((role, i) => (
                                        <div key={i} className="flex items-center gap-4 group">
                                            <div className="w-6 h-6 rounded-full border border-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-500 group-hover:bg-red-500 group-hover:border-red-500 group-hover:text-white transition-all">{i+1}</div>
                                            <span className="text-lg font-bold text-gray-300 group-hover:text-white transition-colors line-through decoration-gray-600">{role}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                {[
                                    { title: "Saves Time", icon: <ClockIcon className="w-6 h-6"/>, desc: "Go from idea to finished asset in under 60 seconds." },
                                    { title: "Saves Cost", icon: <CreditCoinIcon className="w-6 h-6"/>, desc: "Eliminate expensive retainers and per-project freelancer fees." },
                                    { title: "Pro Output", icon: <CheckIcon className="w-6 h-6"/>, desc: "Consistent, agency-grade quality every single time." }
                                ].map((box, i) => (
                                    <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-[2rem] hover:bg-white/10 transition-colors">
                                        <div className="text-indigo-400 mb-4">{box.icon}</div>
                                        <h4 className="text-xl font-bold mb-2">{box.title}</h4>
                                        <p className="text-gray-400 font-medium text-sm">{box.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="py-32 px-4 text-center">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-4xl md:text-5xl font-black text-[#1A1A1E] mb-12 leading-tight tracking-tight">
                            Built for speed. <br/> For growth. For impact.
                        </h2>
                        <button 
                            onClick={() => auth.isAuthenticated ? navigateTo('dashboard') : auth.openAuthModal()}
                            className="bg-[#F9D230] text-[#1A1A1E] font-black py-5 px-12 rounded-[2rem] hover:bg-[#dfbc2b] transition-all shadow-2xl shadow-yellow-500/20 hover:scale-105 active:scale-95 text-lg flex items-center gap-3 mx-auto"
                        >
                            Start Creating Now
                            <ArrowRightIcon className="w-6 h-6" />
                        </button>
                    </div>
                </section>
            </main>
            
            <Footer navigateTo={navigateTo} />
        </div>
    );
};

export default AboutUsPage;