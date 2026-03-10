"use client";

import { useState, useEffect, useRef } from 'react';
import { Search, DollarSign, TrendingUp, Receipt, Zap, Droplets, Home, X, ArrowUpRight, ArrowDownRight, Calendar, CreditCard, Flame, Wrench, Plus, ClipboardList } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { auth, db } from '../../../lib/firebase';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
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
    rentAmount?: string;
    rentSchedule?: string;
    maintenanceFee?: string;
    includeGas?: boolean;
    gasFee?: string;
    paymentModel?: 'rent' | 'mortgage' | 'installment';
    installmentTotal?: string;
    installmentMonths?: string;
}

interface Transaction {
    id: string;
    type: 'income' | 'expense';
    label: string;
    propertyId: string;
    propertyName: string;
    amount: number;
    date: number;
    category: string;
}

export default function FinancesDashboard() {
    const [properties, setProperties] = useState<Property[]>([]);
    const [billingMap, setBillingMap] = useState<Record<string, BillingConfig>>({});
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [companyInfo, setCompanyInfo] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
    const [showRecordModal, setShowRecordModal] = useState(false);
    const [recordForm, setRecordForm] = useState({ type: 'income' as 'income' | 'expense', label: '', amount: '', propertyId: '' });
    const [savingTx, setSavingTx] = useState(false);
    const detailRef = useRef<HTMLDivElement>(null);

    const accentColor = companyInfo?.brandColor1 || '#0891b2';

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
            const list: Property[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Property));
            setProperties(list);
        });
        return () => unsub();
    }, [companyId]);

    useEffect(() => {
        if (!companyId) return;
        const q = query(collection(db, 'billing'), where('companyId', '==', companyId));
        const unsub = onSnapshot(q, (snapshot) => {
            const map: Record<string, BillingConfig> = {};
            snapshot.docs.forEach(d => {
                const data = d.data();
                if (data.propertyId) map[data.propertyId] = data as BillingConfig;
            });
            setBillingMap(map);
        });
        return () => unsub();
    }, [companyId]);

    useEffect(() => {
        if (!companyId) return;
        const q = query(collection(db, 'transactions'), where('companyId', '==', companyId));
        const unsub = onSnapshot(q, (snapshot) => {
            const list: Transaction[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
            list.sort((a, b) => b.date - a.date);
            setTransactions(list);
        });
        return () => unsub();
    }, [companyId]);

    useEffect(() => {
        if (selectedProperty && detailRef.current) {
            gsap.fromTo(detailRef.current, { x: 460, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: 'power3.out' });
        }
    }, [selectedProperty]);

    const handleRecordPayment = async () => {
        if (!companyId || !recordForm.label.trim() || !recordForm.amount || !recordForm.propertyId) return;
        setSavingTx(true);
        try {
            const propName = properties.find(p => p.id === recordForm.propertyId)?.name || 'Unknown';
            await addDoc(collection(db, 'transactions'), {
                companyId,
                type: recordForm.type,
                label: recordForm.label,
                propertyId: recordForm.propertyId,
                propertyName: propName,
                amount: parseFloat(recordForm.amount),
                date: Date.now(),
                category: recordForm.type === 'income' ? 'rent' : 'expense',
            });
            setRecordForm({ type: 'income', label: '', amount: '', propertyId: '' });
            setShowRecordModal(false);
        } catch (err) {
            console.error(err);
        } finally {
            setSavingTx(false);
        }
    };

    const filtered = properties.filter(p =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.address?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalRevenue = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const outstanding = properties.reduce((sum, p) => {
        const billing = billingMap[p.id];
        if (!billing) return sum;
        const amount = billing.paymentModel === 'installment' ? parseFloat(billing.installmentTotal || '0') : parseFloat(billing.rentAmount || '0');
        return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    const modelLabels: Record<string, string> = { rent: 'Rent', mortgage: 'Mortgage', installment: 'Installment' };

    return (
        <div className="flex flex-col h-full -m-4 sm:-m-8">
            {/* Content */}
            <div className="p-8 flex-1 overflow-y-auto">
                <h1 className="text-[28px] font-bold text-[#1b1b1b] tracking-tight mb-1.5">Financial Control Center</h1>
                <p className="text-sm text-[#605e5c] mb-6">Track rent payments, set billing models, and monitor financial performance across your portfolio.</p>

                {/* Search + Record Payment */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="flex items-center gap-2.5 border-b border-[#8a8886] focus-within:border-b-2 focus-within:border-[#0067b8] pb-1.5 pt-2 flex-1 max-w-[380px] transition-all">
                        <Search size={16} className="text-[#a19f9d] shrink-0" />
                        <input type="text" placeholder="Search properties..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            className="border-none bg-transparent w-full outline-none text-[15px] text-[#1b1b1b] placeholder:text-[#605e5c] placeholder:font-light" />
                    </div>
                    <button
                        onClick={() => setShowRecordModal(true)}
                        className="shrink-0 flex items-center gap-2 bg-white border text-[14px] font-semibold px-6 py-2.5 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2"
                        style={{ borderColor: accentColor, color: accentColor }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = accentColor; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.color = accentColor; }}
                    >
                        <Plus size={16} />
                        <span>Record Payment</span>
                    </button>
                </div>

                {properties.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                        <Image src="/finance-freedom.png" alt="No Properties" width={300} height={200} className="mb-6 opacity-80 object-cover" />
                        <h3 className="text-xl font-semibold text-[#1b1b1b] mb-2">No financial data yet</h3>
                        <p className="text-sm text-[#605e5c]">Add properties in the Property Management Ledger to start tracking finances.</p>
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-4 gap-4 mb-8">
                            {[
                                { label: 'Total Revenue', value: `D ${totalRevenue.toLocaleString()}`, sub: 'All time income', icon: DollarSign, iconBg: 'bg-cyan-50', iconColor: 'text-cyan-600', delta: '+', deltaColor: 'text-emerald-600' },
                                { label: 'Total Expenses', value: `D ${totalExpenses.toLocaleString()}`, sub: 'All time expenses', icon: TrendingUp, iconBg: 'bg-red-50', iconColor: 'text-red-500', delta: '-', deltaColor: 'text-red-500' },
                                { label: 'Expected Monthly', value: `D ${outstanding.toLocaleString()}`, sub: 'From all billing configs', icon: Receipt, iconBg: 'bg-amber-50', iconColor: 'text-amber-600', delta: '', deltaColor: 'text-[#a19f9d]' },
                                { label: 'Properties', value: `${properties.length}`, sub: 'Under management', icon: Calendar, iconBg: 'bg-violet-50', iconColor: 'text-violet-600', delta: '', deltaColor: 'text-[#a19f9d]' },
                            ].map((card) => (
                                <div key={card.label} className="bg-white border border-[#e1dfdd] p-5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`w-9 h-9 ${card.iconBg} flex items-center justify-center`}>
                                            <card.icon size={18} className={card.iconColor} />
                                        </div>
                                        <span className="text-sm font-semibold text-[#605e5c]">{card.label}</span>
                                    </div>
                                    <p className="text-[26px] font-bold text-[#1b1b1b]">{card.value}</p>
                                    <p className={`text-xs mt-1 ${card.deltaColor}`}>{card.sub}</p>
                                </div>
                            ))}
                        </div>

                        {/* Two-column: Properties + Recent Transactions */}
                        <div className="grid grid-cols-5 gap-6">
                            {/* Properties List */}
                            <div className="col-span-3 bg-white border border-[#e1dfdd] overflow-hidden">
                                <div className="px-5 py-3 bg-[#faf9f8] border-b border-[#e1dfdd] flex items-center justify-between">
                                    <h3 className="text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Property Finances</h3>
                                    <Link href="/portal/finances/billing" className="text-xs font-semibold transition-colors hover:underline" style={{ color: accentColor }}>
                                        Billing Setup →
                                    </Link>
                                </div>
                                {filtered.map(p => {
                                    const billing = billingMap[p.id];
                                    const amount = billing?.paymentModel === 'installment'
                                        ? parseFloat(billing.installmentTotal || '0')
                                        : parseFloat(billing?.rentAmount || '0');
                                    return (
                                        <div key={p.id}
                                            className="flex items-center justify-between px-5 py-4 border-b border-[#f3f2f1] hover:bg-[#f3f9fd] transition-colors cursor-pointer"
                                            onClick={() => setSelectedProperty(p)}>
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-cyan-50 flex items-center justify-center">
                                                    <Home size={18} className="text-cyan-700" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-[#1b1b1b]">{p.name}</p>
                                                    <p className="text-xs text-[#a19f9d]">{p.tenantName || 'Vacant'} · {modelLabels[billing?.paymentModel || 'rent'] || 'No billing set'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-right mr-2">
                                                    <p className="text-sm font-bold text-[#1b1b1b]">{billing ? `D ${amount.toLocaleString()}` : '—'}</p>
                                                    <p className="text-[11px] text-[#a19f9d]">{billing ? billing.rentSchedule || 'monthly' : 'Not configured'}</p>
                                                </div>
                                                {!billing && (
                                                    <Link href="/portal/finances/billing"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-xs font-semibold px-2.5 py-1 border transition-colors hover:bg-opacity-10"
                                                        style={{ color: accentColor, borderColor: accentColor, backgroundColor: `${accentColor}10` }}>
                                                        Set Up
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Recent Transactions */}
                            <div className="col-span-2 bg-white border border-[#e1dfdd] overflow-hidden">
                                <div className="px-5 py-3 bg-[#faf9f8] border-b border-[#e1dfdd] flex items-center justify-between">
                                    <h3 className="text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Recent Transactions</h3>
                                    <Link href="/portal/finances/transactions" className="text-xs font-semibold transition-colors hover:underline" style={{ color: accentColor }}>
                                        View All →
                                    </Link>
                                </div>
                                {transactions.length === 0 ? (
                                    <div className="px-5 py-10 text-center text-sm text-[#a19f9d]">No transactions yet.<br /><span className="text-xs">Record a payment to get started.</span></div>
                                ) : (
                                    transactions.slice(0, 6).map((t) => (
                                        <div key={t.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-[#f3f2f1]">
                                            <div className={`w-8 h-8 flex items-center justify-center shrink-0 ${t.type === 'income' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                                                <Home size={14} className={t.type === 'income' ? 'text-emerald-600' : 'text-red-500'} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] font-semibold text-[#1b1b1b] truncate">{t.label}</p>
                                                <p className="text-[11px] text-[#a19f9d]">{new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                            </div>
                                            <span className={`text-[13px] font-bold shrink-0 flex items-center gap-0.5 ${t.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {t.type === 'income' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                                D {t.amount.toLocaleString()}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Record Payment Modal */}
            {showRecordModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowRecordModal(false)}>
                    <div className="bg-white w-full max-w-[480px] shadow-[0_8px_32px_rgba(0,0,0,0.12)]" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-5 border-b border-[#e1dfdd] flex items-center justify-between bg-[#faf9f8]">
                            <h2 className="text-lg font-bold text-[#1b1b1b]">Record Transaction</h2>
                            <button className="text-[#605e5c] hover:text-[#1b1b1b] p-1" onClick={() => setShowRecordModal(false)}><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Type */}
                            <div>
                                <label className="text-xs font-semibold text-[#323130] uppercase tracking-wide block mb-2">Transaction Type</label>
                                <div className="flex gap-2">
                                    {(['income', 'expense'] as const).map(type => (
                                        <button key={type} onClick={() => setRecordForm({ ...recordForm, type })}
                                            className={`flex-1 py-2.5 text-sm font-semibold border transition-colors capitalize ${recordForm.type === type
                                                ? type === 'income' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-red-50 border-red-400 text-red-600'
                                                : 'bg-white border-[#e1dfdd] text-[#605e5c] hover:bg-[#f3f2f1]'
                                                }`}>
                                            {type === 'income' ? '↑ Income' : '↓ Expense'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Property */}
                            <div>
                                <label className="text-xs font-semibold text-[#323130] uppercase tracking-wide block mb-2">Property</label>
                                <select className="border border-[#c8c6c4] px-3 py-2.5 text-sm text-[#1b1b1b] bg-white outline-none w-full focus:border-[#0891b2] transition-colors"
                                    value={recordForm.propertyId} onChange={(e) => setRecordForm({ ...recordForm, propertyId: e.target.value })}>
                                    <option value="">Select a property...</option>
                                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            {/* Label */}
                            <div>
                                <label className="text-xs font-semibold text-[#323130] uppercase tracking-wide block mb-2">Description</label>
                                <input className="border border-[#c8c6c4] px-3 py-2.5 text-sm text-[#1b1b1b] outline-none w-full focus:border-[#0891b2] transition-colors"
                                    placeholder="e.g. Rent — March 2026"
                                    value={recordForm.label} onChange={(e) => setRecordForm({ ...recordForm, label: e.target.value })} />
                            </div>
                            {/* Amount */}
                            <div>
                                <label className="text-xs font-semibold text-[#323130] uppercase tracking-wide block mb-2">Amount (GMD)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#605e5c]">D</span>
                                    <input className="border border-[#c8c6c4] pl-8 pr-3 py-2.5 text-sm text-[#1b1b1b] outline-none w-full focus:border-[#0891b2] transition-colors"
                                        type="number" placeholder="0.00"
                                        value={recordForm.amount} onChange={(e) => setRecordForm({ ...recordForm, amount: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-[#e1dfdd] flex justify-end gap-3">
                            <button onClick={() => setShowRecordModal(false)}
                                className="px-5 py-2.5 border border-[#8a8886] text-sm font-semibold text-[#323130] bg-white hover:bg-[#f3f2f1] transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleRecordPayment} disabled={savingTx || !recordForm.label || !recordForm.amount || !recordForm.propertyId}
                                className="px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ backgroundColor: accentColor }}>
                                {savingTx ? 'Recording...' : 'Record Transaction'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Property Finance Detail Panel */}
            {selectedProperty && (
                <>
                    <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setSelectedProperty(null)} />
                    <div ref={detailRef} className="fixed top-0 right-0 bottom-0 w-[460px] bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.1)] z-50 flex flex-col overflow-y-auto">
                        <div className="px-6 py-5 border-b border-[#e1dfdd] flex items-center justify-between bg-[#faf9f8] shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-[#1b1b1b]">{selectedProperty.name}</h2>
                                <p className="text-xs text-[#a19f9d]">{selectedProperty.address}</p>
                            </div>
                            <button className="text-[#605e5c] hover:text-[#1b1b1b] p-1" onClick={() => setSelectedProperty(null)}><X size={20} /></button>
                        </div>
                        <div className="p-6 flex-1">
                            {/* Billing Info */}
                            {billingMap[selectedProperty.id] ? (
                                <>
                                    <div className="mb-6">
                                        <h4 className="text-[11px] font-bold text-[#a19f9d] uppercase tracking-widest mb-3">Financing Model</h4>
                                        <div className="bg-[#f3f9fd] border border-[#cce3f5] p-4 mb-3">
                                            <p className="text-xs text-[#605e5c] mb-1">Model</p>
                                            <p className="text-base font-bold text-[#1b1b1b]">{modelLabels[billingMap[selectedProperty.id].paymentModel || 'rent']}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="border border-[#e1dfdd] p-4">
                                                <p className="text-xs text-[#605e5c] mb-1">Payment Amount</p>
                                                <p className="text-xl font-bold text-[#1b1b1b]">D {parseFloat(billingMap[selectedProperty.id].rentAmount || billingMap[selectedProperty.id].installmentTotal || '0').toLocaleString()}</p>
                                            </div>
                                            <div className="border border-[#e1dfdd] p-4">
                                                <p className="text-xs text-[#605e5c] mb-1">Schedule</p>
                                                <p className="text-xl font-bold text-[#1b1b1b] capitalize">{billingMap[selectedProperty.id].rentSchedule || 'Monthly'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    {billingMap[selectedProperty.id].maintenanceFee && (
                                        <div className="mb-6">
                                            <h4 className="text-[11px] font-bold text-[#a19f9d] uppercase tracking-widest mb-3">Maintenance</h4>
                                            <div className="flex items-center justify-between bg-orange-50 border border-orange-100 px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Wrench size={16} className="text-orange-500" />
                                                    <p className="text-sm font-semibold text-[#1b1b1b]">Monthly Maintenance</p>
                                                </div>
                                                <span className="text-sm font-bold text-[#1b1b1b]">D {parseFloat(billingMap[selectedProperty.id].maintenanceFee || '0').toLocaleString()}</span>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="mb-6 bg-amber-50 border border-amber-100 p-5 text-center">
                                    <p className="text-sm font-semibold text-[#1b1b1b] mb-1">No billing configured</p>
                                    <p className="text-xs text-[#605e5c] mb-4">Set up the financing model for this property to track payments.</p>
                                    <Link href="/portal/finances/billing"
                                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white transition-all hover:brightness-105"
                                        style={{ backgroundColor: accentColor }}>
                                        <ClipboardList size={13} /> Configure Billing
                                    </Link>
                                </div>
                            )}

                            {/* NAWEC Utilities */}
                            <div className="mb-6">
                                <h4 className="text-[11px] font-bold text-[#a19f9d] uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Image src="/nawec.jpg" alt="NAWEC" width={16} height={16} className="rounded-sm" />
                                    Utility Bills (NAWEC — API pending)
                                </h4>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between bg-amber-50 border border-amber-100 px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Zap size={16} className="text-amber-500" />
                                            <div>
                                                <p className="text-sm font-semibold text-[#1b1b1b]">Electricity</p>
                                                <p className="text-[11px] text-[#a19f9d]">#{selectedProperty.nawecCashPower || '—'}</p>
                                            </div>
                                        </div>
                                        <span className="text-xs font-semibold text-[#a19f9d]">Mock</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-blue-50 border border-blue-100 px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Droplets size={16} className="text-blue-500" />
                                            <div>
                                                <p className="text-sm font-semibold text-[#1b1b1b]">Water</p>
                                                <p className="text-[11px] text-[#a19f9d]">#{selectedProperty.nawecWaterBill || '—'}</p>
                                            </div>
                                        </div>
                                        <span className="text-xs font-semibold text-[#a19f9d]">Mock</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowRecordModal(true); setRecordForm(f => ({ ...f, propertyId: selectedProperty.id })); setSelectedProperty(null); }}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-white text-sm font-semibold shadow-sm transition-all hover:brightness-105"
                                    style={{ backgroundColor: accentColor }}>
                                    <Receipt size={16} /> Record Payment
                                </button>
                                <Link href="/portal/finances/billing"
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-[#8a8886] text-[#323130] text-sm font-semibold hover:bg-[#f3f2f1] transition-colors">
                                    <Calendar size={16} /> Billing Setup
                                </Link>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
