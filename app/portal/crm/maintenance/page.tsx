"use client";

import { useState, useEffect } from 'react';
import { Search, Wrench, AlertTriangle, Clock, CheckCircle2, Camera, ChevronDown } from 'lucide-react';
import { auth, db } from '../../../../lib/firebase';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface Property {
    id: string;
    name: string;
    address: string;
    tenantName: string;
}

interface MaintenanceReport {
    id: string;
    propertyId: string;
    propertyName: string;
    tenantName: string;
    category: string;
    subIssues: string[];
    urgency: string;
    description: string;
    photoCount: number;
    status: string;
    createdAt: number;
}

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

const urgencyConfig: Record<string, { bg: string; text: string; label: string }> = {
    low: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Low' },
    medium: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Medium' },
    high: { bg: 'bg-red-50', text: 'text-red-500', label: 'Urgent' },
};

export default function MaintenanceReportsPage() {
    const [properties, setProperties] = useState<Property[]>([]);
    const [reports, setReports] = useState<MaintenanceReport[]>([]);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [companyInfo, setCompanyInfo] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_progress' | 'resolved'>('all');
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const accentColor = companyInfo?.brandColor1 || '#10b981';

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCompanyId(user.uid);
                const snap = await getDoc(doc(db, 'companies', user.uid));
                if (snap.exists()) setCompanyInfo(snap.data());
            }
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

    useEffect(() => {
        if (!companyId) return;
        const q = query(collection(db, 'maintenance'), where('companyId', '==', companyId));
        const unsub = onSnapshot(q, (snapshot) => {
            const list: MaintenanceReport[] = snapshot.docs.map(d => {
                const data = d.data();
                const prop = properties.find(p => p.id === data.propertyId);
                return {
                    id: d.id,
                    propertyId: data.propertyId || '',
                    propertyName: prop?.name || 'Unknown Property',
                    tenantName: prop?.tenantName || 'Unknown Tenant',
                    category: data.category || '',
                    subIssues: data.subIssues || [],
                    urgency: data.urgency || 'medium',
                    description: data.description || '',
                    photoCount: data.photoCount || 0,
                    status: data.status || 'pending',
                    createdAt: data.createdAt || 0,
                };
            });
            list.sort((a, b) => b.createdAt - a.createdAt);
            setReports(list);
        });
        return () => unsub();
    }, [companyId, properties]);

    const handleStatusUpdate = async (report: MaintenanceReport, newStatus: string) => {
        if (!companyId) return;
        setUpdatingId(report.id);
        try {
            await updateDoc(doc(db, 'maintenance', report.id), {
                status: newStatus
            });
        } catch (err) {
            console.error('Failed to update status:', err);
        } finally {
            setUpdatingId(null);
        }
    };

    const filtered = reports.filter(r => {
        const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
        const matchesSearch = searchQuery === '' ||
            r.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (categoryLabels[r.category] || r.category).toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const pendingCount = reports.filter(r => r.status === 'pending').length;
    const progressCount = reports.filter(r => r.status === 'in_progress').length;
    const resolvedCount = reports.filter(r => r.status === 'resolved').length;

    return (
        <div className="flex flex-col h-full -m-4 sm:-m-8">
            <div className="p-8 flex-1 overflow-y-auto">
                <h1 className="text-[28px] font-bold text-[#1b1b1b] tracking-tight mb-1.5">Maintenance Reports</h1>
                <p className="text-sm text-[#605e5c] mb-6">View and manage maintenance requests submitted by tenants from their mobile app.</p>

                {/* Search + Filter + Summary */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="flex items-center gap-2.5 border-b border-[#8a8886] focus-within:border-b-2 focus-within:border-[#0067b8] pb-1.5 pt-2 flex-1 max-w-[380px] transition-all">
                        <Search size={16} className="text-[#a19f9d] shrink-0" />
                        <input type="text" placeholder="Search reports..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            className="border-none bg-transparent w-full outline-none text-[15px] text-[#1b1b1b] placeholder:text-[#605e5c] placeholder:font-light" />
                    </div>
                    <div className="flex items-center gap-1 border border-[#e1dfdd] p-0.5">
                        {([
                            { key: 'all', label: 'All' },
                            { key: 'pending', label: `Pending (${pendingCount})` },
                            { key: 'in_progress', label: `In Progress (${progressCount})` },
                            { key: 'resolved', label: `Resolved (${resolvedCount})` },
                        ] as const).map(tab => (
                            <button key={tab.key} onClick={() => setFilterStatus(tab.key as any)}
                                className={`px-4 py-2 text-sm font-semibold transition-colors ${filterStatus === tab.key ? 'bg-white shadow-sm' : 'text-[#605e5c] hover:text-[#1b1b1b]'}`}
                                style={filterStatus === tab.key ? { color: accentColor } : {}}>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Reports Table */}
                <div className="bg-white border border-[#e1dfdd] overflow-hidden">
                    {filtered.length === 0 ? (
                        <div className="px-5 py-16 text-center">
                            <Wrench size={40} className="mx-auto text-[#c8c6c4] mb-4" />
                            <p className="text-sm font-semibold text-[#605e5c]">
                                {reports.length === 0 ? 'No maintenance reports yet' : 'No reports match your filters'}
                            </p>
                            <p className="text-xs text-[#a19f9d] mt-1">
                                {reports.length === 0 ? 'When tenants submit maintenance requests from the mobile app, they will appear here.' : 'Try adjusting your search or filter.'}
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#e1dfdd] bg-[#faf9f8]">
                                    <th className="py-3 px-5 text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Status</th>
                                    <th className="py-3 px-5 text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Category</th>
                                    <th className="py-3 px-5 text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Property</th>
                                    <th className="py-3 px-5 text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Tenant</th>
                                    <th className="py-3 px-5 text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Urgency</th>
                                    <th className="py-3 px-5 text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Details</th>
                                    <th className="py-3 px-5 text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Date</th>
                                    <th className="py-3 px-5 text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((r) => {
                                    const urg = urgencyConfig[r.urgency] || urgencyConfig.medium;
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
                                                <span className="text-sm font-semibold text-[#1b1b1b]">{categoryLabels[r.category] || r.category}</span>
                                            </td>
                                            <td className="py-3.5 px-5 text-sm text-[#605e5c]">{r.propertyName}</td>
                                            <td className="py-3.5 px-5 text-sm text-[#605e5c]">{r.tenantName}</td>
                                            <td className="py-3.5 px-5">
                                                <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold ${urg.bg} ${urg.text}`}>
                                                    {urg.label}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-5 text-sm text-[#605e5c] max-w-[200px]">
                                                <div className="truncate">{r.subIssues?.join(', ') || r.description || '—'}</div>
                                                {r.photoCount > 0 && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-[#a19f9d] mt-0.5">
                                                        <Camera size={10} /> {r.photoCount} photo{r.photoCount > 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-5 text-sm text-[#605e5c]">
                                                {new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="py-3.5 px-5">
                                                <select
                                                    value={r.status}
                                                    onChange={(e) => handleStatusUpdate(r, e.target.value)}
                                                    disabled={updatingId === r.id}
                                                    className="border border-[#c8c6c4] px-2 py-1.5 text-[12px] font-semibold text-[#1b1b1b] bg-white outline-none focus:border-[#0067b8] transition-colors cursor-pointer disabled:opacity-50"
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="in_progress">In Progress</option>
                                                    <option value="resolved">Resolved</option>
                                                </select>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
