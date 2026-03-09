"use client";

import { useState, useEffect } from 'react';
import { Search, Plus, ArrowUpRight, ArrowDownRight, Download, Home, Zap, Droplets, CreditCard, Wrench, Flame, X, Receipt } from 'lucide-react';
import { auth, database } from '../../../../lib/firebase';
import { ref, onValue, push } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { get } from 'firebase/database';

interface Property {
    id: string;
    name: string;
    address: string;
    tenantName: string;
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

export default function TransactionsPage() {
    const [properties, setProperties] = useState<Property[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [companyInfo, setCompanyInfo] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
    const [showModal, setShowModal] = useState(false);
    const [recordForm, setRecordForm] = useState({ type: 'income' as 'income' | 'expense', label: '', amount: '', propertyId: '' });
    const [saving, setSaving] = useState(false);

    const accentColor = companyInfo?.brandColor1 || '#0891b2';

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
                setProperties(Object.entries(data).map(([key, val]: [string, any]) => ({ id: key, ...val })));
            }
        });
        return () => unsub();
    }, [companyId]);

    useEffect(() => {
        if (!companyId) return;
        const unsub = onValue(ref(database, `transactions/${companyId}`), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const list: Transaction[] = Object.entries(data).map(([key, val]: [string, any]) => ({ id: key, ...val }));
                list.sort((a, b) => b.date - a.date);
                setTransactions(list);
            } else {
                setTransactions([]);
            }
        });
        return () => unsub();
    }, [companyId]);

    const handleRecord = async () => {
        if (!companyId || !recordForm.label.trim() || !recordForm.amount || !recordForm.propertyId) return;
        setSaving(true);
        try {
            const propName = properties.find(p => p.id === recordForm.propertyId)?.name || 'Unknown';
            await push(ref(database, `transactions/${companyId}`), {
                type: recordForm.type,
                label: recordForm.label,
                propertyId: recordForm.propertyId,
                propertyName: propName,
                amount: parseFloat(recordForm.amount),
                date: Date.now(),
                category: recordForm.type === 'income' ? 'rent' : 'expense',
            });
            setRecordForm({ type: 'income', label: '', amount: '', propertyId: '' });
            setShowModal(false);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const filtered = transactions.filter(t =>
        (filterType === 'all' || t.type === filterType) &&
        (t.label.toLowerCase().includes(searchQuery.toLowerCase()) || t.propertyName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    return (
        <div className="flex flex-col h-full -m-4 sm:-m-8">
            <div className="p-8 flex-1 overflow-y-auto">
                <h1 className="text-[28px] font-bold text-[#1b1b1b] tracking-tight mb-1.5">Transaction History</h1>
                <p className="text-sm text-[#605e5c] mb-6">Complete record of all financial activity across your portfolio.</p>

                {/* Search + Filters + Record */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="flex items-center gap-2.5 border-b border-[#8a8886] focus-within:border-b-2 focus-within:border-[#0067b8] pb-1.5 pt-2 flex-1 max-w-[380px] transition-all">
                        <Search size={16} className="text-[#a19f9d] shrink-0" />
                        <input type="text" placeholder="Search transactions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            className="border-none bg-transparent w-full outline-none text-[15px] text-[#1b1b1b] placeholder:text-[#605e5c] placeholder:font-light" />
                    </div>
                    <div className="flex items-center gap-1 border border-[#e1dfdd] p-0.5">
                        {(['all', 'income', 'expense'] as const).map(type => (
                            <button key={type} onClick={() => setFilterType(type)}
                                className={`px-4 py-2 text-sm font-semibold transition-colors capitalize ${filterType === type ? 'bg-white shadow-sm' : 'text-[#605e5c] hover:text-[#1b1b1b]'}`}
                                style={filterType === type ? { color: accentColor } : {}}>
                                {type}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="shrink-0 flex items-center gap-2 bg-white border text-[14px] font-semibold px-6 py-2.5 transition-colors shadow-sm"
                        style={{ borderColor: accentColor, color: accentColor }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = accentColor; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.color = accentColor; }}
                    >
                        <Plus size={16} /> Record
                    </button>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-white border border-[#e1dfdd] p-5">
                        <p className="text-xs font-semibold text-[#605e5c] mb-2">Total Income</p>
                        <p className="text-[22px] font-bold text-emerald-600">D {totalIncome.toLocaleString()}</p>
                    </div>
                    <div className="bg-white border border-[#e1dfdd] p-5">
                        <p className="text-xs font-semibold text-[#605e5c] mb-2">Total Expenses</p>
                        <p className="text-[22px] font-bold text-red-500">D {totalExpenses.toLocaleString()}</p>
                    </div>
                    <div className="bg-white border border-[#e1dfdd] p-5">
                        <p className="text-xs font-semibold text-[#605e5c] mb-2">Net Balance</p>
                        <p className={`text-[22px] font-bold ${totalIncome - totalExpenses >= 0 ? 'text-[#1b1b1b]' : 'text-red-500'}`}>
                            D {(totalIncome - totalExpenses).toLocaleString()}
                        </p>
                    </div>
                </div>

                <div className="bg-white border border-[#e1dfdd] overflow-hidden">
                    {filtered.length === 0 ? (
                        <div className="px-5 py-16 text-center">
                            <Receipt size={40} className="mx-auto text-[#c8c6c4] mb-4" />
                            <p className="text-sm font-semibold text-[#605e5c]">No transactions recorded yet</p>
                            <p className="text-xs text-[#a19f9d] mt-1">Use the Record button to add income or expenses.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#e1dfdd] bg-[#faf9f8]">
                                    <th className="py-3 px-5 text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Type</th>
                                    <th className="py-3 px-5 text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Description</th>
                                    <th className="py-3 px-5 text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Property</th>
                                    <th className="py-3 px-5 text-xs font-semibold text-[#605e5c] uppercase tracking-wider">Date</th>
                                    <th className="py-3 px-5 text-xs font-semibold text-[#605e5c] uppercase tracking-wider text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((t) => (
                                    <tr key={t.id} className="border-b border-[#f3f2f1] hover:bg-[#f3f9fd] transition-colors">
                                        <td className="py-3.5 px-5">
                                            <div className={`w-9 h-9 flex items-center justify-center ${t.type === 'income' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                                                <Home size={15} className={t.type === 'income' ? 'text-emerald-600' : 'text-red-500'} />
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-5 text-sm font-semibold text-[#1b1b1b]">{t.label}</td>
                                        <td className="py-3.5 px-5 text-sm text-[#605e5c]">{t.propertyName}</td>
                                        <td className="py-3.5 px-5 text-sm text-[#605e5c]">{new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td className="py-3.5 px-5 text-right">
                                            <span className={`text-sm font-bold flex items-center justify-end gap-0.5 ${t.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {t.type === 'income' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                                {t.type === 'income' ? '+' : '-'}D {t.amount.toLocaleString()}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Record Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white w-full max-w-[480px] shadow-[0_8px_32px_rgba(0,0,0,0.12)]" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-5 border-b border-[#e1dfdd] flex items-center justify-between bg-[#faf9f8]">
                            <h2 className="text-lg font-bold text-[#1b1b1b]">Record Transaction</h2>
                            <button className="text-[#605e5c] hover:text-[#1b1b1b] p-1" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-[#323130] uppercase tracking-wide block mb-2">Transaction Type</label>
                                <div className="flex gap-2">
                                    {(['income', 'expense'] as const).map(type => (
                                        <button key={type} onClick={() => setRecordForm({ ...recordForm, type })}
                                            className={`flex-1 py-2.5 text-sm font-semibold border transition-colors capitalize ${recordForm.type === type
                                                ? type === 'income' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-red-50 border-red-400 text-red-600'
                                                : 'bg-white border-[#e1dfdd] text-[#605e5c] hover:bg-[#f3f2f1]'}`}>
                                            {type === 'income' ? '↑ Income' : '↓ Expense'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-[#323130] uppercase tracking-wide block mb-2">Property</label>
                                <select className="border border-[#c8c6c4] px-3 py-2.5 text-sm text-[#1b1b1b] bg-white outline-none w-full focus:border-[#0891b2] transition-colors"
                                    value={recordForm.propertyId} onChange={(e) => setRecordForm({ ...recordForm, propertyId: e.target.value })}>
                                    <option value="">Select a property...</option>
                                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-[#323130] uppercase tracking-wide block mb-2">Description</label>
                                <input className="border border-[#c8c6c4] px-3 py-2.5 text-sm text-[#1b1b1b] outline-none w-full focus:border-[#0891b2] transition-colors"
                                    placeholder="e.g. Rent — March 2026"
                                    value={recordForm.label} onChange={(e) => setRecordForm({ ...recordForm, label: e.target.value })} />
                            </div>
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
                            <button onClick={() => setShowModal(false)}
                                className="px-5 py-2.5 border border-[#8a8886] text-sm font-semibold text-[#323130] bg-white hover:bg-[#f3f2f1] transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleRecord} disabled={saving || !recordForm.label || !recordForm.amount || !recordForm.propertyId}
                                className="px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ backgroundColor: accentColor }}>
                                {saving ? 'Recording...' : 'Record Transaction'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
