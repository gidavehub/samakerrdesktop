"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Building2, Users } from 'lucide-react';
import gsap from 'gsap';

const tools = [
    {
        id: 'ledger',
        title: 'Property Management Ledger',
        description: 'Manage assets, track unit economics, and issue connecting QR codes to new tenants across your properties.',
        icon: Building2,
        route: '/ledger',
        image: '/ledger-mastery.png',
        color: '#0A58CA'
    },
    {
        id: 'crm',
        title: 'Client Relations & Requests',
        description: 'Handle tenant utility bills, maintenance tickets, and construction updates centrally from one hub.',
        icon: Users,
        route: '/crm',
        image: '/client-harmony.png',
        color: '#10b981'
    }
];

export default function PortalHome() {
    useEffect(() => {
        gsap.fromTo('.metro-card',
            { opacity: 0, scale: 0.95 },
            { opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
        );
    }, []);

    return (
        <div className="w-full flex flex-col">
            <div className="mb-10">
                <h1 className="text-[32px] font-semibold text-[#1b1b1b] tracking-tight mb-2">Your Licensed Tools</h1>
                <p className="text-[15px] text-[#605e5c] max-w-[600px]">Sama Kerr Suite unlocks full access. Select an application to open its dashboard.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tools.map((tool) => (
                    <Link href={tool.route} key={tool.id} className="metro-card bg-white border border-[#e1dfdd] shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col group overflow-hidden min-h-[380px] relative">
                        <div className="h-[180px] w-full relative overflow-hidden shrink-0">
                            <Image src={tool.image} alt={tool.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                            <div className="absolute inset-0 opacity-80" style={{ background: `linear-gradient(to top, ${tool.color} 0%, rgba(0,0,0,0) 100%)` }} />
                            <div className="absolute bottom-4 left-5 p-2 bg-white rounded shadow-sm" style={{ color: tool.color }}>
                                <tool.icon size={26} strokeWidth={2.5} />
                            </div>
                        </div>
                        <div className="p-6 flex flex-col flex-1">
                            <h2 className="text-[18px] font-semibold text-[#1b1b1b] mb-2 leading-tight">{tool.title}</h2>
                            <p className="text-[14px] text-[#605e5c] line-clamp-3 mb-4 flex-1">{tool.description}</p>

                            <div className="mt-auto flex items-center justify-between pt-4 border-t border-[#f3f2f1] group-hover:border-[#e1dfdd] transition-colors">
                                <span className="text-[14px] font-semibold" style={{ color: tool.color }}>Launch Tool</span>
                                <ArrowRight size={18} className="transform group-hover:translate-x-1 transition-transform" style={{ color: tool.color }} />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="mt-12 p-8 bg-[#f3f9fd] border border-[#cce3f5] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-[#0067b8] opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 max-w-[600px]">
                    <h3 className="text-[20px] font-semibold text-[#1b1b1b] mb-2">Expand Your Capabilities</h3>
                    <p className="text-[14px] text-[#605e5c]">Contact enterprise support to integrate smart lock APIs or external accounting software directly into your hub.</p>
                </div>
                <button className="relative z-10 shrink-0 bg-white border border-[#0067b8] text-[#0067b8] hover:bg-[#0067b8] hover:text-white px-6 py-2.5 text-[14px] font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0067b8] focus:ring-offset-2">Contact Support</button>
            </div>
        </div>
    );
}
