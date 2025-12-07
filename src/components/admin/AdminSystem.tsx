
import React, { useState, useEffect } from 'react';
import { AuditLog, ApiErrorLog } from '../../types';
import { getAuditLogs, getApiErrorLogs } from '../../firebase';

export const AdminSystem: React.FC = () => {
    const [systemLogType, setSystemLogType] = useState<'audit' | 'api'>('audit');
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [apiErrors, setApiErrors] = useState<ApiErrorLog[]>([]);
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
            } 
        } catch (e: any) { 
            console.error("Logs permission error", e); 
        } 
        setIsRefreshingLogs(false); 
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-fadeIn">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex gap-2"><button onClick={() => setSystemLogType('audit')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${systemLogType === 'audit' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}>Admin Audit</button><button onClick={() => setSystemLogType('api')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${systemLogType === 'api' ? 'bg-red-100 text-red-700' : 'text-gray-500 hover:bg-gray-100'}`}>API Errors</button></div>
                <button onClick={loadLogs} className="p-2 hover:bg-gray-200 rounded-full" title="Refresh"><div className={`w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full ${isRefreshingLogs ? 'animate-spin' : ''}`}></div></button>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider sticky top-0"><tr><th className="p-4">Time</th><th className="p-4">{systemLogType === 'audit' ? 'Admin' : 'Endpoint'}</th><th className="p-4">{systemLogType === 'audit' ? 'Action' : 'Error'}</th><th className="p-4">{systemLogType === 'audit' ? 'Details' : 'User ID'}</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                        {systemLogType === 'audit' ? auditLogs.map(log => (<tr key={log.id} className="hover:bg-gray-50"><td className="p-4 text-xs text-gray-500 whitespace-nowrap">{log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : '-'}</td><td className="p-4 font-bold text-gray-700">{log.adminEmail}</td><td className="p-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{log.action}</span></td><td className="p-4 text-xs text-gray-600 font-mono">{log.details}</td></tr>)) : apiErrors.map(err => (<tr key={err.id} className="hover:bg-red-50/30"><td className="p-4 text-xs text-gray-500 whitespace-nowrap">{err.timestamp ? new Date(err.timestamp.seconds * 1000).toLocaleString() : '-'}</td><td className="p-4 font-bold text-red-600">{err.endpoint}</td><td className="p-4 text-xs text-red-700 font-mono max-w-xs truncate" title={err.error}>{err.error}</td><td className="p-4 text-xs text-gray-500 font-mono">{err.userId}</td></tr>))}
                    </tbody>
                </table>
                {((systemLogType === 'audit' && auditLogs.length === 0) || (systemLogType === 'api' && apiErrors.length === 0)) && (<div className="p-8 text-center text-gray-400 text-sm">No logs found.</div>)}
            </div>
        </div>
    );
};
