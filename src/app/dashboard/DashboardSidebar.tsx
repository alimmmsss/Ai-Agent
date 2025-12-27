'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Bell,
    Settings,
    ArrowLeft,
    Mail
} from 'lucide-react';

export default function DashboardSidebar() {
    const pathname = usePathname();

    const navItems = [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
        { href: '/dashboard/approvals', icon: Bell, label: 'Approvals' },
        { href: '/dashboard/orders', icon: ShoppingCart, label: 'Orders' },
        { href: '/dashboard/products', icon: Package, label: 'Products' },
        { href: '/dashboard/subscribers', icon: Mail, label: 'Subscribers' },
        { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <aside className="w-64 bg-[#1f2937] border-r border-gray-700 p-6 flex flex-col">
            <div className="mb-8">
                <h1 className="text-xl font-bold text-white">Owner Dashboard</h1>
                <p className="text-slate-400 text-sm">AI Sales Agent</p>
            </div>

            <nav className="flex-1 space-y-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-400 hover:bg-[#374151] hover:text-white'
                                }`}
                        >
                            <item.icon size={20} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <Link
                href="/"
                className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white transition-colors mt-auto"
            >
                <ArrowLeft size={20} />
                <span>Back to Store</span>
            </Link>
        </aside>
    );
}
