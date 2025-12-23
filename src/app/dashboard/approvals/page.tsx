'use client';

import { useEffect, useState } from 'react';
import { Check, X, MessageSquare } from 'lucide-react';
import type { ApprovalRequest } from '@/lib/types';

export default function ApprovalsPage() {
    const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [counterOffer, setCounterOffer] = useState('');
    const [showCounterModal, setShowCounterModal] = useState<string | null>(null);

    useEffect(() => {
        fetchApprovals();
    }, []);

    async function fetchApprovals() {
        try {
            const res = await fetch('/api/approvals');
            const data = await res.json();
            setApprovals(data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleApproval(orderId: string, action: 'approve' | 'reject') {
        setProcessing(orderId);
        try {
            await fetch('/api/approvals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId,
                    action,
                    counterOffer: action === 'reject' ? counterOffer : undefined
                })
            });

            // Refresh
            await fetchApprovals();
            setShowCounterModal(null);
            setCounterOffer('');
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setProcessing(null);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const pendingApprovals = approvals.filter(a => a.status === 'pending');

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-2">Pending Approvals</h1>
            <p className="text-gray-400 mb-8">Review and approve customer orders before processing</p>

            {pendingApprovals.length === 0 ? (
                <div className="bg-[#1f2937] rounded-xl border border-gray-700 p-12 text-center">
                    <div className="w-16 h-16 bg-[#374151] rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="text-gray-500" size={32} />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">All caught up!</h3>
                    <p className="text-gray-400">No pending approvals. New orders will appear here.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {pendingApprovals.map((approval) => (
                        <div key={approval.id} className="bg-[#1f2937] rounded-xl border border-gray-700 p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${approval.type === 'deal' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                                            }`}>
                                            {approval.type === 'deal' ? '🛒 New Order' : '📦 Shipping'}
                                        </span>
                                        <span className="text-gray-500 text-sm">{approval.orderId}</span>
                                    </div>
                                    <p className="text-white font-medium">{approval.summary}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-indigo-400">৳{approval.totalAmount.toLocaleString()}</p>
                                    {approval.discountPercent > 0 && (
                                        <p className="text-yellow-400 text-sm">{approval.discountPercent}% discount applied</p>
                                    )}
                                </div>
                            </div>

                            {/* Items */}
                            <div className="bg-[#374151]/50 rounded-lg p-4 mb-4">
                                <h4 className="text-sm font-medium text-gray-400 mb-2">Order Items:</h4>
                                {approval.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm py-1">
                                        <span className="text-white">{item.productName} x{item.quantity}</span>
                                        <span className="text-gray-400">৳{(item.finalPrice * item.quantity).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Customer Info */}
                            {approval.customerInfo && (
                                <div className="bg-[#374151]/50 rounded-lg p-4 mb-4">
                                    <h4 className="text-sm font-medium text-gray-400 mb-2">Customer:</h4>
                                    <p className="text-white">{approval.customerInfo.name}</p>
                                    <p className="text-gray-400 text-sm">{approval.customerInfo.phone}</p>
                                    <p className="text-gray-400 text-sm">{approval.customerInfo.address}, {approval.customerInfo.city}</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleApproval(approval.orderId, 'approve')}
                                    disabled={processing === approval.orderId}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                    <Check size={18} />
                                    Approve
                                </button>
                                <button
                                    onClick={() => setShowCounterModal(approval.orderId)}
                                    disabled={processing === approval.orderId}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                    <X size={18} />
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Counter Offer Modal */}
            {showCounterModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1f2937] rounded-xl border border-gray-700 p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-white mb-4">Reject with Counter-Offer</h3>
                        <textarea
                            value={counterOffer}
                            onChange={(e) => setCounterOffer(e.target.value)}
                            placeholder="Enter a counter-offer or reason for rejection..."
                            className="w-full px-4 py-3 bg-[#374151] border border-gray-600 rounded-lg text-white placeholder-slate-500 resize-none h-32 mb-4"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCounterModal(null)}
                                className="flex-1 px-4 py-3 bg-[#374151] text-white rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleApproval(showCounterModal, 'reject')}
                                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg"
                            >
                                Confirm Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
