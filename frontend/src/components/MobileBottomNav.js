'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, ArrowLeftRight, Wallet, Rocket, User } from 'lucide-react';

export default function MobileBottomNav() {
    const pathname = usePathname();

    const links = [
        { href: '/', icon: <LayoutGrid className="w-5 h-5" />, label: 'Home' },
        { href: '/exchange', icon: <ArrowLeftRight className="w-5 h-5" />, label: 'Exchange' },
        { href: '/launch', icon: <Rocket className="w-5 h-5" />, label: 'Launch' },
        { href: '/profile', icon: <User className="w-5 h-5" />, label: 'Profile' },
        { href: '/staking', icon: <Wallet className="w-5 h-5" />, label: 'Staking' },
    ];

    return (
        <nav className="mobile-bottom-nav">
            {links.map(({ href, icon, label }) => (
                <Link
                    key={href}
                    href={href}
                    className={pathname === href || pathname.startsWith(href + '/') && href !== '/'
                        ? 'bn-active'
                        : ''}
                    style={{
                        color: (pathname === href || (pathname.startsWith(href) && href !== '/'))
                            ? '#f59e0b'
                            : '#9ca3af',
                        textDecoration: 'none'
                    }}
                >
                    {icon}
                    {label}
                </Link>
            ))}
        </nav>
    );
}
