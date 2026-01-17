
import React from 'react';
import { AuthProps } from '../../types';
import { UserIcon, LogoutIcon, ShieldCheckIcon, PixaBillingIcon } from '../../components/icons';

export const MobileProfile: React.FC<{ auth: AuthProps }> = ({ auth }) => {
    const user = auth.user;

    return (
        <div className="p-6 animate-fadeIn">
            <div className="mb-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-indigo-600 border-4 border-white shadow-2xl flex items-center justify-center text-3xl font-black text-white uppercase mb-4 overflow-hidden">
                    {user?.avatar || user?.name?.[0] || 'U'}
                </div>
                <h2 className="text-2xl font-black text-gray-900">{user?.name}</h2>
                <p className="text-gray-400 font-medium text-sm">{user?.email}</p>
                
                <div className="mt-4 flex items-center gap-2 bg-blue-50 px-4 py-1 rounded-full border border-blue-100">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{user?.plan || 'Free'} Plan</span>
                </div>
            </div>

            <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-5 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm active:bg-gray-50 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><PixaBillingIcon className="w-5 h-5"/></div>
                        <span className="text-sm font-bold text-gray-700">Billing & Credits</span>
                    </div>
                    <ShieldCheckIcon className="w-4 h-4 text-gray-300" />
                </button>

                <button className="w-full flex items-center justify-between p-5 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm active:bg-gray-50 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-gray-50 text-gray-400 rounded-xl"><UserIcon className="w-5 h-5"/></div>
                        <span className="text-sm font-bold text-gray-700">Account Settings</span>
                    </div>
                    <ShieldCheckIcon className="w-4 h-4 text-gray-300" />
                </button>

                <button 
                    onClick={auth.handleLogout}
                    className="w-full flex items-center justify-between p-5 bg-red-50 border border-red-100 rounded-[1.5rem] shadow-sm active:bg-red-100 transition-all mt-8"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-white text-red-600 rounded-xl shadow-sm"><LogoutIcon className="w-5 h-5"/></div>
                        <span className="text-sm font-bold text-red-700">Sign Out</span>
                    </div>
                </button>
            </div>
            
            <p className="text-center text-[10px] text-gray-300 font-bold uppercase tracking-[0.3em] mt-12">MagicPixa v1.0.3</p>
        </div>
    );
};
