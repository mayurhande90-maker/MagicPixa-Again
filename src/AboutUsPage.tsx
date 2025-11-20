import React from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import { Page, View, AuthProps } from './types';

interface AboutUsPageProps {
    navigateTo: (page: Page, view?: View, sectionId?: string) => void;
    auth: AuthProps;
}

const AboutUsPage: React.FC<AboutUsPageProps> = ({ navigateTo, auth }) => {
    return (
        <div className="min-h-screen bg-white flex flex-col">
            <Header navigateTo={navigateTo} auth={auth} />
            <main className="flex-grow">
                {/* Hero Section */}
                <div className="py-20 px-4 bg-[#F6F7FA]">
                    <div className="max-w-4xl mx-auto text-center">
                        <h1 className="text-4xl md:text-5xl font-bold text-[#1A1A1E] mb-6">About MagicPixa</h1>
                        <p className="text-xl text-[#5F6368] max-w-2xl mx-auto">
                            Revolutionizing visual content creation with the power of Artificial Intelligence.
                        </p>
                    </div>
                </div>

                {/* Mission Section */}
                <div className="py-20 px-4">
                     <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold text-[#1A1A1E] mb-6">Our Mission</h2>
                            <p className="text-lg text-[#5F6368] leading-relaxed">
                            At MagicPixa, we believe that creativity should be accessible to everyone. Our mission is to empower individuals and businesses with powerful, intuitive AI tools that make professional-quality visual content creation as simple as a single click. We're dedicated to pushing the boundaries of what's possible, so you can focus on what matters most: bringing your ideas to life.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-[#1A1A1E]">Innovation First</h3>
                                <p className="text-[#5F6368]">We constantly leverage the latest advancements in Generative AI to bring you tools that were previously impossible, ensuring you always have the cutting edge at your fingertips.</p>
                            </div>
                            <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-[#1A1A1E]">Simplicity Core</h3>
                                <p className="text-[#5F6368]">Complex technology shouldn't mean complex user experience. We hide the math and show you the magic, creating interfaces that just work.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Team / Values Section */}
                <div className="py-20 px-4 bg-[#1A1A1E] text-white">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-3xl font-bold mb-6">Built for Creators</h2>
                        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
                            Whether you are an e-commerce owner, a social media influencer, or just someone who loves beautiful images, MagicPixa is built to help you stand out.
                        </p>
                        <button onClick={() => navigateTo('home', undefined, 'features')} className="bg-[#F9D230] text-[#1A1A1E] font-bold py-3 px-8 rounded-xl hover:bg-[#dfbc2b] transition-colors">
                            Explore Features
                        </button>
                    </div>
                </div>
            </main>
            <Footer navigateTo={navigateTo} />
        </div>
    );
};

export default AboutUsPage;