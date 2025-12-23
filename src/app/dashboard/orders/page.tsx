'use client';

import { useEffect, useState } from 'react';
import { Eye, Truck, CheckCircle, XCircle } from 'lucide-react';
import type { Order } from '@/lib/types';

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    async function fetchOrders() {
        try {
            const res = await fetch('/api/orders');
            const data = await res.json();
            setOrders(data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }

    async function updateOrderStatus(orderId: string, status: Order['status']) {
        try {
            await fetch('/api/orders', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, updates: { status } })
            });
            await fetchOrders();
        } catch (error) {
            console.error('Error:', error);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-2">Orders</h1>
            <p className="text-gray-400 mb-8">Manage and track all customer orders</p>

            {orders.length === 0 ? (
                <div className="bg-[#1f2937] rounded-xl border border-gray-700 p-12 text-center">
                    <p className="text-gray-400">No orders yet.</p>
                </div>
            ) : (
                <div className="bg-[#1f2937] rounded-xl border border-gray-700 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-[#374151]/50">
                            <tr>
                                <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Order ID</th>
                                <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Items</th>
                                <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Customer</th>
                                <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Amount</th>
                                <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Status</th>
                                <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {orders.map((order) => (
                                <tr key={order.id} className="hover:bg-[#374151]/30">
                                    <td className="px-6 py-4 text-white font-mono text-sm">{order.id}</td>
                                    <td className="px-6 py-4">
                                        <span className="text-white">{order.items.map(i => i.productName).join(', ')}</span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400">
                                        {order.customerInfo?.name || 'Not collected'}
                                    </td>
                                    <td className="px-6 py-4 text-indigo-400 font-semibold">
                                        ৳{order.finalAmount.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}>
                                            {order.status.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setSelectedOrder(order)}
                                                className="p-2 text-gray-400 hover:text-white hover:bg-[#374151] rounded-lg"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            {order.status === 'shipping_approved' && (
                                                <button
                                                    onClick={() => updateOrderStatus(order.id, 'shipped')}
                                                    className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 rounded-lg"
                                                    title="Mark as Shipped"
                                                >
                                                    <Truck size={16} />
                                                </button>
                                            )}
                                            {order.status === 'shipped' && (
                                                <button
                                                    onClick={() => updateOrderStatus(order.id, 'delivered')}
                                                    className="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/20 rounded-lg"
                                                    title="Mark as Delivered"
                                                >
                                                    <CheckCircle size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Order Detail Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1f2937] rounded-xl border border-gray-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Order {selectedOrder.id}</h3>
                            <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-white">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-[#374151]/50 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-gray-400 mb-2">Status</h4>
                                <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(selectedOrder.status)}`}>
                                    {selectedOrder.status.replace(/_/g, ' ')}
                                </span>
                            </div>

                            <div className="bg-[#374151]/50 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-gray-400 mb-2">Items</h4>
                                {selectedOrder.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between py-2">
                                        <span className="text-white">{item.productName} x{item.quantity}</span>
                                        <span className="text-gray-400">৳{(item.finalPrice * item.quantity).toLocaleString()}</span>
                                    </div>
                                ))}
                                <div className="border-t border-gray-600 mt-2 pt-2 flex justify-between">
                                    <span className="text-white font-medium">Total</span>
                                    <span className="text-indigo-400 font-bold">৳{selectedOrder.finalAmount.toLocaleString()}</span>
                                </div>
                            </div>

                            {selectedOrder.customerInfo && (
                                <div className="bg-[#374151]/50 rounded-lg p-4">
                                    <h4 className="text-sm font-medium text-gray-400 mb-2">Customer Information</h4>
                                    <p className="text-white">{selectedOrder.customerInfo.name}</p>
                                    <p className="text-gray-400">{selectedOrder.customerInfo.phone}</p>
                                    <p className="text-gray-400">{selectedOrder.customerInfo.address}</p>
                                    <p className="text-gray-400">{selectedOrder.customerInfo.city}</p>
                                </div>
                            )}

                            <div className="bg-[#374151]/50 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-gray-400 mb-2">Timeline</h4>
                                <p className="text-gray-400 text-sm">Created: {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                                {selectedOrder.approvedAt && (
                                    <p className="text-gray-400 text-sm">Approved: {new Date(selectedOrder.approvedAt).toLocaleString()}</p>
                                )}
                                {selectedOrder.paidAt && (
                                    <p className="text-gray-400 text-sm">Paid: {new Date(selectedOrder.paidAt).toLocaleString()}</p>
                                )}
                                {selectedOrder.shippedAt && (
                                    <p className="text-gray-400 text-sm">Shipped: {new Date(selectedOrder.shippedAt).toLocaleString()}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        'pending_approval': 'bg-yellow-500/20 text-yellow-400',
        'approved': 'bg-blue-500/20 text-blue-400',
        'info_collected': 'bg-cyan-500/20 text-cyan-400',
        'payment_pending': 'bg-orange-500/20 text-orange-400',
        'paid': 'bg-green-500/20 text-green-400',
        'shipping_pending': 'bg-indigo-500/20 text-indigo-400',
        'shipping_approved': 'bg-purple-500/20 text-purple-400',
        'shipped': 'bg-violet-500/20 text-violet-400',
        'delivered': 'bg-emerald-500/20 text-emerald-400',
        'cancelled': 'bg-gray-500/20 text-gray-400',
        'rejected': 'bg-red-500/20 text-red-400',
    };
    return colors[status] || 'bg-slate-500/20 text-gray-400';
}
