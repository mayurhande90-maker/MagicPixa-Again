
import React, { useState, useEffect } from 'react';
import { User, AuthProps, AppConfig } from '../../types';
import { getAllUsers, toggleUserBan } from '../../firebase';
import { DownloadIcon, EyeIcon, InformationCircleIcon, XIcon, ArrowLeftIcon, ArrowRightIcon } from '../icons';
import { UserDetailModal } from './UserDetailModal';

interface AdminUsersProps {
    auth: AuthProps;
    appConfig: AppConfig | null;
}

export const AdminUsers: React.FC<AdminUsersProps> = ({ auth, appConfig }) => {
    const [allUsers, setAllUsers] = useState<User[]>([]); 
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 10;
    const [searchTerm, setSearchTerm] = useState('');
    const [sortMode, setSortMode] = useState<'newest' | 'oldest' | 'credits'>('newest');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedUserForDetail, setSelectedUserForDetail] = useState<User | null>(null);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => { 
        setIsLoading(true); 
        try { 
            const users = await getAllUsers(); 
            setAllUsers(users); 
        } catch (e: any) { 
            console.error("Failed to load users:", e); 
            alert(`Error loading users: ${e.message}`); 
        } finally { 
            setIsLoading(false); 
        } 
    };

    const handleToggleBan = async (user: User) => { 
        if (confirm(`Confirm ${user.isBanned ? 'UNBAN' : 'BAN'} for ${user.email}?`)) { 
            if(auth.user) await toggleUserBan(auth.user.uid, user.uid, !user.isBanned); 
            loadUsers(); 
        } 
    };

    const exportUsersCSV = () => { 
        const headers = ["UID", "Name", "Email", "Credits", "Plan", "Joined", "Last Active"]; 
        const rows = allUsers.map(u => [ 
            u.uid, u.name, u.email, u.credits, u.plan || 'Free', 
            u.signUpDate ? new Date((u.signUpDate as any).seconds * 1000).toISOString() : '', 
            u.lastActive ? new Date((u.lastActive as any).seconds * 1000).toISOString() : '' 
        ]); 
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n'); 
        const blob = new Blob([csvContent], { type: 'text/csv' }); 
        const url = window.URL.createObjectURL(blob); 
        const a = document.createElement('a'); 
        a.href = url; 
        a.download = `users_export_${new Date().toISOString()}.csv`; 
        a.click(); 
    };

    useEffect(() => {
        let result = [...allUsers];
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(u => u.name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term) || u.uid?.toLowerCase().includes(term));
        }
        if (sortMode === 'newest') { result.sort((a, b) => { const da = a.signUpDate ? (a.signUpDate as any).seconds : 0; const db = b.signUpDate ? (b.signUpDate as any).seconds : 0; return db - da; }); } 
        else if (sortMode === 'oldest') { result.sort((a, b) => { const da = a.signUpDate ? (a.signUpDate as any).seconds : 0; const db = b.signUpDate ? (b.signUpDate as any).seconds : 0; return da - db; }); } 
        else if (sortMode === 'credits') { result.sort((a, b) => (b.credits || 0) - (a.credits || 0)); }
        setFilteredUsers(result);
        setCurrentPage(1);
    }, [allUsers, searchTerm, sortMode]);

    const indexOfLastUser = currentPage * usersPerPage; 
    const indexOfFirstUser = indexOfLastUser - usersPerPage; 
    const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser); 
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    const formatTableDate = (timestamp: any) => { if (!timestamp) return '-'; try { const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000 || timestamp); return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return '-'; } };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-fadeIn">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
                <div className="flex items-center gap-3"><h3 className="font-bold text-gray-800">Users ({filteredUsers.length})</h3><button onClick={exportUsersCSV} className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline"><DownloadIcon className="w-3 h-3"/> Export CSV</button></div>
                <div className="flex gap-2"><select value={sortMode} onChange={(e) => setSortMode(e.target.value as any)} className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold focus:outline-none"><option value="newest">Newest First</option><option value="oldest">Oldest First</option><option value="credits">Most Credits</option></select><input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-500 w-48"/></div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider"><tr><th className="p-4">Identity</th><th className="p-4">Plan</th><th className="p-4">Credits</th><th className="p-4">Spent</th><th className="p-4">Last Login</th><th className="p-4 text-right">Actions</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                        {isLoading ? (<tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading...</td></tr>) : currentUsers.map(u => (
                            <tr key={u.uid} className={`hover:bg-gray-50 transition-colors ${u.isBanned ? 'bg-red-50' : ''}`}>
                                <td className="p-4"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs">{u.name?.[0]}</div><div><p className="font-bold text-gray-800">{u.name}</p><p className="text-xs text-gray-500">{u.email}</p></div></div></td>
                                <td className="p-4"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">{u.plan || 'Free'}</span></td>
                                <td className="p-4 font-mono font-bold">{u.credits}</td>
                                <td className="p-4 font-mono text-green-600 font-bold">₹{u.totalSpent || 0}</td>
                                <td className="p-4 text-xs text-gray-500 font-medium whitespace-nowrap">{formatTableDate(u.lastActive)}</td>
                                <td className="p-4 text-right"><div className="flex items-center justify-end gap-2"><button onClick={() => auth.impersonateUser && auth.impersonateUser(u)} className="p-1.5 hover:bg-orange-100 rounded text-gray-500 hover:text-orange-600" title="View As User"><EyeIcon className="w-4 h-4"/></button><button onClick={() => setSelectedUserForDetail(u)} className="p-1.5 hover:bg-gray-200 rounded text-gray-500 hover:text-blue-600"><InformationCircleIcon className="w-4 h-4"/></button><button onClick={() => handleToggleBan(u)} className={`p-1.5 rounded transition-colors ${u.isBanned ? 'bg-red-600 text-white' : 'hover:bg-red-100 text-gray-500 hover:text-red-600'}`}><XIcon className="w-4 h-4"/></button></div></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/50"><button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-2 rounded hover:bg-gray-200 disabled:opacity-50"><ArrowLeftIcon className="w-4 h-4"/></button><span className="text-xs font-bold text-gray-500">Page {currentPage} of {totalPages}</span><button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="p-2 rounded hover:bg-gray-200 disabled:opacity-50"><ArrowRightIcon className="w-4 h-4"/></button></div>
            
            {selectedUserForDetail && auth.user && <UserDetailModal user={selectedUserForDetail} currentUser={auth.user} appConfig={appConfig} onClose={() => setSelectedUserForDetail(null)} />}
        </div>
    );
};
