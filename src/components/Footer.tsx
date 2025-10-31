import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer className="bg-slate-50 dark:bg-black border-t border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        Magic<span className="text-blue-600 dark:text-blue-400">Pixa</span>
                    </h1>
                    <p className="mt-4 text-sm">Your all-in-one AI studio for instant image creation and enhancement.</p>
                </div>
                <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white tracking-wider">Quick Links</h3>
                    <ul className="mt-4 space-y-2">
                        <li><a href="#features" className="text-sm hover:text-slate-900 dark:hover:text-white transition-colors">Features</a></li>
                        <li><a href="#pricing" className="text-sm hover:text-slate-900 dark:hover:text-white transition-colors">Pricing</a></li>
                        <li><a href="#" className="text-sm hover:text-slate-900 dark:hover:text-white transition-colors">Dashboard</a></li>
                        <li><a href="#" className="text-sm hover:text-slate-900 dark:hover:text-white transition-colors">Help Center</a></li>
                        <li><a href="#" className="text-sm hover:text-slate-900 dark:hover:text-white transition-colors">Contact</a></li>
                    </ul>
                </div>
                 <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white tracking-wider">Legal</h3>
                    <ul className="mt-4 space-y-2">
                        <li><a href="#" className="text-sm hover:text-slate-900 dark:hover:text-white transition-colors">Privacy Policy</a></li>
                        <li><a href="#" className="text-sm hover:text-slate-900 dark:hover:text-white transition-colors">Terms of Service</a></li>
                    </ul>
                </div>
                 <div>
                     <h3 className="font-semibold text-slate-900 dark:text-white tracking-wider">Connect</h3>
                     <p className="mt-4 text-sm">Social media links coming soon.</p>
                </div>
            </div>
            <div className="mt-12 border-t border-slate-200 dark:border-slate-800 pt-8 text-center text-sm">
                <p>&copy; {new Date().getFullYear()} MagicPixa. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;