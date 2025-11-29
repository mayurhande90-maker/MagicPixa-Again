
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, AuthProps, AppConfig, Purchase, Transaction, CreditPack, Creation } from '../types';
import { 
    getAllUsers, addCreditsToUser, getAppConfig, updateAppConfig, getRecentSignups, getRecentPurchases, getTotalRevenue, getCreditHistory, getCreations
} from '../firebase';
import { 
    UsersIcon, CreditCardIcon, XIcon, SparklesIcon, InformationCircleIcon, CurrencyDollarIcon, ChartBarIcon, CogIcon, EyeIcon, CheckIcon, PencilIcon, AdjustmentsVerticalIcon, ImageIcon
} from './icons';

interface AdminPanelProps {
    auth: AuthProps;
    appConfig: AppConfig | null;
    onConfigUpdate: (newConfig: AppConfig) => void;
}

// Helper to safely display names/emails even if they are empty strings or whitespace
const getDisplayName = (name: string | undefined | null) => {
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return <span className="italic text-gray-400">No Name</span>;
    }
    return name;
};

const getDisplayEmail = (email: string | undefined | null) => {
    if (!email || typeof email !== 'string' || email.trim() === '') {
        return <span className="italic text-gray-400">No Email</span>;
    }
    return email;
};

const PermissionsGuide: React.FC<{ auth: AuthProps }> = ({ auth }) => (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 space-y-6">
        {/* FIRESTORE RULES */}
        <div className="flex">
            <div className="flex-shrink-0">
                <InformationCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3 w-full">
                <h3 className="text-lg font-bold text-red-800">1. Firestore Database Rules</h3>
                <div className="mt-2 text-sm text-red-700 space-y-2">
                    <p>Required for **Referrals** and **User Management**.</p>
                    <pre className="bg-gray-900 text-white p-4 rounded-md text-xs overflow-x-auto select-all">
                        <code>
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAdmin() {
      return request.auth.token.email == '${auth.user?.email}';
    }

    match /users/{userId} {
      allow read, write: if isAdmin();
      allow create, delete: if request.auth.uid == userId;
      allow read: if request.auth != null;
      allow update: if request.auth.uid == userId 
                    || (request.auth != null && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['credits', 'referralCount', 'totalCreditsAcquired', 'referredBy', 'brandKit']));
    }

    match /users/{userId}/transactions/{transactionId} {
      allow read: if request.auth.uid == userId || isAdmin();
      allow create: if request.auth.uid == userId || isAdmin()
                    || (request.auth != null && request.resource.data.feature == 'Referral Bonus (Referrer)');
    }

    match /users/{userId}/creations/{creationId} {
      allow read, write: if request.auth.uid == userId || isAdmin();
    }
    
    match /config/main {
        allow write: if isAdmin();
        allow read: if request.auth != null;
    }
    
    match /purchases/{purchaseId} {
        allow list, read: if isAdmin();
        allow create: if request.auth.uid == request.resource.data.userId;
    }
  }
}`}
                        </code>
                    </pre>
                </div>
            </div>
        </div>

        {/* STORAGE RULES */}
        <div className="flex border-t border-red-200 pt-6">
            <div className="flex-shrink-0">
                <InformationCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3 w-full">
                <h3 className="text-lg font-bold text-red-800">2. Storage Rules</h3>
                <div className="mt-2 text-sm text-red-700 space-y-2">
                    <p>Required for **Brand Kit Logo Uploads** and **Image Generation**.</p>
                    <pre className="bg-gray-900 text-white p-4 rounded-md text-xs overflow-x-auto select-all">
                        <code>
{`rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // 1. Allow users to upload their own Brand Kit assets (Logos)
    match /users/{userId}/brand_assets/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // 2. Allow users to upload and manage their creations
    match /creations/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Default Deny
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}`}
                        </code>
                    </pre>
                </div>
            </div>
        </div>
    </div>
);

const AddCreditsModal: React.FC<{
    user: User;
    onClose: () => void;
    onSuccess: (updatedUser: User) => void;
    adminUid: string;
}> = ({ user, onClose, onSuccess, adminUid }) => {
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const creditAmount = parseInt(amount, 10);
        if (isNaN(creditAmount) || creditAmount <= 0) {
            setError("Please enter a valid, positive number of credits.");
            return;
        }
        if (!reason.trim()) {
            setError("A reason is required for this transaction.");
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const updatedProfile = await addCreditsToUser(adminUid, user.uid, creditAmount, reason);
            onSuccess({ ...user, ...updatedProfile });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
            <div className="relative bg-white w-full max-w-md m-4 p-6 rounded-2xl shadow-xl" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><XIcon className="w-6 h-6" /></button>
                <h2 className="text-xl font-bold text-[#1E1E1E] mb-2">Add Credits</h2>
                <div className="p-3 bg-gray-50 rounded-lg mb-4">
                    <p className="text-sm font-semibold text-gray-800">{getDisplayName(user.name)}</p>
                    <p className="text-xs text-gray-500">{getDisplayEmail(user.email)}</p>
                    <p className="text-xs text-gray-500 mt-1">Current Balance: <span className="font-bold">{user.credits} credits</span></p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Credits to Add</label>
                        <input
                            type="number"
                            id="amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0079F2]"
                            placeholder="e.g., 100"
                            min="1"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Reason (Required)</label>
                        <textarea
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0079F2]"
                            placeholder="e.g., Goodwill gesture, support resolution..."
                            rows={3}
                            required
                        />
                    </div>
                    {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md">{error}</p>}
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-semibold text-[#1A1A1E] bg-[#F9D230] rounded-lg hover:bg-[#dfbc2b] disabled:opacity-50">
                            {isLoading ? 'Adding...' : 'Confirm'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const UserDetailModal: React.FC<{ user: User; onClose: () => void; }> = ({ user, onClose }) => {
    const [activeTab, setActiveTab] = useState<'details' | 'creations'>('details');
    
    // Transactions Data
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);

    // Creations Data
    const [creations, setCreations] = useState<Creation[]>([]);
    const [isLoadingCreations, setIsLoadingCreations] = useState(false);
    const [hasLoadedCreations, setHasLoadedCreations] = useState(false);

    useEffect(() => {
        getCreditHistory(user.uid)
            .then(history => setTransactions(history as Transaction[]))
            .catch(err => console.error("Failed to load user transaction history:", err))
            .finally(() => setIsLoadingTransactions(false));
    }, [user.uid]);

    useEffect(() => {
        if (activeTab === 'creations' && !hasLoadedCreations) {
            setIsLoadingCreations(true);
            getCreations(user.uid)
                .then(data => {
                    setCreations(data as Creation[]);
                    setHasLoadedCreations(true);
                })
                .catch(err => console.error("Failed to load creations:", err))
                .finally(() => setIsLoadingCreations(false));
        }
    }, [activeTab, user.uid, hasLoadedCreations]);
    
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
            <div className="relative bg-white w-full max-w-4xl m-4 p-6 rounded-2xl shadow-xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><XIcon className="w-6 h-6" /></button>
                
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-[#1E1E1E] mb-1">{getDisplayName(user.name)}</h2>
                    <p className="text-sm text-gray-500">{getDisplayEmail(user.email)}</p>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-4">
                    <button 
                        onClick={() => setActiveTab('details')}
                        className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'details' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Overview & History
                    </button>
                    <button 
                        onClick={() => setActiveTab('creations')}
                        className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'creations' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Creations Gallery
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                    {activeTab === 'details' ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Account Info</p>
                                    <div className="space-y-1">
                                        <div className="flex justify-between"><span className="text-sm text-gray-600">Joined</span> <span className="text-sm font-medium">{user.signUpDate ? new Date(user.signUpDate.seconds * 1000).toLocaleDateString() : 'N/A'}</span></div>
                                        <div className="flex justify-between"><span className="text-sm text-gray-600">Last Active</span> <span className="text-sm font-medium">{user.lastActive ? user.lastActive.toDate().toLocaleDateString() : 'N/A'}</span></div>
                                    </div>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Credits & Spending</p>
                                    <div className="space-y-1">
                                        <div className="flex justify-between"><span className="text-sm text-gray-600">Balance</span> <span className="text-sm font-bold text-blue-600">{user.credits} CR</span></div>
                                        <div className="flex justify-between"><span className="text-sm text-gray-600">Total Spent</span> <span className="text-sm font-bold text-green-600">₹{user.totalSpent || 0}</span></div>
                                        <div className="flex justify-between"><span className="text-sm text-gray-600">Generations</span> <span className="text-sm font-medium">{user.lifetimeGenerations || 0}</span></div>
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider">Transaction History</h3>
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                {isLoadingTransactions ? (
                                    <div className="p-8 text-center text-gray-500">Loading history...</div>
                                ) : transactions.length > 0 ? (
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Action</th>
                                                <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">Change</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {transactions.map(tx => (
                                                <tr key={tx.id}>
                                                    <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">{tx.date?.toDate().toLocaleDateString()}</td>
                                                    <td className="px-4 py-2 text-sm text-gray-800">{tx.feature}{tx.reason && <span className="text-gray-400 text-xs ml-1">({tx.reason})</span>}</td>
                                                    <td className={`px-4 py-2 text-sm font-bold text-right ${tx.creditChange ? 'text-green-600' : 'text-gray-600'}`}>
                                                        {tx.creditChange ? tx.creditChange : `-${tx.cost}`}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="p-8 text-center text-gray-500 text-sm">No transactions found.</div>
                                )}
                            </div>
                        </>
                    ) : (
                        // CREATIONS GALLERY TAB
                        <div className="h-full">
                            {isLoadingCreations ? (
                                <div className="p-12 flex flex-col items-center justify-center text-gray-400">
                                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mb-3"></div>
                                    <p className="text-sm">Loading user's gallery...</p>
                                </div>
                            ) : creations.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {creations.map(creation => (
                                        <div key={creation.id} className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                            <img 
                                                src={creation.thumbnailUrl || creation.imageUrl} 
                                                alt={creation.feature} 
                                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                loading="lazy"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                                <p className="text-white text-xs font-bold truncate">{creation.feature}</p>
                                                <p className="text-gray-300 text-[10px]">{creation.createdAt ? new Date((creation.createdAt as any).seconds * 1000).toLocaleDateString() : ''}</p>
                                            </div>
                                            <a 
                                                href={creation.imageUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="absolute inset-0 z-10"
                                                title="View Full Size"
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-12 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>No creations generated yet.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

type AdminTab = 'dashboard' | 'users' | 'settings';
type SortOption = 'newest' | 'active' | 'credits_high' | 'credits_low' | 'revenue' | 'generations';

export const AdminPanel: React.FC<AdminPanelProps> = ({ auth, appConfig: propConfig, onConfigUpdate }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Data states
    const [users, setUsers] = useState<User[]>([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [recentSignups, setRecentSignups] = useState<User[]>([]);
    const [recentPurchases, setRecentPurchases] = useState<Purchase[]>([]);
    
    // State for editable config, initialized from props
    const [editableConfig, setEditableConfig] = useState<AppConfig | null>(propConfig);

    // UI states
    const [searchTerm, setSearchTerm] = useState('');
    const [sortMode, setSortMode] = useState<SortOption>('newest');
    const [selectedUserForCredits, setSelectedUserForCredits] = useState<User | null>(null);
    const [selectedUserForDetails, setSelectedUserForDetails] = useState<User | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Keep local editable state in sync with props from App.tsx
    useEffect(() => {
        setEditableConfig(propConfig);
    }, [propConfig]);

    const fetchData = useCallback(async () => {
        setIsLoadingData(true);
        setError(null);
        try {
            // Config is now passed via props, so we only fetch other admin data here.
            const [userList, revenue, signups, purchases] = await Promise.all([
                getAllUsers(),
                getTotalRevenue(),
                getRecentSignups(),
                getRecentPurchases(),
            ]);
            setUsers(userList as User[]);
            setTotalRevenue(revenue);
            setRecentSignups(signups);
            setRecentPurchases(purchases as Purchase[]);
        } catch (err) {
            if (err instanceof Error && (err.message.includes('permission-denied') || err.message.includes('insufficient permissions') || err.message.includes('Missing or insufficient permissions'))) {
                setError('permission-denied');
            } else {
                setError(err instanceof Error ? err.message : "Failed to load admin data.");
            }
        } finally {
            setIsLoadingData(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleConfigSave = async () => {
        if (!editableConfig) return;
        setIsSaving(true);
        setError(null);
        setSaveSuccess(false);
        try {
            await updateAppConfig(editableConfig);
            // Re-fetch from DB to get the canonical state and update the global app state
            const updatedConfig = await getAppConfig();
            onConfigUpdate(updatedConfig);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save settings.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfigChange = (section: keyof AppConfig, key: string, value: any) => {
        setEditableConfig(prev => {
            if (!prev) return null;
            const newConfig = { ...prev };
            (newConfig[section] as any)[key] = value;
            return newConfig;
        });
    };
    
    const handlePackChange = (index: number, field: keyof CreditPack, value: any) => {
        setEditableConfig(prev => {
            if (!prev) return null;
            const newPacks = [...prev.creditPacks];
            const pack = { ...newPacks[index] };
            (pack as any)[field] = value;

            // Recalculate total credits when base or bonus changes
            if (field === 'credits' || field === 'bonus') {
                pack.totalCredits = Number(pack.credits) + Number(pack.bonus);
            }

            newPacks[index] = pack;
            return { ...prev, creditPacks: newPacks };
        });
    };


    const filteredUsers = useMemo(() => {
        // 1. Filter by search term
        let result = users;
        if (searchTerm) {
            result = result.filter(user =>
                user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // 2. Sort
        return result.sort((a, b) => {
            switch (sortMode) {
                case 'newest':
                    // Default: Sign up date descending
                    const dateA = a.signUpDate?.seconds || 0;
                    const dateB = b.signUpDate?.seconds || 0;
                    return dateB - dateA;
                
                case 'active':
                    // Last Active descending
                    const activeA = a.lastActive?.seconds || 0;
                    const activeB = b.lastActive?.seconds || 0;
                    return activeB - activeA;

                case 'credits_high':
                    // Credits descending
                    return (b.credits || 0) - (a.credits || 0);

                case 'credits_low':
                    // Credits ascending (Low balance first)
                    return (a.credits || 0) - (b.credits || 0);

                case 'revenue':
                    // Total Spent descending
                    return (b.totalSpent || 0) - (a.totalSpent || 0);

                case 'generations':
                    // Lifetime Generations descending
                    return (b.lifetimeGenerations || 0) - (a.lifetimeGenerations || 0);

                default:
                    return 0;
            }
        });
    }, [users, searchTerm, sortMode]);

    const handleCreditUpdateSuccess = (updatedUser: User) => {
        setUsers(prevUsers => prevUsers.map(u => u.uid === updatedUser.uid ? updatedUser : u));
    };

    const StatCard: React.FC<{ icon: React.FC<{ className?: string }>, title: string, value: string | number, color: string }> = ({ icon: Icon, title, value, color }) => (
        <div className={`bg-white p-4 rounded-lg border border-gray-200 flex items-center gap-4`}>
            <div className={`p-3 rounded-full ${color}`}>
                <Icon className="w-6 h-6 text-white"/>
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
            </div>
        </div>
    );
    
    if (isLoadingData) return <div className="text-center p-10">Loading Admin Panel...</div>;
    if (error === 'permission-denied') return <div className="p-4 sm:p-6 lg:p-8"><PermissionsGuide auth={auth} /></div>;
    if (error) return <p className="text-center p-10 text-red-500">{error}</p>;

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <div className='mb-8 flex justify-between items-start'>
                    <div>
                        <h2 className="text-3xl font-bold text-[#1E1E1E]">Admin Panel</h2>
                        <p className="text-[#5F6368] mt-1">Manage users and application settings.</p>
                    </div>
                    <button 
                        onClick={fetchData} 
                        disabled={isLoadingData}
                        className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 disabled:opacity-50 transition-all"
                        title="Refresh Data"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${isLoadingData ? 'animate-spin' : ''}`}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.181-3.183m-4.991-2.696a8.25 8.25 0 00-11.664 0l-3.181 3.183" />
                        </svg>
                    </button>
                </div>

                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        {(['dashboard', 'users', 'settings'] as AdminTab[]).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`whitespace-nowrap py-3 px-1 border-b-2 font-semibold text-sm capitalize ${
                                    activeTab === tab
                                        ? 'border-[#F9D230] text-yellow-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Dashboard View */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <StatCard icon={CurrencyDollarIcon} title="Total Revenue" value={`₹${totalRevenue.toFixed(2)}`} color="bg-green-500" />
                            <StatCard icon={UsersIcon} title="Total Users" value={users.length} color="bg-blue-500" />
                            <StatCard icon={SparklesIcon} title="Avg. Credits / User" value={users.length > 0 ? (users.reduce((acc, u) => acc + u.credits, 0) / users.length).toFixed(1) : 0} color="bg-yellow-500" />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                           <div className="bg-white p-6 rounded-2xl border border-gray-200 flex flex-col h-[350px]">
                                <h3 className="font-bold text-lg mb-4 flex-shrink-0">Recent Sign-ups</h3>
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                    <div className="space-y-3">
                                        {recentSignups.map(user => (
                                            <div key={user.uid} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                                <div className="min-w-0 mr-4">
                                                    <p className="font-semibold text-gray-800 truncate">{getDisplayName(user.name)}</p>
                                                    <p className="text-xs text-gray-500 truncate" title={user.email}>{getDisplayEmail(user.email)}</p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-xs text-gray-400">
                                                        {user.signUpDate 
                                                            ? new Date((user.signUpDate as any).seconds * 1000).toLocaleDateString() 
                                                            : 'N/A'}
                                                    </p>
                                                    <p className="text-[10px] text-gray-300">
                                                        {user.signUpDate 
                                                            ? new Date((user.signUpDate as any).seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                                                            : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        {recentSignups.length === 0 && <p className="text-center text-gray-400 text-sm py-10">No recent signups.</p>}
                                    </div>
                                </div>
                           </div>
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 flex flex-col h-[350px]">
                                <h3 className="font-bold text-lg mb-4 flex-shrink-0">Recent Purchases</h3>
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                    <div className="space-y-3">
                                        {recentPurchases.map(p => (
                                            <div key={p.id} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                                <div>
                                                    <p className="font-semibold text-gray-800">{getDisplayName(p.userName)}</p>
                                                    <p className="text-xs text-gray-500">{p.packName}</p>
                                                </div>
                                                <p className="font-bold text-green-600">₹{p.amountPaid}</p>
                                            </div>
                                        ))}
                                        {recentPurchases.length === 0 && <p className="text-center text-gray-400 text-sm py-10">No recent purchases.</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Users View */}
                {activeTab === 'users' && (
                    <div className="bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-6">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                             <h3 className="text-xl font-bold text-[#1E1E1E]">User Management ({users.length})</h3>
                             <div className="flex gap-2 w-full md:w-auto">
                                <div className="relative flex-1 md:flex-none">
                                    <select 
                                        value={sortMode}
                                        onChange={(e) => setSortMode(e.target.value as SortOption)}
                                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#0079F2] text-sm font-medium text-gray-700 cursor-pointer"
                                    >
                                        <option value="newest">Newest Members</option>
                                        <option value="active">Recently Active</option>
                                        <option value="credits_high">Highest Credits</option>
                                        <option value="credits_low">Low Balance</option>
                                        <option value="revenue">Top Spenders</option>
                                        <option value="generations">Power Users</option>
                                    </select>
                                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                        <AdjustmentsVerticalIcon className="w-4 h-4 text-gray-500" />
                                    </div>
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="Search by name or email..." 
                                    value={searchTerm} 
                                    onChange={(e) => setSearchTerm(e.target.value)} 
                                    className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0079F2]"
                                />
                             </div>
                        </div>
                         <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Name & Email</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Last Active</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Total Spent</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Credits</th>
                                        <th className="relative px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredUsers.map(user => (
                                        <tr key={user.uid}>
                                            <td className="px-4 py-3 text-sm">
                                                <p className="font-medium text-gray-900">{getDisplayName(user.name)}</p>
                                                <p className="text-gray-500">{getDisplayEmail(user.email)}</p>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">{user.lastActive ? user.lastActive.toDate().toLocaleString() : 'N/A'}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-gray-700">₹{user.totalSpent || 0}</td>
                                            <td className="px-4 py-3 text-sm font-bold text-gray-900">{user.credits}</td>
                                            <td className="px-4 py-3 text-right text-sm font-medium space-x-2">
                                                <button onClick={() => setSelectedUserForDetails(user)} className="text-gray-500 hover:text-blue-600"><EyeIcon className="w-5 h-5"/></button>
                                                <button onClick={() => setSelectedUserForCredits(user)} className="text-gray-500 hover:text-green-600"><CreditCardIcon className="w-5 h-5"/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                             {filteredUsers.length === 0 && <p className="text-center py-10 text-gray-500">No users found.</p>}
                        </div>
                    </div>
                )}
                
                {/* Settings View */}
                {activeTab === 'settings' && editableConfig && (
                    <div className="space-y-8">
                        {/* Feature Costs */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200">
                           <h3 className="font-bold text-lg mb-4">Feature Costs (in Credits)</h3>
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.keys(editableConfig.featureCosts).map(key => (
                                    <div key={key}>
                                        <label className="block text-sm font-medium text-gray-700">{key}</label>
                                        <input
                                            type="number"
                                            value={editableConfig.featureCosts[key]}
                                            onChange={(e) => handleConfigChange('featureCosts', key, Number(e.target.value))}
                                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                ))}
                           </div>
                        </div>

                        {/* Feature Toggles */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200">
                            <h3 className="font-bold text-lg mb-4">Feature Toggles</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {Object.keys(editableConfig.featureToggles).map(key => (
                                    <div key={key} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                        <label htmlFor={`toggle-${key}`} className="text-sm font-medium text-gray-700 capitalize">{key.replace('_', ' ')}</label>
                                        <input
                                            id={`toggle-${key}`}
                                            type="checkbox"
                                            checked={editableConfig.featureToggles[key]}
                                            onChange={(e) => handleConfigChange('featureToggles', key, e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Credit Packs */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200">
                            <h3 className="font-bold text-lg mb-4">Credit Packs</h3>
                            <div className="space-y-4">
                                {editableConfig.creditPacks.map((pack, index) => (
                                    <div key={index} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end p-3 border rounded-lg bg-gray-50">
                                        <div className="col-span-2 md:col-span-1">
                                            <label className="text-xs font-medium">Name</label>
                                            <input type="text" value={pack.name} onChange={e => handlePackChange(index, 'name', e.target.value)} className="w-full p-1 border rounded-md" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium">Price (₹)</label>
                                            <input type="number" value={pack.price} onChange={e => handlePackChange(index, 'price', Number(e.target.value))} className="w-full p-1 border rounded-md" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium">Credits</label>
                                            <input type="number" value={pack.credits} onChange={e => handlePackChange(index, 'credits', Number(e.target.value))} className="w-full p-1 border rounded-md" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium">Bonus</label>
                                            <input type="number" value={pack.bonus} onChange={e => handlePackChange(index, 'bonus', Number(e.target.value))} className="w-full p-1 border rounded-md" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm">Total: <strong className="text-blue-600">{pack.totalCredits}</strong></p>
                                            <div className="flex items-center">
                                                <input id={`popular-${index}`} type="checkbox" checked={pack.popular} onChange={e => handlePackChange(index, 'popular', e.target.checked)} className="h-4 w-4 rounded border-gray-300"/>
                                                <label htmlFor={`popular-${index}`} className="ml-1 text-xs font-medium">Popular</label>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end items-center gap-4 pt-4 border-t">
                            {saveSuccess && <p className="text-green-600 flex items-center gap-1 text-sm"><CheckIcon className="w-4 h-4"/> Saved successfully!</p>}
                            <button onClick={handleConfigSave} disabled={isSaving} className="px-6 py-2 bg-[#F9D230] text-[#1A1A1E] font-semibold rounded-lg hover:bg-[#dfbc2b] disabled:opacity-50">
                                {isSaving ? 'Saving...' : 'Save All Settings'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {selectedUserForCredits && auth.user && (
                <AddCreditsModal 
                    user={selectedUserForCredits} 
                    onClose={() => setSelectedUserForCredits(null)}
                    onSuccess={handleCreditUpdateSuccess}
                    adminUid={auth.user.uid}
                />
            )}
            {selectedUserForDetails && (
                <UserDetailModal
                    user={selectedUserForDetails}
                    onClose={() => setSelectedUserForDetails(null)}
                />
            )}
        </div>
    );
};
