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
    MagicPixaLogo
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
                {/* Hero Section - Matching HomePage style */}
                <section className="text-center py-20 px-4">
                    <div className="relative max-w-5xl mx-auto bg-white p-8 sm:p-12 md:p-20 rounded-3xl shadow-sm border border-gray-200/80 overflow-hidden">
                        {/* Background Blobs matching Home */}
                        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl opacity-50"></div>
                        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-100/50 rounded-full blur-3xl opacity-50"></div>
                        
                        <div className="relative z-10 max-w-4xl mx-auto">
                            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 border border-transparent px-4 py-1.5 rounded-full mb-8 shadow-sm">
                                <SparklesIcon className="w-4 h-4 text-white" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white">About MagicPixa</span>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-bold text-[#1A1A1E] mb-6 leading-tight tracking-tight">
                                Create Stunning Visuals, <span className="text-[#4D7CFF]">Built for Speed.</span>
                            </h1>
                            <p className="text-lg md:text-xl text-[#5F6368] max-w-3xl mx-auto leading-relaxed font-medium">
                                MagicPixa is an AI-powered creative platform built for people who need stunning designs, videos, content and visuals — <span className="text-[#1A1A1E] font-bold underline decoration-[#F9D230] decoration-4 underline-offset-4">without spending hours, hiring multiple freelancers, or learning complicated software.</span>
                            </p>
                            <p className="mt-6 text-[#5F6368] text-base leading-relaxed">
                                MagicPixa helps creators, entrepreneurs, businesses, marketers, and agencies generate professional creative assets in minutes using artificial intelligence.
                            </p>
                        </div>
                    </div>
                </section>

                {/* What Is MagicPixa - Feature Cards matching Home */}
                <section className="py-20 px-4 bg-[#F6F7FA]">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold text-[#1A1A1E] mb-3">What Is MagicPixa?</h2>
                            <p className="text-lg text-[#5F6368] font-medium">Your all-in-one AI design and content engine.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[
                                { title: "YouTube & Social", icon: <ThumbnailIcon className="w-10 h-10"/>, text: "Generate high-CTR thumbnails for YouTube, Instagram and social media." },
                                { title: "Marketing Creatives", icon: <MagicAdsIcon className="w-10 h-10"/>, text: "Create posters, banners, and marketing creatives instantly." },
                                { title: "Viral Copywriting", icon: <PixaCaptionIcon className="w-10 h-10"/>, text: "Generate reels ideas, scripts, captions and ad copies." },
                                { title: "Brand Identity", icon: <BrandKitIcon className="w-10 h-10"/>, text: "Design brand visuals and promotional creatives without design skills." },
                                { title: "Studio Quality", icon: <PixaProductIcon className="w-10 h-10"/>, text: "Produce high-quality visuals for products without editing skills." }
                            ].map((item, i) => (
                                <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200/80 hover:shadow-md transition-all group">
                                    <div className="w-16 h-16 bg-[#F6F7FA] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
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
                                <h3 className="text-xl font-bold mb-2">Maximum Speed</h3>
                                <p className="text-blue-100 text-sm leading-relaxed font-medium">MagicPixa is designed for speed, simplicity and results — helping you publish faster, look professional, and grow online.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Who Built MagicPixa - Studio Section */}
                <section className="py-24 px-4 bg-white">
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
                                    Working with brands, creators, real estate companies, startups and businesses across India, Magic Peacock Studios created MagicPixa to solve a simple problem:
                                </p>
                                <div className="bg-[#F6F7FA] p-6 rounded-2xl border-l-4 border-[#F9D230]">
                                    <p className="text-[#1A1A1E] font-bold italic text-lg leading-relaxed">
                                        "Most businesses need constant content — but design, editing and production are expensive, slow and complicated."
                                    </p>
                                </div>
                            </div>
                            <div className="md:w-1/2 w-full">
                                <div className="bg-[#F6F7FA] p-10 rounded-[3rem] border border-gray-100 flex flex-col items-center text-center">
                                    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-gray-200/50">
                                        <BuildingIcon className="w-10 h-10 text-indigo-600" />
                                    </div>
                                    <h4 className="text-xl font-bold text-[#1A1A1E] mb-2 uppercase tracking-tight">Magic Peacock Studios</h4>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-6">India's Leading Production House</p>
                                    <div className="w-full space-y-4">
                                        {['Branding & Identity', 'Advertising Visuals', 'Video Production', 'Content Strategy'].map(service => (
                                            <div key={service} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200">
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
                <section className="py-24 px-4 bg-[#F6F7FA]">
                    <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12">
                        <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-200/80 space-y-6">
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
                        <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-200/80 space-y-6">
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