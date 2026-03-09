"use client";

import { useState, useEffect, useRef } from 'react';
import { Search, Activity, MessageSquare, Clock, AlertTriangle, CheckCircle2, Wrench } from 'lucide-react';
import Image from 'next/image';
import { auth, database } from '../../../lib/firebase';
import { ref, onValue, get } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import gsap from 'gsap';

interface Property {
    id: string;
    name: string;
    address: string;
    tenantName: string;
    completionState: string;
    nawecCashPower: string;
    nawecWaterBill: string;
}

interface MaintenanceReport {
    id: string;
    propertyId: string;
    propertyName: string;
    category: string;
    subIssues: string[];
    urgency: string;
    description: string;
    photoCount: number;
    status: string;
    createdAt: number;
}

export default function CRMDashboard() {
    const [properties, setProperties] = useState<Property[]>([]);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [companyInfo, setCompanyInfo] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [recentReports, setRecentReports] = useState<MaintenanceReport[]>([]);
    const contentRef = useRef<HTMLDivElement>(null);

    const accentColor = companyInfo?.brandColor1 || '#10b981';

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCompanyId(user.uid);
                const snap = await get(ref(database, 'companies/' + user.uid));
                if (snap.exists()) setCompanyInfo(snap.val());
            }
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!companyId) return;
        const unsub = onValue(ref(database, `properties/${companyId}`), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const list: Property[] = Object.entries(data).map(([key, val]: [string, any]) => ({ id: key, ...val }));
                setProperties(list);
            } else {
                setProperties([]);
            }
        });
        return () => unsub();
    }, [companyId]);

    // Fetch maintenance reports across all properties
    useEffect(() => {
        if (!companyId) return;
        const unsub = onValue(ref(database, `maintenance/${companyId}`), (snapshot) => {
            if (!snapshot.exists()) { setRecentReports([]); return; }
            const data = snapshot.val();
            const reports: MaintenanceReport[] = [];
            // data structure: maintenance/companyId/propertyId/reportId
            for (const [propId, propReports] of Object.entries(data) as [string, any][]) {
                const prop = properties.find(p => p.id === propId);
                if (typeof propReports === 'object' && propReports !== null) {
                    for (const [reportId, reportData] of Object.entries(propReports) as [string, any][]) {
                        reports.push({
                            id: reportId,
                            propertyId: propId,
                            propertyName: prop?.name || 'Unknown Property',
                            category: reportData.category || '',
                            subIssues: reportData.subIssues || [],
                            urgency: reportData.urgency || 'medium',
                            description: reportData.description || '',
                            photoCount: reportData.photoCount || 0,
                            status: reportData.status || 'pending',
                            createdAt: reportData.createdAt || 0,
                        });
                    }
                }
            }
            reports.sort((a, b) => b.createdAt - a.createdAt);
            setRecentReports(reports);
        });
        return () => unsub();
    }, [companyId, properties]);

    const filtered = properties.filter(p =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tenantName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pendingCount = recentReports.filter(r => r.status === 'pending').length;
    const inProgressCount = recentReports.filter(r => r.status === 'in_progress').length;
    const resolvedCount = recentReports.filter(r => r.status === 'resolved').length;

    const urgencyColors: Record<string, { bg: string; text: string; label: string }> = {
        low: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Low' },
        medium: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Medium' },
        high: { bg: 'bg-red-50', text: 'text-red-500', label: 'Urgent' },
    };

    const categoryLabels: Record<string, string> = {
        plumbing: 'Plumbing',
        electrical: 'Electrical',
        doors_windows: 'Doors & Windows',
        walls_paint: 'Walls & Paint',
        pest: 'Pests',
        hvac: 'AC & Ventilation',
        gas: 'Gas & Cooking',
        other: 'Other',
    };

    return (
        <div className="flex flex-col h-full -m-4 sm:-m-8">
            <div ref={contentRef} className="p-8 flex-1 overflow-y-auto">
                <h1 className="text-[28px] font-bold text-[#1b1b1b] tracking-tight mb-1.5">Client Relations</h1>
                <p className="text-sm text-[#605e5c] mb-6">Monitor maintenance requests and manage tenant communications across all properties.</p>

                {/* Search */}
                <div className="flex items-center gap-2.5 border-b border-[#8a8886] focus-within:border-b-2 focus-within:border-[#0067b8] pb-1.5 pt-2 max-w-[380px] transition-all mb-8">
                    <Search size={16} className="text-[#a19f9d] shrink-0" />
                    <input type="text" placeholder="Search tenants or properties..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        className="border-none bg-transparent w-full outline-none text-[15px] text-[#1b1b1b] placeholder:text-[#605e5c] placeholder:font-light" />
                </div>

                {properties.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                        <Image src="/office-collaboration.png" alt="No Properties" width={300} height={200} className="mb-6 opacity-80 object-cover" />
                        <h3 className="text-xl font-semibold text-[#1b1b1b] mb-2">No properties to manage</h3>
                        <p className="text-sm text-[#605e5c]">Add properties in the Property Management Ledger first to see them here.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-white border border-[#e1dfdd] p-5">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-9 h-9 bg-amber-50 flex items-center justify-center"><AlertTriangle size={18} className="text-amber-500" /></div>
                                    <span className="text-sm font-semibold text-[#1b1b1b]">Pending</span>
                                </div>
                                <p className="text-[28px] font-bold text-[#1b1b1b]">{pendingCount}</p>
                                <p className="text-xs text-[#a19f9d] mt-1">{pendingCount === 0 ? 'No pending requests' : 'Awaiting action'}</p>
                            </div>
                            <div className="bg-white border border-[#e1dfdd] p-5">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-9 h-9 bg-blue-50 flex items-center justify-center"><Clock size={18} className="text-blue-500" /></div>
                                    <span className="text-sm font-semibold text-[#1b1b1b]">In Progress</span>
                                </div>
                                <p className="text-[28px] font-bold text-[#1b1b1b]">{inProgressCount}</p>
                                <p className="text-xs text-[#a19f9d] mt-1">{inProgressCount === 0 ? 'No active work orders' : 'Being addressed'}</p>
                            </div>
                            <div className="bg-white border border-[#e1dfdd] p-5">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-9 h-9 bg-emerald-50 flex items-center justify-center"><CheckCircle2 size={18} className="text-emerald-500" /></div>
                                    <span className="text-sm font-semibold text-[#1b1b1b]">Resolved</span>
                                </div>
                                <p className="text-[28px] font-bold text-[#1b1b1b]">{resolvedCount}</p>
                                <p className="text-xs text-[#a19f9d] mt-1">This month</p>
                            </div>
                        </div>

                        {/* Recent Maintenance Reports */}
                        {recentReports.length > 0 && (
                            <div className="bg-white border border-[#e1dfdd] overflow-hidden">
                                <div className="px-5 py-3 bg-[#faf9f8] border-b border-[#e1dfdd] flex items-center justify-between">
                                    <h3 className="text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Recent Maintenance Reports</h3>
                                    <span className="text-xs font-semibold" style={{ color: accentColor }}>{recentReports.length} total</span>
                                </div>
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[#e1dfdd] bg-[#faf9f8]">
                                            <th className="py-3 px-5 text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Status</th>
                                            <th className="py-3 px-5 text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Category</th>
                                            <th className="py-3 px-5 text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Property</th>
                                            <th className="py-3 px-5 text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Urgency</th>
                                            <th className="py-3 px-5 text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Issues</th>
                                            <th className="py-3 px-5 text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentReports.slice(0, 10).map((r) => {
                                            const urg = urgencyColors[r.urgency] || urgencyColors.medium;
                                            return (
                                                <tr key={r.id} className="border-b border-[#f3f2f1] hover:bg-[#f3f9fd] transition-colors">
                                                    <td className="py-3.5 px-5">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${r.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                                                                r.status === 'in_progress' ? 'bg-blue-50 text-blue-600' :
                                                                    'bg-emerald-50 text-emerald-600'
                                                            }`}>
                                                            {r.status === 'pending' ? <AlertTriangle size={12} /> :
                                                                r.status === 'in_progress' ? <Clock size={12} /> :
                                                                    <CheckCircle2 size={12} />}
                                                            {r.status.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-5">
                                                        <div className="flex items-center gap-2">
                                                            <Wrench size={14} className="text-[#605e5c]" />
                                                            <span className="text-sm font-semibold text-[#1b1b1b]">{categoryLabels[r.category] || r.category}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-5 text-sm text-[#605e5c]">{r.propertyName}</td>
                                                    <td className="py-3.5 px-5">
                                                        <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold ${urg.bg} ${urg.text}`}>
                                                            {urg.label}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-5 text-sm text-[#605e5c] max-w-[200px] truncate">
                                                        {r.subIssues?.join(', ') || r.description || '—'}
                                                    </td>
                                                    <td className="py-3.5 px-5 text-sm text-[#605e5c]">
                                                        {new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Properties List */}
                        <div className="bg-white border border-[#e1dfdd] overflow-hidden">
                            <div className="px-5 py-3 bg-[#faf9f8] border-b border-[#e1dfdd]">
                                <h3 className="text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Properties ({filtered.length})</h3>
                            </div>
                            {filtered.map(p => {
                                const propReports = recentReports.filter(r => r.propertyId === p.id && r.status === 'pending');
                                return (
                                    <div key={p.id} className="flex items-center justify-between px-5 py-4 border-b border-[#f3f2f1] hover:bg-[#f3f9fd] transition-colors cursor-pointer">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-emerald-50 flex items-center justify-center">
                                                <MessageSquare size={18} className="text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-[#1b1b1b]">{p.name}</p>
                                                <p className="text-xs text-[#a19f9d]">{p.tenantName || 'No tenant assigned'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {propReports.length > 0 ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-amber-50 text-amber-600">
                                                    <AlertTriangle size={12} />
                                                    {propReports.length} pending
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold bg-gray-50 text-gray-400">
                                                    No tickets
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
