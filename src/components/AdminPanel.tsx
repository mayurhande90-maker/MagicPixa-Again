import React, { useState, useEffect, useMemo } from 'react';
import { User, AuthProps } from '../types';
import { getAllUsers, addCreditsToUser } from '../firebase';
import { UsersIcon, CreditCardIcon, XIcon, SparklesIcon } from './icons';

interface AdminPanelProps {
    auth: AuthProps;
}

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
            <div className="relative bg-white w-full max-w-md m-4 p-6 rounded-2xl shadow-xl" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><XIcon className="w-6 h-6" /></button>
                <h2 className="text-xl font-bold text-[#1E1E1E] mb-2">Add Credits</h2>
                <div className="p-3 bg-gray-50 rounded-lg mb-4">
                    <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
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
                        <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-semibold text-white bg-[#0079F2] rounded-lg hover:bg-blue-700 disabled:opacity-50">
                            {isLoading ? 'Adding...' : 'Confirm'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AdminPanel: React.FC<AdminPanelProps> = ({ auth }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const userList = await getAllUsers();
                setUsers(userList);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load users.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const filteredUsers = useMemo(() => {
        if (!searchTerm) return users;
        return users.filter(user =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    const handleCreditUpdateSuccess = (updatedUser: User) => {
        setUsers(prevUsers => prevUsers.map(u => u.uid === updatedUser.uid ? updatedUser : u));
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <div className='mb-8'>
                    <h2 className="text-3xl font-bold text-[#1E1E1E]">Admin Panel</h2>
                    <p className="text-[#5F6368] mt-1">Manage users and application settings.</p>
                </div>

                <div className="bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                        <h3 className="text-xl font-bold text-[#1E1E1E] flex items-center gap-2">
                            <UsersIcon className="w-6 h-6" /> User Management
                        </h3>
                        <div className="w-full md:w-72">
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0079F2]"
                            />
                        </div>
                    </div>

                    {isLoading ? (
                        <p className="text-center py-10">Loading users...</p>
                    ) : error ? (
                        <p className="text-center py-10 text-red-500">{error}</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Sign-up Date</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Credits</th>
                                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredUsers.map(user => (
                                        <tr key={user.uid}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {user.signUpDate ? new Date(user.signUpDate.seconds * 1000).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 flex items-center gap-1">
                                                <SparklesIcon className="w-4 h-4 text-yellow-500"/> {user.credits}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => setSelectedUser(user)}
                                                    className="flex items-center gap-1 text-sm bg-blue-50 text-[#0079F2] font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                                                >
                                                    <CreditCardIcon className="w-4 h-4" /> Add Credits
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                             {filteredUsers.length === 0 && <p className="text-center py-10 text-gray-500">No users found.</p>}
                        </div>
                    )}
                </div>
            </div>
            {selectedUser && auth.user && (
                <AddCreditsModal
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                    onSuccess={handleCreditUpdateSuccess}
                    adminUid={auth.user.uid}
                />
            )}
        </div>
    );
};

export default AdminPanel;
