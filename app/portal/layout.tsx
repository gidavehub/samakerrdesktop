"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
    LayoutGrid, Users, CreditCard, Settings, LogOut,
    Building2, Map as MapIcon, Activity, FileText, Wrench,
    DollarSign, Receipt, TrendingUp, PieChart,
    ArrowLeft, ClipboardList
} from 'lucide-react';
import { auth, database } from '../../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import gsap from 'gsap';

interface ToolConfig {
    name: string;
    icon: React.ElementType;
    color: string;
    navItems: { label: string; icon: React.ElementType; href: string }[];
}

const toolConfigs: Record<string, ToolConfig> = {
    ledger: {
        name: 'Property Management Ledger',
        icon: Building2,
        color: '#0A58CA',
        navItems: [
            { label: 'All Properties', icon: Building2, href: '/portal/ledger' },
            { label: 'Map View', icon: MapIcon, href: '/portal/ledger/map' },
        ]
    },
    crm: {
        name: 'Client Relations & Requests',
        icon: Users,
        color: '#10b981',
        navItems: [
            { label: 'Active Tickets', icon: Activity, href: '/portal/crm' },
            { label: 'Maintenance Reports', icon: Wrench, href: '/portal/crm/maintenance' },
        ]
    },
    finances: {
        name: 'Financial Control Center',
        icon: DollarSign,
        color: '#0891b2',
        navItems: [
            { label: 'Overview', icon: PieChart, href: '/portal/finances' },
            { label: 'Transactions', icon: Receipt, href: '/portal/finances/transactions' },
            { label: 'Revenue', icon: TrendingUp, href: '/portal/finances/revenue' },
            { label: 'Billing Setup', icon: ClipboardList, href: '/portal/finances/billing' },
        ]
    }
};

const defaultNavItems = [
    { label: 'My Tools', icon: LayoutGrid, href: '/portal' },
    { label: 'Team Management', icon: Users, href: '/portal/team' },
    { label: 'Billing & Limits', icon: CreditCard, href: '#' },
    { label: 'Preferences', icon: Settings, href: '#' },
];

function getActiveTool(pathname: string): string | null {
    if (pathname.startsWith('/portal/ledger')) return 'ledger';
    if (pathname.startsWith('/portal/crm')) return 'crm';
    if (pathname.startsWith('/portal/finances')) return 'finances';
    return null;
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [company, setCompany] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const navRef = useRef<HTMLDivElement>(null);
    const prevToolRef = useRef<string | null>(null);

    const activeTool = getActiveTool(pathname);
    const toolConfig = activeTool ? toolConfigs[activeTool] : null;

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const companySnap = await get(ref(database, 'companies/' + currentUser.uid));
                if (companySnap.exists()) {
                    setCompany(companySnap.val());
                }
            } else {
                router.push('/auth');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [router]);

    // GSAP sidebar animation when tool context changes
    useEffect(() => {
        if (prevToolRef.current !== activeTool && navRef.current) {
            gsap.fromTo(navRef.current,
                { opacity: 0, x: -12 },
                { opacity: 1, x: 0, duration: 0.35, ease: 'power2.out' }
            );
        }
        prevToolRef.current = activeTool;
    }, [activeTool]);

    const handleSignOut = async () => {
        await signOut(auth);
        router.push('/');
    };

    if (loading) return null;

    const navItems = toolConfig ? toolConfig.navItems : defaultNavItems;
    const sidebarLabel = toolConfig ? toolConfig.name : (company?.plan || 'Suite');
    const accentColor = toolConfig?.color || company?.brandColor1 || '#0067b8';

    return (
        <div className="flex h-screen w-full bg-[#f3f2f1] font-inter overflow-hidden">
            {/* Sidebar */}
            <aside className="w-[280px] bg-white border-r border-[#e1dfdd] flex flex-col z-10 shrink-0">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-[#e1dfdd]">
                    <div className="mb-6">
                        <Image src="/logo-blue.png" alt="Sama Kerr" width={120} height={32} className="object-contain" />
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Always show company logo — never swap to tool icon */}
                        <div className="w-10 h-10 bg-[#f3f2f1] flex items-center justify-center font-semibold text-lg shrink-0 overflow-hidden border border-[#e1dfdd]">
                            {company?.companyLogo ? (
                                <img src={company.companyLogo} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                                <span className="text-[#323130]">
                                    {company?.companyName ? company.companyName.charAt(0).toUpperCase() : 'C'}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <p className="font-semibold text-[#1b1b1b] text-[15px] truncate">
                                {company?.companyName || 'My Company'}
                            </p>
                            <p
                                className="text-[12px] px-2 py-0.5 rounded-sm self-start mt-1 font-medium truncate max-w-full border"
                                style={{
                                    backgroundColor: `${accentColor}08`,
                                    color: accentColor,
                                    borderColor: `${accentColor}30`,
                                }}
                            >
                                {sidebarLabel}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav ref={navRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                    {toolConfig && (
                        <Link
                            href="/portal"
                            className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-[#605e5c] hover:text-[#1b1b1b] hover:bg-[#f3f2f1] transition-colors mb-2"
                        >
                            <ArrowLeft size={16} />
                            <span>Back to Hub</span>
                        </Link>
                    )}

                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = toolConfig
                            ? pathname === item.href
                            : pathname === item.href;
                        return (
                            <Link
                                href={item.href}
                                key={item.label}
                                className={`flex items-center gap-3 px-4 py-2.5 text-[14px] font-semibold transition-colors ${isActive
                                    ? 'text-white'
                                    : 'text-[#323130] hover:bg-[#f3f2f1]'
                                    }`}
                                style={isActive ? {
                                    backgroundColor: accentColor,
                                    color: '#fff',
                                } : undefined}
                            >
                                <Icon size={18} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-[#e1dfdd]">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 bg-[#f3f2f1] text-[#323130] flex items-center justify-center font-medium text-sm shrink-0 border border-[#c8c6c4] overflow-hidden">
                            {user?.photoURL ? (
                                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                            ) : (
                                user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'A'
                            )}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <p className="text-[14px] font-medium text-[#1b1b1b] truncate">{user?.displayName || 'Admin'}</p>
                            <p className="text-[12px] text-[#605e5c] truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-[#8a8886] text-[#323130] bg-white hover:bg-[#f3f2f1] text-[13px] font-medium transition-colors">
                        <LogOut size={16} />
                        <span>Sign out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 relative">
                    <div className="max-w-[1200px] mx-auto w-full h-full">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
