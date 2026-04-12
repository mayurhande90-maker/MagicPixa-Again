
import React, { useState } from 'react';
import { User, AuthProps } from '../../types';
import { findUserByEmail, findUserByPhone, mergeUserAccounts, unlinkUserPhone, unlinkUserEmail } from '../../firebase';
import { SearchIcon, UsersIcon, ShieldCheckIcon, TrashIcon, LinkIcon } from '../icons';

interface AdminAccountMergeProps {
    auth: AuthProps;
}

export const AdminAccountMerge: React.FC<AdminAccountMergeProps> = ({ auth }) => {
    const [sourcePhone, setSourcePhone] = useState('');
    const [targetEmail, setTargetEmail] = useState('');
    
    const [sourceUser, setSourceUser] = useState<User | null>(null);
    const [targetUser, setTargetUser] = useState<User | null>(null);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isMerging, setIsMerging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [confirmMerge, setConfirmMerge] = useState(false);

    const handleSearch = async () => {
        setIsLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const [source, target] = await Promise.all([
                sourcePhone ? findUserByPhone(sourcePhone) : Promise.resolve(null),
                targetEmail ? findUserByEmail(targetEmail) : Promise.resolve(null)
            ]);
            
            setSourceUser(source);
            setTargetUser(target);
            
            if (sourcePhone && !source) setError('Source user (Phone) not found.');
            if (targetEmail && !target) setError('Target user (Email) not found.');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMerge = async () => {
        if (!sourceUser || !targetUser || !confirmMerge) return;
        
        setIsMerging(true);
        setError(null);
        try {
            await mergeUserAccounts(auth.user?.uid || 'admin', sourceUser.uid, targetUser.uid);
            setSuccess(`Successfully merged ${sourceUser.phoneNumber} into ${targetUser.email}.`);
            setSourceUser(null);
            setTargetUser(null);
            setSourcePhone('');
            setTargetEmail('');
            setConfirmMerge(false);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsMerging(false);
        }
    };

    const handleUnlink = async (uid: string, type: 'phone' | 'email') => {
        if (!confirm(`Are you sure you want to remove the ${type} from this user?`)) return;
        
        setIsLoading(true);
        try {
            if (type === 'phone') await unlinkUserPhone(auth.user?.uid || 'admin', uid);
            else await unlinkUserEmail(auth.user?.uid || 'admin', uid);
            setSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} unlinked successfully.`);
            handleSearch(); // Refresh
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const sourcePaidCredits = sourceUser ? Math.max(0, (sourceUser.credits || 0) - 50) : 0;

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-indigo-100 p-2 rounded-lg">
                        <LinkIcon className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">Account Merge Tool</h3>
                        <p className="text-sm text-gray-500">Consolidate a phone account into a Google account.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Source (Phone Account)</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={sourcePhone}
                                onChange={(e) => setSourcePhone(e.target.value)}
                                placeholder="Enter Phone Number (e.g. +91...)"
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                            />
                            <SearchIcon className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target (Email Account)</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={targetEmail}
                                onChange={(e) => setTargetEmail(e.target.value)}
                                placeholder="Enter Email Address"
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                            />
                            <SearchIcon className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                        </div>
                    </div>
                </div>

                <button 
                    onClick={handleSearch}
                    disabled={isLoading || (!sourcePhone && !targetEmail)}
                    className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isLoading ? 'Searching...' : 'Find Accounts'}
                </button>

                {error && <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
                {success && <div className="mt-4 p-3 bg-green-50 text-green-600 text-sm rounded-lg border border-green-100">{success}</div>}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Source User Card */}
                <div className={`bg-white p-6 rounded-2xl border ${sourceUser ? 'border-orange-200 bg-orange-50/10' : 'border-gray-100 opacity-50'} shadow-sm transition-all`}>
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <UsersIcon className="w-4 h-4 text-orange-500" /> Source User
                    </h4>
                    {sourceUser ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-orange-100">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase">Name</p>
                                    <p className="font-bold text-gray-800">{sourceUser.name}</p>
                                </div>
                                <button onClick={() => handleUnlink(sourceUser.uid, 'phone')} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Unlink Phone">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-white rounded-xl border border-orange-100">
                                    <p className="text-xs font-bold text-gray-400 uppercase">Credits</p>
                                    <p className="font-bold text-orange-600 text-lg">{sourceUser.credits}</p>
                                    <p className="text-[10px] text-gray-400">({sourcePaidCredits} paid will merge)</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-orange-100">
                                    <p className="text-xs font-bold text-gray-400 uppercase">Phone</p>
                                    <p className="font-bold text-gray-800 text-sm">{sourceUser.phoneNumber}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-32 flex items-center justify-center text-gray-400 text-sm italic">No source user selected</div>
                    )}
                </div>

                {/* Target User Card */}
                <div className={`bg-white p-6 rounded-2xl border ${targetUser ? 'border-green-200 bg-green-50/10' : 'border-gray-100 opacity-50'} shadow-sm transition-all`}>
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <UsersIcon className="w-4 h-4 text-green-500" /> Target User
                    </h4>
                    {targetUser ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-green-100">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase">Name</p>
                                    <p className="font-bold text-gray-800">{targetUser.name}</p>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => handleUnlink(targetUser.uid, 'phone')} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Unlink Phone">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleUnlink(targetUser.uid, 'email')} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Unlink Email">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-white rounded-xl border border-green-100">
                                    <p className="text-xs font-bold text-gray-400 uppercase">Credits</p>
                                    <p className="font-bold text-green-600 text-lg">{targetUser.credits}</p>
                                    <p className="text-[10px] text-gray-400">(Will become {targetUser.credits + sourcePaidCredits})</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-green-100">
                                    <p className="text-xs font-bold text-gray-400 uppercase">Email</p>
                                    <p className="font-bold text-gray-800 text-sm truncate">{targetUser.email}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-32 flex items-center justify-center text-gray-400 text-sm italic">No target user selected</div>
                    )}
                </div>
            </div>

            {sourceUser && targetUser && (
                <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 shadow-sm animate-slideUp">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="bg-indigo-600 p-2 rounded-lg">
                            <ShieldCheckIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h4 className="font-bold text-indigo-900">Final Confirmation</h4>
                            <p className="text-sm text-indigo-700">
                                You are about to merge <span className="font-bold">{sourceUser.phoneNumber}</span> into <span className="font-bold">{targetUser.email}</span>.
                                This will transfer all paid credits and projects. The source account will be deleted.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                        <input 
                            type="checkbox" 
                            id="confirm-merge" 
                            checked={confirmMerge}
                            onChange={(e) => setConfirmMerge(e.target.checked)}
                            className="w-5 h-5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="confirm-merge" className="text-sm font-bold text-indigo-900 cursor-pointer">
                            I understand this action is permanent and cannot be undone.
                        </label>
                    </div>

                    <button 
                        onClick={handleMerge}
                        disabled={!confirmMerge || isMerging}
                        className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {isMerging ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Processing Merge...</span>
                            </>
                        ) : (
                            <>
                                <LinkIcon className="w-5 h-5" />
                                <span>Execute Account Merge</span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};
