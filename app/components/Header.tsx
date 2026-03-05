"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Globe, User } from 'lucide-react';

export default function Header() {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            // Change header state after scrolling past the hero video roughly
            setIsScrolled(window.scrollY > 100);
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Check on initial load

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header className={`fixed top-0 left-0 w-full z-50 flex flex-col transition-all duration-300 ${isScrolled ? 'bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)]' : 'bg-transparent'}`}>
            <div className={`flex items-center justify-between px-6 lg:px-12 h-[80px] transition-colors duration-300 ${isScrolled ? 'text-primary-text' : 'text-white'}`}>
                <div className="flex items-center gap-12">
                    <Link href="/" className="shrink-0 flex items-center h-full">
                        <Image
                            src="/logo-blue.png"
                            alt="Sama Kerr Logo"
                            width={120}
                            height={34}
                            className="object-contain transition-all duration-300 opacity-90"
                            priority
                        />
                    </Link>
                    <nav className="hidden lg:flex items-center gap-8">
                        <Link href="#desktop" className="text-[13px] font-semibold tracking-wider uppercase opacity-90 hover:opacity-100 transition-opacity">Manager Ledger</Link>
                        <Link href="#mobile" className="text-[13px] font-semibold tracking-wider uppercase opacity-90 hover:opacity-100 transition-opacity">Mobile App</Link>
                        <Link href="#corporate" className="text-[13px] font-semibold tracking-wider uppercase opacity-90 hover:opacity-100 transition-opacity">Corporate Suite</Link>
                    </nav>
                </div>

                <div className="flex items-center gap-8">
                    <Link href="#explore" className="hidden md:block text-[13px] font-semibold tracking-wider uppercase opacity-90 hover:opacity-100 transition-opacity">Explore</Link>
                    <Link href="#support" className="hidden md:block text-[13px] font-semibold tracking-wider uppercase opacity-90 hover:opacity-100 transition-opacity">Support</Link>
                    <div className="flex items-center gap-6">
                        <Search size={20} className="cursor-pointer opacity-90 hover:opacity-100 transition-opacity" />
                        <div className="flex items-center gap-2 cursor-pointer opacity-90 hover:opacity-100 transition-opacity">
                            <Globe size={20} />
                            <span className="text-xs font-bold uppercase">GM</span>
                        </div>
                        <User size={20} className="cursor-pointer opacity-90 hover:opacity-100 transition-opacity" />
                    </div>
                </div>
            </div>

            <div className={`flex items-center justify-between px-6 lg:px-12 bg-secondary-bg transition-all duration-300 overflow-hidden ${isScrolled ? 'h-[64px] opacity-100 border-t border-border-subtle' : 'h-0 opacity-0'}`}>
                <div className="font-playfair font-semibold text-lg text-primary-text">Sama Kerr Suite</div>
                <div className="flex items-center gap-6">
                    <div className="hidden md:block text-right text-sm leading-tight text-primary-text">
                        Access all tools <br />
                        <strong>Starting at $1999/year</strong>
                    </div>
                    <Link href="/auth" className="bg-accent-blue text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-accent-hover transition-colors">
                        Get Started
                    </Link>
                </div>
            </div>
        </header>
    );
}
