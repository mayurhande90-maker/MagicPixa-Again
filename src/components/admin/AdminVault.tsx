import React, { useState, useEffect, useRef } from 'react';
import { AuthProps, VaultReference, VaultFolderConfig } from '../../types';
import { 
    getVaultImages, uploadVaultImage, deleteVaultImage, 
    getVaultFolderConfig, updateVaultFolderConfig 
} from '../../firebase';
import { analyzeVaultDNA } from '../../services/adminService';
import { 
    ArrowLeftIcon, PlusIcon, TrashIcon, CloudUploadIcon, 
    MagicAdsIcon, PixaProductIcon, ThumbnailIcon, BuildingIcon, 
    PixaInteriorIcon, ApparelIcon, PixaTogetherIcon, MagicWandIcon,
    CheckIcon, SparklesIcon, InformationCircleIcon, ShieldCheckIcon,
    LightningIcon, CubeIcon
} from '../icons';
import { FoodIcon, SaaSRequestIcon, EcommerceAdIcon, FMCGIcon, RealtyAdIcon, EducationAdIcon, ServicesAdIcon } from '../icons/adMakerIcons';
import { VaultStyles as styles } from '../../styles/admin/AdminVault.styles';
import { fileToBase64 } from '../../utils/imageUtils';

const VAULT_FOLDERS = [
    { id: 'brand_stylist', label: 'Pixa AdMaker', icon: MagicAdsIcon, color: 'bg-blue-400', hasCategories: true },
    { id: 'studio', label: 'Pixa Product Shots', icon: PixaProductIcon, color: 'bg-indigo-400' },
    { id: 'thumbnail_studio', label: 'Thumbnail Pro', icon: ThumbnailIcon, color: 'bg-orange-400' },
    { id: 'brand_kit', label: 'Ecommerce Kit', icon: BuildingIcon, color: 'bg-green-400' },
    { id: 'realty', label: 'Realty Ads', icon: BuildingIcon, color: 'bg-purple-400' },
    { id: 'interior', label: 'Interior Design', icon: PixaInteriorIcon, color: 'bg-amber-400' },
    { id: 'soul', label: 'Pixa Together', icon: PixaTogetherIcon, color: 'bg-pink-400' },
    { id: 'apparel', label: 'Pixa TryOn', icon: ApparelIcon, color: 'bg-rose-400' },
    { id: 'mockup', label: 'Pixa Mockups', icon: MagicWandIcon, color: 'bg-teal-400' },
];

const ADMAKER_CATEGORIES = [
    { id: 'ecommerce', label: 'E-Commerce', icon: EcommerceAdIcon, color: 'bg-blue-400' },
    { id: 'fmcg', label: 'FMCG / CPG', icon: FMCGIcon, color: 'bg-green-400' },
    { id: 'fashion', label: 'Fashion', icon: ApparelIcon, color: 'bg-pink-400' },
    { id: 'realty', label: 'Real Estate', icon: BuildingIcon, color: 'bg-purple-400' },
    { id: 'food', label: 'Food & Dining', icon: FoodIcon, color: 'bg-orange-400' },
    { id: 'saas', label: 'SaaS / Tech', icon: SaaSRequestIcon, color: 'bg-teal-400' },
    { id: 'education', label: 'Education', icon: EducationAdIcon, color: 'bg-amber-400' },
    { id: 'services', label: 'Services', icon: ServicesAdIcon, color: 'bg-indigo-400' },
];

export const AdminVault: React.FC<{ auth: AuthProps }> = ({ auth }) => {
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [images, setImages] = useState<VaultReference[]>([]);
    const [config, setConfig] = useState<VaultFolderConfig | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [isSavingDNA, setIsSavingDNA] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (selectedFolder) {
            // If it has categories, we wait for category selection
            const folder = VAULT_FOLDERS.find(f => f.id === selectedFolder);
            if (folder?.hasCategories && !selectedCategory) {
                setImages([]);
                setConfig(null);
                return;
            }
            loadFolderData(selectedFolder, selectedCategory || undefined);
        }
    }, [selectedFolder, selectedCategory]);

    const loadFolderData = async (featureId: string, subCatId?: string) => {
        setLoading(true);
        try {
            const [refs, conf] = await Promise.all([
                getVaultImages(featureId, subCatId),
                getVaultFolderConfig(featureId, subCatId)
            ]);
            setImages(refs);
            setConfig(conf || { featureId: subCatId || featureId, dna: '', lastUpdated: null as any });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedFolder || !auth.user || !e.target.files) return;
        const files = Array.from(e.target.files);
        setUploading(true);
        try {
            for (const file of files) {
                const b64 = await fileToBase64(file);
                await uploadVaultImage(auth.user.uid, selectedFolder, `data:${b64.mimeType};base64,${b64.base64}`, selectedCategory || undefined);
            }
            await loadFolderData(selectedFolder, selectedCategory || undefined);
        } catch (e) {
            alert("Upload failed.");
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleDelete = async (imageId: string) => {
        if (!selectedFolder || !auth.user) return;
        if (confirm("Delete this reference image from the global vault?")) {
            await deleteVaultImage(auth.user.uid, selectedFolder, imageId, selectedCategory || undefined);
            setImages(prev => prev.filter(img => img.id !== imageId));
        }
    };

    const handleSaveDNA = async () => {
        if (!selectedFolder || !auth.user || !config) return;
        setIsSavingDNA(true);
        try {
            await updateVaultFolderConfig(auth.user.uid, selectedFolder, config.dna, selectedCategory || undefined);
            alert("Visual DNA saved.");
        } catch (e) {
            alert("Save failed.");
        } finally {
            setIsSavingDNA(false);
        }
    };

    const handleAutoAnalyze = async () => {
        if (images.length === 0) {
            alert("Upload some reference images first so Pixa can analyze them.");
            return;
        }
        
        let folderLabel = VAULT_FOLDERS.find(f => f.id === selectedFolder)?.label || 'Current Feature';
        if (selectedCategory) {
            const catLabel = ADMAKER_CATEGORIES.find(c => c.id === selectedCategory)?.label || 'Sub Category';
            folderLabel = `${folderLabel} (${catLabel})`;
        }
        
        setIsAnalyzing(true);
        try {
            const dnaReport = await analyzeVaultDNA(folderLabel, images.map(img => img.imageUrl));
            setConfig(prev => prev ? { ...prev, dna: dnaReport } : null);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (!selectedFolder) {
        return (
            <div className={styles.container}>
                <div className="mb-10">
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Global Style Vault</h2>
                    <p className="text-gray-500 mt-1 font-medium">Curate the master references that drive our signature AI aesthetic.</p>
                </div>

                <div className={styles.folderGrid}>
                    {VAULT_FOLDERS.map(folder => (
                        <div 
                            key={folder.id} 
                            onClick={() => setSelectedFolder(folder.id)}
                            className={styles.folderCard}
                        >
                            <div className={`${styles.folderOrb} ${folder.color}`}></div>
                            <div className={styles.folderIconBox}>
                                <folder.icon className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className={styles.folderTitle}>{folder.label}</h3>
                                <div className="mt-2 flex justify-center">
                                    <span className={styles.folderCount}>{folder.hasCategories ? 'Has Sub-Folders' : 'Vault Active'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // CATEGORY SELECTION VIEW for AdMaker
    if (selectedFolder === 'brand_stylist' && !selectedCategory) {
        return (
            <div className={styles.container}>
                <div className="mb-10">
                    <button onClick={() => setSelectedFolder(null)} className={styles.backBtn}>
                        <ArrowLeftIcon className="w-3 h-3" /> All Folders
                    </button>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">AdMaker Industry Vaults</h2>
                    <p className="text-gray-500 mt-1 font-medium">Categorize styles by industry to train specific AI logic.</p>
                </div>

                <div className={styles.folderGrid}>
                    {ADMAKER_CATEGORIES.map(cat => (
                        <div 
                            key={cat.id} 
                            onClick={() => setSelectedCategory(cat.id)}
                            className={styles.folderCard}
                        >
                            <div className={`${styles.folderOrb} ${cat.color}`}></div>
                            <div className={styles.folderIconBox}>
                                <cat.icon className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className={styles.folderTitle}>{cat.label}</h3>
                                <div className="mt-2 flex justify-center">
                                    <span className={styles.folderCount}>Manage Category</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const folderInfo = VAULT_FOLDERS.find(f => f.id === selectedFolder);
    const categoryInfo = selectedCategory ? ADMAKER_CATEGORIES.find(c => c.id === selectedCategory) : null;

    return (
        <div className={styles.container}>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <button onClick={() => selectedCategory ? setSelectedCategory(null) : setSelectedFolder(null)} className={styles.backBtn}>
                        <ArrowLeftIcon className="w-3 h-3" /> {selectedCategory ? `Back to AdMaker` : `All Folders`}
                    </button>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        {categoryInfo ? `${categoryInfo.label}` : folderInfo?.label} Vault
                    </h2>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-full px-4 py-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{images.length} References</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT: DNA CONTROL */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-sm h-full flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shadow-sm">
                                    <SparklesIcon className="w-5 h-5"/>
                                </div>
                                <h3 className="text-[11px] font-black text-gray-800 uppercase tracking-[0.2em]">{selectedCategory ? 'Industry DNA' : 'Visual DNA'}</h3>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleAutoAnalyze}
                                    disabled={isAnalyzing || images.length === 0}
                                    className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all disabled:opacity-50 flex items-center gap-2 border border-indigo-100"
                                    title="Pixa AI will scan images and write the DNA for you"
                                >
                                    {isAnalyzing ? (
                                        <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <LightningIcon className="w-3 h-3"/>
                                    )}
                                    {isAnalyzing ? 'Analyzing...' : 'Auto-DNA'}
                                </button>
                                <button 
                                    onClick={handleSaveDNA}
                                    disabled={isSavingDNA}
                                    className="bg-indigo-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                                >
                                    {isSavingDNA ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex-1 flex flex-col gap-4">
                            <p className="text-[10px] text-gray-400 font-medium leading-relaxed italic px-2">
                                <InformationCircleIcon className="w-3 h-3 inline mr-1" />
                                {selectedCategory 
                                    ? `These instructions define how the AI should render ads for the ${categoryInfo?.label} industry specifically.`
                                    : `These technical instructions define the signature "Pixa Look". Use Auto-DNA to let AI architect the rules.`
                                }
                            </p>
                            <div className="relative flex-1 group">
                                {isAnalyzing && (
                                    <div className="absolute inset-0 z-10 bg-black/5 rounded-3xl backdrop-blur-[2px] flex flex-col items-center justify-center animate-fadeIn">
                                        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] animate-pulse">Architecting Intelligence...</p>
                                    </div>
                                )}
                                <textarea 
                                    value={config?.dna || ''}
                                    onChange={e => setConfig(prev => prev ? { ...prev, dna: e.target.value } : null)}
                                    className={styles.dnaInput}
                                    placeholder="e.g. Always use high-contrast rim lighting. Prioritize desaturated backgrounds with sharp subject focus..."
                                />
                            </div>
                            <div className="mt-auto pt-6 border-t border-gray-100 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                                    <ShieldCheckIcon className="w-5 h-5"/>
                                </div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">AI Enforcement: Active</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: ASSET GRID */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Upload Zone */}
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={styles.uploadZone}
                    >
                        <div className={styles.uploadIcon}>
                            {uploading ? (
                                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <PlusIcon className="w-8 h-8" />
                            )}
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-black text-gray-900 tracking-tight">Upload Style References</p>
                            <p className="text-xs text-gray-400 mt-1">Multi-select supported (Max 10MB per file)</p>
                        </div>
                        <input ref={fileInputRef} type="file" multiple className="hidden" accept="image/*" onChange={handleUpload} />
                    </div>

                    {/* Image Grid */}
                    <div className={styles.assetGrid}>
                        {images.map(img => (
                            <div key={img.id} className={styles.assetCard}>
                                <img src={img.imageUrl} className={styles.assetImage} alt="Ref" />
                                <button 
                                    onClick={() => handleDelete(img.id)}
                                    className={styles.assetDeleteBtn}
                                    title="Delete"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {images.length === 0 && !loading && (
                        <div className="py-20 text-center bg-gray-50 rounded-[3rem] border border-dashed border-gray-200">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-gray-300">
                                <CloudUploadIcon className="w-8 h-8"/>
                            </div>
                            <p className="text-sm font-bold text-gray-400">Vault is empty. Fallback AI active.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};