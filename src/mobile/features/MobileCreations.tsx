
import React from 'react';
import { AuthProps } from '../../types';
import { ProjectsIcon, InformationCircleIcon } from '../../components/icons';

export const MobileCreations: React.FC<{ auth: AuthProps }> = ({ auth }) => {
    return (
        <div className="p-6 h-full flex flex-col animate-fadeIn">
            <div className="mb-6">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">My Creations</h1>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-amber-600 font-bold bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100 w-fit">
                    <InformationCircleIcon className="w-3.5 h-3.5" />
                    <span>Assets deleted after 15 days</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-4">
                    <ProjectsIcon className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Your lab is empty</h3>
                <p className="text-sm font-medium text-gray-500 mt-1 max-w-[200px]">Start creating to populate your gallery.</p>
            </div>
        </div>
    );
};
