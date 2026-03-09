"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, QrCode, X, Printer, Eye, Building2, FileEdit } from 'lucide-react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { auth, database } from '../../../lib/firebase';
import { ref, get, push, set, onValue } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import gsap from 'gsap';

interface Property {
    id: string;
    name: string;
    address: string;
    googlePlusCode: string;
    completionState: 'planning' | 'construction' | 'completed';
    nawecCashPower: string;
    nawecWaterBill: string;
    tenantName: string;
    notes: string;
    createdAt: number;
}

const emptyForm = {
    name: '', address: '', googlePlusCode: '',
    completionState: 'completed' as const,
    nawecCashPower: '', nawecWaterBill: '', tenantName: '', notes: '',
};

export default function LedgerDashboard() {
    const router = useRouter();
    const [properties, setProperties] = useState<Property[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [companyInfo, setCompanyInfo] = useState<any>(null);
    const [activeProperty, setActiveProperty] = useState<Property | null>(null);
    const [detailProperty, setDetailProperty] = useState<Property | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const detailRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    const accentColor = companyInfo?.brandColor1 || '#0A58CA';

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
        const propsRef = ref(database, `properties/${companyId}`);
        const unsub = onValue(propsRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const list: Property[] = Object.entries(data).map(([key, val]: [string, any]) => ({ id: key, ...val }));
                list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                setProperties(list);
            } else {
                setProperties([]);
            }
        });
        return () => unsub();
    }, [companyId]);

    useEffect(() => {
        if (detailProperty && detailRef.current) {
            gsap.fromTo(detailRef.current, { x: 460, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: 'power3.out' });
        }
    }, [detailProperty]);

    useEffect(() => {
        if (showAddModal && modalRef.current) {
            gsap.fromTo(modalRef.current, { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'power2.out' });
        }
    }, [showAddModal]);

    const handleSave = async () => {
        if (!companyId || !formData.name.trim() || !formData.address.trim()) return;
        setSaving(true);
        try {
            const newRef = push(ref(database, `properties/${companyId}`));
            await set(newRef, { ...formData, createdAt: Date.now() });
            setFormData(emptyForm);
            setShowAddModal(false);
        } catch (err) {
            console.error('Failed to save property:', err);
        } finally {
            setSaving(false);
        }
    };

    const handlePrint = () => window.print();

    const statusConfig: Record<string, { label: string; classes: string }> = {
        planning: { label: 'Planning', classes: 'bg-gray-100 text-gray-600' },
        construction: { label: 'Under Construction', classes: 'bg-amber-50 text-amber-700' },
        completed: { label: 'Completed', classes: 'bg-emerald-50 text-emerald-700' },
    };

    const filtered = properties.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full -m-4 sm:-m-8">
            {/* Content */}
            <div className="p-8 flex-1 overflow-y-auto">
                <h1 className="text-[28px] font-bold text-[#1b1b1b] tracking-tight mb-1.5">Property Portfolio</h1>
                <p className="text-sm text-[#605e5c] mb-6">Manage your real estate units, track completion states, and generate QR codes for tenants.</p>

                {/* Search + Add Property */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="flex items-center gap-2.5 border-b border-[#8a8886] focus-within:border-b-2 focus-within:border-[#0067b8] pb-1.5 pt-2 flex-1 max-w-[380px] transition-all">
                        <Search size={16} className="text-[#a19f9d] shrink-0" />
                        <input type="text" placeholder="Search properties..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            className="border-none bg-transparent w-full outline-none text-[15px] text-[#1b1b1b] placeholder:text-[#605e5c] placeholder:font-light" />
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="shrink-0 flex items-center gap-2 bg-white border text-[14px] font-semibold px-6 py-2.5 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2"
                        style={{
                            borderColor: accentColor,
                            color: accentColor,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = accentColor; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.color = accentColor; }}
                    >
                        <Plus size={16} />
                        <span>Add Property</span>
                    </button>
                </div>

                {filtered.length === 0 && properties.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                        <Image src="/management-confidence.png" alt="Empty Portfolio" width={300} height={200} className="rounded-xl mb-6 opacity-80 object-cover" />
                        <h3 className="text-xl font-semibold text-[#1b1b1b] mb-2">No properties tracked yet</h3>
                        <p className="text-sm text-[#605e5c] mb-6">Begin by adding your first unit to the ledger.</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-105 hover:shadow-md active:scale-[0.98]"
                            style={{ backgroundColor: accentColor }}
                        >
                            <Plus size={16} />
                            Add First Property
                        </button>
                    </div>
                ) : (
                    <div className="bg-white border border-[#e1dfdd] shadow-[0_2px_4px_rgba(0,0,0,0.02)] overflow-hidden w-full">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#e1dfdd] bg-[#faf9f8]">
                                    <th className="py-3 px-5 text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Name</th>
                                    <th className="py-3 px-5 text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Address</th>
                                    <th className="py-3 px-5 text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Status</th>
                                    <th className="py-3 px-5 text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Tenant</th>
                                    <th className="py-3 px-5 text-xs font-semibold text-[#605e5c] uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(p => (
                                    <tr key={p.id} className="border-b border-[#f3f2f1] hover:bg-[#f3f9fd] transition-colors cursor-pointer" onClick={() => setDetailProperty(p)}>
                                        <td className="py-3.5 px-5 text-sm font-semibold text-[#1b1b1b]">{p.name}</td>
                                        <td className="py-3.5 px-5 text-sm text-[#323130]">{p.address}</td>
                                        <td className="py-3.5 px-5">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold ${statusConfig[p.completionState]?.classes}`}>
                                                {statusConfig[p.completionState]?.label}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-5 text-sm text-[#605e5c]">{p.tenantName || 'Vacant'}</td>
                                        <td className="py-3.5 px-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setDetailProperty(p); }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-transparent hover:border-[#e1dfdd] hover:bg-[#f3f2f1] transition-colors"
                                                    style={{ color: accentColor }}
                                                >
                                                    <Eye size={13} /> View
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setActiveProperty(p); }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-transparent hover:border-[#e1dfdd] hover:bg-[#f3f2f1] transition-colors"
                                                    style={{ color: accentColor }}
                                                >
                                                    <QrCode size={13} /> QR
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Property Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
                    <div ref={modalRef} className="bg-white w-full max-w-[620px] max-h-[90vh] overflow-y-auto shadow-[0_8px_32px_rgba(0,0,0,0.12)]" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-5 border-b border-[#e1dfdd] flex items-center justify-between bg-[#faf9f8]">
                            <h2 className="text-lg font-bold text-[#1b1b1b]">Add New Property</h2>
                            <button className="text-[#605e5c] hover:text-[#1b1b1b] p-1" onClick={() => setShowAddModal(false)}><X size={20} /></button>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-[#323130] uppercase tracking-wide">Property Name *</label>
                                    <input className="border border-[#c8c6c4] px-3 py-2.5 text-sm text-[#1b1b1b] outline-none focus:border-[#0A58CA] transition-colors" placeholder="e.g. Bijilo Residence A" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div className="col-span-2 flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-[#323130] uppercase tracking-wide">Full Address *</label>
                                    <input className="border border-[#c8c6c4] px-3 py-2.5 text-sm text-[#1b1b1b] outline-none focus:border-[#0A58CA] transition-colors" placeholder="e.g. 14B Fajara East, Serrekunda" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-[#323130] uppercase tracking-wide">Google Plus Code</label>
                                    <input className="border border-[#c8c6c4] px-3 py-2.5 text-sm text-[#1b1b1b] outline-none focus:border-[#0A58CA] transition-colors" placeholder="e.g. 7R8V+X8 Banjul" value={formData.googlePlusCode} onChange={(e) => setFormData({ ...formData, googlePlusCode: e.target.value })} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-[#323130] uppercase tracking-wide">Completion State</label>
                                    <select className="border border-[#c8c6c4] px-3 py-2.5 text-sm text-[#1b1b1b] bg-white outline-none focus:border-[#0A58CA] cursor-pointer transition-colors" value={formData.completionState} onChange={(e) => setFormData({ ...formData, completionState: e.target.value as any })}>
                                        <option value="planning">Planning</option>
                                        <option value="construction">Under Construction</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-[#323130] uppercase tracking-wide">NAWEC Cash Power Number</label>
                                    <input className="border border-[#c8c6c4] px-3 py-2.5 text-sm text-[#1b1b1b] outline-none focus:border-[#0A58CA] transition-colors" placeholder="Cash power meter #" value={formData.nawecCashPower} onChange={(e) => setFormData({ ...formData, nawecCashPower: e.target.value })} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-[#323130] uppercase tracking-wide">NAWEC Water Bill Number</label>
                                    <input className="border border-[#c8c6c4] px-3 py-2.5 text-sm text-[#1b1b1b] outline-none focus:border-[#0A58CA] transition-colors" placeholder="Water bill account #" value={formData.nawecWaterBill} onChange={(e) => setFormData({ ...formData, nawecWaterBill: e.target.value })} />
                                </div>
                                <div className="col-span-2 flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-[#323130] uppercase tracking-wide">Current Tenant</label>
                                    <input className="border border-[#c8c6c4] px-3 py-2.5 text-sm text-[#1b1b1b] outline-none focus:border-[#0A58CA] transition-colors" placeholder="Leave empty if vacant" value={formData.tenantName} onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })} />
                                </div>
                                <div className="col-span-2 flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-[#323130] uppercase tracking-wide">Notes / Status Updates</label>
                                    <textarea className="border border-[#c8c6c4] px-3 py-2.5 text-sm text-[#1b1b1b] outline-none focus:border-[#0A58CA] transition-colors resize-y min-h-[80px]" placeholder="Any additional notes about this property..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-[#e1dfdd] flex justify-end gap-3">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-5 py-2.5 border border-[#8a8886] text-sm font-semibold text-[#323130] bg-white hover:bg-[#f3f2f1] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !formData.name.trim() || !formData.address.trim()}
                                className="px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ backgroundColor: accentColor }}
                            >
                                {saving ? 'Saving...' : 'Save Property'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Property Detail Slide-In Panel */}
            {detailProperty && (
                <>
                    <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setDetailProperty(null)} />
                    <div ref={detailRef} className="fixed top-0 right-0 bottom-0 w-[460px] bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.1)] z-50 flex flex-col overflow-y-auto">
                        <div className="px-6 py-5 border-b border-[#e1dfdd] flex items-center justify-between bg-[#faf9f8] shrink-0">
                            <h2 className="text-lg font-bold text-[#1b1b1b]">{detailProperty.name}</h2>
                            <button className="text-[#605e5c] hover:text-[#1b1b1b] p-1" onClick={() => setDetailProperty(null)}><X size={20} /></button>
                        </div>
                        <div className="p-6 flex-1">
                            {/* Location */}
                            <div className="mb-6">
                                <h4 className="text-[11px] font-bold text-[#a19f9d] uppercase tracking-widest mb-3">Location</h4>
                                <div className="flex justify-between items-center py-2 border-b border-[#f3f2f1]">
                                    <span className="text-[13px] text-[#605e5c]">Address</span>
                                    <span className="text-sm font-semibold text-[#1b1b1b]">{detailProperty.address}</span>
                                </div>
                                {detailProperty.googlePlusCode && (
                                    <div className="flex justify-between items-center py-2 border-b border-[#f3f2f1]">
                                        <span className="text-[13px] text-[#605e5c]">Plus Code</span>
                                        <span className="text-sm font-semibold text-[#1b1b1b]">{detailProperty.googlePlusCode}</span>
                                    </div>
                                )}
                            </div>
                            {/* Status */}
                            <div className="mb-6">
                                <h4 className="text-[11px] font-bold text-[#a19f9d] uppercase tracking-widest mb-3">Status</h4>
                                <div className="flex justify-between items-center py-2 border-b border-[#f3f2f1]">
                                    <span className="text-[13px] text-[#605e5c]">Completion</span>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold ${statusConfig[detailProperty.completionState]?.classes}`}>
                                        {statusConfig[detailProperty.completionState]?.label}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-[#f3f2f1]">
                                    <span className="text-[13px] text-[#605e5c]">Tenant</span>
                                    <span className="text-sm font-semibold text-[#1b1b1b]">{detailProperty.tenantName || 'Vacant'}</span>
                                </div>
                            </div>
                            {/* NAWEC */}
                            <div className="mb-6">
                                <h4 className="text-[11px] font-bold text-[#a19f9d] uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Image src="/nawec.jpg" alt="NAWEC" width={18} height={18} className="rounded-sm" />
                                    NAWEC Information
                                </h4>
                                <div className="flex justify-between items-center py-2 border-b border-[#f3f2f1]">
                                    <span className="text-[13px] text-[#605e5c]">Cash Power #</span>
                                    <span className="text-sm font-semibold text-[#1b1b1b]">{detailProperty.nawecCashPower || '—'}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-[#f3f2f1]">
                                    <span className="text-[13px] text-[#605e5c]">Water Bill #</span>
                                    <span className="text-sm font-semibold text-[#1b1b1b]">{detailProperty.nawecWaterBill || '—'}</span>
                                </div>
                            </div>
                            {/* Notes */}
                            {detailProperty.notes && (
                                <div className="mb-6">
                                    <h4 className="text-[11px] font-bold text-[#a19f9d] uppercase tracking-widest mb-3">Notes</h4>
                                    <p className="text-sm text-[#323130] leading-relaxed whitespace-pre-wrap">{detailProperty.notes}</p>
                                </div>
                            )}
                            {/* Action */}
                            <div className="mt-6 flex flex-col gap-3">
                                <button
                                    onClick={() => { setActiveProperty(detailProperty); setDetailProperty(null); }}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-white text-sm font-semibold shadow-sm transition-all hover:brightness-105 hover:shadow-md"
                                    style={{ backgroundColor: accentColor }}
                                >
                                    <QrCode size={16} /> Generate QR Code
                                </button>
                                <button
                                    onClick={() => { router.push(`/portal/ledger/edit?id=${detailProperty.id}`); setDetailProperty(null); }}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold border bg-white transition-colors"
                                    style={{ borderColor: accentColor, color: accentColor }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = accentColor; e.currentTarget.style.color = '#fff'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.color = accentColor; }}
                                >
                                    <FileEdit size={16} /> Manage Property
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* QR Code Modal */}
            {activeProperty && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
                    <div className="bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)] w-full max-w-[600px] overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-[#e1dfdd] flex items-center justify-between bg-[#faf9f8]">
                            <h2 className="text-lg font-semibold text-[#1b1b1b]">Tenant Setup Profile</h2>
                            <button className="text-[#605e5c] hover:text-[#1b1b1b] p-1" onClick={() => setActiveProperty(null)}><X size={20} /></button>
                        </div>
                        <div className="p-8 flex flex-col items-center">
                            <div className="w-32 h-32 mb-6">
                                <QRCodeSVG value={activeProperty.id} size={128} fgColor={companyInfo?.brandColor1 || "#000000"} />
                            </div>
                            <h3 className="text-xl font-bold text-[#1b1b1b] mb-1">{activeProperty.name}</h3>
                            <p className="text-sm text-[#605e5c] mb-2">{activeProperty.address}</p>
                            <p className="text-sm text-[#605e5c] text-center max-w-[400px] mb-8">Print this setup kit and provide it to your tenant when they move in.</p>
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-8 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-105 hover:shadow-md"
                                style={{ backgroundColor: accentColor }}
                            >
                                <Printer size={18} /> Generate Printable PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
