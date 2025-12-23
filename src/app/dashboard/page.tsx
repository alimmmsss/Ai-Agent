'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart, Package, CheckCircle, Clock, DollarSign, TrendingUp } from 'lucide-react';
import type { Order, Product } from '@/lib/types';

export default function DashboardPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [ordersRes, productsRes] = await Promise.all([
                    fetch('/api/orders'),
                    fetch('/api/products')
                ]);
                setOrders(await ordersRes.json());
                setProducts(await productsRes.json());
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const stats = {
        totalOrders: orders.length,
        pendingApprovals: orders.filter(o => o.status === 'pending_approval').length,
        completedOrders: orders.filter(o => o.status === 'delivered').length,
        totalRevenue: orders.filter(o => o.paymentStatus === 'completed').reduce((sum, o) => sum + o.finalAmount, 0),
        totalProducts: products.length,
        lowStock: products.filter(p => p.stock < 10).length
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
            <h1 className="text-3xl font-bold text-white mb-8">Dashboard Overview</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <StatCard
                    icon={<Clock className="text-yellow-400" />}
                    label="Pending Approvals"
                    value={stats.pendingApprovals}
                    color="yellow"
                />
                <StatCard
                    icon={<ShoppingCart className="text-blue-400" />}
                    label="Total Orders"
                    value={stats.totalOrders}
                    color="blue"
                />
                <StatCard
                    icon={<CheckCircle className="text-green-400" />}
                    label="Completed"
                    value={stats.completedOrders}
                    color="green"
                />
                <StatCard
                    icon={<DollarSign className="text-emerald-400" />}
                    label="Total Revenue"
                    value={`৳${stats.totalRevenue.toLocaleString()}`}
                    color="emerald"
                />
                <StatCard
                    icon={<Package className="text-purple-400" />}
                    label="Products"
                    value={stats.totalProducts}
                    color="purple"
                />
                <StatCard
                    icon={<TrendingUp className="text-red-400" />}
                    label="Low Stock Items"
                    value={stats.lowStock}
                    color="red"
                />
            </div>

            {/* Recent Orders */}
            <div className="bg-[#1f2937] rounded-xl border border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Recent Orders</h2>
                {orders.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No orders yet. Orders will appear here when customers start shopping.</p>
                ) : (
                    <div className="space-y-4">
                        {orders.slice(0, 5).map((order) => (
                            <div key={order.id} className="flex items-center justify-between p-4 bg-[#374151] rounded-lg">
                                <div>
                                    <p className="text-white font-medium">{order.id}</p>
                                    <p className="text-gray-400 text-sm">{order.items.map(i => i.productName).join(', ')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-indigo-400 font-semibold">৳{order.finalAmount.toLocaleString()}</p>
                                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                                        {order.status.replace(/_/g, ' ')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
    return (
        <div className={`bg-[#1f2937] rounded-xl border border-gray-700 p-6 hover:border-${color}-500/50 transition-colors`}>
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 bg-${color}-500/20 rounded-xl flex items-center justify-center`}>
                    {icon}
                </div>
                <div>
                    <p className="text-gray-400 text-sm">{label}</p>
                    <p className="text-2xl font-bold text-white">{value}</p>
                </div>
            </div>
        </div>
    );
}

function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        'pending_approval': 'bg-yellow-500/20 text-yellow-400',
        'approved': 'bg-blue-500/20 text-blue-400',
        'paid': 'bg-green-500/20 text-green-400',
        'shipped': 'bg-purple-500/20 text-purple-400',
        'delivered': 'bg-emerald-500/20 text-emerald-400',
        'rejected': 'bg-red-500/20 text-red-400',
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
}
