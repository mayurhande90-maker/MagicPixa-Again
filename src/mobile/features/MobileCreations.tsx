
import React, { useState, useEffect } from 'react';
import { AuthProps, Creation } from '../../types';
import { ProjectsIcon, InformationCircleIcon, DownloadIcon } from '../../components/icons';
import { getCreations } from '../../firebase';
import { downloadImage } from '../../utils/imageUtils';

export const MobileCreations: React.FC<{ auth: AuthProps }> = ({ auth }) => {
    const [creations, setCreations] = useState<Creation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (auth.user) {
            loadCreations();
        }
    }, [auth.user]);

    const loadCreations = async () => {
        if (!auth.user) return;
        setLoading(true);
        try {
            const data = await getCreations(auth.user.uid);
            setCreations(data as Creation[]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 h-full flex flex-col animate-fadeIn">
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">My Creations</h1>
                    <div className="mt-2 flex items-center gap-2 text-[9px] text-amber-600 font-black uppercase bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100 w-fit">
                        <InformationCircleIcon className="w-3 h-3" />
                        <span>15-Day Auto-Cleanup</span>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : creations.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 pb-10">
                    {creations.map((c) => (
                        <div key={c.id} className="group relative aspect-square bg-gray-50 rounded-2xl overflow-hidden shadow-sm border border-gray-100 active:scale-95 transition-transform">
                            <img src={c.imageUrl} className="w-full h-full object-cover" loading="lazy" />
                            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                                <p className="text-[8px] font-black text-white/80 uppercase truncate">{c.feature}</p>
                            </div>
                            <button 
                                onClick={() => downloadImage(c.imageUrl, 'pixa-creation.png')}
                                className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm text-gray-700"
                            >
                                <DownloadIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                    <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-4">
                        <ProjectsIcon className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Your lab is empty</h3>
                    <p className="text-sm font-medium text-gray-500 mt-1 max-w-[200px]">Start creating in the Studio to populate your gallery.</p>
                </div>
            )}
        </div>
    );
};
