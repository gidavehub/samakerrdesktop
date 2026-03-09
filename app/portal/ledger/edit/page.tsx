"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft, Upload, X, Trash2, Image as ImageIcon,
    HardHat, CheckCircle2, Clock, Save, Cuboid, FileText,
    GripVertical,
    ChevronRight
} from 'lucide-react';
import { auth, database } from '../../../../lib/firebase';
import { ref, get, update } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import gsap from 'gsap';
import { Suspense } from 'react';

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
    const [notes, setNotes] = useState('');
    const [newImageUrl, setNewImageUrl] = useState('');
    // Property fields
    const [propName, setPropName] = useState('');
    const [propAddress, setPropAddress] = useState('');
    const [propPlusCode, setPropPlusCode] = useState('');
    const [propTenant, setPropTenant] = useState('');
    const [propCashPower, setPropCashPower] = useState('');
    const [propWaterBill, setPropWaterBill] = useState('');

    const contentRef = useRef<HTMLDivElement>(null);
    const accentColor = companyInfo?.brandColor1 || '#0A58CA';

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (user && propertyId) {
                setCompanyId(user.uid);
                const [compSnap, propSnap] = await Promise.all([
                    get(ref(database, 'companies/' + user.uid)),
                    get(ref(database, `properties/${user.uid}/${propertyId}`)),
                ]);
                if (compSnap.exists()) setCompanyInfo(compSnap.val());
                if (propSnap.exists()) {
                    const data = propSnap.val();
                    setProperty(data);
                    setImages(data.images || []);
                    setProgress(data.constructionProgress ?? (data.completionState === 'completed' ? 100 : data.completionState === 'construction' ? 50 : 15));
                    setCompletionState(data.completionState || 'planning');
                    setNotes(data.notes || '');
                    setPropName(data.name || '');
                    setPropAddress(data.address || '');
                    setPropPlusCode(data.googlePlusCode || '');
                    setPropTenant(data.tenantName || '');
                    setPropCashPower(data.nawecCashPower || '');
                    setPropWaterBill(data.nawecWaterBill || '');
                }
                setLoading(false);
            }
        });
        return () => unsub();
    }, [propertyId]);

    useEffect(() => {
        if (!loading && contentRef.current) {
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

            await update(ref(database, `properties/${companyId}/${propertyId}`), {
                name: propName,
                address: propAddress,
                googlePlusCode: propPlusCode,
                tenantName: propTenant,
                nawecCashPower: propCashPower,
                nawecWaterBill: propWaterBill,
                images,
                constructionProgress: progress,
                completionState: state,
                notes,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            console.error('Save error:', err);
        } finally {
            setSaving(false);
        }
    };

    const addImage = () => {
        if (newImageUrl.trim()) {
            setImages(prev => [...prev, newImageUrl.trim()]);
            setNewImageUrl('');
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
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

                    {/* ──── 3. GALLERY ──── */}
                    <section>
                        <h2 className="text-[18px] font-bold text-[#1b1b1b] mb-1">Property Gallery</h2>
                        <p className="text-[13px] text-[#605e5c] mb-6">Add images that tenants can view on their mobile app.</p>

                        <div className="bg-white border border-[#e1dfdd] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6">
                            {/* Add image input */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="flex-1 flex items-center gap-2.5 border-b border-[#8a8886] focus-within:border-b-2 focus-within:border-[#0067b8] pb-1.5 pt-2 transition-all">
                                    <ImageIcon size={16} className="text-[#a19f9d] shrink-0" />
                                    <input
                                        type="text"
                                        placeholder="Paste image URL..."
                                        value={newImageUrl}
                                        onChange={(e) => setNewImageUrl(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addImage()}
                                        className="border-none bg-transparent w-full outline-none text-[14px] text-[#1b1b1b] placeholder:text-[#605e5c] placeholder:font-light"
                                    />
                                </div>
                                <button
                                    onClick={addImage}
                                    disabled={!newImageUrl.trim()}
                                    className="flex items-center gap-2 px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:brightness-95 disabled:opacity-40"
                                    style={{ backgroundColor: accentColor }}
                                >
                                    <Upload size={14} /> Add
                                </button>
                            </div>

                            {/* Image grid */}
                            {images.length > 0 ? (
                                <div className="grid grid-cols-3 gap-4">
                                    {images.map((img, i) => (
                                        <div key={i} className="relative group aspect-[4/3] bg-[#f3f2f1] overflow-hidden border border-[#e1dfdd]">
                                            <img src={img} alt={`Property ${i + 1}`} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                                <button
                                                    onClick={() => removeImage(i)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity w-10 h-10 bg-white/90 flex items-center justify-center text-[#e81123] hover:bg-white"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <span className="absolute bottom-2 left-2 bg-black/50 text-white text-[11px] font-medium px-2 py-0.5">{i + 1}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-[#faf9f8] border border-dashed border-[#c8c6c4] p-12 flex flex-col items-center gap-3">
                                    <ImageIcon size={32} className="text-[#c8c6c4]" />
                                    <p className="text-[14px] text-[#a19f9d] font-medium text-center">No images yet. Paste a URL above to add property photos.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* ──── 4. NOTES ──── */}
                    <section>
                        <h2 className="text-[18px] font-bold text-[#1b1b1b] mb-1">Property Notes</h2>
                        <p className="text-[13px] text-[#605e5c] mb-6">Add status updates or notes visible to your team.</p>

                        <div className="bg-white border border-[#e1dfdd] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6">
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Any notes about this property..."
                                className="w-full border border-[#c8c6c4] px-4 py-3 text-[14px] text-[#1b1b1b] outline-none focus:border-[#0A58CA] transition-colors resize-y min-h-[120px] placeholder:text-[#605e5c] placeholder:font-light"
                            />
                        </div>
                    </section>

                    {/* ──── 5. 3D MODEL & BLUEPRINTS (Coming Soon) ──── */}
                    <section className="pb-8">
                        <h2 className="text-[18px] font-bold text-[#1b1b1b] mb-1">3D Model & Blueprints</h2>
                        <p className="text-[13px] text-[#605e5c] mb-6">Upload architectural blueprints and 3D models for this property.</p>

                        <div className="bg-[#f3f9fd] border border-[#cce3f5] p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-48 h-48 bg-[#0067b8] opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                            <div className="flex items-start gap-4 relative z-10">
                                <div className="w-12 h-12 bg-white border border-[#cce3f5] flex items-center justify-center shrink-0">
                                    <Cuboid size={24} className="text-[#0067b8]" />
                                </div>
                                <div>
                                    <h3 className="text-[16px] font-semibold text-[#1b1b1b] mb-1">Coming Soon</h3>
                                    <p className="text-[13px] text-[#605e5c] max-w-[400px]">
                                        Upload 3D models (.glb, .obj) and architectural blueprints (.pdf, .dwg) to share with tenants and contractors.
                                    </p>
                                </div>
                            </div>
                            <button
                                disabled
                                className="relative z-10 shrink-0 bg-white border border-[#0067b8] text-[#0067b8] px-6 py-2.5 text-[14px] font-semibold transition-colors shadow-sm opacity-50 cursor-not-allowed"
                            >
                                Upload Files
                            </button>
                        </div>
                    </section>
                </div>
            </div>
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
