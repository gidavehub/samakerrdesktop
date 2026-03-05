"use client";

import { useState } from 'react';
import { Building2, Map as MapIcon, Plus, Search, QrCode, X, Printer } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { auth, database } from '../../lib/firebase';
import { ref, get } from 'firebase/database';
import styles from './page.module.css';

export default function LedgerDashboard() {
    const [properties, setProperties] = useState<any[]>([
        { id: '10A', address: '10A Bijilo Drive', tenant: null },
        { id: '14B', address: '14B Fajara East', tenant: 'Amadou Jallow' }
    ]);
    const [activeProperty, setActiveProperty] = useState<any>(null);
    const [companyInfo, setCompanyInfo] = useState<any>(null);

    // Initial company fetch
    useState(() => {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                const snap = await get(ref(database, 'companies/' + user.uid));
                if (snap.exists()) setCompanyInfo(snap.val());
            }
        });
    });

    const handlePrint = () => {
        window.print();
    };
    return (
        <div className={styles.toolLayout}>
            {/* Tool Specific Sidebar */}
            <aside className={styles.toolSidebar}>
                <div className={styles.toolLogo}>
                    <Building2 size={24} color="var(--accent-blue)" />
                    <span className={styles.toolName}>Ledger</span>
                </div>

                <nav className={styles.toolNav}>
                    <button className={`${styles.navItem} ${styles.active}`}>
                        <Building2 size={18} />
                        <span>All Properties</span>
                    </button>
                    <button className={styles.navItem}>
                        <MapIcon size={18} />
                        <span>Map View</span>
                    </button>
                    <hr className={styles.divider} />
                    <Link href="/portal" className={styles.backBtn}>
                        <span>← Back to Hub</span>
                    </Link>
                </nav>
            </aside>

            {/* Main Ledger Content */}
            <main className={styles.toolMain}>
                <div className={styles.topHeader}>
                    <div className={styles.searchBar}>
                        <Search size={18} color="var(--text-secondary)" />
                        <input type="text" placeholder="Search properties by ID or Address..." />
                    </div>
                    <button className={styles.primaryBtn}>
                        <Plus size={18} />
                        <span>New Property</span>
                    </button>
                </div>

                <div className={styles.contentWrap}>
                    <h1 className={styles.pageTitle}>Property Portfolio</h1>
                    <p className={styles.subtitle}>Manage your high-end real estate units and generate QR codes.</p>

                    {properties.length === 0 ? (
                        <div className={styles.emptyState}>
                            <Image src="/management-confidence.png" alt="Empty Portfolio" width={300} height={200} className={styles.emptyImg} />
                            <h3>No properties tracked yet</h3>
                            <p>Begin by adding your first unit to the ledger.</p>
                            <button className={styles.primaryBtn}>Add First Unit</button>
                        </div>
                    ) : (
                        <div className="bg-white border border-[#e1dfdd] shadow-[0_2px_4px_rgba(0,0,0,0.02)] overflow-hidden w-full max-w-[900px]">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#e1dfdd] bg-[#f8f8f8]">
                                        <th className="py-3 px-6 text-[13px] font-semibold text-[#323130] uppercase">Unit ID</th>
                                        <th className="py-3 px-6 text-[13px] font-semibold text-[#323130] uppercase">Property Address</th>
                                        <th className="py-3 px-6 text-[13px] font-semibold text-[#323130] uppercase">Current Tenant</th>
                                        <th className="py-3 px-6 text-[13px] font-semibold text-[#323130] uppercase text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {properties.map(p => (
                                        <tr key={p.id} className="border-b border-[#f3f2f1] hover:bg-[#f3f9fd] transition-colors">
                                            <td className="py-4 px-6 text-[14px] font-medium text-[#1b1b1b]">{p.id}</td>
                                            <td className="py-4 px-6 text-[14px] text-[#323130]">{p.address}</td>
                                            <td className="py-4 px-6 text-[14px] text-[#605e5c]">{p.tenant || 'Vacant'}</td>
                                            <td className="py-4 px-6 text-right">
                                                <button onClick={() => setActiveProperty(p)} className="text-[#0067b8] hover:text-[#005da6] flex items-center justify-end gap-1.5 text-[13px] font-medium transition-colors ml-auto">
                                                    <QrCode size={16} />
                                                    Setup QR Profile
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Print Modal / Setup Drawer */}
                {activeProperty && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
                        <div className="bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)] w-full max-w-[600px] overflow-hidden flex flex-col">
                            <div className="px-6 py-4 border-b border-[#e1dfdd] flex items-center justify-between bg-[#f8f8f8]">
                                <h2 className="text-[18px] font-semibold text-[#1b1b1b]">Tenant Setup Profile</h2>
                                <button className="text-[#605e5c] hover:text-[#1b1b1b] p-1 rounded" onClick={() => setActiveProperty(null)}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 flex flex-col items-center">
                                <div className="w-32 h-32 mb-6">
                                    <QRCodeSVG value={activeProperty.id} size={128} fgColor={companyInfo?.brandColor1 || "#000000"} />
                                </div>
                                <h3 className="text-[20px] font-bold text-[#1b1b1b] mb-2">{activeProperty.address}</h3>
                                <p className="text-[14px] text-[#605e5c] text-center max-w-[400px] mb-8">Print this setup kit and provide it to your tenant when they move in. It contains instructions on how to download Sama Kerr and connect to this property.</p>

                                <button onClick={handlePrint} className="bg-[#0067b8] text-white px-8 py-2.5 text-[14px] font-semibold hover:bg-[#005da6] transition-colors flex items-center gap-2 shadow-sm focus:outline-[#000000] focus:outline-offset-2">
                                    <Printer size={18} />
                                    Generate Printable PDF
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Print-Only Layout Element */}
            <div className={styles.printOnlyContainer}>
                {activeProperty && (
                    <div className={styles.printPage}>
                        {companyInfo?.companyLogo && (
                            <img src={companyInfo.companyLogo} alt="Company Logo" className={styles.printLogo} />
                        )}
                        <h1 className={styles.printHeader} style={{ color: companyInfo?.brandColor1 || '#0A58CA' }}>Welcome to Your New Home</h1>
                        <p className={styles.printAddress}>Property ID: {activeProperty.id} &nbsp;|&nbsp; {activeProperty.address}</p>

                        <div className={styles.printQrWrapper}>
                            <QRCodeSVG value={activeProperty.id} size={256} className={styles.printQr} fgColor={companyInfo?.brandColor1 || '#0A58CA'} />
                        </div>

                        <div className={styles.printInstructions}>
                            <h2 style={{ color: companyInfo?.brandColor1 || '#0A58CA' }}>How to connect your property:</h2>
                            <ol>
                                <li>Scan the QR code above or go to <strong>app.samakerr.gm</strong> on your mobile device.</li>
                                <li>Follow the prompt to "Add to Home Screen" to install the Sama Kerr app.</li>
                                <li>Open the Sama Kerr app and tap <strong>Get Started</strong>.</li>
                                <li>Accept camera permissions and point your camera back at this QR code.</li>
                            </ol>
                            <p>Once connected, you can pay rent, report maintenance issues, and manage utilities directly from your device.</p>
                        </div>

                        <div className={styles.printFooter} style={{ backgroundColor: companyInfo?.brandColor1 || '#0A58CA' }}>
                            Powered by Sama Kerr Suite &mdash; The Nexus for Operational Visual Automation
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
