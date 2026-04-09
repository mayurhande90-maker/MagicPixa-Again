
import React, { useState, useEffect } from 'react';
import { AuditLog, ApiErrorLog, User } from '../../types';
import { getAuditLogs, getApiErrorLogs, db } from '../../firebase';

export const AdminSystem: React.FC = () => {
    const [systemLogType, setSystemLogType] = useState<'audit' | 'api'>('audit');
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [apiErrors, setApiErrors] = useState<ApiErrorLog[]>([]);
    const [userMap, setUserMap] = useState<Record<string, { name: string; email: string }>>({});
    const [selectedError, setSelectedError] = useState<ApiErrorLog | null>(null);
    const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);

    useEffect(() => {
        loadLogs();
    }, [systemLogType]);

    const loadLogs = async () => { 
        setIsRefreshingLogs(true); 
        try { 
            if (systemLogType === 'audit') { 
                const logs = await getAuditLogs(50); 
                setAuditLogs(logs); 
            } else { 
                const errors = await getApiErrorLogs(50); 
                setApiErrors(errors); 
                
                if (db) {
                    const uniqueUserIds = Array.from(new Set(errors.map(e => e.userId).filter(id => id && id !== 'anonymous')));
                    const newUserMap: Record<string, { name: string; email: string }> = {};
                    
                    await Promise.all(uniqueUserIds.map(async (uid) => {
                        if (!uid) return;
                        try {
                            const userDoc = await db!.collection('users').doc(uid).get();
                            if (userDoc.exists) {
                                const data = userDoc.data() as User;
                                newUserMap[uid] = { name: data.name || 'Unknown', email: data.email || 'No Email' };
                            }
                        } catch (err) {
                            console.error("Failed to fetch user", uid, err);
                        }
                    }));
                    setUserMap(newUserMap);
                }
            } 
        } catch (e: any) { 
            console.error("Logs permission error", e); 
        } 
        setIsRefreshingLogs(false); 
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-fadeIn relative">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex gap-2">
                    <button onClick={() => setSystemLogType('audit')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${systemLogType === 'audit' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}>Admin Audit</button>
                    <button onClick={() => setSystemLogType('api')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${systemLogType === 'api' ? 'bg-red-100 text-red-700' : 'text-gray-500 hover:bg-gray-100'}`}>API Errors</button>
                </div>
                <button onClick={loadLogs} className="p-2 hover:bg-gray-200 rounded-full" title="Refresh">
                    <div className={`w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full ${isRefreshingLogs ? 'animate-spin' : ''}`}></div>
                </button>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10">
                        <tr>
                            <th className="p-4">Time</th>
                            <th className="p-4">{systemLogType === 'audit' ? 'Admin' : 'Endpoint'}</th>
                            <th className="p-4">{systemLogType === 'audit' ? 'Action' : 'Error'}</th>
                            <th className="p-4">{systemLogType === 'audit' ? 'Details' : 'User'}</th>
                            {systemLogType === 'api' && <th className="p-4 text-right">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {systemLogType === 'audit' ? auditLogs.map(log => (
                            <tr key={log.id} className="hover:bg-gray-50">
                                <td className="p-4 text-xs text-gray-500 whitespace-nowrap">{log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : '-'}</td>
                                <td className="p-4 font-bold text-gray-700">{log.adminEmail}</td>
                                <td className="p-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{log.action}</span></td>
                                <td className="p-4 text-xs text-gray-600 font-mono">{log.details}</td>
                            </tr>
                        )) : apiErrors.map(err => {
                            const user = err.userId && userMap[err.userId];
                            return (
                                <tr key={err.id} className="hover:bg-red-50/30">
                                    <td className="p-4 text-xs text-gray-500 whitespace-nowrap">{err.timestamp ? new Date(err.timestamp.seconds * 1000).toLocaleString() : '-'}</td>
                                    <td className="p-4 font-bold text-red-600">{err.endpoint}</td>
                                    <td className="p-4 text-xs text-red-700 font-mono max-w-xs truncate" title={err.error}>{err.error}</td>
                                    <td className="p-4 text-xs text-gray-500">
                                        {user ? (
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-700">{user.name}</span>
                                                <span className="text-[10px]">{user.email}</span>
                                            </div>
                                        ) : (
                                            <span className="font-mono">{err.userId || 'anonymous'}</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button 
                                            onClick={() => setSelectedError(err)}
                                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 shadow-sm"
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {((systemLogType === 'audit' && auditLogs.length === 0) || (systemLogType === 'api' && apiErrors.length === 0)) && (
                    <div className="p-8 text-center text-gray-400 text-sm">No logs found.</div>
                )}
            </div>

            {/* Error Details Modal */}
            {selectedError && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-red-50/30">
                            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                Error Details
                            </h3>
                            <button onClick={() => setSelectedError(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex flex-col gap-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Time</p>
                                    <p className="text-sm font-medium text-gray-800">
                                        {selectedError.timestamp ? new Date(selectedError.timestamp.seconds * 1000).toLocaleString() : 'Unknown'}
                                    </p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Endpoint</p>
                                    <p className="text-sm font-mono font-bold text-red-600 break-all">
                                        {selectedError.endpoint}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="bg-indigo-50/30 p-4 rounded-xl border border-indigo-100">
                                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-2">User Information</p>
                                {selectedError.userId && userMap[selectedError.userId] ? (
                                    <div className="flex flex-col gap-1">
                                        <p className="text-sm font-bold text-gray-900">{userMap[selectedError.userId].name}</p>
                                        <p className="text-sm text-gray-600">{userMap[selectedError.userId].email}</p>
                                        <p className="text-xs font-mono text-gray-400 mt-1">ID: {selectedError.userId}</p>
                                    </div>
                                ) : (
                                    <p className="text-sm font-mono text-gray-600">{selectedError.userId || 'anonymous'}</p>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Full Error Message</p>
                                <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
                                    <pre className="text-xs font-mono text-red-400 whitespace-pre-wrap break-words">
                                        {selectedError.error}
                                    </pre>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <button 
                                onClick={() => setSelectedError(null)}
                                className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
