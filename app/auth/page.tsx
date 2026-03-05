"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, database } from '../../lib/firebase';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();


    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            let userCredential;
            if (isLogin) {
                userCredential = await signInWithEmailAndPassword(auth, email, password);
            } else {
                userCredential = await createUserWithEmailAndPassword(auth, email, password);
            }

            // Check if user has completed onboarding
            const companySnap = await get(ref(database, 'companies/' + userCredential.user.uid));
            if (companySnap.exists()) {
                router.push('/portal');
            } else {
                router.push('/onboarding');
            }
        } catch (err: any) {
            setError(err.message);
        }
        setLoading(false);
    };

    const handleGoogleAuth = async () => {
        setLoading(true);
        setError('');
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);

            // Check if user has completed onboarding
            const companySnap = await get(ref(database, 'companies/' + result.user.uid));
            if (companySnap.exists()) {
                router.push('/portal');
            } else {
                router.push('/onboarding');
            }
        } catch (err: any) {
            setError(err.message);
        }
        setLoading(false);
    };

    return (
        <main className="h-[100dvh] w-full bg-[#f3f2f1] overflow-hidden flex flex-col lg:flex-row font-inter">

            {/* Sliding Form Container (Left Side on Auth) */}
            <motion.div
                initial={{ x: '-10%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="w-full lg:w-1/2 bg-[#f3f2f1] flex flex-col items-center pt-8 md:pt-12 px-4 z-20 shadow-[20px_0_40px_rgba(0,0,0,0.05)] overflow-y-auto pb-10"
            >
                {/* Top Navigation Back Banner */}
                <div className="w-full max-w-[440px] flex items-center mb-6">
                    <button onClick={() => router.push('/')} className="flex items-center gap-1.5 text-[13px] text-[#0067b8] hover:underline" type="button">
                        <ArrowLeft size={14} />
                        <span>Back</span>
                    </button>
                </div>

                {/* Microsoft Style Card */}
                <div className="w-full max-w-[440px] bg-white shadow-[0_2px_6px_rgba(0,0,0,0.2)] p-11">

                    <div className="flex justify-start mb-6">
                        <Image src="/logo-blue.png" alt="Sama Kerr" width={110} height={32} className="object-contain" />
                    </div>

                    <h1 className="text-[24px] font-semibold text-[#1b1b1b] mb-4 tracking-[-0.02em]">
                        {isLogin ? 'Sign in' : 'Create account'}
                    </h1>

                    <p className="text-[14px] text-[#605e5c] mb-6">
                        {isLogin ? 'to continue to Sama Kerr Suite' : 'to standardize your property management'}
                    </p>

                    {error && <div className="text-[#e81123] text-[13px] mb-4 font-medium">{error}</div>}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="w-full">
                            <input
                                className="w-full px-0 pb-1.5 pt-2 border-b border-[#8a8886] text-[15px] bg-transparent text-[#1b1b1b] placeholder:text-[#605e5c] focus:border-[#0067b8] focus:border-b-2 outline-none transition-all placeholder:font-light"
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="Email address"
                            />
                        </div>

                        <div className="w-full">
                            <input
                                className="w-full px-0 pb-1.5 pt-2 border-b border-[#8a8886] text-[15px] bg-transparent text-[#1b1b1b] placeholder:text-[#605e5c] focus:border-[#0067b8] focus:border-b-2 outline-none transition-all placeholder:font-light"
                                type="password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Password"
                            />
                        </div>

                        <div className="mt-2 text-[13px]">
                            {isLogin ? "No account? " : "Already have an account? "}
                            <button
                                type="button"
                                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                                className="text-[#0067b8] hover:text-[#005da6] hover:underline focus:outline-none"
                            >
                                {isLogin ? 'Create one!' : 'Sign in'}
                            </button>
                        </div>

                        <div className="flex justify-end mt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-[#0067b8] text-white px-8 py-1.5 text-[15px] font-medium min-h-[32px] hover:bg-[#005da6] transition-colors disabled:opacity-60 focus:outline-[#000000] focus:outline-offset-2"
                            >
                                {loading ? 'Wait...' : 'Next'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Microsoft Style Secondary Sign In Options */}
                <div className="w-full max-w-[440px] mt-6 bg-white shadow-[0_2px_6px_rgba(0,0,0,0.2)]">
                    <button
                        onClick={handleGoogleAuth}
                        disabled={loading}
                        className="w-full flex items-center p-4 text-[15px] text-[#1b1b1b] hover:bg-[#f3f2f1] transition-colors disabled:opacity-50 text-left font-medium"
                    >
                        <div className="w-8 h-8 flex items-center justify-center mr-3 bg-white border border-[#e1dfdd] rounded-sm">
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                        </div>
                        Sign in with Google
                    </button>
                </div>

                {/* Footer Links (Microsoft Style) */}
                <div className="mt-8 flex gap-6 text-[12px] text-[#605e5c]">
                    <a href="#" className="hover:underline">Terms of use</a>
                    <a href="#" className="hover:underline">Privacy & cookies</a>
                </div>
            </motion.div>

            {/* Sliding Image Container (Right Side on Auth) */}
            <motion.div
                initial={{ x: '10%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                className="hidden lg:block relative w-1/2 bg-black z-10 overflow-hidden"
            >
                <Image
                    src="/management-confidence.png"
                    alt="Management Setup"
                    fill
                    className="object-cover opacity-90 transition-transform duration-[1500ms] scale-105"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10" />

                <div className="absolute bottom-20 left-12 right-12 z-20">
                    <h2 className="text-[28px] font-semibold text-white leading-snug tracking-tight drop-shadow-lg">
                        Elevating the standard of structural longevity and architectural management.
                    </h2>
                </div>
            </motion.div>

        </main>
    );
}
