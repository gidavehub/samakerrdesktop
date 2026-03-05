"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { auth, database } from '../../lib/firebase';
import { ArrowRight, CheckCircle, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OnboardingPage() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    // Form states
    const [name, setName] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [portfolioSize, setPortfolioSize] = useState('1-50');
    const [role, setRole] = useState('');
    const [brandColor1, setBrandColor1] = useState('#0067b8');
    const [brandColor2, setBrandColor2] = useState('#10b981');
    const [companyLogo, setCompanyLogo] = useState('');

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (value: string) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setter(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                if (currentUser.displayName) setName(currentUser.displayName);
                if (currentUser.photoURL) setPhotoUrl(currentUser.photoURL);
            } else {
                router.replace('/auth');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleCompanySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (!user) throw new Error("Authentication error. Please sign in again.");

            await updateProfile(user, { displayName: name, photoURL: photoUrl });

            await set(ref(database, 'companies/' + user.uid), {
                ownerName: name,
                ownerEmail: user.email,
                ownerPhoto: photoUrl,
                companyName,
                role,
                portfolioSize,
                brandColor1,
                brandColor2,
                companyLogo,
                createdAt: Date.now(),
                plan: 'pending'
            });
            setStep(2);
        } catch (err: any) {
            setError(err.message);
        }
        setLoading(false);
    };

    const handlePlanSelect = async () => {
        setLoading(true);
        // Mock payment verification & upgrade
        setTimeout(async () => {
            if (user) {
                await set(ref(database, `companies/${user.uid}/plan`), 'Sama Kerr Suite');
            }
            router.push('/portal');
        }, 1500);
    };

    if (!user) return null; // Wait for auth check

    return (
        <main className="h-[100dvh] w-full bg-[#f3f2f1] overflow-hidden font-inter">

            <div className={`flex w-full h-full ${step === 1 ? 'flex-col lg:flex-row' : 'flex-col lg:flex-row-reverse'}`}>

                {/* IMAGE CONTAINER (Layout animated) 
                    Starts on LEFT in step 1, slides to RIGHT in step 2
                */}
                <motion.div
                    layout
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    className="hidden lg:block relative w-1/2 bg-black z-10 overflow-hidden"
                >
                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.div
                                key="img-step-1"
                                initial={{ opacity: 0, scale: 1.05 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.6 }}
                                className="absolute inset-0"
                            >
                                <Image
                                    src="/office-collaboration.png"
                                    alt="Corporate Setup"
                                    fill
                                    className="object-cover opacity-90"
                                    priority
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-20" />
                                <div className="absolute bottom-20 left-12 right-12 z-30">
                                    <h2 className="text-[28px] font-semibold text-white leading-snug tracking-tight drop-shadow-md">
                                        Centralize your workflow from one powerful corporate environment.
                                    </h2>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="img-step-2"
                                initial={{ opacity: 0, scale: 1.05 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.6 }}
                                className="absolute inset-0"
                            >
                                <Image
                                    src="/digital-lifestyle.png"
                                    alt="Premium Access"
                                    fill
                                    className="object-cover opacity-90"
                                    priority
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-20" />
                                <div className="absolute bottom-20 left-12 right-12 z-30">
                                    <h2 className="text-[28px] font-semibold text-white leading-snug tracking-tight drop-shadow-md">
                                        Unlock the ultimate structural longevity and architectural management tier.
                                    </h2>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* FORM CONTAINER (Layout animated) 
                    Starts on RIGHT in step 1, slides to LEFT in step 2
                */}
                <motion.div
                    layout
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full lg:w-1/2 bg-[#f3f2f1] flex flex-col items-center pt-8 md:pt-12 px-4 shadow-[20px_0_40px_rgba(0,0,0,0.05)] overflow-y-auto pb-10 z-20"
                >
                    {/* Header inside Form Side */}
                    <motion.div layout="position" className="w-full max-w-[440px] flex items-center justify-between mb-8">
                        <button onClick={() => router.push('/auth')} className="flex items-center gap-1.5 text-[13px] text-[#0067b8] hover:underline" type="button">
                            <ChevronLeft size={14} />
                            <span>Cancel Setup</span>
                        </button>
                        <Image src="/logo-blue.png" alt="Sama Kerr" width={100} height={28} className="object-contain" />
                    </motion.div>

                    <motion.div layout="position" className="w-full max-w-[440px] bg-white shadow-[0_2px_6px_rgba(0,0,0,0.2)] p-11">
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div
                                    key="form-step-1"
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -15 }}
                                    transition={{ duration: 0.4 }}
                                    className="w-full"
                                >
                                    <h1 className="text-[24px] font-semibold text-[#1b1b1b] mb-4 tracking-[-0.02em]">Company Details</h1>
                                    <p className="text-[14px] text-[#605e5c] mb-6">Tell us about your organization to setup your corporate ledger.</p>

                                    {error && <div className="text-[#e81123] text-[13px] mb-4 font-medium">{error}</div>}

                                    <form onSubmit={handleCompanySubmit} className="flex flex-col gap-4">
                                        <div className="w-full flex items-end gap-4 mb-2">
                                            <div className="w-16 h-16 rounded-full bg-[#f3f9fd] border border-[#cce3f5] overflow-hidden flex items-center justify-center shrink-0">
                                                {photoUrl ? <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" /> : <div className="text-[12px] text-[#0067b8]">No Pic</div>}
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[12px] text-[#605e5c] block mb-1">Profile Picture</label>
                                                <input type="file" accept="image/*" onChange={e => handleImageUpload(e, setPhotoUrl)} className="text-[13px]" />
                                            </div>
                                        </div>

                                        <div className="w-full">
                                            <input className="w-full px-0 pb-1.5 pt-2 border-b border-[#8a8886] text-[15px] bg-transparent text-[#1b1b1b] placeholder:text-[#605e5c] focus:border-[#0067b8] focus:border-b-2 outline-none transition-all placeholder:font-light" type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Your Full Name" />
                                        </div>
                                        <div className="w-full">
                                            <input className="w-full px-0 pb-1.5 pt-2 border-b border-[#8a8886] text-[15px] bg-transparent text-[#1b1b1b] placeholder:text-[#605e5c] focus:border-[#0067b8] focus:border-b-2 outline-none transition-all placeholder:font-light" type="text" required value={role} onChange={e => setRole(e.target.value)} placeholder="Your Role (e.g. Property Manager)" />
                                        </div>

                                        <div className="w-full border-t border-[#e1dfdd] my-2"></div>

                                        <div className="w-full flex items-end gap-4 mb-2">
                                            <div className="w-16 h-16 bg-[#f3f9fd] border border-[#cce3f5] flex items-center justify-center shrink-0 rounded-sm overflow-hidden">
                                                {companyLogo ? <img src={companyLogo} alt="Logo" className="w-full h-full object-contain" /> : <div className="text-[11px] text-[#0067b8] text-center">Company<br />Logo</div>}
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[12px] text-[#605e5c] block mb-1">Upload Company Logo</label>
                                                <input type="file" accept="image/*" onChange={e => handleImageUpload(e, setCompanyLogo)} className="text-[13px]" required={!companyLogo} />
                                            </div>
                                        </div>

                                        <div className="w-full">
                                            <input className="w-full px-0 pb-1.5 pt-2 border-b border-[#8a8886] text-[15px] bg-transparent text-[#1b1b1b] placeholder:text-[#605e5c] focus:border-[#0067b8] focus:border-b-2 outline-none transition-all placeholder:font-light" type="text" required value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Company Legal Name" />
                                        </div>

                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="text-[12px] text-[#605e5c] block mb-1">Primary Brand Color</label>
                                                <input type="color" value={brandColor1} onChange={e => setBrandColor1(e.target.value)} className="w-full h-8 cursor-pointer" />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[12px] text-[#605e5c] block mb-1">Secondary Brand Color</label>
                                                <input type="color" value={brandColor2} onChange={e => setBrandColor2(e.target.value)} className="w-full h-8 cursor-pointer" />
                                            </div>
                                        </div>
                                        <div className="w-full mt-2">
                                            <label className="text-[13px] text-[#605e5c] mb-1 block">Portfolio Size</label>
                                            <select
                                                className="w-full px-0 pb-1.5 pt-1 border-b border-[#8a8886] text-[15px] bg-transparent text-[#1b1b1b] focus:border-[#0067b8] focus:border-b-2 outline-none transition-all"
                                                value={portfolioSize}
                                                onChange={e => setPortfolioSize(e.target.value)}
                                            >
                                                <option value="1-50">1 - 50 Properties</option>
                                                <option value="51-200">51 - 200 Properties</option>
                                                <option value="201-500">201 - 500 Properties</option>
                                                <option value="500+">500+ Properties</option>
                                            </select>
                                        </div>

                                        <div className="flex justify-end mt-6">
                                            <button type="submit" disabled={loading} className="bg-[#0067b8] text-white px-8 py-1.5 text-[15px] font-medium min-h-[32px] hover:bg-[#005da6] transition-colors disabled:opacity-60 focus:outline-[#000000] focus:outline-offset-2 flex items-center gap-2">
                                                {loading ? 'Saving...' : 'Continue'}
                                                {!loading && <ArrowRight size={16} />}
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div
                                    key="form-step-2"
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -15 }}
                                    transition={{ duration: 0.4 }}
                                    className="w-full"
                                >
                                    <h1 className="text-[24px] font-semibold text-[#1b1b1b] mb-4 tracking-[-0.02em]">Unlock Premium</h1>
                                    <p className="text-[14px] text-[#605e5c] mb-6">Get full access to the Sama Kerr Suite.</p>

                                    <div className="border border-[#0067b8] p-6 mb-8 bg-[#f3f9fd]">
                                        <div className="flex justify-between items-center mb-5 pb-5 border-b border-[#cce3f5]">
                                            <h3 className="text-[17px] font-semibold text-[#1b1b1b]">Sama Kerr Suite</h3>
                                            <div className="text-[20px] font-bold text-[#1b1b1b]">$1999<span className="text-[13px] font-normal text-[#605e5c]">/year</span></div>
                                        </div>
                                        <ul className="flex flex-col gap-3">
                                            <li className="flex items-center gap-3 text-[14px] text-[#323130]"><CheckCircle size={16} className="text-[#0067b8]" /> Property Management Ledger</li>
                                            <li className="flex items-center gap-3 text-[14px] text-[#323130]"><CheckCircle size={16} className="text-[#0067b8]" /> Client Relations Toolkit</li>
                                            <li className="flex items-center gap-3 text-[14px] text-[#323130]"><CheckCircle size={16} className="text-[#0067b8]" /> Interactive Metro Dashboard</li>
                                        </ul>
                                    </div>

                                    <div className="flex justify-end">
                                        <button onClick={handlePlanSelect} disabled={loading} className="w-full bg-[#0067b8] text-white px-8 py-2 text-[15px] font-medium min-h-[36px] hover:bg-[#005da6] transition-colors disabled:opacity-60 focus:outline-[#000000] focus:outline-offset-2">
                                            {loading ? 'Activating License...' : 'Unlock Workspace (Bypass)'}
                                        </button>
                                    </div>
                                    <p className="text-center text-[12px] text-[#605e5c] mt-4">By clicking unlock, you agree to our digital licensing Terms of Service.</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            </div>

        </main>
    );
}
