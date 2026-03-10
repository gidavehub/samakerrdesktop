"use client";

import { useState, useEffect } from 'react';
import { Search, TrendingUp, ArrowUpRight, Home, BarChart3, Calendar } from 'lucide-react';
import Image from 'next/image';
import { auth, db } from '../../../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface Property {
    id: string;
    name: string;
    address: string;
    tenantName: string;
    completionState: string;
}

export default function RevenuePage() {
    const [properties, setProperties] = useState<Property[]>([]);
    const [companyId, setCompanyId] = useState<string | null>(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            if (user) setCompanyId(user.uid);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!companyId) return;
        const q = query(collection(db, 'properties'), where('companyId', '==', companyId));
        const unsub = onSnapshot(q, (snapshot) => {
            setProperties(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Property)));
        });
        return () => unsub();
    }, [companyId]);

    const occupiedCount = properties.filter(p => p.tenantName).length;
    const occupancyRate = properties.length > 0 ? Math.round((occupiedCount / properties.length) * 100) : 0;

    return (
        <div className="flex flex-col h-full -m-4 sm:-m-8">
            <div className="p-8 flex-1 overflow-y-auto">
                <h1 className="text-[28px] font-bold text-[#1b1b1b] tracking-tight mb-1.5">Revenue Analytics</h1>
                <p className="text-sm text-[#605e5c] mb-6">Track rent collection performance and portfolio occupancy.</p>

                {/* Search */}
                <div className="flex items-center gap-2.5 border-b border-[#8a8886] focus-within:border-b-2 focus-within:border-[#0067b8] pb-1.5 pt-2 max-w-[380px] transition-all mb-8">
                    <Search size={16} className="text-[#a19f9d] shrink-0" />
                    <input type="text" placeholder="Search..." className="border-none bg-transparent w-full outline-none text-[15px] text-[#1b1b1b] placeholder:text-[#605e5c] placeholder:font-light" />
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="bg-white border border-[#e1dfdd] p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 bg-emerald-50 flex items-center justify-center"><TrendingUp size={18} className="text-emerald-600" /></div>
                            <span className="text-sm font-semibold text-[#605e5c]">Monthly Revenue</span>
                        </div>
                        <p className="text-[26px] font-bold text-[#1b1b1b]">D 0</p>
                        <p className="text-xs text-emerald-600 mt-1 flex items-center gap-0.5"><ArrowUpRight size={12} /> vs last month</p>
                    </div>
                    <div className="bg-white border border-[#e1dfdd] p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 bg-blue-50 flex items-center justify-center"><BarChart3 size={18} className="text-blue-600" /></div>
                            <span className="text-sm font-semibold text-[#605e5c]">Annual Revenue</span>
                        </div>
                        <p className="text-[26px] font-bold text-[#1b1b1b]">D 0</p>
                        <p className="text-xs text-[#a19f9d] mt-1">Year to date</p>
                    </div>
                    <div className="bg-white border border-[#e1dfdd] p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 bg-cyan-50 flex items-center justify-center"><Home size={18} className="text-cyan-600" /></div>
                            <span className="text-sm font-semibold text-[#605e5c]">Occupancy Rate</span>
                        </div>
                        <p className="text-[26px] font-bold text-[#1b1b1b]">{occupancyRate}%</p>
                        <p className="text-xs text-[#a19f9d] mt-1">{occupiedCount} of {properties.length} occupied</p>
                    </div>
                    <div className="bg-white border border-[#e1dfdd] p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 bg-violet-50 flex items-center justify-center"><Calendar size={18} className="text-violet-600" /></div>
                            <span className="text-sm font-semibold text-[#605e5c]">Avg. Collection</span>
                        </div>
                        <p className="text-[26px] font-bold text-[#1b1b1b]">D 0</p>
                        <p className="text-xs text-[#a19f9d] mt-1">Per property</p>
                    </div>
                </div>

                {/* Property Revenue Table */}
                <div className="bg-white border border-[#e1dfdd] overflow-hidden">
                    <div className="px-5 py-3 bg-[#faf9f8] border-b border-[#e1dfdd]">
                        <h3 className="text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Revenue by Property</h3>
                    </div>
                    {properties.length > 0 ? properties.map(p => (
                        <div key={p.id} className="flex items-center justify-between px-5 py-4 border-b border-[#f3f2f1] hover:bg-[#f3f9fd] transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-emerald-50 flex items-center justify-center">
                                    <Home size={18} className="text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-[#1b1b1b]">{p.name}</p>
                                    <p className="text-xs text-[#a19f9d]">{p.tenantName || 'Vacant'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-[#1b1b1b]">D 0</p>
                                <p className="text-[11px] text-[#a19f9d]">This month</p>
                            </div>
                        </div>
                    )) : (
                        <div className="px-5 py-12 text-center text-sm text-[#a19f9d]">
                            No properties found. Add properties in the Ledger to track revenue.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
