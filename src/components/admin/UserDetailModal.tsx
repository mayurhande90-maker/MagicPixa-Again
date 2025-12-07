
import React, { useState } from 'react';
import { User, AppConfig } from '../../types';
import { addCreditsToUser, grantPackageToUser, sendSystemNotification } from '../../firebase';
import { CreditCardIcon, GiftIcon, FlagIcon, XIcon } from '../icons';

interface UserDetailModalProps {
    user: User;
    currentUser: User;
    appConfig: AppConfig | null;
    onClose: () => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({ user, currentUser, appConfig, onClose }) => {
    const [creditAmount, setCreditAmount] = useState(0);
    const [creditReason, setCreditReason] = useState('');
    const [selectedPackIndex, setSelectedPackIndex] = useState(0);
    
    // Notification State
    const [notificationMsg, setNotificationMsg] = useState('');
    const [notificationTitle, setNotificationTitle] = useState('');
    const [notificationLink, setNotificationLink] = useState('');
    const [notificationStyle, setNotificationStyle] = useState<'banner' | 'pill' | 'toast' | 'modal'>('banner');
    
    const [isLoading, setIsLoading] = useState(false);

    const handleGrantCredits = async () => {
        if (creditAmount <= 0) return;
        setIsLoading(true);
        try {
            await addCreditsToUser(currentUser.uid, user.uid, creditAmount, creditReason || 'Admin Grant');
            alert(`Granted ${creditAmount} credits.`);
            setCreditAmount(0);
            setCreditReason('');
        } catch (e: any) {
            alert('Failed to grant credits: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGrantPack = async () => {
        if (!appConfig?.creditPacks?.[selectedPackIndex]) return;
        const pack = appConfig.creditPacks[selectedPackIndex];
        if(confirm(`Grant ${pack.name} to ${user.email}?`)) {
            setIsLoading(true);
            try {
                await grantPackageToUser(currentUser.uid, user.uid, pack, 'Admin Gift');
                alert(`Granted ${pack.name}.`);
            } catch (e: any) {
                alert('Failed to grant package: ' + e.message);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleSendNotification = async () => {
        if (!notificationMsg) return;
        setIsLoading(true);
        try {
            await sendSystemNotification(
                currentUser.uid, 
                user.uid, 
                notificationTitle || 'System Message', 
                notificationMsg, 
                'info', 
                notificationStyle, 
                notificationLink
            );
            alert('Notification sent.');
            setNotificationMsg('');
            setNotificationTitle('');
            setNotificationLink('');
        } catch (e: any) {
            alert('Failed to send notification: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'Never';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
            return date.toLocaleString('en-US', { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });
        } catch (e) {
            return 'Invalid Date';
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-800">User Details: {user.name}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><XIcon className="w-5 h-5"/></button>
                </div>
                
                <div className="p-6 space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-xl">
                            <p className="text-xs text-gray-500 uppercase font-bold">Credits</p>
                            <p className="text-2xl font-black text-[#1A1A1E]">{user.credits}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                            <p className="text-xs text-gray-500 uppercase font-bold">Plan</p>
                            <p className="text-2xl font-black text-[#1A1A1E]">{user.plan || 'Free'}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                            <p className="text-xs text-gray-500 uppercase font-bold">Joined On</p>
                            <p className="text-sm font-medium text-gray-800">{formatDate(user.signUpDate)}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                            <p className="text-xs text-gray-500 uppercase font-bold">Last Seen</p>
                            <p className="text-sm font-medium text-gray-800">{formatDate(user.lastActive)}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                            <p className="text-xs text-gray-500 uppercase font-bold">UID</p>
                            <p className="text-xs font-mono text-gray-600 break-all">{user.uid}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                            <p className="text-xs text-gray-500 uppercase font-bold">Email</p>
                            <p className="text-sm font-medium text-gray-800 break-all">{user.email}</p>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><CreditCardIcon className="w-5 h-5"/> Grant Credits</h3>
                        <div className="flex gap-2">
                            <input type="number" placeholder="Amount" value={creditAmount || ''} onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)} className="w-24 px-3 py-2 border rounded-lg outline-none focus:border-indigo-500"/>
                            <input type="text" placeholder="Reason (Optional)" value={creditReason} onChange={(e) => setCreditReason(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg outline-none focus:border-indigo-500"/>
                            <button onClick={handleGrantCredits} disabled={isLoading || creditAmount <= 0} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-700 disabled:opacity-50">Grant</button>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><GiftIcon className="w-5 h-5"/> Grant Package</h3>
                        <div className="flex gap-2">
                            <select value={selectedPackIndex} onChange={(e) => setSelectedPackIndex(parseInt(e.target.value))} className="flex-1 px-3 py-2 border rounded-lg outline-none focus:border-indigo-500 bg-white">
                                {appConfig?.creditPacks.map((p, i) => (
                                    <option key={i} value={i}>{p.name} ({p.totalCredits} Cr)</option>
                                ))}
                            </select>
                            <button onClick={handleGrantPack} disabled={isLoading} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-purple-700 disabled:opacity-50">Grant Pack</button>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FlagIcon className="w-5 h-5"/> Send Notification</h3>
                        
                        {/* Style Selector */}
                        <div className="mb-4">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-2">Visual Style</label>
                            <div className="flex gap-2">
                                {['banner', 'pill', 'toast', 'modal'].map((s) => (
                                    <button 
                                        key={s} 
                                        onClick={() => setNotificationStyle(s as any)} 
                                        className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize border transition-all ${
                                            notificationStyle === s 
                                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700' 
                                            : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                        }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <input type="text" placeholder="Title (e.g. Welcome Back)" value={notificationTitle} onChange={(e) => setNotificationTitle(e.target.value)} className="w-full px-3 py-2 border rounded-lg mb-2 outline-none focus:border-indigo-500 text-sm font-bold"/>
                        <textarea placeholder="Message body..." value={notificationMsg} onChange={(e) => setNotificationMsg(e.target.value)} className="w-full px-3 py-2 border rounded-lg mb-2 outline-none focus:border-indigo-500 text-sm" rows={2}/>
                        <input type="text" placeholder="Link / Action URL (Optional)" value={notificationLink} onChange={(e) => setNotificationLink(e.target.value)} className="w-full px-3 py-2 border rounded-lg mb-2 outline-none focus:border-indigo-500 text-sm"/>
                        <button onClick={handleSendNotification} disabled={isLoading || !notificationMsg} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm w-full hover:bg-blue-700 disabled:opacity-50">Send Message</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
