
import React, { useEffect, useState } from 'react';
import { CheckIcon, XIcon, InformationCircleIcon, LogoutIcon } from './icons';

interface ToastNotificationProps {
    message: string;
    type?: 'success' | 'error' | 'info' | 'logout';
    onClose: () => void;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ message, type = 'success', onClose }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimatingProgress, setIsAnimatingProgress] = useState(false);
    const DURATION = 3000;

    useEffect(() => {
        // Trigger enter animation (Spring/Bounce)
        // Small delay to ensure initial render happens before class change
        const enterTimer = setTimeout(() => {
            setIsVisible(true);
            setIsAnimatingProgress(true);
        }, 50);
        
        const exitTimer = setTimeout(() => {
            setIsVisible(false);
            // Wait for exit animation to finish before unmounting
            setTimeout(onClose, 500);
        }, DURATION);
        
        return () => {
            clearTimeout(enterTimer);
            clearTimeout(exitTimer);
        };
    }, [onClose]);

    const styles = {
        success: 'border-l-4 border-green-500 bg-white shadow-lg shadow-green-500/10',
        error: 'border-l-4 border-red-500 bg-white shadow-lg shadow-red-500/10',
        info: 'border-l-4 border-blue-500 bg-white shadow-lg shadow-blue-500/10',
        logout: 'border-l-4 border-red-500 bg-white shadow-lg shadow-red-500/10'
    };

    const iconStyles = {
        success: 'bg-green-100 text-green-600',
        error: 'bg-red-100 text-red-600',
        info: 'bg-blue-100 text-blue-600',
        logout: 'bg-red-100 text-red-600'
    };

    const icons = {
        success: <CheckIcon className="w-5 h-5" />,
        error: <XIcon className="w-5 h-5" />,
        info: <InformationCircleIcon className="w-5 h-5" />,
        logout: <LogoutIcon className="w-5 h-5" />
    };

    const progressColors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        logout: 'bg-red-500'
    };

    const getTitle = () => {
        if (type === 'logout') return 'Signed Out';
        if (type === 'success') return 'Success';
        if (type === 'error') return 'Error';
        return 'Notification';
    };

    return (
        <div 
            className={`fixed top-24 right-4 z-[200] flex flex-col min-w-[300px] rounded-xl overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${styles[type]} ${isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-90'}`}
        >
            <div className="flex items-start gap-4 px-5 py-4 pr-10 relative">
                <div className={`p-2 rounded-full flex-shrink-0 ${iconStyles[type]}`}>
                    {icons[type]}
                </div>
                <div className="flex flex-col pt-0.5">
                    <h4 className="text-sm font-bold text-gray-900">{getTitle()}</h4>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">{message}</p>
                </div>
                <button 
                    onClick={() => { setIsVisible(false); setTimeout(onClose, 300); }} 
                    className="absolute top-2 right-2 text-gray-300 hover:text-gray-500 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                    <XIcon className="w-4 h-4" />
                </button>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-1 bg-gray-100">
                <div 
                    className={`h-full ${progressColors[type]}`} 
                    style={{ 
                        width: isAnimatingProgress ? '0%' : '100%',
                        transition: `width ${DURATION}ms linear`
                    }}
                ></div>
            </div>
        </div>
    );
};

export default ToastNotification;
