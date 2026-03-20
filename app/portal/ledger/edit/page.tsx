"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft, Upload, X, Trash2, Image as ImageIcon,
    HardHat, CheckCircle2, Clock, Save, Cuboid, FileText,
    GripVertical, Wand2, Settings2, Smartphone,
    ChevronRight
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { auth, db, rtdb } from '../../../../lib/firebase';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { ref as rtdbRef, onValue, off, set } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import gsap from 'gsap';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Grammar of Shelter Engine — dynamically imported (uses Three.js which needs browser)
const FirstPersonViewer = dynamic(
    () => import('../../../components/grammar-of-shelter/viewer/FirstPersonViewer'),
    { ssr: false, loading: () => <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center"><div className="w-8 h-8 border-[3px] border-white/20 border-t-white rounded-full animate-spin" /></div> }
);

// --- 3D Parallax Viewer REMOVED ---
// Replaced by the Grammar of Shelter Engine (first-person 3D walkthrough)

interface PropertyData {
    name: string;
    address: string;
    googlePlusCode: string;
    completionState: 'planning' | 'construction' | 'completed';
    nawecCashPower: string;
    nawecWaterBill: string;
    tenantName: string;
    notes: string;
    images?: string[];
    constructionProgress?: number;
    blueprintUrl?: string;
    rooms?: any[];
    isometric25DUrl?: string;
    videoUrl?: string;
}

const progressStages = [
    { key: 'planning', label: 'Planning & Design', percent: 15, icon: Clock, color: '#8a8886' },
    { key: 'foundation', label: 'Foundation', percent: 30, icon: HardHat, color: '#d48806' },
    { key: 'structure', label: 'Structure', percent: 50, icon: HardHat, color: '#cf7c2d' },
    { key: 'roofing', label: 'Roofing', percent: 70, icon: HardHat, color: '#0891b2' },
    { key: 'finishing', label: 'Finishing', percent: 90, icon: HardHat, color: '#0A58CA' },
    { key: 'completed', label: 'Completed', percent: 100, icon: CheckCircle2, color: '#34C759' },
];

/* ─── Animated SVG Building ─── */
function BuildingSVG({ progress }: { progress: number }) {
    const p = Math.min(100, Math.max(0, progress));
    // How many floors filled (out of 5)
    const filledFloors = Math.round((p / 100) * 5);
    // Crane visibility
    const showCrane = p < 100 && p > 10;

    return (
        <svg viewBox="0 0 200 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            {/* Ground */}
            <rect x="0" y="140" width="200" height="20" fill="#f3f2f1" rx="2" />
            <rect x="10" y="148" width="180" height="2" fill="#e1dfdd" rx="1" />

            {/* Building outline */}
            <rect x="55" y="20" width="90" height="120" fill="none" stroke="#e1dfdd" strokeWidth="2" strokeDasharray="4 4" rx="2" />

            {/* Building floors (fill from bottom up) */}
            {[0, 1, 2, 3, 4].map(i => {
                const floorY = 116 - i * 24;
                const isFilled = i < filledFloors;
                const isCurrent = i === filledFloors - 1;
                return (
                    <g key={i}>
                        <rect
                            x="57" y={floorY}
                            width="86" height="22"
                            fill={isFilled ? (isCurrent ? '#0A58CA' : '#0A58CA') : 'transparent'}
                            opacity={isFilled ? (1 - i * 0.12) : 0}
                            rx="1"
                        >
                            {isFilled && (
                                <animate attributeName="opacity" from="0" to={1 - i * 0.12} dur="0.6s" begin={`${i * 0.15}s`} fill="freeze" />
                            )}
                        </rect>
                        {/* Windows */}
                        {isFilled && [0, 1, 2].map(w => (
                            <rect
                                key={w}
                                x={66 + w * 28} y={floorY + 5}
                                width="18" height="12"
                                fill="white" opacity="0.4" rx="1"
                            />
                        ))}
                    </g>
                );
            })}

            {/* Crane (visible during construction) */}
            {showCrane && (
                <g opacity="0.7">
                    {/* Vertical pole */}
                    <rect x="155" y="10" width="4" height="130" fill="#d48806" rx="1" />
                    {/* Horizontal arm */}
                    <rect x="90" y="10" width="80" height="4" fill="#d48806" rx="1" />
                    {/* Cable */}
                    <line x1="110" y1="14" x2="110" y2={40 + (100 - p) * 0.6} stroke="#d48806" strokeWidth="1.5" strokeDasharray="3 2">
                        <animate attributeName="y2" values={`${40 + (100 - p) * 0.6};${35 + (100 - p) * 0.6};${40 + (100 - p) * 0.6}`} dur="2s" repeatCount="indefinite" />
                    </line>
                    {/* Hook block */}
                    <rect x="106" y={36 + (100 - p) * 0.6} width="8" height="6" fill="#d48806" rx="1">
                        <animate attributeName="y" values={`${36 + (100 - p) * 0.6};${31 + (100 - p) * 0.6};${36 + (100 - p) * 0.6}`} dur="2s" repeatCount="indefinite" />
                    </rect>
                    {/* Support cables */}
                    <line x1="155" y1="12" x2="170" y2="10" stroke="#d48806" strokeWidth="1" />
                </g>
            )}

            {/* Checkmark when completed */}
            {p >= 100 && (
                <g>
                    <circle cx="100" cy="80" r="20" fill="#34C759" opacity="0.9">
                        <animate attributeName="r" from="0" to="20" dur="0.4s" fill="freeze" />
                    </circle>
                    <polyline points="90,80 97,88 112,72" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <animate attributeName="stroke-dashoffset" from="30" to="0" dur="0.5s" begin="0.3s" fill="freeze" />
                    </polyline>
                </g>
            )}

            {/* Percentage text */}
            <text x="100" y="156" textAnchor="middle" fill="#605e5c" fontSize="11" fontWeight="600" fontFamily="Inter, sans-serif">
                {p}% Complete
            </text>
        </svg>
    );
}

function PropertyEditorContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const propertyId = searchParams.get('id');

    const [companyId, setCompanyId] = useState<string | null>(null);
    const [companyInfo, setCompanyInfo] = useState<any>(null);
    const [property, setProperty] = useState<PropertyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Editable state
    const [images, setImages] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);
    const [completionState, setCompletionState] = useState<string>('planning');
    const [imagesPerRoom, setImagesPerRoom] = useState(3);
    const [videoLength, setVideoLength] = useState(30);

    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // AI Orchestrator States
    const [blueprintFile, setBlueprintFile] = useState<File | null>(null);
    const [blueprintUrl, setBlueprintUrl] = useState<string | null>(null);
    const [rooms, setRooms] = useState<any[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // --- 2.5D Orchestrator States ---
    const [isOrchestrating, setIsOrchestrating] = useState(false);
    const [orchestratorStep, setOrchestratorStep] = useState<string | null>(null);
    const [orchestratorProgress, setOrchestratorProgress] = useState<number>(0);
    const [orchestratorError, setOrchestratorError] = useState<string | null>(null);
    const [orchestratorTrigger, setOrchestratorTrigger] = useState<number>(0); // Timestamp from mobile

    const [isometric25DUrl, setIsometric25DUrl] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);

    const blueprintInputRef = useRef<HTMLInputElement>(null);

    // Property fields
    const [propName, setPropName] = useState('');
    const [propAddress, setPropAddress] = useState('');
    const [propPlusCode, setPropPlusCode] = useState('');
    const [propTenant, setPropTenant] = useState('');
    const [propCashPower, setPropCashPower] = useState('');
    const [propWaterBill, setPropWaterBill] = useState('');

    const contentRef = useRef<HTMLDivElement>(null);
    const accentColor = companyInfo?.brandColor1 || '#0A58CA';

    // Generate the special capture URL for the mobile app
    const captureUrl = `https://samakerrmobile.vercel.app/capture?id=${propertyId || 'demo'}&imagesPerRoom=${imagesPerRoom}&videoLength=${videoLength}`;

    useEffect(() => {
        let unsubscribeProperty = () => {};

        const unsubAuth = onAuthStateChanged(auth, async (user) => {
            if (user && propertyId) {
                setCompanyId(user.uid);
                const compSnap = await getDoc(doc(db, 'companies', user.uid));
                if (compSnap.exists()) setCompanyInfo(compSnap.data());

                // Real-time listener for property data (core data)
                unsubscribeProperty = onSnapshot(doc(db, 'properties', propertyId), (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data() as any;
                        setProperty(data);
                        setImages(data.images || []);
                        setProgress(data.constructionProgress ?? (data.completionState === 'completed' ? 100 : data.completionState === 'construction' ? 50 : 15));
                        setCompletionState(data.completionState || 'planning');

                        if (!propName) setPropName(data.name || '');
                        if (!propAddress) setPropAddress(data.address || '');
                        if (!propPlusCode) setPropPlusCode(data.googlePlusCode || '');
                        if (!propTenant) setPropTenant(data.tenantName || '');
                        if (!propCashPower) setPropCashPower(data.nawecCashPower || '');
                        if (!propWaterBill) setPropWaterBill(data.nawecWaterBill || '');

                        setBlueprintUrl(data.blueprintUrl || null);
                        setRooms(data.rooms || []);

                        if (data.isometric25DUrl) setIsometric25DUrl(data.isometric25DUrl);
                        if (data.videoUrl) setVideoUrl(data.videoUrl);
                    }
                    setLoading(false);
                });

                // Real-time listener for Orchestration Progress (RTDB for low latency)
                const orchestrationRef = rtdbRef(rtdb, `orchestration/${propertyId}`);
                onValue(orchestrationRef, (snapshot) => {
                    const orchData = snapshot.val();
                    if (orchData) {
                        // Detect and wipe stale orchestration data from crashed/timed-out runs
                        const updatedAt = orchData.updatedAt ? new Date(orchData.updatedAt).getTime() : 0;
                        const ageMs = Date.now() - updatedAt;
                        const isStale = ageMs > 10 * 60 * 1000 && orchData.progress < 100 && !orchData.error;
                        if (isStale && orchData.isOrchestrating) {
                            console.warn(`[RTDB] Wiping stale orchestration data (age: ${Math.round(ageMs / 1000)}s)`);
                            set(rtdbRef(rtdb, `orchestration/${propertyId}`), null).catch(() => {});
                            return;
                        }

                        setIsOrchestrating(orchData.isOrchestrating || false);
                        setOrchestratorStep(orchData.step || null);
                        setOrchestratorProgress(orchData.progress || 0);
                        setOrchestratorError(orchData.error || null);
                        if (orchData.trigger) setOrchestratorTrigger(orchData.trigger);
                    }
                });
            }
        });

        return () => {
            unsubAuth();
            unsubscribeProperty();
            if (propertyId) off(rtdbRef(rtdb, `orchestration/${propertyId}`));
        };
    }, [propertyId]);

    // We removed the auto-trigger useEffect here so the user has to click "Begin Process" manually.

    useEffect(() => {        if (!loading && contentRef.current) {
            gsap.fromTo(contentRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
        }
    }, [loading]);

    const handleSave = async () => {
        if (!companyId || !propertyId) return;
        setSaving(true);
        try {
            // Determine completionState from progress
            let state: string = 'planning';
            if (progress >= 100) state = 'completed';
            else if (progress > 15) state = 'construction';

            await updateDoc(doc(db, 'properties', propertyId), {
                name: propName,
                address: propAddress,
                googlePlusCode: propPlusCode,
                tenantName: propTenant,
                nawecCashPower: propCashPower,
                nawecWaterBill: propWaterBill,
                images,
                constructionProgress: progress,
                completionState: state,
                blueprintUrl,
                rooms,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            console.error('Save error:', err);
        } finally {
            setSaving(false);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleOrchestrate = async () => {
        if (!propertyId || !blueprintUrl || rooms.length === 0) {
            alert("Missing blueprint or mapped rooms.");
            return;
        }

        setIsOrchestrating(true);
        // Reset the trigger so it doesn't fire again
        if (orchestratorTrigger > 0) {
            setOrchestratorTrigger(0);
            try {
                await set(rtdbRef(rtdb, `orchestration/${propertyId}/trigger`), 0);
            } catch (e) { console.warn("Failed to reset trigger", e); }
        }

        try {
            const res = await fetch('/api/orchestrate-2-5d', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    propertyId,
                    blueprintUrl,
                    rooms
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Orchestration failed');
            }

            const data = await res.json();
            setIsometric25DUrl(data.isometric25DUrl);
            if (data.videoUrl) setVideoUrl(data.videoUrl);
            setRooms(data.rooms);

            await updateDoc(doc(db, 'properties', propertyId), {
                rooms: data.rooms,
                isometric25DUrl: data.isometric25DUrl,
                ...(data.videoUrl && { videoUrl: data.videoUrl })
            });
            
            alert("Generation Complete!");
        } catch (err: any) {
            console.error("Orchestration failed:", err);
            alert(`Generation failed: ${err.message}`);
        } finally {
            setIsOrchestrating(false);
        }
    };

    const handleBlueprintUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !propertyId) return;
        const file = e.target.files[0];
        setBlueprintFile(file);
        setIsAnalyzing(true);

        try {
            // 1. Securely upload to GCP Storage via our backend (NO CORS ISSUES)
            const formData = new FormData();
            formData.append('file', file);
            formData.append('propertyId', propertyId);
            formData.append('type', 'blueprint');
            
            // If they are replacing an existing blueprint, pass the old URL to the backend so it can be deleted
            if (blueprintUrl) {
                 formData.append('oldUrl', blueprintUrl);
            }

            const uploadRes = await fetch('/api/upload-media', {
                method: 'POST',
                body: formData
            });

            if (!uploadRes.ok) {
                const err = await uploadRes.json();
                throw new Error(err.error || 'Upload failed');
            }

            const { url: downloadUrl } = await uploadRes.json();
            setBlueprintUrl(downloadUrl);

            // 2. Send to Vertex AI to extract rooms
            const reader = new FileReader();
            reader.onloadend = async () => {
                try {
                    const base64String = (reader.result as string).split(',')[1];
                    const res = await fetch('/api/analyze-floorplan', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageBase64: base64String, mimeType: file.type })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        setRooms(data.rooms || []);
                        setIsometric25DUrl(null);
                        setVideoUrl(null);
                        setIsOrchestrating(false);
                        
                        // Auto-save to firestore (Firebase is just keeping the text record)
                        await updateDoc(doc(db, 'properties', propertyId), {
                            blueprintUrl: downloadUrl,
                            rooms: data.rooms || [],
                            isometric25DUrl: null,
                            videoUrl: null
                        });
                        
                        // Clear the RTDB trigger flag so it doesn't auto-fire randomly
                        try {
                            await set(rtdbRef(rtdb, `orchestration/${propertyId}/trigger`), 0);
                            await set(rtdbRef(rtdb, `orchestration/${propertyId}/isOrchestrating`), false);
                        } catch(e) {}
                    } else {
                        const errData = await res.json();
                        console.error("Vertex AI API Error:", errData);
                        alert(`Analysis failed: ${errData.error}. Details: ${errData.details || 'None'}`);
                        setBlueprintUrl(null); 
                    }
                } catch (err) {
                    console.error("Fetch failed", err);
                    alert("Failed to connect to the analysis service.");
                    setBlueprintUrl(null);
                } finally {
                    setIsAnalyzing(false);
                }
            };
            reader.readAsDataURL(file);

        } catch (err: any) {
            console.error("Blueprint upload failed", err);
            alert(`Failed to upload to GCP: ${err.message}`);
            setIsAnalyzing(false);
        }
    };

    // Find current stage
    const currentStage = progressStages.reduce((best, stage) => {
        if (progress >= stage.percent) return stage;
        return best;
    }, progressStages[0]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-[3px] border-[#e1dfdd] border-t-[#0A58CA] rounded-full animate-spin" />
            </div>
        );
    }

    if (!property) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <p className="text-[15px] text-[#605e5c]">Property not found.</p>
                <button onClick={() => router.push('/portal/ledger')} className="text-[14px] font-semibold" style={{ color: accentColor }}>
                    ← Back to Ledger
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full -m-4 sm:-m-8">
            {/* Header */}
            <div className="px-8 py-5 border-b border-[#e1dfdd] flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/portal/ledger')} className="flex items-center gap-2 text-[13px] font-medium text-[#605e5c] hover:text-[#1b1b1b] transition-colors">
                        <ArrowLeft size={16} /> Back
                    </button>
                    <div className="h-6 w-px bg-[#e1dfdd]" />
                    <div>
                        <h1 className="text-[20px] font-bold text-[#1b1b1b] tracking-tight">{propName || property.name}</h1>
                        <p className="text-[13px] text-[#605e5c]">{propAddress || property.address}</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 text-[14px] font-semibold text-white transition-all hover:brightness-95 disabled:opacity-50"
                    style={{ backgroundColor: saved ? '#34C759' : accentColor }}
                >
                    {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
                    {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
                </button>
            </div>

            {/* Content */}
            <div ref={contentRef} className="flex-1 overflow-y-auto p-8">
                <div className="max-w-[900px] mx-auto space-y-10">

                    {/* ──── 1. PROPERTY DETAILS ──── */}
                    <section>
                        <h2 className="text-[18px] font-bold text-[#1b1b1b] mb-1">Property Details</h2>
                        <p className="text-[13px] text-[#605e5c] mb-6">Edit the core information about this property.</p>

                        <div className="bg-white border border-[#e1dfdd] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                                <div className="col-span-2 flex flex-col gap-1.5">
                                    <label className="text-[12px] font-semibold text-[#323130] uppercase tracking-wide">Property Name</label>
                                    <input className="border border-[#c8c6c4] px-3 py-2.5 text-[14px] text-[#1b1b1b] outline-none focus:border-[#0A58CA] transition-colors" value={propName} onChange={(e) => setPropName(e.target.value)} placeholder="e.g. Bijilo Residence A" />
                                </div>
                                <div className="col-span-2 flex flex-col gap-1.5">
                                    <label className="text-[12px] font-semibold text-[#323130] uppercase tracking-wide">Full Address</label>
                                    <input className="border border-[#c8c6c4] px-3 py-2.5 text-[14px] text-[#1b1b1b] outline-none focus:border-[#0A58CA] transition-colors" value={propAddress} onChange={(e) => setPropAddress(e.target.value)} placeholder="e.g. 14B Fajara East, Serrekunda" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[12px] font-semibold text-[#323130] uppercase tracking-wide">Google Plus Code</label>
                                    <input className="border border-[#c8c6c4] px-3 py-2.5 text-[14px] text-[#1b1b1b] outline-none focus:border-[#0A58CA] transition-colors" value={propPlusCode} onChange={(e) => setPropPlusCode(e.target.value)} placeholder="e.g. 7R8V+X8 Banjul" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[12px] font-semibold text-[#323130] uppercase tracking-wide">Current Tenant</label>
                                    <input className="border border-[#c8c6c4] px-3 py-2.5 text-[14px] text-[#1b1b1b] outline-none focus:border-[#0A58CA] transition-colors" value={propTenant} onChange={(e) => setPropTenant(e.target.value)} placeholder="Leave empty if vacant" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[12px] font-semibold text-[#323130] uppercase tracking-wide">NAWEC Cash Power #</label>
                                    <input className="border border-[#c8c6c4] px-3 py-2.5 text-[14px] text-[#1b1b1b] outline-none focus:border-[#0A58CA] transition-colors" value={propCashPower} onChange={(e) => setPropCashPower(e.target.value)} placeholder="Cash power meter number" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[12px] font-semibold text-[#323130] uppercase tracking-wide">NAWEC Water Bill #</label>
                                    <input className="border border-[#c8c6c4] px-3 py-2.5 text-[14px] text-[#1b1b1b] outline-none focus:border-[#0A58CA] transition-colors" value={propWaterBill} onChange={(e) => setPropWaterBill(e.target.value)} placeholder="Water bill account number" />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ──── 2. CONSTRUCTION PROGRESS ──── */}
                    <section>
                        <h2 className="text-[18px] font-bold text-[#1b1b1b] mb-1">Construction Progress</h2>
                        <p className="text-[13px] text-[#605e5c] mb-6">Adjust the build progress — tenants will see this on their mobile app.</p>

                        <div className="bg-white border border-[#e1dfdd] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
                            <div className="grid grid-cols-[1fr_260px]">
                                {/* Left: slider + stages */}
                                <div className="p-6 border-r border-[#e1dfdd]">
                                    {/* Current stage label */}
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 flex items-center justify-center" style={{ backgroundColor: `${currentStage.color}15`, color: currentStage.color }}>
                                            <currentStage.icon size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[15px] font-bold text-[#1b1b1b]">{currentStage.label}</p>
                                            <p className="text-[12px] text-[#605e5c]">{progress}% complete</p>
                                        </div>
                                    </div>

                                    {/* Slider */}
                                    <div className="mb-6">
                                        <input
                                            type="range"
                                            min="0" max="100" step="5"
                                            value={progress}
                                            onChange={(e) => setProgress(parseInt(e.target.value))}
                                            className="w-full h-2 appearance-none cursor-pointer"
                                            style={{
                                                background: `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${progress}%, #e1dfdd ${progress}%, #e1dfdd 100%)`,
                                                borderRadius: 0,
                                            }}
                                        />
                                        <div className="flex justify-between mt-2">
                                            <span className="text-[11px] text-[#a19f9d]">0%</span>
                                            <span className="text-[11px] text-[#a19f9d]">100%</span>
                                        </div>
                                    </div>

                                    {/* Stage chips */}
                                    <div className="flex flex-wrap gap-2">
                                        {progressStages.map(stage => (
                                            <button
                                                key={stage.key}
                                                onClick={() => setProgress(stage.percent)}
                                                className="px-3 py-1.5 text-[12px] font-semibold border transition-colors"
                                                style={progress >= stage.percent ? {
                                                    backgroundColor: stage.color,
                                                    borderColor: stage.color,
                                                    color: '#fff',
                                                } : {
                                                    borderColor: '#e1dfdd',
                                                    color: '#605e5c',
                                                    backgroundColor: '#fff',
                                                }}
                                            >
                                                {stage.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Right: SVG Animation */}
                                <div className="p-6 bg-[#faf9f8] flex items-center justify-center">
                                    <div className="w-full max-w-[220px]">
                                        <BuildingSVG progress={progress} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ──── 3. PROPERTY VISION PIPELINE ──── */}
                    <section>
                        <div className="flex items-center gap-2 mb-1">
                            <Wand2 size={20} className="text-[#0A58CA]" />
                            <h2 className="text-[18px] font-bold text-[#1b1b1b]">Property Vision Pipeline</h2>
                        </div>
                        <p className="text-[13px] text-[#605e5c] mb-6">First upload the property blueprint, then scan the QR code to capture room photos on mobile.</p>

                        <div className="bg-white border border-[#0A58CA]/30 shadow-[0_4px_16px_rgba(10,88,202,0.08)] p-6 rounded-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#0A58CA]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                            
                            <div className="grid grid-cols-[1fr_auto] gap-10 items-start relative z-10">
                                <div className="space-y-6">
                                    
                                    {/* Step 1: Blueprint */}
                                    <div className={`p-5 rounded-lg border transition-colors ${blueprintUrl ? 'border-[#34C759] bg-[#34C759]/5' : 'border-[#0067b8]/30 bg-[#f3f9fd]'}`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <label className="flex items-center gap-2 text-[14px] font-semibold text-[#1b1b1b]">
                                                {blueprintUrl ? <CheckCircle2 size={18} className="text-[#34C759]" /> : <span className="w-5 h-5 rounded-full bg-[#0067b8] text-white flex items-center justify-center text-[11px]">1</span>}
                                                Upload Blueprint
                                            </label>
                                            {blueprintUrl && rooms.length > 0 && (
                                                <span className="text-[12px] font-bold text-[#34C759]">{rooms.length} Rooms Mapped</span>
                                            )}
                                        </div>
                                        
                                        {!blueprintUrl ? (
                                            <div className="flex flex-col gap-3">
                                                <p className="text-[12px] text-[#605e5c]">Upload a 2D floorplan. Our Vision Agent will segment the rooms automatically.</p>
                                                <input type="file" accept="image/*" className="hidden" ref={blueprintInputRef} onChange={handleBlueprintUpload} />
                                                <button 
                                                    onClick={() => blueprintInputRef.current?.click()}
                                                    disabled={isAnalyzing}
                                                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-white border border-[#0067b8] text-[#0067b8] rounded font-semibold text-[13px] active:scale-[0.98] transition-all disabled:opacity-50"
                                                >
                                                    {isAnalyzing ? <div className="w-4 h-4 border-2 border-[#0067b8]/20 border-t-[#0067b8] rounded-full animate-spin" /> : <Upload size={16} />}
                                                    {isAnalyzing ? 'Mapping Rooms...' : 'Upload Floorplan Image'}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-4">
                                                <div className="w-20 h-20 rounded bg-white border border-black/10 overflow-hidden shrink-0">
                                                    <img src={blueprintUrl} className="w-full h-full object-cover" alt="Blueprint" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[12px] text-[#1b1b1b] font-medium mb-3">Agent successfully mapped the floorplan.</p>
                                                    <button 
                                                        onClick={() => setShowDeleteModal(true)} 
                                                        className="text-[12px] text-[#e81123] hover:underline font-semibold flex items-center gap-1"
                                                    >
                                                        <Trash2 size={14} /> Delete Blueprint
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Step 2: Mobile Parameters */}
                                    <div className={`p-5 rounded-lg border transition-colors ${!blueprintUrl ? 'opacity-50 pointer-events-none border-[#e1dfdd] bg-[#faf9f8]' : 'border-[#0067b8]/30 bg-[#f3f9fd]'}`}>
                                        <label className="flex items-center gap-2 text-[14px] font-semibold text-[#1b1b1b] mb-4">
                                            <span className="w-5 h-5 rounded-full bg-[#0067b8] text-white flex items-center justify-center text-[11px]">2</span>
                                            Mobile Capture Parameters
                                        </label>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-[11px] font-semibold text-[#323130] uppercase tracking-wide">Images Per Room</label>
                                                <select 
                                                    className="border border-[#c8c6c4] px-3 py-2 text-[14px] text-[#1b1b1b] outline-none focus:border-[#0A58CA] bg-white transition-colors"
                                                    value={imagesPerRoom}
                                                    onChange={(e) => setImagesPerRoom(Number(e.target.value))}
                                                >
                                                    <option value={1}>1 Image (Fastest)</option>
                                                    <option value={2}>2 Images</option>
                                                    <option value={3}>3 Images (Recommended for 2.5D)</option>
                                                    <option value={5}>5 Images (High Fidelity)</option>
                                                </select>
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-[11px] font-semibold text-[#323130] uppercase tracking-wide">Cinematic Video Length</label>
                                                <select 
                                                    className="border border-[#c8c6c4] px-3 py-2 text-[14px] text-[#1b1b1b] outline-none focus:border-[#0A58CA] bg-white transition-colors"
                                                    value={videoLength}
                                                    onChange={(e) => setVideoLength(Number(e.target.value))}
                                                >
                                                    <option value={15}>15 Seconds (Shorts/Reels)</option>
                                                    <option value={30}>30 Seconds</option>
                                                    <option value={60}>60 Seconds</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                </div>

                                <div className={`flex flex-col items-center bg-[#faf9f8] p-5 border border-[#e1dfdd] rounded-xl shadow-sm transition-opacity ${!blueprintUrl ? 'opacity-40 grayscale' : ''}`}>
                                    <div className="bg-white p-2 rounded-lg shadow-sm border border-[#e1dfdd] mb-3 relative">
                                        {!blueprintUrl && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10"><Wand2 size={24} className="text-[#a19f9d]" /></div>}
                                        <QRCodeSVG value={captureUrl} size={140} level="M" />
                                    </div>
                                    <p className="text-[13px] font-bold text-[#1b1b1b] text-center">Capture QR Code</p>
                                    <p className="text-[11px] text-[#605e5c] text-center max-w-[140px] mt-1">Scan with Sama Kerr mobile app to shoot mapped rooms.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ──── 4. PROPERTY PREVIEW ──── */}
                    <section className="pb-8">
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <h2 className="text-[18px] font-bold text-[#1b1b1b] mb-1">Property Preview</h2>
                                <p className="text-[13px] text-[#605e5c]">2.5D interactive floorplans, cinematic videos, and enhanced photography.</p>
                            </div>
                            {(isometric25DUrl || videoUrl || rooms.some(r => r.heroImageUrl)) && (
                                <button
                                    onClick={handleOrchestrate}
                                    disabled={isOrchestrating || !blueprintUrl || rooms.length === 0 || !rooms[0].photos}
                                    className="bg-white border border-[#0067b8] text-[#0067b8] px-5 py-2 text-[13px] font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#0067b8] hover:text-white"
                                >
                                    Regenerate Assets
                                </button>
                            )}
                        </div>

                        {(!isometric25DUrl && !videoUrl && !rooms.some(r => r.heroImageUrl) && !isOrchestrating) ? (
                            orchestratorTrigger > 0 ? (
                                <div className="bg-[#f3f9fd] border border-[#0067b8]/30 shadow-[0_4px_16px_rgba(10,88,202,0.08)] p-10 flex flex-col items-center gap-4 rounded-xl">
                                    <div className="w-16 h-16 bg-[#0067b8] text-white rounded-full flex items-center justify-center shadow-md animate-bounce">
                                        <Smartphone size={32} />
                                    </div>
                                    <h3 className="text-[20px] font-bold text-[#1b1b1b]">Mobile Capture Received!</h3>
                                    <p className="text-[14px] text-[#605e5c] text-center max-w-[400px]">
                                        Room photography has been successfully synced from the Sama Kerr app. The pipeline is ready to generate 2.5D models and cinematic video.
                                    </p>
                                    <button
                                        onClick={handleOrchestrate}
                                        className="mt-4 bg-[#0A58CA] text-white px-8 py-3 text-[15px] font-semibold hover:bg-[#084298] transition-all rounded shadow-md flex items-center gap-2"
                                    >
                                        <Wand2 size={18} />
                                        Begin Process
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-[#faf9f8] border border-dashed border-[#c8c6c4] p-8 flex flex-col items-center gap-3">
                                    <Wand2 size={32} className="text-[#c8c6c4]" />
                                    <p className="text-[14px] text-[#a19f9d] font-medium text-center">Complete the Property Vision Pipeline process to view property media.</p>
                                </div>
                            )
                        ) : (
                            <div className="bg-[#f3f9fd] border border-[#cce3f5] p-8 flex flex-col gap-8 relative overflow-hidden transition-all duration-700 ease-in-out min-h-[300px]">
                                <div className="absolute right-0 top-0 w-48 h-48 bg-[#0067b8] opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                                
                                {/* 1. Enhanced Pictures Box */}
                                {rooms.some(r => r.heroImageUrl) && (
                                    <div className="relative z-10 bg-white border border-[#e1dfdd] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                                        <h3 className="text-[16px] font-semibold text-[#1b1b1b] mb-4 flex items-center gap-2">
                                            <ImageIcon size={18} className="text-[#0A58CA]" /> 
                                            Enhanced Room Photography
                                        </h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            {rooms.filter(r => r.heroImageUrl).map((room, i) => (
                                                <div key={i} className="group relative aspect-[4/3] bg-[#f3f2f1] overflow-hidden border border-[#e1dfdd]">
                                                    <img src={room.heroImageUrl} alt={room.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
                                                        <p className="text-white text-[12px] font-semibold truncate">{room.name}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 2. Cinematic Video Box */}
                                {videoUrl && (
                                    <div className="relative z-10 bg-white border border-[#e1dfdd] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                                        <h3 className="text-[16px] font-semibold text-[#1b1b1b] mb-4 flex items-center gap-2">
                                            <Wand2 size={18} className="text-[#0A58CA]" /> 
                                            Cinematic Property Tour (Video)
                                        </h3>
                                        <div className="w-full aspect-[16/9] bg-black border border-[#e1dfdd] overflow-hidden relative">
                                            <video 
                                                src={videoUrl} 
                                                controls 
                                                autoPlay
                                                muted
                                                loop
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* 3. Grammar of Shelter — 3D Walkthrough */}
                                {rooms.length > 0 && (
                                    <div className="relative z-10 bg-white border border-[#e1dfdd] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                                        <h3 className="text-[16px] font-semibold text-[#1b1b1b] mb-4 flex items-center gap-2">
                                            <Cuboid size={18} className="text-[#0A58CA]" /> 
                                            3D Walkthrough — Grammar of Shelter Engine
                                        </h3>
                                        <div className="w-full aspect-[16/9] overflow-hidden relative rounded-lg">
                                            <FirstPersonViewer
                                                rooms={rooms}
                                                className="w-full h-full"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Overlay for Orchestration Progress */}
                                {(isOrchestrating || orchestratorError) && (
                                    <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-8">
                                        <div className="w-full max-w-[500px] bg-white border border-[#0067b8]/20 shadow-[0_8px_30px_rgba(0,103,184,0.1)] p-8 rounded-xl flex flex-col items-center text-center">
                                            <div className="w-16 h-16 bg-[#f3f9fd] text-[#0A58CA] rounded-full flex items-center justify-center mb-6 overflow-hidden relative">
                                                {orchestratorError ? <X size={32} className="text-[#e81123]" /> : (
                                                    <>
                                                        <Wand2 size={32} className="animate-pulse absolute" />
                                                        <div className="absolute bottom-0 left-0 right-0 bg-[#0067b8]/20" style={{ height: `${orchestratorProgress}%`, transition: 'height 0.5s ease-out' }} />
                                                    </>
                                                )}
                                            </div>
                                            <h3 className="text-[20px] font-bold text-[#1b1b1b] mb-2">
                                                {orchestratorError ? "Pipeline Error" : "Processing Pipeline"}
                                            </h3>
                                            
                                            {/* Microsoft-style sliding text animation */}
                                            <div className="h-[24px] overflow-hidden mb-8 relative w-full flex justify-center">
                                                <p key={orchestratorStep} className={`text-[14px] font-medium absolute animate-fade-slide-up ${orchestratorError ? 'text-[#e81123]' : 'text-[#605e5c]'}`}>
                                                    {orchestratorError ? orchestratorError : (orchestratorStep || 'Initializing pipeline...')}
                                                </p>
                                            </div>
                                            
                                            {!orchestratorError ? (
                                                <div className="w-full flex flex-col gap-4">
                                                    <div>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-[12px] font-semibold text-[#605e5c]">Overall Progress</span>
                                                            <span className="text-[12px] font-bold text-[#0A58CA]">{Math.round(orchestratorProgress)}%</span>
                                                        </div>
                                                        <div className="w-full h-2 bg-[#f3f2f1] overflow-hidden rounded-full">
                                                            <div 
                                                                className="h-full bg-[#0A58CA] transition-all duration-500 ease-out"
                                                                style={{ width: `${orchestratorProgress}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm("Are you sure you want to cancel the current pipeline process? This will reset the state.")) {
                                                                // 1. Instantly override local state so the UI updates immediately without waiting for Firebase sync
                                                                setIsOrchestrating(false);
                                                                setOrchestratorStep(null);
                                                                setOrchestratorProgress(0);
                                                                setOrchestratorError(null);
                                                                
                                                                // 2. Bruteforce wipe the node in RTDB
                                                                try {
                                                                    const { set } = await import('firebase/database');
                                                                    if (propertyId) {
                                                                        // Setting it to null completely removes the node, rather than just updating fields,
                                                                        // preventing any lingering data from overriding the state back.
                                                                        await set(rtdbRef(rtdb, `orchestration/${propertyId}`), null);
                                                                        console.log("RTDB Orchestration node wiped.");
                                                                    }
                                                                } catch (e) {
                                                                    console.error("Failed to reset RTDB state", e);
                                                                }
                                                            }
                                                        }}
                                                        className="text-[12px] font-semibold text-[#e81123] hover:underline mt-2"
                                                    >
                                                        Cancel & Reset Pipeline
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={handleOrchestrate}
                                                    className="bg-[#e81123] text-white px-8 py-3 text-[14px] font-semibold hover:bg-[#c50f1f] transition-colors rounded shadow-sm"
                                                >
                                                    Retry Pipeline
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </div>

            {/* Delete Blueprint Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white border border-[#e1dfdd] shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-6 max-w-[400px] w-full mx-4 rounded-lg">
                        <h3 className="text-[18px] font-bold text-[#1b1b1b] mb-2">Wipe Property Pipeline?</h3>
                        <p className="text-[14px] text-[#605e5c] mb-6">
                            This will permanently delete the floorplan, all generated images, 3D scenes, and videos associated with this property across our cloud storage and databases.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2 text-[14px] font-semibold text-[#1b1b1b] bg-[#f3f2f1] hover:bg-[#e1dfdd] transition-colors rounded"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={async () => {
                                    setShowDeleteModal(false);
                                    setIsAnalyzing(true);
                                    
                                    // 1. Immediately wipe all local state
                                    setIsOrchestrating(false);
                                    setOrchestratorStep(null);
                                    setOrchestratorProgress(0);
                                    setOrchestratorError(null);
                                    setIsometric25DUrl(null);
                                    setVideoUrl(null);
                                    setBlueprintUrl(null);
                                    setRooms([]);
                                    setImages([]); // also clear raw images locally

                                    try {
                                        // 2. Wipe everything under this property's prefix from Storage
                                        if (propertyId) {
                                            await fetch('/api/upload-media', {
                                                method: 'DELETE',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ propertyId: propertyId })
                                            });

                                            // 3. Wipe from Firestore
                                            await updateDoc(doc(db, 'properties', propertyId), {
                                                blueprintUrl: null,
                                                rooms: [],
                                                images: [], // wipe raw images from firestore too
                                                isometric25DUrl: null,
                                                videoUrl: null
                                            });

                                            // 4. WIPEOUT the Realtime Database state completely
                                            try {
                                                const { set } = await import('firebase/database');
                                                await set(rtdbRef(rtdb, `orchestration/${propertyId}`), null);
                                            } catch (e) {
                                                console.error("RTDB wipe failed", e);
                                            }
                                        }
                                    } catch (e) {
                                        console.error("Failed to completely delete blueprint and models:", e);
                                        alert("Warning: Failed to clear all remote assets.");
                                    } finally {
                                        setIsAnalyzing(false);
                                    }
                                }}
                                className="px-4 py-2 text-[14px] font-semibold text-white bg-[#e81123] hover:bg-[#c50f1f] transition-colors rounded"
                            >
                                Delete Entire Pipeline
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PropertyEditorPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-[3px] border-[#e1dfdd] border-t-[#0A58CA] rounded-full animate-spin" />
            </div>
        }>
            <PropertyEditorContent />
        </Suspense>
    );
}
