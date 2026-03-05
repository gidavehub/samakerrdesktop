"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { LayoutGrid, Users, CreditCard, Settings, LogOut } from 'lucide-react';
import { auth, database } from '../../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, get } from 'firebase/database';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [company, setCompany] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                // Fetch company details
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

    const handleSignOut = async () => {
        await signOut(auth);
        router.push('/');
    };

    if (loading) return null;

    return (
        <div className="flex h-screen w-full bg-[#f3f2f1] font-inter overflow-hidden">
            {/* Sidebar */}
            <aside className="w-[280px] bg-white border-r border-[#e1dfdd] flex flex-col z-10 shrink-0">
                <div className="p-6 pb-4 border-b border-[#e1dfdd]">
                    <div className="mb-6 flex items-center gap-2">
                        <Image src="/logo-blue.png" alt="Sama Kerr" width={32} height={32} className="object-contain" />
                        <span className="font-semibold text-[#0067b8] text-xl tracking-tight">Sama Kerr</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-[#0067b8] text-white flex items-center justify-center font-semibold text-lg shrink-0">
                            {company?.companyName ? company.companyName.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <p className="font-semibold text-[#1b1b1b] text-[15px] truncate">{company?.companyName || 'My Company'}</p>
                            <p className="text-[12px] bg-[#f3f9fd] text-[#0067b8] px-2 py-0.5 rounded-sm self-start mt-1 font-medium border border-[#cce3f5] truncate max-w-full">{company?.plan || 'Suite'}</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
                    <Link href="/portal" className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-[14px] font-medium transition-colors ${pathname === '/portal' ? 'bg-[#f3f9fd] text-[#0067b8] relative after:absolute after:left-0 after:top-1/2 after:-translate-y-1/2 after:w-1 after:h-5 after:bg-[#0067b8] after:rounded-r-full' : 'text-[#323130] hover:bg-[#f3f2f1]'}`}>
                        <LayoutGrid size={20} />
                        <span>My Tools</span>
                    </Link>
                    <Link href="/portal/team" className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-[14px] font-medium transition-colors ${pathname.includes('/portal/team') ? 'bg-[#f3f9fd] text-[#0067b8] relative after:absolute after:left-0 after:top-1/2 after:-translate-y-1/2 after:w-1 after:h-5 after:bg-[#0067b8] after:rounded-r-full' : 'text-[#323130] hover:bg-[#f3f2f1]'}`}>
                        <Users size={20} />
                        <span>Team Management</span>
                    </Link>
                    <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-[14px] font-medium text-[#323130] hover:bg-[#f3f2f1] transition-colors">
                        <CreditCard size={20} />
                        <span>Billing & Limits</span>
                    </Link>
                    <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-[14px] font-medium text-[#323130] hover:bg-[#f3f2f1] transition-colors">
                        <Settings size={20} />
                        <span>Preferences</span>
                    </Link>
                </nav>

                <div className="p-4 border-t border-[#e1dfdd]">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-[#f3f2f1] text-[#323130] flex items-center justify-center font-medium text-sm shrink-0 border border-[#c8c6c4]">
                            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <p className="text-[14px] font-medium text-[#1b1b1b] truncate">{user?.displayName || 'Admin'}</p>
                            <p className="text-[12px] text-[#605e5c] truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded border border-[#8a8886] text-[#323130] bg-white hover:bg-[#f3f2f1] text-[13px] font-medium transition-colors">
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
