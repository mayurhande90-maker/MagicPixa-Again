
import React from 'react';
import { XIcon } from '../icons';

interface AdminImageViewerProps {
    src: string;
    onClose: () => void;
}

export const AdminImageViewer: React.FC<AdminImageViewerProps> = ({ src, onClose }) => {
    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
            <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute -top-4 -right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100">
                    <XIcon className="w-6 h-6"/>
                </button>
                <img src={src} className="max-w-full max-h-full rounded-lg shadow-2xl" alt="Preview"/>
            </div>
        </div>
    );
};
