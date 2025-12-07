
import React, { useState, useEffect } from 'react';
import { AuthProps, Announcement } from '../../types';
import { getAnnouncement, updateAnnouncement } from '../../firebase';
import { FlagIcon } from '../icons';

export const AdminComms: React.FC<{ auth: AuthProps }> = ({ auth }) => {
    const [announcement, setAnnouncement] = useState<Announcement>({ 
        title: '', 
        message: '', 
        isActive: false, 
        type: 'info', 
        link: '', 
        style: 'banner' 
    });

    useEffect(() => {
        fetchAnnouncement();
    }, []);

    const fetchAnnouncement = async () => {
        try {
            const ann = await getAnnouncement();
            setAnnouncement({
                title: ann?.title || '',
                message: ann?.message || '',
                isActive: ann?.isActive ?? false, 
                type: ann?.type || 'info',
                link: ann?.link || '',
                style: ann?.style || 'banner'
            });
        } catch (e) {
            console.error("Failed to fetch announcement", e);
        }
    };

    const handleSaveAnnouncement = async () => { 
        if(!auth.user) return; 
        try { 
            await updateAnnouncement(auth.user.uid, announcement); 
            alert("Announcement updated successfully."); 
        } catch (e: any) { 
            alert("Failed to update announcement: " + e.message); 
        } 
    };

    return (
        <div className="max-w-2xl mx-auto animate-fadeIn bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6"><div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl"><FlagIcon className="w-6 h-6"/></div><h3 className="text-xl font-bold text-gray-800">Global Announcement</h3></div>
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Content</label>
                    <div className="space-y-2">
                        <input type="text" value={announcement.title || ''} onChange={(e) => setAnnouncement({...announcement, title: e.target.value})} className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold" placeholder="Headline" />
                        <textarea value={announcement.message} onChange={(e) => setAnnouncement({...announcement, message: e.target.value})} className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium h-24 resize-none" placeholder="Message body..." />
                    </div>
                </div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Link (Optional)</label><input type="text" value={announcement.link || ''} onChange={(e) => setAnnouncement({...announcement, link: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl text-sm" placeholder="https://..." /></div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Visual Style</label>
                    <div className="grid grid-cols-4 gap-2">{['banner', 'pill', 'toast', 'modal'].map((s) => (<button key={s} onClick={() => setAnnouncement({...announcement, style: s as any})} className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all capitalize ${announcement.style === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>{s}</button>))}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Type</label><select value={announcement.type} onChange={(e) => setAnnouncement({...announcement, type: e.target.value as any})} className="w-full p-3 border border-gray-200 rounded-xl text-sm"><option value="info">Info (Blue)</option><option value="success">Success (Green)</option><option value="warning">Warning (Yellow)</option><option value="error">Critical (Red)</option></select></div>
                    <div className="flex items-end"><button onClick={() => setAnnouncement({...announcement, isActive: !announcement.isActive})} className={`w-full py-3 rounded-xl font-bold transition-all border ${announcement.isActive ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500'}`}>{announcement.isActive ? 'Active' : 'Inactive'}</button></div>
                </div>
                <div className="pt-2"><button onClick={handleSaveAnnouncement} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg">Publish Announcement</button></div>
            </div>
        </div>
    );
};
