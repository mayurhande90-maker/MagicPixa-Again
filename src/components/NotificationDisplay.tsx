
import React, { useEffect, useState } from 'react';
import { InformationCircleIcon, XIcon, CheckIcon, ShieldCheckIcon } from './icons';

interface NotificationDisplayProps {
    title?: string; // Added title prop
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    style?: 'banner' | 'pill' | 'toast' | 'modal';
    link?: string;
    onClose: () => void;
}

export const NotificationDisplay: React.FC<NotificationDisplayProps> = ({ 
    title,
    message, 
    type, 
    style = 'banner', 
    link, 
    onClose 
}) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger enter animation
        const timer = requestAnimationFrame(() => setIsVisible(true));
        return () => cancelAnimationFrame(timer);
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for exit animation
    };

    // Fallback title based on type if not provided
    const displayTitle = title || (type === 'info' ? 'Update' : type);

    // Theme Configuration
    const themes = {
        info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', iconColor: 'text-blue-600', Icon: InformationCircleIcon },
        success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', iconColor: 'text-green-600', Icon: CheckIcon },
        warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', iconColor: 'text-yellow-600', Icon: InformationCircleIcon },
        error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', iconColor: 'text-red-600', Icon: ShieldCheckIcon }
    };
    const theme = themes[type] || themes.info;

    // 1. BANNER (Top Bar - Standard)
    if (style === 'banner') {
        return (
            <div className={`w-full px-4 py-3 flex items-center justify-between text-sm font-medium z-[90] shadow-sm border-b transition-all duration-300 ${theme.bg} ${theme.border} ${theme.text}`}>
                <div className="flex items-center gap-3 mx-auto max-w-7xl w-full">
                    <theme.Icon className={`w-5 h-5 shrink-0 ${theme.iconColor}`} />
                    <span className="flex-1 text-center">
                        {title && <span className="font-bold mr-2 uppercase tracking-wide text-xs opacity-90">{title}:</span>}
                        {message}
                        {link && (
                            <a href={link} target="_blank" rel="noreferrer" className="ml-2 underline font-bold hover:opacity-80">
                                Learn More
                            </a>
                        )}
                    </span>
                </div>
                <button onClick={handleClose} className="p-1 hover:bg-black/5 rounded-full transition-colors ml-4">
                    <XIcon className="w-4 h-4" />
                </button>
            </div>
        );
    }

    // 2. PILL (Floating Dynamic Island)
    if (style === 'pill') {
        return (
            <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] transition-all duration-500 ease-out transform ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}>
                <div className="bg-white/90 backdrop-blur-md shadow-2xl border border-gray-200 rounded-full px-5 py-3 flex items-center gap-4 min-w-[320px] max-w-md">
                    <div className={`p-1.5 rounded-full ${theme.bg} ${theme.iconColor}`}>
                        <theme.Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-center">
                        {title && <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-0.5">{title}</p>}
                        <p className="text-sm font-medium text-gray-700 leading-tight">{message}</p>
                        {link && <a href={link} target="_blank" rel="noreferrer" className="text-xs text-blue-600 font-bold hover:underline block mt-1">View details</a>}
                    </div>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    // 3. TOAST (Bottom Right)
    if (style === 'toast') {
        return (
            <div className={`fixed bottom-8 right-8 z-[200] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-20 opacity-0'}`}>
                <div className={`bg-white shadow-xl border-l-4 rounded-r-xl p-4 flex items-start gap-3 max-w-sm ${theme.border.replace('border', 'border-l')}`}>
                    <theme.Icon className={`w-5 h-5 mt-0.5 ${theme.iconColor}`} />
                    <div>
                        <h4 className={`text-sm font-bold ${theme.text} ${!title ? 'capitalize' : ''}`}>{displayTitle}</h4>
                        <p className="text-sm text-gray-600 mt-1">{message}</p>
                        {link && <a href={link} target="_blank" rel="noreferrer" className="text-xs text-blue-600 font-bold hover:underline mt-2 block">Action →</a>}
                    </div>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 ml-2">
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    // 4. MODAL (Center Screen)
    if (style === 'modal') {
        return (
            <div className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
                <div className={`bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 text-center relative overflow-hidden transform transition-all duration-500 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
                    <div className={`absolute top-0 left-0 w-full h-2 ${theme.bg.replace('bg-', 'bg-').replace('50', '500')}`}></div>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${theme.bg} ${theme.iconColor}`}>
                        <theme.Icon className="w-8 h-8" />
                    </div>
                    <h3 className={`text-xl font-bold text-gray-900 mb-2 ${!title ? 'capitalize' : ''}`}>{displayTitle}</h3>
                    <p className="text-gray-600 mb-6 leading-relaxed">{message}</p>
                    
                    <div className="flex gap-3">
                        <button onClick={handleClose} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                            Dismiss
                        </button>
                        {link && (
                            <a href={link} target="_blank" rel="noreferrer" className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-colors flex items-center justify-center">
                                Open Link
                            </a>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return null;
};
