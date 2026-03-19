import React from 'react';
import { AuthProps, User } from '../types';
import { 
    PhoneIcon, 
    ShieldCheckIcon, 
    CheckCircleIcon,
    ChevronRightIcon,
    LogoutIcon,
    TrashIcon,
    SparklesIcon,
    LightningIcon
} from '../components/icons';
import { getBadgeInfo } from '../utils/badgeUtils';

export const Profile: React.FC<{ auth: AuthProps }> = ({ auth }) => {
    const { user } = auth;
    if (!user) return null;

    const badge = getBadgeInfo(user.lifetimeGenerations || 0);

    const lifetimeGens = user.lifetimeGenerations || 0;
    const nextMilestone = lifetimeGens < 10 ? 10 : Math.ceil((lifetimeGens + 1) / 50) * 50;
    const progress = (lifetimeGens / nextMilestone) * 100;

    return (
        <div className="max-w-4xl mx-auto py-12 px-6">
            <div className="mb-10">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Account Settings</h1>
                <p className="text-slate-500 font-medium">Manage your profile, security, and preferences.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Identity Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                        <div className="h-24 bg-gradient-to-br from-indigo-600 to-violet-700 relative">
                            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                                <div className="w-24 h-24 rounded-full border-4 border-white bg-slate-50 flex items-center justify-center text-3xl shadow-lg">
                                    {user.avatar || user.name[0]}
                                </div>
                            </div>
                        </div>
                        <div className="pt-16 pb-8 px-6 text-center">
                            <h2 className="text-xl font-black text-slate-900 mb-1">{user.name}</h2>
                            <p className="text-sm text-slate-500 mb-4">{user.email}</p>
                            
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${badge.bgColor} ${badge.borderColor} ${badge.color} text-[10px] font-black uppercase tracking-wider`}>
                                <badge.Icon className="w-3 h-3" />
                                {badge.rank}
                            </div>
                        </div>
                        <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                <span>Loyalty Progress</span>
                                <span>{lifetimeGens} / {nextMilestone}</span>
                            </div>
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-indigo-600 transition-all duration-1000"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => auth.handleLogout()}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold hover:bg-red-50 hover:text-red-600 transition-all border border-slate-200"
                    >
                        <LogoutIcon className="w-5 h-5" />
                        Sign Out
                    </button>
                </div>

                {/* Right Column: Settings Sections */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Security Section */}
                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <ShieldCheckIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Security & Verification</h3>
                                <p className="text-sm text-slate-500">Keep your account secure and verified.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Phone Linking */}
                            <div className="flex items-center justify-between p-6 rounded-2xl border border-slate-100 bg-slate-50/50 group hover:border-indigo-200 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl ${user.phoneNumber ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                                        <PhoneIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900">Phone Number</span>
                                            {user.phoneNumber && (
                                                <span className="flex items-center gap-1 text-[10px] font-black text-green-600 uppercase tracking-wider bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                                                    <CheckCircleIcon className="w-3 h-3" />
                                                    Verified
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-500">
                                            {user.phoneNumber ? user.phoneNumber : 'Not linked yet'}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => auth.openPhoneVerification()}
                                    className="px-6 py-2 bg-white border border-slate-200 text-slate-900 rounded-xl font-bold hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm"
                                >
                                    {user.phoneNumber ? 'Change' : 'Link Phone'}
                                </button>
                            </div>

                            {/* Email Verification (Static for now as it's usually handled by Google) */}
                            <div className="flex items-center justify-between p-6 rounded-2xl border border-slate-100 bg-slate-50/50 opacity-60">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                                        <ShieldCheckIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900">Email Address</span>
                                            <span className="flex items-center gap-1 text-[10px] font-black text-green-600 uppercase tracking-wider bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                                                <CheckCircleIcon className="w-3 h-3" />
                                                Verified
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500">{user.email}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Usage & Plan Section */}
                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                                <LightningIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Plan & Usage</h3>
                                <p className="text-sm text-slate-500">Your current subscription and credit balance.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Plan</p>
                                <p className="text-xl font-black text-slate-900">{user.plan || 'Free'}</p>
                            </div>
                            <div className="p-6 rounded-2xl bg-indigo-50 border border-indigo-100">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Available Credits</p>
                                <p className="text-xl font-black text-indigo-600">{user.credits} Credits</p>
                            </div>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="pt-4">
                        <button 
                            onClick={() => alert("Please contact support@magicpixa.com to delete your account.")}
                            className="flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-600 transition-colors ml-4"
                        >
                            <TrashIcon className="w-4 h-4" />
                            Delete Account Permanently
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
