"use client";

import { useState, useEffect, useRef } from 'react';
import { Search, ClipboardList, X, Plus, Home, DollarSign, Calendar, Wrench, Flame, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { auth, db } from '../../../../lib/firebase';
import { doc, collection, query, where, onSnapshot, setDoc, getDocs } from 'firebase/firestore';
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

interface BillingConfig {
    rentAmount: string;
    rentSchedule: 'monthly' | 'quarterly' | 'annually';
    maintenanceFee: string;
    includeGas: boolean;
    gasFee: string;
    paymentModel: 'rent' | 'mortgage' | 'installment';
    installmentTotal: string;
    installmentMonths: string;
    notes: string;
}

const emptyBilling: BillingConfig = {
    rentAmount: '',
    rentSchedule: 'monthly',
    maintenanceFee: '',
    includeGas: false,
    gasFee: '',
    paymentModel: 'rent',
    installmentTotal: '',
    installmentMonths: '',
    notes: '',
};

export default function BillingSetupPage() {
    const [properties, setProperties] = useState<Property[]>([]);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
    const [billingConfig, setBillingConfig] = useState<BillingConfig>(emptyBilling);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const detailRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        if (selectedProperty && detailRef.current) {
            gsap.fromTo(detailRef.current, { x: 500, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: 'power3.out' });
        }
    }, [selectedProperty]);

    // Load billing config when property is selected
    useEffect(() => {
        if (!selectedProperty || !companyId) return;
        const q = query(collection(db, 'billing'), where('companyId', '==', companyId), where('propertyId', '==', selectedProperty.id));
        const unsub = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                setBillingConfig({ ...emptyBilling, ...snapshot.docs[0].data() });
            } else {
                setBillingConfig(emptyBilling);
            }
        });
        return () => unsub();
    }, [selectedProperty, companyId]);

    const handleSaveBilling = async () => {
        if (!companyId || !selectedProperty) return;
        setSaving(true);
        try {
            const billingDocId = `${companyId}_${selectedProperty.id}`;
            await setDoc(doc(db, 'billing', billingDocId), { ...billingConfig, companyId, propertyId: selectedProperty.id });
        } catch (err) {
            console.error('Failed to save billing config:', err);
        } finally {
            setSaving(false);
        }
    };

    const filtered = properties.filter(p =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.address?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const paymentModelLabels: Record<string, string> = {
        rent: 'Standard Rent',
        mortgage: 'Mortgage / Loan',
        installment: 'Installment Plan',
    };

    return (
        <div className="flex flex-col h-full -m-4 sm:-m-8">
            <div className="p-8 flex-1 overflow-y-auto">
                <h1 className="text-[28px] font-bold text-[#1b1b1b] tracking-tight mb-1.5">Billing Setup</h1>
                <p className="text-sm text-[#605e5c] mb-6">Configure the financing model, rent schedule, and maintenance charges for each property.</p>

                {/* Search */}
                <div className="flex items-center gap-2.5 border-b border-[#8a8886] focus-within:border-b-2 focus-within:border-[#0067b8] pb-1.5 pt-2 max-w-[380px] transition-all mb-8">
                    <Search size={16} className="text-[#a19f9d] shrink-0" />
                    <input type="text" placeholder="Search properties..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        className="border-none bg-transparent w-full outline-none text-[15px] text-[#1b1b1b] placeholder:text-[#605e5c] placeholder:font-light" />
                </div>

                <div className="bg-white border border-[#e1dfdd] overflow-hidden">
                    <div className="px-5 py-3 bg-[#faf9f8] border-b border-[#e1dfdd] flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Properties ({filtered.length})</h3>
                    </div>
                    {filtered.length > 0 ? filtered.map(p => (
                        <div key={p.id}
                            className="flex items-center justify-between px-5 py-4 border-b border-[#f3f2f1] hover:bg-[#f3f9fd] transition-colors cursor-pointer"
                            onClick={() => setSelectedProperty(p)}>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-cyan-50 flex items-center justify-center">
                                    <ClipboardList size={18} className="text-cyan-700" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-[#1b1b1b]">{p.name}</p>
                                    <p className="text-xs text-[#a19f9d]">{p.tenantName || 'No tenant'} • {p.address}</p>
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-[#c8c6c4]" />
                        </div>
                    )) : (
                        <div className="px-5 py-12 text-center text-sm text-[#a19f9d]">
                            No properties found. Add properties in the Ledger first.
                        </div>
                    )}
                </div>
            </div>

            {/* Billing Config Panel */}
            {selectedProperty && (
                <>
                    <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setSelectedProperty(null)} />
                    <div ref={detailRef} className="fixed top-0 right-0 bottom-0 w-[500px] bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.1)] z-50 flex flex-col overflow-y-auto">
                        <div className="px-6 py-5 border-b border-[#e1dfdd] flex items-center justify-between bg-[#faf9f8] shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-[#1b1b1b]">{selectedProperty.name}</h2>
                                <p className="text-xs text-[#a19f9d]">Billing Configuration</p>
                            </div>
                            <button className="text-[#605e5c] hover:text-[#1b1b1b] p-1" onClick={() => setSelectedProperty(null)}><X size={20} /></button>
                        </div>
                        <div className="p-6 flex-1 space-y-6">
                            {/* Payment Model */}
                            <div>
                                <h4 className="text-[11px] font-bold text-[#a19f9d] uppercase tracking-widest mb-3">Financing Model</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['rent', 'mortgage', 'installment'] as const).map(model => (
                                        <button key={model} onClick={() => setBillingConfig({ ...billingConfig, paymentModel: model })}
                                            className={`py-3 px-3 text-sm font-semibold text-center border transition-colors ${billingConfig.paymentModel === model
                                                ? 'bg-[#0891b2]/10 border-[#0891b2] text-[#0891b2]'
                                                : 'bg-white border-[#e1dfdd] text-[#323130] hover:bg-[#f3f2f1]'
                                                }`}>
                                            {paymentModelLabels[model]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Rent Config */}
                            <div>
                                <h4 className="text-[11px] font-bold text-[#a19f9d] uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <DollarSign size={14} /> {billingConfig.paymentModel === 'rent' ? 'Rent Details' : billingConfig.paymentModel === 'mortgage' ? 'Mortgage Details' : 'Installment Details'}
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-[#323130] uppercase tracking-wide">
                                            {billingConfig.paymentModel === 'installment' ? 'Total Amount' : 'Payment Amount (GMD)'}
                                        </label>
                                        <input className="border border-[#c8c6c4] px-3 py-2.5 text-sm text-[#1b1b1b] outline-none focus:border-[#0891b2] transition-colors"
                                            placeholder="e.g. 25000"
                                            value={billingConfig.paymentModel === 'installment' ? billingConfig.installmentTotal : billingConfig.rentAmount}
                                            onChange={(e) => billingConfig.paymentModel === 'installment'
                                                ? setBillingConfig({ ...billingConfig, installmentTotal: e.target.value })
                                                : setBillingConfig({ ...billingConfig, rentAmount: e.target.value })
                                            } />
                                    </div>
                                    {billingConfig.paymentModel === 'installment' && (
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-[#323130] uppercase tracking-wide">Number of Months</label>
                                            <input className="border border-[#c8c6c4] px-3 py-2.5 text-sm text-[#1b1b1b] outline-none focus:border-[#0891b2] transition-colors"
                                                placeholder="e.g. 24"
                                                value={billingConfig.installmentMonths}
                                                onChange={(e) => setBillingConfig({ ...billingConfig, installmentMonths: e.target.value })} />
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-[#323130] uppercase tracking-wide">Payment Schedule</label>
                                        <select className="border border-[#c8c6c4] rounded px-3 py-2.5 text-sm text-[#1b1b1b] bg-white outline-none focus:border-[#0891b2] cursor-pointer transition-colors"
                                            value={billingConfig.rentSchedule}
                                            onChange={(e) => setBillingConfig({ ...billingConfig, rentSchedule: e.target.value as any })}>
                                            <option value="monthly">Monthly</option>
                                            <option value="quarterly">Quarterly</option>
                                            <option value="annually">Annually</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Maintenance */}
                            <div>
                                <h4 className="text-[11px] font-bold text-[#a19f9d] uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Wrench size={14} /> Maintenance Fee
                                </h4>
                                <input className="border border-[#c8c6c4] px-3 py-2.5 text-sm text-[#1b1b1b] outline-none focus:border-[#0891b2] transition-colors w-full"
                                    placeholder="Monthly maintenance fee (GMD), leave empty if none"
                                    value={billingConfig.maintenanceFee}
                                    onChange={(e) => setBillingConfig({ ...billingConfig, maintenanceFee: e.target.value })} />
                            </div>

                            {/* Gas */}
                            <div>
                                <h4 className="text-[11px] font-bold text-[#a19f9d] uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Flame size={14} /> Gas Bill
                                </h4>
                                <label className="flex items-center gap-3 mb-3 cursor-pointer">
                                    <input type="checkbox" checked={billingConfig.includeGas}
                                        onChange={(e) => setBillingConfig({ ...billingConfig, includeGas: e.target.checked })}
                                        className="w-4 h-4 accent-[#0891b2]" />
                                    <span className="text-sm text-[#323130]">This property uses gas</span>
                                </label>
                                {billingConfig.includeGas && (
                                    <input className="border border-[#c8c6c4] px-3 py-2.5 text-sm text-[#1b1b1b] outline-none focus:border-[#0891b2] transition-colors w-full"
                                        placeholder="Estimated monthly gas cost (GMD)"
                                        value={billingConfig.gasFee}
                                        onChange={(e) => setBillingConfig({ ...billingConfig, gasFee: e.target.value })} />
                                )}
                            </div>

                            {/* Notes */}
                            <div>
                                <h4 className="text-[11px] font-bold text-[#a19f9d] uppercase tracking-widest mb-3">Additional Notes</h4>
                                <textarea className="border border-[#c8c6c4] px-3 py-2.5 text-sm text-[#1b1b1b] outline-none focus:border-[#0891b2] transition-colors w-full resize-y min-h-[80px]"
                                    placeholder="Special billing arrangements, discounts, etc."
                                    value={billingConfig.notes}
                                    onChange={(e) => setBillingConfig({ ...billingConfig, notes: e.target.value })} />
                            </div>

                            {/* Save */}
                            <button onClick={handleSaveBilling} disabled={saving}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-[#0891b2] text-white text-sm font-semibold hover:bg-[#0e7490] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                {saving ? 'Saving...' : 'Save Billing Configuration'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
