'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, MessageCircle, Info } from 'lucide-react';

export default function CustomerNav() {
    const pathname = usePathname();

    const navItems = [
        { href: '/', label: 'Home', icon: Home },
        { href: '/products', label: 'Products', icon: Package },
        { href: '/contact', label: 'Contact', icon: MessageCircle },
        { href: '/about', label: 'About', icon: Info },
    ];

    // Don't show on dashboard pages
    if (pathname?.startsWith('/dashboard')) {
        return null;
    }

    return (
        <header className="fixed top-0 left-0 right-0 z-40 backdrop-blur-md bg-[#111827]/90 border-b border-white/10">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    AI Store
                </Link>

                <nav className="hidden md:flex items-center gap-8">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-2 text-sm font-medium transition-colors ${isActive
                                        ? 'text-white'
                                        : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                <item.icon size={16} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <Link
                    href="/dashboard"
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm"
                >
                    Owner Dashboard
                </Link>
            </div>

            {/* Mobile Navigation */}
            <nav className="md:hidden flex justify-around py-2 border-t border-white/10">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center gap-1 text-xs ${isActive ? 'text-indigo-400' : 'text-gray-400'
                                }`}
                        >
                            <item.icon size={18} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </header>
    );
}
