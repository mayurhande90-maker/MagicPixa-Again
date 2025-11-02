import React from 'react';
import { MagicPixaLogo } from './icons';

const Footer: React.FC = () => {
    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <footer className="bg-white text-[#5F6368] py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-8 text-center md:text-left">
                    <div className="flex-shrink-0">
                        <MagicPixaLogo className="justify-center md:justify-start" />
                        <p className="mt-2 text-sm">Create, No Prompt Required.</p>
                    </div>
                    <div className="flex gap-12">
                        <div className="flex flex-col gap-4 items-start">
                            <button onClick={() => scrollToSection('home')} className="text-sm font-semibold text-[#5F6368] hover:text-[#1E1E1E] transition-colors">Home</button>
                            <button onClick={() => scrollToSection('features')} className="text-sm font-semibold text-[#5F6368] hover:text-[#1E1E1E] transition-colors">Features</button>
                        </div>
                        <div className="flex flex-col gap-4 items-start">
                            <button onClick={() => scrollToSection('pricing')} className="text-sm font-semibold text-[#5F6368] hover:text-[#1E1E1E] transition-colors">Pricing</button>
                            <button onClick={() => scrollToSection('about')} className="text-sm font-semibold text-[#5F6368] hover:text-[#1E1E1E] transition-colors">About Us</button>
                        </div>
                    </div>
                </div>
                 <div className="mt-12 border-t border-gray-200/80 pt-8 text-center text-sm">
                    <p>&copy; {new Date().getFullYear()} MagicPixa. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
// Minor change for commit.