
import React, { useState, useEffect, useRef } from 'react';
import { AuthProps } from '../../types';
import { 
    subscribeToLabConfig, updateLabConfig, uploadLabAsset 
} from '../../firebase';
import { fileToBase64 } from '../../utils/imageUtils';
import { 
    PixaProductIcon, ThumbnailIcon, PixaRestoreIcon, MagicAdsIcon, PixaHeadshotIcon,
    // FIX: Added InformationCircleIcon to resolve "Cannot find name" error on line 157.
    ArrowLeftIcon, CloudUploadIcon, XIcon, CheckIcon, ImageIcon, CameraIcon, SparklesIcon, InformationCircleIcon
} from '../icons';
import { VaultStyles as styles } from '../../styles/admin/AdminVault.styles';
import { BeforeAfterSlider } from '../BeforeAfterSlider';

const LAB_FOLDERS = [
    { id: 'studio', label: 'Product Shots', icon: PixaProductIcon, color: 'bg-indigo-400' },
    { id: 'thumbnail_studio', label: 'Thumbnail Pro', icon: ThumbnailIcon, color: 'bg-orange-400' },
    { id: 'colour', label: 'Photo Restore', icon: PixaRestoreIcon, color: 'bg-purple-400' },
    { id: 'brand_stylist', label: 'AdMaker', icon: MagicAdsIcon, color: 'bg-blue-400' },
    { id: 'headshot', label: 'Headshot Pro', icon: PixaHeadshotIcon, color: 'bg-rose-400' },
];

export const AdminLabManager: React.FC<{ auth: AuthProps }> = ({ auth }) => {
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [labConfig, setLabConfig] = useState<Record<string, { before: string, after: string }>>({});
    const [uploading, setUploading] = useState<'before' | 'after' | null>(null);
    
    useEffect(() => {
        const unsubscribe = subscribeToLabConfig(setLabConfig);
        return () => unsubscribe();
    }, []);

    const handleUpload = async (type: 'before' | 'after', file: File) => {
        if (!selectedFolderId || !auth.user) return;
        setUploading(type);
        try {
            const b64 = await fileToBase64(file);
            const url = await uploadLabAsset(auth.user.uid, `data:${b64.mimeType};base64,${b64.base64}`, selectedFolderId, type);
            await updateLabConfig(selectedFolderId, { [type]: url });
        } catch (e) {
            alert("Upload failed.");
        } finally {
            setUploading(null);
        }
    };

    if (!selectedFolderId) {
        return (
            <div className={styles.container}>
                <div className="mb-10">
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Transformation Lab Manager</h2>
                    <p className="text-gray-500 mt-1 font-medium">Upload custom Before/After examples for the staging homepage.</p>
                </div>

                <div className={styles.folderGrid}>
                    {LAB_FOLDERS.map(folder => (
                        <div 
                            key={folder.id} 
                            onClick={() => setSelectedFolderId(folder.id)}
                            className={styles.folderCard}
                        >
                            <div className={`${styles.folderOrb} ${folder.color}`}></div>
                            <div className={styles.folderIconBox}>
                                <folder.icon className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className={styles.folderTitle}>{folder.label}</h3>
                                <div className="mt-2 flex justify-center gap-1.5">
                                    <div className={`w-2 h-2 rounded-full ${labConfig[folder.id]?.before ? 'bg-green-500' : 'bg-gray-200'}`} title="Before set"></div>
                                    <div className={`w-2 h-2 rounded-full ${labConfig[folder.id]?.after ? 'bg-green-500' : 'bg-gray-200'}`} title="After set"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const folder = LAB_FOLDERS.find(f => f.id === selectedFolderId)!;
    const currentAssets = labConfig[selectedFolderId] || { before: '', after: '' };

    return (
        <div className={styles.container}>
            <div className="mb-8">
                <button onClick={() => setSelectedFolderId(null)} className={styles.backBtn}>
                    <ArrowLeftIcon className="w-3 h-3" /> Back to Folders
                </button>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                    <folder.icon className="w-8 h-8" /> {folder.label} Lab
                </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-sm">
                        <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-6">Asset Production</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Before Upload */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Input (Before)</label>
                                <div 
                                    onClick={() => !uploading && document.getElementById('lab-before-input')?.click()}
                                    className={`relative aspect-square rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                                        currentAssets.before ? 'border-green-200 bg-green-50/10' : 'border-gray-200 bg-gray-50/50 hover:border-indigo-400'
                                    }`}
                                >
                                    {uploading === 'before' ? (
                                        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
                                    ) : currentAssets.before ? (
                                        <>
                                            <img src={currentAssets.before} className="w-full h-full object-cover rounded-[1.4rem]" alt="Before" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-[1.4rem] flex items-center justify-center">
                                                <div className="p-2 bg-white rounded-full text-indigo-600 shadow-xl"><CloudUploadIcon className="w-5 h-5"/></div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <CameraIcon className="w-8 h-8 text-gray-300 mb-2"/>
                                            <span className="text-xs font-bold text-gray-400">Upload Raw</span>
                                        </>
                                    )}
                                    <input id="lab-before-input" type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload('before', e.target.files[0])} />
                                </div>
                            </div>

                            {/* After Upload */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Output (After)</label>
                                <div 
                                    onClick={() => !uploading && document.getElementById('lab-after-input')?.click()}
                                    className={`relative aspect-square rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                                        currentAssets.after ? 'border-indigo-200 bg-indigo-50/10' : 'border-gray-200 bg-gray-50/50 hover:border-indigo-400'
                                    }`}
                                >
                                    {uploading === 'after' ? (
                                        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
                                    ) : currentAssets.after ? (
                                        <>
                                            <img src={currentAssets.after} className="w-full h-full object-cover rounded-[1.4rem]" alt="After" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-[1.4rem] flex items-center justify-center">
                                                <div className="p-2 bg-white rounded-full text-indigo-600 shadow-xl"><CloudUploadIcon className="w-5 h-5"/></div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <SparklesIcon className="w-8 h-8 text-gray-300 mb-2"/>
                                            <span className="text-xs font-bold text-gray-400">Upload Masterpiece</span>
                                        </>
                                    )}
                                    <input id="lab-after-input" type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload('after', e.target.files[0])} />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-gray-100 flex items-center gap-4 text-gray-400">
                             <InformationCircleIcon className="w-5 h-5 shrink-0"/>
                             <p className="text-[11px] font-medium leading-relaxed">Images are automatically resized for web performance. Changes are reflected on the staging homepage instantly for all users.</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-gray-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
                        <h3 className="text-white text-xs font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                             <CheckIcon className="w-4 h-4 text-green-500"/> Live Staging Preview
                        </h3>

                        {currentAssets.before && currentAssets.after ? (
                            <div className="max-w-md mx-auto scale-90 md:scale-100">
                                <BeforeAfterSlider 
                                    beforeImage={currentAssets.before}
                                    afterImage={currentAssets.after}
                                    beforeLabel="Raw Input"
                                    afterLabel="MagicPixa Output"
                                />
                            </div>
                        ) : (
                            <div className="h-64 flex flex-col items-center justify-center text-indigo-200/30 border-2 border-dashed border-white/10 rounded-[2rem]">
                                <ImageIcon className="w-12 h-12 mb-2"/>
                                <p className="text-xs font-bold uppercase tracking-widest">Awaiting Assets</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
