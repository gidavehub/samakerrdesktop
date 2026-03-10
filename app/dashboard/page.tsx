"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { QRCodeSVG } from 'qrcode.react';
import styles from './page.module.css';

export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [homes, setHomes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [homeName, setHomeName] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [location, setLocation] = useState('');

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            if (!currentUser) {
                router.push('/auth');
            } else {
                setUser(currentUser);
                loadHomes(currentUser.uid);
            }
        });

        return () => unsubscribe();
    }, [router]);

    const loadHomes = (userId: string) => {
        const q = query(collection(db, 'userHomes'), where('userId', '==', userId));
        onSnapshot(q, (snapshot) => {
            const homesList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setHomes(homesList);
            setLoading(false);
        });
    };

    const handleAddHome = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        const newHomeId = uuidv4();
        const homeData = {
            name: homeName,
            owner: ownerName,
            location: location,
            qrToken: newHomeId,
            createdAt: new Date().toISOString()
        };

        await addDoc(collection(db, 'userHomes'), { ...homeData, userId: user.uid });

        setHomeName('');
        setOwnerName('');
        setLocation('');
    };

    const handleLogout = async () => {
        await auth.signOut();
        router.push('/');
    };

    const printQR = (id: string) => {
        const printContent = document.getElementById(`qr-${id}`);
        if (printContent) {
            const WindowPrint = window.open('', '', 'width=900,height=650');
            if (WindowPrint) {
                WindowPrint.document.write('<html><head><title>Print Sama Kerr QR Code</title>');
                WindowPrint.document.write('<style>body{display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;font-family:sans-serif;} svg{width:300px;height:300px;}</style></head><body>');
                WindowPrint.document.write('<h1>Sama Kerr Home Access</h1>');
                WindowPrint.document.write(printContent.innerHTML);
                WindowPrint.document.write('<p>Scan to manage your home</p>');
                WindowPrint.document.write('</body></html>');
                WindowPrint.document.close();
                WindowPrint.focus();
                setTimeout(() => {
                    WindowPrint.print();
                    WindowPrint.close();
                }, 250);
            }
        }
    };

    if (loading) {
        return <div className={styles.loading}>Loading Sama Kerr Management...</div>;
    }

    return (
        <div className={styles.dashboard}>
            <aside className={styles.sidebar}>
                <div className={styles.brand}>Sama Kerr Ledger</div>
                <nav className={styles.nav}>
                    <a href="#" className={styles.active}>Home Management</a>
                    <a href="#">Utility Reports</a>
                    <a href="#">Maintenance</a>
                </nav>
                <button onClick={handleLogout} className={styles.logoutBtn}>Sign Out</button>
            </aside>

            <main className={styles.mainContent}>
                <header className={styles.header}>
                    <h1>Property Ledger</h1>
                    <p>Manage your real estate portfolio</p>
                </header>

                <section className={styles.addSection}>
                    <h2>Register New Home</h2>
                    <form onSubmit={handleAddHome} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label>Property Name / ID</label>
                            <input type="text" required value={homeName} onChange={e => setHomeName(e.target.value)} />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Owner Name</label>
                            <input type="text" required value={ownerName} onChange={e => setOwnerName(e.target.value)} />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Location (Google Code / Address)</label>
                            <input type="text" required value={location} onChange={e => setLocation(e.target.value)} />
                        </div>
                        <button type="submit" className="btn-primary">Generate Property & QR</button>
                    </form>
                </section>

                <section className={styles.listSection}>
                    <h2>Registered Properties</h2>
                    {homes.length === 0 ? (
                        <p className={styles.emptyState}>No properties registered yet.</p>
                    ) : (
                        <div className={styles.grid}>
                            {homes.map((home) => (
                                <div key={home.id} className={styles.homeCard}>
                                    <div className={styles.homeDetails}>
                                        <h3>{home.name}</h3>
                                        <p><strong>Owner:</strong> {home.owner}</p>
                                        <p><strong>Location:</strong> {home.location}</p>
                                    </div>
                                    <div className={styles.qrSection}>
                                        <div id={`qr-${home.id}`} className={styles.qrWrapper}>
                                            <QRCodeSVG value={`https://samakerr.vercel.app/home/${home.qrToken}`} size={128} />
                                        </div>
                                        <button onClick={() => printQR(home.id)} className={styles.printBtn}>
                                            Print Placard
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
