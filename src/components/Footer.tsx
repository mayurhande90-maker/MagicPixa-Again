import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer className="bg-[#F9FAFB] text-[#5F6368] py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto text-center border-t border-gray-200/80 pt-8">
                <p className="text-sm">&copy; {new Date().getFullYear()} MagicPixa. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;