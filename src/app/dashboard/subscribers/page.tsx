'use client';

import { useEffect, useState } from 'react';
import { Mail, Trash2, UserCheck, UserX } from 'lucide-react';

interface Subscriber {
    id: string;
    email: string;
    status: string;
    subscribedAt: string;
    unsubscribedAt: string | null;
}

export default function SubscribersPage() {
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'unsubscribed'>('all');

    useEffect(() => {
        fetchSubscribers();
    }, []);

    async function fetchSubscribers() {
        try {
            const res = await fetch('/api/subscribers');
            const data = await res.json();
            setSubscribers(data);
        } catch (error) {
            console.error('Error fetching subscribers:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleUnsubscribe(id: string) {
        try {
            await fetch(`/api/subscribers?id=${id}`, { method: 'DELETE' });
            fetchSubscribers();
        } catch (error) {
            console.error('Error unsubscribing:', error);
        }
    }

    const filteredSubscribers = subscribers.filter(sub => {
        if (filter === 'all') return true;
        return sub.status === filter;
    });

    const stats = {
        total: subscribers.length,
        active: subscribers.filter(s => s.status === 'active').length,
        unsubscribed: subscribers.filter(s => s.status === 'unsubscribed').length,
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Newsletter Subscribers</h1>
                    <p className="text-gray-400 mt-1">Manage your email subscribers</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-[#1f2937] rounded-xl border border-gray-700 p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                            <Mail className="text-indigo-400" size={24} />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Total Subscribers</p>
                            <p className="text-2xl font-bold text-white">{stats.total}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-[#1f2937] rounded-xl border border-gray-700 p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                            <UserCheck className="text-green-400" size={24} />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Active</p>
                            <p className="text-2xl font-bold text-white">{stats.active}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-[#1f2937] rounded-xl border border-gray-700 p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                            <UserX className="text-red-400" size={24} />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Unsubscribed</p>
                            <p className="text-2xl font-bold text-white">{stats.unsubscribed}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6">
                {(['all', 'active', 'unsubscribed'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f
                                ? 'bg-indigo-600 text-white'
                                : 'bg-[#374151] text-gray-400 hover:text-white'
                            }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Subscribers Table */}
            <div className="bg-[#1f2937] rounded-xl border border-gray-700 overflow-hidden">
                {filteredSubscribers.length === 0 ? (
                    <div className="text-center py-12">
                        <Mail className="mx-auto text-gray-600 mb-4" size={48} />
                        <p className="text-gray-400">No subscribers yet</p>
                        <p className="text-gray-500 text-sm mt-1">Subscribers will appear here when users sign up</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-[#374151]">
                            <tr>
                                <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Email</th>
                                <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Status</th>
                                <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Subscribed</th>
                                <th className="text-right text-gray-400 text-sm font-medium px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {filteredSubscribers.map((subscriber) => (
                                <tr key={subscriber.id} className="hover:bg-[#374151]/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="text-white">{subscriber.email}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${subscriber.status === 'active'
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-red-500/20 text-red-400'
                                            }`}>
                                            {subscriber.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400 text-sm">
                                        {new Date(subscriber.subscribedAt).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                        })}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {subscriber.status === 'active' && (
                                            <button
                                                onClick={() => handleUnsubscribe(subscriber.id)}
                                                className="text-red-400 hover:text-red-300 transition-colors"
                                                title="Unsubscribe"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
