import React from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import { Page, View, AuthProps } from './types';
import { 
    SparklesIcon, 
    CheckIcon, 
    BuildingIcon,
    ArrowRightIcon,
    ShieldCheckIcon,
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
                {/* Hero Section - Matching HomePage style precisely */}
                <section className="text-center py-20 px-4">
                    <div className="relative max-w-5xl mx-auto bg-white p-8 sm:p-12 md:p-20 rounded-3xl shadow-sm border border-gray-200/80 overflow-hidden">
                        {/* The standard theme blobs */}
                        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl opacity-50"></div>
                        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-100/50 rounded-full blur-3xl opacity-50"></div>
                        
                        <div className="relative z-10 max-w-4xl mx-auto">
                            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 border border-transparent px-4 py-1.5 rounded-full mb-8 shadow-sm">
                                <SparklesIcon className="w-4 h-4 text-white" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white">The Zero-Prompt Standard</span>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-bold text-[#1A1A1E] mb-6 leading-tight tracking-tight">
                                Professional Visuals. <br/>
                                <span className="text-[#4D7CFF]">Zero Prompts Required.</span>
                            </h1>
                            <p className="text-lg md:text-xl text-[#5F6368] max-w-3xl mx-auto leading-relaxed font-medium">
                                While other AI tools force you to learn complex "Prompt Engineering," <span className="text-indigo-600 font-bold underline decoration-[#F9D230] decoration-4 underline-offset-4">MagicPixa uses Pixa Vision</span> to see your product and understand your needs instantly.
                            </p>
                            
                            <div className="mt-10 flex flex-wrap justify-center gap-4">
                                {['No Typing', 'No Keywords', 'Zero Learning Curve'].map((pill) => (
                                    <div key={pill} className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full border border-gray-100 shadow-inner">
                                        <CheckIcon className="w-3.5 h-3.5 text-green-500" />
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{pill}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Who Built MagicPixa - Studio Section matching theme */}
                <section className="py-24 px-4 bg-white">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex flex-col md:flex-row items-center gap-12">
                            <div className="md:w-1/2">
                                <div className="inline-flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-lg mb-6">
                                    <BuildingIcon className="w-4 h-4 text-indigo-600" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">The Studio Background</span>
                                </div>
                                <h2 className="text-3xl font-bold text-[#1A1A1E] mb-6 tracking-tight">Who Built MagicPixa?</h2>
                                <p className="text-[#5F6368] font-medium leading-relaxed mb-6 text-lg">
                                    MagicPixa is built and owned by <span className="text-indigo-600 font-bold">Magic Peacock Studios</span>, a creative studio and media production company known for storytelling, design, and digital marketing.
                                </p>
                                <p className="text-[#5F6368] font-medium leading-relaxed mb-6">
                                    Working with brands, creators, real estate companies, architects and businesses across India, Magic Peacock Studios created MagicPixa to solve a simple problem:
                                </p>
                                <div className="bg-[#F6F7FA] p-6 rounded-2xl border-l-4 border-[#F9D230] shadow-sm">
                                    <p className="text-[#1A1A1E] font-bold italic text-lg leading-relaxed">
                                        "Most businesses need constant content — but design, editing and production are expensive, slow and complicated."
                                    </p>
                                </div>
                            </div>
                            <div className="md:w-1/2 w-full">
                                <div className="bg-white p-10 rounded-[3rem] border border-gray-200 flex flex-col items-center text-center shadow-lg relative overflow-hidden">
                                    <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
                                    <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-gray-200/50 relative z-10">
                                        <BuildingIcon className="w-10 h-10 text-indigo-600" />
                                    </div>
                                    <h4 className="text-xl font-bold text-[#1A1A1E] mb-2 uppercase tracking-tight relative z-10">Magic Peacock Studios</h4>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-6 relative z-10">India's Leading Production House</p>
                                    <div className="w-full space-y-4 relative z-10">
                                        {['Branding & Identity', 'Advertising Visuals', 'Video Production', 'Content Strategy'].map(service => (
                                            <div key={service} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
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

                {/* Mission & Vision - Two Columns matching theme cards */}
                <section className="py-24 px-4 bg-[#F6F7FA]">
                    <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
                        <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-200/80 space-y-6">
                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm">
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
                            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm">
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

                {/* Final CTA - Precise Homepage matching */}
                <section className="py-32 px-4 text-center bg-white border-t border-gray-100">
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