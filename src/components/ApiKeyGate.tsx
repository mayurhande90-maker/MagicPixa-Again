
import React, { useState, useEffect } from 'react';
import { MagicPixaLogo, ShieldCheckIcon, ArrowRightIcon } from './icons';

interface ApiKeyGateProps {
    children: React.ReactNode;
}

export const ApiKeyGate: React.FC<ApiKeyGateProps> = ({ children }) => {
    const [hasKey, setHasKey] = useState<boolean | null>(null);

    const checkKey = async () => {
        if (window.aistudio) {
            const selected = await window.aistudio.hasSelectedApiKey();
            // Verify that not only is a key selected, but the env var is actually populated
            const envKeyReady = !!process.env.API_KEY && process.env.API_KEY !== 'undefined';
            setHasKey(selected && envKeyReady);
        } else {
            // Fallback if not in the specialized environment (local dev)
            setHasKey(true);
        }
    };

    useEffect(() => {
        checkKey();
        
        // Listen for reset events from our services if a key becomes invalid or is found missing
        const handleReset = () => {
            console.warn("ApiKeyGate: Received reset event. Forcing key selection...");
            setHasKey(false);
        };

        window.addEventListener('pixa-reset-api-key', handleReset);
        
        // Polling as a safety net because injection of process.env.API_KEY 
        // can happen slightly after hasSelectedApiKey returns true.
        const interval = setInterval(() => {
            if (hasKey === false) {
                // If we are currently showing the gate, keep checking if a key appeared
                // (e.g. user selected one in the native dialog)
                checkKey();
            }
        }, 2000);

        return () => {
            window.removeEventListener('pixa-reset-api-key', handleReset);
            clearInterval(interval);
        };
    }, [hasKey]);

    const handleSelectKey = async () => {
        if (window.aistudio) {
            try {
                await window.aistudio.openSelectKey();
                // Assume success and proceed to attempt use
                setHasKey(true);
            } catch (e) {
                console.error("Key selection failed", e);
            }
        }
    };

    if (hasKey === null) return null; // Loading state

    if (!hasKey) {
        return (
            <div className="fixed inset-0 z-[999] bg-[#FFFFFF] flex items-center justify-center p-6">
                <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>
                
                <div className="relative max-w-md w-full bg-white rounded-[2.5rem] border border-gray-200 shadow-2xl p-10 text-center animate-fadeIn">
                    <div className="flex justify-center mb-8">
                        <MagicPixaLogo />
                    </div>

                    <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-indigo-100">
                        <ShieldCheckIcon className="w-10 h-10" />
                    </div>

                    <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Activate AI Intelligence</h2>
                    
                    <p className="text-gray-500 text-sm leading-relaxed mb-8">
                        To enable high-fidelity generation and strategic research (Gemini 3 Pro), you must select an API key from a paid Google Cloud project.
                    </p>

                    <div className="space-y-4">
                        <button 
                            onClick={handleSelectKey}
                            className="w-full bg-[#1A1A1E] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-black transition-all transform active:scale-95 shadow-xl shadow-gray-200"
                        >
                            Select API Key <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                        </button>

                        <a 
                            href="https://ai.google.dev/gemini-api/docs/billing" 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-block text-xs font-bold text-indigo-600 hover:underline"
                        >
                            Learn about Billing & Key setup
                        </a>
                    </div>
                    
                    <p className="mt-10 text-[10px] text-gray-400 font-medium uppercase tracking-widest">
                        MagicPixa Workspace • Powered by Gemini 3
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};
