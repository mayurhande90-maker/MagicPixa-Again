import React, { useState, useEffect, useRef } from 'react';
import { AuthProps } from '../../types';
import { 
    subscribeToLabConfig, updateLabConfig, uploadLabAsset, 
    subscribeToLabCollections, updateLabCollection 
} from '../../firebase';
import { fileToBase64 } from '../../utils/imageUtils';
import { 
    PixaProductIcon, ThumbnailIcon, MagicAdsIcon, PixaHeadshotIcon, PixaTryOnIcon,
    ArrowLeftIcon, CloudUploadIcon, XIcon, CheckIcon, ImageIcon, CameraIcon, SparklesIcon, InformationCircleIcon,
    MenuIcon, LayoutGridIcon, TrashIcon, PlusIcon, PlusCircleIcon
} from '../icons';
import { VaultStyles as styles } from '../../styles/admin/AdminVault.styles';
import { BeforeAfterSlider } from '../BeforeAfterSlider';

const LAB_FOLDERS = [
    { id: 'homepage_marquee', label: 'Homepage Marquee', icon: MenuIcon, color: 'bg-indigo-600', isCollection: true },
    { id: 'homepage_gallery', label: 'Transformation Grid', icon: LayoutGridIcon, color: 'bg-blue-600', isCollection: true },
    { type: 'divider' },
    { id: 'studio', label: 'Product Shots', icon: PixaProductIcon, color: 'bg-indigo-400' },
    { id: 'thumbnail_studio', label: 'Thumbnail Pro', icon: ThumbnailIcon, color: 'bg-orange-400' },
    { id: 'apparel', label: 'Pixa TryOn', icon: PixaTryOnIcon, color: 'bg-pink-400' },
    { id: 'brand_stylist', label: 'AdMaker', icon: MagicAdsIcon, color: 'bg-blue-400' },
    { id: 'headshot', label: 'Headshot Pro', icon: PixaHeadshotIcon, color: 'bg-rose-400' },
];

export const AdminLabManager: React.FC<{ auth: AuthProps }> = ({ auth }) => {
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [labConfig, setLabConfig] = useState<Record<string, { before: string, after: string }>>({});
    const [labCollections, setLabCollections] = useState<Record<string, any[]>>({});
    const [uploading, setUploading] = useState<string | null>(null);
    
    useEffect(() => {
        const unsubConfig = subscribeToLabConfig(setLabConfig);
        const unsubCollections = subscribeToLabCollections(setLabCollections);
        return () => {
            unsubConfig();
            unsubCollections();
        };
    }, []);

    const handleUpload = async (type: string, file: File) => {
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

    const handleAddCollectionItem = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedFolderId || !auth.user || !e.target.files) return;
        const files = Array.from(e.target.files);
        setUploading('collection');
        
        try {
            const currentItems = labCollections[selectedFolderId] || [];
            const newItems = [...currentItems];

            for (const file of files) {
                const b64 = await fileToBase64(file);
                if (selectedFolderId === 'homepage_marquee') {
                    // For Marquee, we only need the "After" image
                    const url = await uploadLabAsset(auth.user.uid, `data:${b64.mimeType};base64,${b64.base64}`, selectedFolderId, 'item');
                    newItems.push({ id: Date.now().toString() + Math.random(), after: url, label: file.name.split('.')[0] });
                } else if (selectedFolderId === 'homepage_gallery') {
                    // For Gallery, we need to prompt for Before/After or just use it as 'after' for now
                    // To keep it simple: use this as 'after' and set a placeholder for 'before'
                    const url = await uploadLabAsset(auth.user.uid, `data:${b64.mimeType};base64,${b64.base64}`, selectedFolderId, 'after');
                    newItems.push({ 
                        id: Date.now().toString() + Math.random(), 
                        after: url, 
                        before: url, // User will need to replace this or we add a specific UI for pairs
                        label: file.name.split('.')[0] 
                    });
                }
            }
            await updateLabCollection(selectedFolderId, newItems);
        } catch (e) {
            alert("Upload failed.");
        } finally {
            setUploading(null);
            e.target.value = '';
        }
    };

    const handleUpdateGalleryPair = async (itemId: string, type: 'before' | 'after', file: File) => {
        if (!selectedFolderId || !auth.user) return;
        setUploading(`${itemId}-${type}`);
        try {
            const b64 = await fileToBase64(file);
            const url = await uploadLabAsset(auth.user.uid, `data:${b64.mimeType};base64,${b64.base64}`, selectedFolderId, `${itemId}_${type}`);
            const currentItems = labCollections[selectedFolderId] || [];
            const updatedItems = currentItems.map(item => item.id === itemId ? { ...item, [type]: url } : item);
            await updateLabCollection(selectedFolderId, updatedItems);
        } catch (e) {
            alert("Update failed.");
        } finally {
            setUploading(null);
        }
    };

    const handleRemoveCollectionItem = async (itemId: string) => {
        if (!selectedFolderId) return;
        if (confirm("Delete this item from the homepage section?")) {
            const currentItems = labCollections[selectedFolderId] || [];
            const updatedItems = currentItems.filter(item => item.id !== itemId);
            await updateLabCollection(selectedFolderId, updatedItems);
        }
    };

    const handleUpdateLabel = async (itemId: string, newLabel: string) => {
        if (!selectedFolderId) return;
        const currentItems = labCollections[selectedFolderId] || [];
        const updatedItems = currentItems.map(item => item.id === itemId ? { ...item, label: newLabel } : item);
        await updateLabCollection(selectedFolderId, updatedItems);
    };

    if (!selectedFolderId) {
        return (
            <div className={styles.container}>
                <div className="mb-10">
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Transformation Lab Manager</h2>
                    <p className="text-gray-500 mt-1 font-medium">Manage the visual highlights and dynamic sections of the MagicPixa homepage.</p>
                </div>

                <div className={styles.folderGrid}>
                    {LAB_FOLDERS.map((folder, idx) => {
                        if ((folder as any).type === 'divider') return <div key={idx} className="col-span-full h-px bg-gray-100 my-4"></div>;
                        const f = folder as any;
                        const isCollection = f.isCollection;
                        const items = labCollections[f.id] || [];
                        const assets = labConfig[f.id];

                        return (
                            <div 
                                key={f.id} 
                                onClick={() => setSelectedFolderId(f.id)}
                                className={styles.folderCard}
                            >
                                <div className={`${styles.folderOrb} ${f.color}`}></div>
                                <div className={styles.folderIconBox}>
                                    <f.icon className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className={styles.folderTitle}>{f.label}</h3>
                                    <div className="mt-2 flex justify-center gap-1.5">
                                        {isCollection ? (
                                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{items.length} Items</span>
                                        ) : (
                                            <>
                                                <div className={`w-2 h-2 rounded-full ${assets?.before ? 'bg-green-500' : 'bg-gray-200'}`} title="Before set"></div>
                                                <div className={`w-2 h-2 rounded-full ${assets?.after ? 'bg-green-500' : 'bg-gray-200'}`} title="After set"></div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    const folder = LAB_FOLDERS.find(f => (f as any).id === selectedFolderId) as any;
    const isCollection = folder?.isCollection;
    const currentAssets = labConfig[selectedFolderId] || { before: '', after: '' };
    const collectionItems = labCollections[selectedFolderId] || [];

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

            {!isCollection ? (
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
                                                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 rounded-[1.4rem] flex items-center justify-center">
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
            ) : (
                <div className="space-y-8 animate-fadeIn">
                    {/* Collection Manager UI */}
                    <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-lg font-black text-gray-800 tracking-tight">Active Collection</h3>
                                <p className="text-xs text-gray-400 mt-1 font-medium">Manage multiple items for this homepage section.</p>
                            </div>
                            <button 
                                onClick={() => document.getElementById('collection-upload')?.click()}
                                disabled={uploading === 'collection'}
                                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-black transition-all shadow-lg flex items-center gap-2"
                            >
                                {uploading === 'collection' ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <PlusIcon className="w-4 h-4" />}
                                Add New Assets
                            </button>
                            <input id="collection-upload" type="file" multiple className="hidden" accept="image/*" onChange={handleAddCollectionItem} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {collectionItems.map((item) => (
                                <div key={item.id} className="relative bg-gray-50 rounded-2xl border border-gray-100 p-4 group">
                                    <button 
                                        onClick={() => handleRemoveCollectionItem(item.id)}
                                        className="absolute top-2 right-2 p-1.5 bg-white shadow-sm rounded-lg text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all z-20"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>

                                    {selectedFolderId === 'homepage_gallery' ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div 
                                                    onClick={() => !uploading && document.getElementById(`upload-${item.id}-before`)?.click()}
                                                    className="aspect-square bg-white rounded-xl border border-dashed border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-indigo-400"
                                                >
                                                    {uploading === `${item.id}-before` ? <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> : <img src={item.before} className="w-full h-full object-cover" />}
                                                    <input id={`upload-${item.id}-before`} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpdateGalleryPair(item.id, 'before', e.target.files[0])} />
                                                </div>
                                                <div 
                                                    onClick={() => !uploading && document.getElementById(`upload-${item.id}-after`)?.click()}
                                                    className="aspect-square bg-white rounded-xl border border-dashed border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-indigo-400"
                                                >
                                                    {uploading === `${item.id}-after` ? <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> : <img src={item.after} className="w-full h-full object-cover" />}
                                                    <input id={`upload-${item.id}-after`} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpdateGalleryPair(item.id, 'after', e.target.files[0])} />
                                                </div>
                                            </div>
                                            <div className="flex justify-between text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">
                                                <span>Before</span>
                                                <span>After</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="aspect-video bg-white rounded-xl border border-gray-100 overflow-hidden mb-3">
                                            <img src={item.after} className="w-full h-full object-cover" />
                                        </div>
                                    )}

                                    <div className="mt-3">
                                        <input 
                                            type="text" 
                                            value={item.label || ''} 
                                            onChange={(e) => handleUpdateLabel(item.id, e.target.value)}
                                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 outline-none focus:border-indigo-500"
                                            placeholder="Item Label (e.g. Luxury Vibe)"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {collectionItems.length === 0 && !uploading && (
                            <div className="py-20 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                <PlusCircleIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-sm font-bold text-gray-400">Empty Collection. Add some items to populate the homepage.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};