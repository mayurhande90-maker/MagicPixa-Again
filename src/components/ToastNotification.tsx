
import React, { useEffect, useState } from 'react';
import { CheckIcon, XIcon, InformationCircleIcon } from './icons';

interface ToastNotificationProps {
    message: string;
    type?: 'success' | 'error' | 'info';
    onClose: () => void;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ message, type = 'success', onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger enter animation
        setIsVisible(true);
        
        const timer = setTimeout(() => {
            setIsVisible(false);
            // Wait for exit animation to finish before unmounting
            setTimeout(onClose, 300);
        }, 3000);
        
        return () => clearTimeout(timer);
    }, [onClose]);

    const styles = {
        success: 'bg-white border-l-4 border-green-500 text-gray-800',
        error: 'bg-white border-l-4 border-red-500 text-gray-800',
        info: 'bg-white border-l-4 border-blue-500 text-gray-800'
    };

    const icons = {
        success: <div className="bg-green-100 p-1 rounded-full"><CheckIcon className="w-4 h-4 text-green-600" /></div>,
        error: <div className="bg-red-100 p-1 rounded-full"><XIcon className="w-4 h-4 text-red-600" /></div>,
        info: <div className="bg-blue-100 p-1 rounded-full"><InformationCircleIcon className="w-4 h-4 text-blue-600" /></div>
    };

    return (
        <div className={`fixed top-24 right-4 z-[200] flex items-center gap-3 px-5 py-4 rounded-lg shadow-xl border border-gray-100 transition-all duration-300 transform ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'} ${styles[type]}`}>
            {icons[type]}
            <span className="text-sm font-semibold">{message}</span>
            <button onClick={() => { setIsVisible(false); setTimeout(onClose, 300); }} className="ml-4 text-gray-400 hover:text-gray-600">
                <XIcon className="w-4 h-4" />
            </button>
        </div>
    );
};

export default ToastNotification;
