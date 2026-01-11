
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
    MenuIcon, LayoutGridIcon, TrashIcon, PlusIcon, PlusCircleIcon, PixaTogetherIcon, PixaEcommerceIcon, PixaInteriorIcon, PixaRestoreIcon
} from '../icons';
import { VaultStyles as styles } from '../../styles/admin/AdminVault.styles';
import { BeforeAfterSlider } from '../BeforeAfterSlider';

const LAB_FOLDERS = [
    { id: 'homepage_marquee', label: 'Homepage Marquee', icon: MenuIcon, color: 'bg-indigo-600', isCollection: true },
    { id: 'homepage_gallery', label: 'Transformation Grid Lab', icon: LayoutGridIcon, color: 'bg-blue-600', isSlotManager: true },
];

const GALLERY_SLOTS = [
    { id: 'studio', label: 'Product Shots', icon: PixaProductIcon, color: 'bg-indigo-500' },
    { id: 'headshot', label: 'Headshot Pro', icon: PixaHeadshotIcon, color: 'bg-rose-500' },
    { id: 'interior', label: 'Interior Design', icon: PixaInteriorIcon, color: 'bg-amber-500' },
    { id: 'brand_stylist', label: 'AdMaker', icon: MagicAdsIcon, color: 'bg-blue-500' },
    { id: 'apparel', label: 'Pixa TryOn', icon: PixaTryOnIcon, color: 'bg-pink-500' },
    { id: 'soul', label: 'Pixa Together', icon: PixaTogetherIcon, color: 'bg-purple-500' },
    { id: 'thumbnail_studio', label: 'Thumbnail Pro', icon: ThumbnailIcon, color: 'bg-orange-500' },
    { id: 'brand_kit', label: 'Ecommerce Kit', icon: PixaEcommerceIcon, color: 'bg-green-500' },
    { id: 'colour', label: 'Photo Restore', icon: PixaRestoreIcon, color: 'bg-slate-500' },
];

export const AdminLabManager: React.FC<{ auth: AuthProps }> = ({ auth }) => {
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [labConfig, setLabConfig] = useState<Record<string, { before: string, after: string }>>({});
    const [labCollections, setLabCollections] = useState<Record<string, any[] | Record<string, any>>>({});
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
            const currentItems = Array.isArray(labCollections[selectedFolderId]) ? (labCollections[selectedFolderId] as any[]) : [];
            const newItems = [...currentItems];

            for (const file of files) {
                const b64 = await fileToBase64(file);
                if (selectedFolderId === 'homepage_marquee') {
                    const url = await uploadLabAsset(auth.user.uid, `data:${b64.mimeType};base64,${b64.base64}`, selectedFolderId, 'item');
                    newItems.push({ id: Date.now().toString() + Math.random(), after: url, label: file.name.split('.')[0] });
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

    const handleUpdateSlotPair = async (slotId: string, type: 'before' | 'after', file: File) => {
        if (!auth.user) return;
        setUploading(`${slotId}-${type}`);
        try {
            const b64 = await fileToBase64(file);
            const url = await uploadLabAsset(auth.user.uid, `data:${b64.mimeType};base64,${b64.base64}`, 'homepage_gallery', `${slotId}_${type}`);
            
            const currentData = (labCollections['homepage_gallery'] as Record<string, any>) || {};
            const slotData = currentData[slotId] || {};
            
            const updatedData = {
                ...currentData,
                [slotId]: {
                    ...slotData,
                    [type]: url
                }
            };
            
            await updateLabCollection('homepage_gallery', updatedData);
        } catch (e) {
            alert("Update failed.");
        } finally {
            setUploading(null);
        }
    };

    const handleRemoveCollectionItem = async (itemId: string) => {
        if (!selectedFolderId) return;
        if (confirm("Delete this item from the homepage section?")) {
            const currentItems = Array.isArray(labCollections[selectedFolderId]) ? (labCollections[selectedFolderId] as any[]) : [];
            const updatedItems = currentItems.filter(item => item.id !== itemId);
            await updateLabCollection(selectedFolderId, updatedItems);
        }
    };

    const handleUpdateLabel = async (itemId: string, newLabel: string) => {
        if (!selectedFolderId) return;
        const currentItems = Array.isArray(labCollections[selectedFolderId]) ? (labCollections[selectedFolderId] as any[]) : [];
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
                        const f = folder as any;
                        const isCollection = f.isCollection;
                        const isSlotManager = f.isSlotManager;

                        let statusText = "Vault Active";
                        if (isCollection) {
                            const items = Array.isArray(labCollections[f.id]) ? (labCollections[f.id] as any[]).length : 0;
                            statusText = `${items} Items`;
                        } else if (isSlotManager) {
                            statusText = "9 Feature Slots";
                        }

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
                                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{statusText}</span>
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
    const isSlotManager = folder?.isSlotManager;

    return (
        <div className={styles.container}>
            <div className="mb-8">
                <button onClick={() => setSelectedFolderId(null)} className={styles.backBtn}>
                    <ArrowLeftIcon className="w-3 h-3" /> Back to Folders
                </button>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                    <folder.icon className="w-8 h-8" /> {folder.label}
                </h2>
            </div>

            {isSlotManager ? (
                <div className="space-y-8 animate-fadeIn">
                    <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
                        <div className="mb-8">
                            <h3 className="text-lg font-black text-gray-800 tracking-tight">3x3 Grid Feature Folders</h3>
                            <p className="text-xs text-gray-400 mt-1 font-medium">Manage the specific before/after pairs for each homepage feature category.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {GALLERY_SLOTS.map((slot) => {
                                const slotData = (labCollections['homepage_gallery'] as Record<string, any>)?.[slot.id] || {};
                                return (
                                    <div key={slot.id} className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 flex flex-col gap-5 group hover:border-indigo-200 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 ${slot.color} rounded-xl flex items-center justify-center text-white shadow-sm`}>
                                                <slot.icon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Feature Slot</p>
                                                <h4 className="text-sm font-black text-gray-800">{slot.label}</h4>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Before Slot */}
                                            <div 
                                                onClick={() => !uploading && document.getElementById(`upload-grid-${slot.id}-before`)?.click()}
                                                className={`relative aspect-square bg-white rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer transition-all ${slotData.before ? 'border-indigo-100' : 'border-gray-200 hover:border-indigo-300'}`}
                                            >
                                                {uploading === `${slot.id}-before` ? (
                                                    <div className="animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                                                ) : slotData.before ? (
                                                    <img src={slotData.before} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="text-center p-2"><CameraIcon className="w-5 h-5 text-gray-300 mx-auto mb-1"/><span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Raw Input</span></div>
                                                )}
                                                <input id={`upload-grid-${slot.id}-before`} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpdateSlotPair(slot.id, 'before', e.target.files[0])} />
                                            </div>

                                            {/* After Slot */}
                                            <div 
                                                onClick={() => !uploading && document.getElementById(`upload-grid-${slot.id}-after`)?.click()}
                                                className={`relative aspect-square bg-white rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer transition-all ${slotData.after ? 'border-indigo-100' : 'border-gray-200 hover:border-indigo-300'}`}
                                            >
                                                {uploading === `${slot.id}-after` ? (
                                                    <div className="animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                                                ) : slotData.after ? (
                                                    <img src={slotData.after} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="text-center p-2"><SparklesIcon className="w-5 h-5 text-indigo-300 mx-auto mb-1"/><span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">AI Result</span></div>
                                                )}
                                                <input id={`upload-grid-${slot.id}-after`} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpdateSlotPair(slot.id, 'after', e.target.files[0])} />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">
                                            <span className={slotData.before ? 'text-green-500' : ''}>{slotData.before ? '✓ Raw Set' : 'Awaiting Before'}</span>
                                            <span className={slotData.after ? 'text-indigo-500' : ''}>{slotData.after ? '✓ Result Set' : 'Awaiting After'}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : isCollection && (
                <div className="space-y-8 animate-fadeIn">
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
                            {(Array.isArray(labCollections[selectedFolderId]) ? (labCollections[selectedFolderId] as any[]) : []).map((item) => (
                                <div key={item.id} className="relative bg-gray-50 rounded-2xl border border-gray-100 p-4 group">
                                    <button 
                                        onClick={() => handleRemoveCollectionItem(item.id)}
                                        className="absolute top-2 right-2 p-1.5 bg-white shadow-sm rounded-lg text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all z-20"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>

                                    <div className="aspect-video bg-white rounded-xl border border-gray-100 overflow-hidden mb-3">
                                        <img src={item.after} className="w-full h-full object-cover" />
                                    </div>

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

                        {(Array.isArray(labCollections[selectedFolderId]) ? (labCollections[selectedFolderId] as any[]) : []).length === 0 && !uploading && (
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
