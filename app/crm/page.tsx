"use client";

import { Users, Search, Activity, FileText } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../ledger/page.module.css';

export default function CRMDashboard() {
    return (
        <div className={styles.toolLayout}>
            {/* Tool Specific Sidebar */}
            <aside className={styles.toolSidebar}>
                <div className={styles.toolLogo}>
                    <Users size={24} color="#10b981" />
                    <span className={styles.toolName}>Client Rel</span>
                </div>

                <nav className={styles.toolNav}>
                    <button className={`${styles.navItem} ${styles.active}`} style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)' }}>
                        <Activity size={18} />
                        <span>Active Tickets</span>
                    </button>
                    <button className={styles.navItem}>
                        <FileText size={18} />
                        <span>Utility Reports</span>
                    </button>
                    <hr className={styles.divider} />
                    <Link href="/portal" className={styles.backBtn}>
                        <span>← Back to Hub</span>
                    </Link>
                </nav>
            </aside>

            {/* Main CRM Content */}
            <main className={styles.toolMain}>
                <div className={styles.topHeader}>
                    <div className={styles.searchBar}>
                        <Search size={18} color="var(--text-secondary)" />
                        <input type="text" placeholder="Search tenant tickets..." />
                    </div>
                </div>

                <div className={styles.contentWrap}>
                    <h1 className={styles.pageTitle}>Client Relations</h1>
                    <p className={styles.subtitle}>Monitor utility bills, maintenance requests, and construction progress.</p>

                    <div className={styles.emptyState}>
                        <Image src="/office-collaboration.png" alt="Happy Clients" width={300} height={200} className={styles.emptyImg} />
                        <h3>Inbox is clear</h3>
                        <p>Your tenants have no active requests at this time.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
