'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Bell,
    Settings,
    ArrowLeft,
    Mail,
    Menu,
    X,
    MessageCircle
} from 'lucide-react';

export default function DashboardSidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    const navItems = [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
        { href: '/dashboard/approvals', icon: Bell, label: 'Approvals' },
        { href: '/dashboard/orders', icon: ShoppingCart, label: 'Orders' },
        { href: '/dashboard/products', icon: Package, label: 'Products' },
        { href: '/dashboard/subscribers', icon: Mail, label: 'Subscribers' },
        { href: '/dashboard/messages', icon: MessageCircle, label: 'Messages' },
        { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
    ];

    const closeSidebar = () => setIsOpen(false);

    return (
        <>
            {/* Mobile Header with Toggle */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#1f2937] border-b border-gray-700 px-4 py-3 flex items-center justify-between">
                <h1 className="text-lg font-bold text-white">Dashboard</h1>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-[#374151] rounded-lg transition-colors"
                >
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={closeSidebar}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-50
                w-64 bg-[#1f2937] border-r border-gray-700 p-6 flex flex-col
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="mb-8">
                    <h1 className="text-xl font-bold text-white">Owner Dashboard</h1>
                    <p className="text-slate-400 text-sm">Gadgets Store</p>
                </div>

                <nav className="flex-1 space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={closeSidebar}
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
        </>
    );
}

