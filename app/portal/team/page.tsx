"use client";

import { useState, useEffect } from 'react';
import { Mail, Plus, Shield, User, X } from 'lucide-react';
import { auth, database } from '../../../lib/firebase';
import { ref, get, set, push } from 'firebase/database';
import { createUserWithEmailAndPassword } from 'firebase/auth'; // Using secondary auth instance conceptually
import gsap from 'gsap';

interface TeamMember {
    id: string;
    email: string;
    role: string;
    accessLevel: string;
    addedAt: number;
}

export default function TeamManagement() {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('Property Manager');
    const [accessLevel, setAccessLevel] = useState('Full Access');
    const [companyData, setCompanyData] = useState<any>(null);
    const [statusMsg, setStatusMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchTeam();
        // Animate the list items
        gsap.fromTo('.team-row',
            { opacity: 0, y: 15 },
            { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, ease: 'power2.out' }
        );
    }, []);

    const fetchTeam = async () => {
        const user = auth.currentUser;
        if (!user) return;

        const teamRef = ref(database, `companies/${user.uid}/team`);
        const companyRef = ref(database, `companies/${user.uid}`);

        const [teamSnap, compSnap] = await Promise.all([get(teamRef), get(companyRef)]);

        if (compSnap.exists()) {
            setCompanyData(compSnap.val());
        }

        if (teamSnap.exists()) {
            const data = teamSnap.val();
            const parsed = Object.keys(data).map(key => ({ id: key, ...data[key] }));
            setMembers(parsed);
        }
    };

    const generateTempPassword = () => {
        return Math.random().toString(36).slice(-8) + "!";
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setStatusMsg('Generating Workspace ID...');

        try {
            const admin = auth.currentUser;
            if (!admin) throw new Error("Unauthorized.");

            const tempPassword = generateTempPassword();

            // 1. Send the email using our API route
            setStatusMsg('Dispatching email via Resend...');

            const payload = {
                email,
                password: tempPassword,
                role,
                accessLevel: 'Full Access', // Forced requirement
                companyLogo: companyData?.companyLogo,
                brandColor1: companyData?.brandColor1 || '#0A58CA',
                brandColor2: companyData?.brandColor2 || '#f4f5f7',
                companyName: companyData?.companyName || 'Sama Kerr Suite'
            };

            const res = await fetch('/api/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed sending email.");
            }

            // 2. Save records to DB
            setStatusMsg('Saving team credentials...');
            const teamRef = ref(database, `companies/${admin.uid}/team`);
            const newMemberRef = push(teamRef);
            await set(newMemberRef, {
                email,
                role,
                accessLevel: 'Full Access',
                addedAt: Date.now()
            });

            setStatusMsg('Invite sent successfully!');
            setTimeout(() => {
                setIsModalOpen(false);
                fetchTeam();
                setEmail('');
                setStatusMsg('');
            }, 1500);

        } catch (error: any) {
            setStatusMsg(`Error: ${error.message}`);
        }
        setIsLoading(false);
    };

    return (
        <div className="w-full flex flex-col pb-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-[32px] font-semibold text-[#1b1b1b] tracking-tight mb-1">Team Management</h1>
                    <p className="text-[15px] text-[#605e5c]">Invite members and manage property access rules.</p>
                </div>
                <button className="bg-[#0067b8] text-white px-5 py-2 text-[14px] font-semibold hover:bg-[#005da6] transition-colors flex items-center gap-2 shadow-sm focus:outline-[#000000] focus:outline-offset-2" onClick={() => setIsModalOpen(true)}>
                    <Plus size={18} />
                    <span>Invite User</span>
                </button>
            </div>

            <div className="bg-white border border-[#e1dfdd] shadow-[0_2px_4px_rgba(0,0,0,0.02)] overflow-hidden">
                {members.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-[#f3f2f1] flex items-center justify-center mb-4">
                            <User size={32} className="text-[#8a8886]" />
                        </div>
                        <p className="text-[16px] font-medium text-[#1b1b1b] mb-1">No team members added yet.</p>
                        <p className="text-[14px] text-[#605e5c]">Click "Invite User" to send a workspace invitation.</p>
                    </div>
                ) : (
                    <div className="w-full overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                                <tr className="border-b border-[#e1dfdd] bg-[#f8f8f8]">
                                    <th className="py-3 px-6 text-[13px] font-semibold text-[#323130] uppercase tracking-wider w-[35%]">User Email</th>
                                    <th className="py-3 px-6 text-[13px] font-semibold text-[#323130] uppercase tracking-wider w-[25%]">Corporate Role</th>
                                    <th className="py-3 px-6 text-[13px] font-semibold text-[#323130] uppercase tracking-wider w-[25%]">Access Level</th>
                                    <th className="py-3 px-6 text-[13px] font-semibold text-[#323130] uppercase tracking-wider w-[15%]">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {members.map((m) => (
                                    <tr key={m.id} className="team-row border-b border-[#f3f2f1] hover:bg-[#f8f8f8] transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-[#e1dfdd] text-[#323130] flex items-center justify-center font-semibold text-[13px] shrink-0 border border-[#c8c6c4]">
                                                    {m.email.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-[14px] font-medium text-[#1b1b1b] truncate">{m.email}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-[14px] text-[#323130] capitalize">{m.role}</td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium border ${m.accessLevel === 'Full Access' ? 'bg-[#d1e8ff] text-[#005da6] border-[#a3d1ff]' : 'bg-[#fff4ce] text-[#795b00] border-[#ffe69c]'}`}>
                                                {m.accessLevel}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="inline-flex items-center gap-1.5 text-[13px] text-[#107c41] font-medium">
                                                <span className="w-2 h-2 rounded-full bg-[#107c41]"></span>
                                                Active
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)] w-full max-w-[480px] overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-[#e1dfdd] flex items-center justify-between bg-[#f8f8f8]">
                            <h2 className="text-[18px] font-semibold text-[#1b1b1b]">Send Workspace Invite</h2>
                            <button className="text-[#605e5c] hover:text-[#1b1b1b] hover:bg-[#e1dfdd] p-1.5 rounded transition-colors" onClick={() => setIsModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleInvite} className="p-6 flex flex-col gap-5">
                            <div className="flex flex-col gap-2">
                                <label className="text-[13px] font-semibold text-[#323130]">User Email</label>
                                <div className="relative flex items-center">
                                    <Mail size={18} className="absolute left-3 text-[#605e5c]" />
                                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@domain.com" className="w-full pl-10 pr-4 py-2 bg-white border border-[#8a8886] rounded text-[14px] text-[#1b1b1b] focus:border-[#0067b8] focus:ring-1 focus:ring-[#0067b8] outline-none transition-shadow" />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[13px] font-semibold text-[#323130]">Corporate Role</label>
                                <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-3 py-2 bg-white border border-[#8a8886] rounded text-[14px] text-[#1b1b1b] focus:border-[#0067b8] focus:ring-1 focus:ring-[#0067b8] outline-none transition-shadow">
                                    <option>Property Manager</option>
                                    <option>Accountant</option>
                                    <option>System Administrator</option>
                                    <option>Client Relations</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[13px] font-semibold text-[#323130]">Access Level</label>
                                <div className="relative flex items-center">
                                    <Shield size={18} className="absolute left-3 text-[#605e5c]" />
                                    <select disabled value="Full Access" className="w-full pl-10 pr-4 py-2 bg-[#f3f2f1] border border-[#8a8886] rounded text-[14px] text-[#605e5c] outline-none cursor-not-allowed">
                                        <option>Full Access</option>
                                    </select>
                                </div>
                                <span className="text-[11px] text-[#605e5c]">All team members are granted full authoritarian access by default.</span>
                            </div>

                            {statusMsg && <div className="mt-2 p-3 bg-[#f3f9fd] border border-[#cce3f5] text-[13px] text-[#0067b8] font-medium rounded">{statusMsg}</div>}

                            <div className="mt-4 pt-4 border-t border-[#e1dfdd] flex justify-end">
                                <button type="submit" disabled={isLoading} className="bg-[#0067b8] text-white px-6 py-2 text-[14px] font-semibold hover:bg-[#005da6] transition-colors shadow-sm disabled:opacity-60 focus:outline-[#000000] focus:outline-offset-2 w-full sm:w-auto text-center">
                                    {isLoading ? 'Processing...' : 'Send Invitation Securely'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
