"use client";

import { useState, useRef, useMemo } from 'react';
import { X, Download, FileDown, Check, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BrandedQRCode, { QR_TEMPLATES, type QRTemplateConfig, type BrandedQRCodeRef } from './BrandedQRCode';

interface QRCodeModalProps {
    property: {
        id: string;
        name: string;
        address: string;
    };
    companyInfo: {
        brandColor1?: string;
        brandColor2?: string;
        companyLogo?: string;
        companyName?: string;
    } | null;
    onClose: () => void;
}

function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ─── Template-specific PDF pattern styles ────────────────────────────────
function getTemplatePDFStyles(templateId: string, c1: string, c2: string): string {
    const shared = `
        .pattern-overlay {
            position: absolute;
            inset: 0;
            overflow: hidden;
            z-index: 0;
            pointer-events: none;
        }
    `;

    switch (templateId) {
        case 'corporate-classic':
            return shared + `
                .pattern-overlay::before {
                    content: '';
                    position: absolute;
                    top: -200px; right: -150px;
                    width: 600px; height: 600px;
                    border-radius: 50%;
                    background: ${c1};
                    opacity: 0.04;
                }
                .pattern-overlay::after {
                    content: '';
                    position: absolute;
                    bottom: -100px; left: -100px;
                    width: 400px; height: 400px;
                    border-radius: 50%;
                    background: ${c2};
                    opacity: 0.04;
                }
                .pattern-dots {
                    position: absolute; inset: 0;
                    background-image: radial-gradient(${c1}12 1.2px, transparent 1.2px);
                    background-size: 28px 28px;
                    opacity: 0.6;
                }
                .header-strip {
                    background: ${c1};
                }
                .header-strip::after {
                    content: '';
                    position: absolute;
                    bottom: -20px; left: 0; right: 0;
                    height: 40px;
                    background: ${c1};
                    clip-path: polygon(0 0, 100% 0, 100% 40%, 0 100%);
                }
                .accent-bar { height: 5px; background: ${c1}; }
            `;

        case 'gradient-flow':
            return shared + `
                .pattern-overlay::before {
                    content: '';
                    position: absolute;
                    top: -300px; left: -200px;
                    width: 900px; height: 900px;
                    border-radius: 50%;
                    background: radial-gradient(circle, ${c1}08, ${c2}05, transparent 70%);
                }
                .pattern-waves {
                    position: absolute; bottom: 0; left: 0; right: 0;
                    height: 300px;
                    background: linear-gradient(180deg, transparent, ${c2}06);
                }
                .pattern-dots {
                    position: absolute; inset: 0;
                    background-image: radial-gradient(${c2}10 1px, transparent 1px);
                    background-size: 20px 20px;
                    opacity: 0.5;
                }
                .header-strip {
                    background: linear-gradient(135deg, ${c1}, ${c2});
                }
                .header-strip::after {
                    content: '';
                    position: absolute;
                    bottom: -32px; left: 0; right: 0;
                    height: 64px;
                    background: linear-gradient(135deg, ${c1}, ${c2});
                    clip-path: ellipse(55% 100% at 50% 0%);
                }
                .accent-bar { height: 6px; background: linear-gradient(90deg, ${c1}, ${c2}); }
            `;

        case 'dot-matrix':
            return shared + `
                .pattern-dots {
                    position: absolute; inset: 0;
                    background-image: radial-gradient(${c1}18 2px, transparent 2px);
                    background-size: 18px 18px;
                    opacity: 0.4;
                }
                .pattern-overlay::before {
                    content: '';
                    position: absolute;
                    top: 30%; left: -5%;
                    width: 110%; height: 40%;
                    background: linear-gradient(90deg, transparent, ${c1}05, ${c2}05, transparent);
                    transform: rotate(-3deg);
                }
                .header-strip {
                    background: ${c1};
                }
                .header-strip::after {
                    content: '';
                    position: absolute;
                    bottom: -15px; left: 0; right: 0;
                    height: 30px;
                    background: ${c1};
                    clip-path: polygon(0 0, 100% 0, 98% 100%, 2% 100%);
                }
                .accent-bar { height: 4px; background: repeating-linear-gradient(90deg, ${c1} 0px, ${c1} 8px, transparent 8px, transparent 12px); }
            `;

        case 'diamond-grid':
            return shared + `
                .pattern-dots {
                    position: absolute; inset: 0;
                    background-image: 
                        linear-gradient(45deg, ${c1}06 25%, transparent 25%),
                        linear-gradient(-45deg, ${c1}06 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, ${c2}06 75%),
                        linear-gradient(-45deg, transparent 75%, ${c2}06 75%);
                    background-size: 40px 40px;
                    background-position: 0 0, 0 20px, 20px -20px, -20px 0px;
                    opacity: 0.5;
                }
                .pattern-overlay::before {
                    content: '';
                    position: absolute;
                    bottom: -100px; right: -100px;
                    width: 500px; height: 500px;
                    border-radius: 50%;
                    background: radial-gradient(circle, ${c2}08, transparent 70%);
                }
                .header-strip {
                    background: linear-gradient(135deg, ${c1} 0%, ${c2} 100%);
                }
                .header-strip::after {
                    content: '';
                    position: absolute;
                    bottom: -28px; left: 0; right: 0;
                    height: 56px;
                    background: linear-gradient(135deg, ${c1}, ${c2});
                    clip-path: polygon(0 0, 50% 100%, 100% 0);
                }
                .accent-bar { height: 6px; background: linear-gradient(90deg, ${c1}, ${c2}, ${c1}); }
            `;

        case 'neon-edge':
            return shared + `
                body { background: #0f172a !important; }
                .page { background: #0f172a; color: #e2e8f0; }
                .pattern-dots {
                    position: absolute; inset: 0;
                    background-image: radial-gradient(${c1}20 1px, transparent 1px);
                    background-size: 24px 24px;
                    opacity: 0.6;
                }
                .pattern-overlay::before {
                    content: '';
                    position: absolute;
                    top: -150px; right: -100px;
                    width: 500px; height: 500px;
                    border-radius: 50%;
                    background: radial-gradient(circle, ${c1}18, transparent 70%);
                }
                .pattern-overlay::after {
                    content: '';
                    position: absolute;
                    bottom: -80px; left: -60px;
                    width: 350px; height: 350px;
                    border-radius: 50%;
                    background: radial-gradient(circle, ${c2}15, transparent 70%);
                }
                .header-strip {
                    background: linear-gradient(135deg, ${c1}, ${c2});
                    border-bottom: 1px solid ${c1}40;
                }
                .header-strip::after {
                    content: '';
                    position: absolute;
                    bottom: -30px; left: 0; right: 0;
                    height: 60px;
                    background: linear-gradient(135deg, ${c1}, ${c2});
                    clip-path: ellipse(55% 100% at 50% 0%);
                }
                .welcome h1 { color: #f1f5f9; }
                .welcome p { color: #94a3b8; }
                .qr-box { background: #1e293b; box-shadow: 0 0 60px ${c1}15, 0 4px 30px rgba(0,0,0,0.4); }
                .qr-box img { border-radius: 4px; }
                .prop-name { color: #f1f5f9; }
                .prop-addr { color: #64748b; }
                .step-card { background: #1e293b; border-color: #334155; }
                .step-title { color: #e2e8f0; }
                .step-desc { color: #64748b; }
                .footer-bar { border-color: #1e293b; }
                .footer-left { color: #475569; }
                .footer-right span { color: #475569; }
                .footer-sk { color: #64748b; }
                .accent-bar { height: 4px; background: linear-gradient(90deg, ${c1}, ${c2}, ${c1}); box-shadow: 0 0 20px ${c1}40; }
            `;

        case 'organic-blend':
            return shared + `
                .pattern-dots {
                    position: absolute; inset: 0;
                    background-image: radial-gradient(${c1}0a 3px, transparent 3px);
                    background-size: 32px 32px;
                    opacity: 0.4;
                }
                .pattern-overlay::before {
                    content: '';
                    position: absolute;
                    top: -250px; left: 50%;
                    width: 800px; height: 800px;
                    border-radius: 42% 58% 60% 40% / 45% 50% 50% 55%;
                    background: linear-gradient(160deg, ${c1}06, ${c2}08);
                    transform: translateX(-50%);
                }
                .pattern-overlay::after {
                    content: '';
                    position: absolute;
                    bottom: -200px; right: -100px;
                    width: 600px; height: 600px;
                    border-radius: 55% 45% 48% 52% / 52% 58% 42% 48%;
                    background: linear-gradient(200deg, ${c2}05, ${c1}04);
                }
                .header-strip {
                    background: linear-gradient(160deg, ${c1}, ${c2});
                }
                .header-strip::after {
                    content: '';
                    position: absolute;
                    bottom: -40px; left: 0; right: 0;
                    height: 80px;
                    background: linear-gradient(160deg, ${c1}, ${c2});
                    clip-path: ellipse(60% 100% at 40% 0%);
                }
                .accent-bar { height: 8px; background: linear-gradient(90deg, ${c1}, ${c2}); border-radius: 4px 4px 0 0; }
            `;

        default:
            return shared + `
                .header-strip { background: ${c1}; }
                .accent-bar { height: 5px; background: ${c1}; }
            `;
    }
}

export default function QRCodeModal({ property, companyInfo, onClose }: QRCodeModalProps) {
    const [selectedTemplate, setSelectedTemplate] = useState<QRTemplateConfig>(QR_TEMPLATES[0]);
    const [generating, setGenerating] = useState(false);
    const qrRef = useRef<BrandedQRCodeRef>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    const brandColor1 = companyInfo?.brandColor1 || '#0A58CA';
    const brandColor2 = companyInfo?.brandColor2 || '#10b981';
    const companyLogoUrl = companyInfo?.companyLogo || undefined;
    const companyName = companyInfo?.companyName || 'Your Company';

    // Sama Kerr logo always goes in the QR center
    const samaKerrLogo = '/logo-blue.png';

    const qrValue = `https://samakerr.vercel.app/home/${property.id}`;

    const miniTemplates = useMemo(() => QR_TEMPLATES, []);

    const handleDownload = () => {
        qrRef.current?.download(`${property.name.replace(/\s+/g, '-')}-QR`);
    };

    // ─── Build the A4 HTML for a given template, then convert to PDF ──────
    const handleGeneratePDF = async () => {
        const canvas = qrRef.current?.getCanvas();
        if (!canvas) return;

        setGenerating(true);

        try {
            const html2pdf = (await import('html2pdf.js')).default;
            const dataUrl = canvas.toDataURL('image/png');
            const safe = (s: string) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const sName = safe(companyName);
            const sProp = safe(property.name);
            const sAddr = safe(property.address);
            const isDark = selectedTemplate.id === 'neon-edge';
            const templateStyles = getTemplatePDFStyles(selectedTemplate.id, brandColor1, brandColor2);

            const html = `
            <div class="page" style="width:210mm;min-height:297mm;position:relative;overflow:hidden;display:flex;flex-direction:column;font-family:'Inter',-apple-system,Segoe UI,sans-serif;background:${isDark ? '#0f172a' : '#ffffff'};color:${isDark ? '#e2e8f0' : '#1a1a2e'};">
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    ${templateStyles}
                </style>

                <!-- Patterns -->
                <div class="pattern-overlay">
                    <div class="pattern-dots"></div>
                </div>

                <!-- Header -->
                <div class="header-strip" style="position:relative;z-index:2;padding:28px 48px;display:flex;align-items:center;justify-content:space-between;">
                    <div style="display:flex;align-items:center;gap:14px;">
                        ${companyLogoUrl ? `<img src="${companyLogoUrl}" style="width:48px;height:48px;border-radius:12px;object-fit:contain;background:rgba(255,255,255,0.2);padding:6px;border:2px solid rgba(255,255,255,0.3);" />` : ''}
                        <span style="font-size:24px;font-weight:800;color:white;letter-spacing:-0.5px;">${sName}</span>
                    </div>
                    <span style="background:rgba(255,255,255,0.2);color:white;font-size:11px;font-weight:700;padding:6px 16px;border-radius:100px;letter-spacing:1.5px;text-transform:uppercase;border:1px solid rgba(255,255,255,0.3);">Tenant Setup Kit</span>
                </div>

                <!-- Content -->
                <div style="position:relative;z-index:1;flex:1;display:flex;flex-direction:column;align-items:center;padding:60px 48px 40px;">
                    <div class="welcome" style="text-align:center;margin-bottom:36px;">
                        <h1 style="font-size:32px;font-weight:800;letter-spacing:-0.8px;margin-bottom:8px;color:${isDark ? '#f1f5f9' : '#111827'};">Welcome to Your New Home</h1>
                        <p style="font-size:15px;color:${isDark ? '#94a3b8' : '#6b7280'};line-height:1.6;max-width:420px;margin:0 auto;">Scan the QR code below with your phone camera to instantly connect to your property and unlock your smart tenant portal.</p>
                    </div>

                    <!-- QR Code -->
                    <div class="qr-box" style="position:relative;padding:28px;border-radius:24px;background:${isDark ? '#1e293b' : '#ffffff'};box-shadow:${isDark ? `0 0 60px ${brandColor1}15, 0 4px 30px rgba(0,0,0,0.4)` : '0 4px 40px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)'};margin-bottom:32px;">
                        <div style="position:absolute;top:-2px;left:-2px;width:20px;height:20px;border-top:4px solid ${brandColor1};border-left:4px solid ${brandColor1};border-radius:8px 0 0 0;"></div>
                        <div style="position:absolute;top:-2px;right:-2px;width:20px;height:20px;border-top:4px solid ${brandColor2};border-right:4px solid ${brandColor2};border-radius:0 8px 0 0;"></div>
                        <div style="position:absolute;bottom:-2px;left:-2px;width:20px;height:20px;border-bottom:4px solid ${brandColor2};border-left:4px solid ${brandColor2};border-radius:0 0 0 8px;"></div>
                        <div style="position:absolute;bottom:-2px;right:-2px;width:20px;height:20px;border-bottom:4px solid ${brandColor1};border-right:4px solid ${brandColor1};border-radius:0 0 8px 0;"></div>
                        <img src="${dataUrl}" style="width:280px;height:280px;display:block;" />
                    </div>

                    <!-- Property -->
                    <div style="text-align:center;margin-bottom:40px;">
                        <div class="prop-name" style="font-size:26px;font-weight:800;color:${isDark ? '#f1f5f9' : '#111827'};margin-bottom:4px;letter-spacing:-0.5px;">${sProp}</div>
                        <div class="prop-addr" style="font-size:14px;color:${isDark ? '#64748b' : '#9ca3af'};font-weight:500;">${sAddr}</div>
                    </div>

                    <!-- Divider -->
                    <div style="width:80px;height:3px;border-radius:10px;background:linear-gradient(90deg, ${brandColor1}, ${brandColor2});margin:0 auto 24px;"></div>

                    <!-- Steps -->
                    <div style="display:flex;gap:20px;width:100%;max-width:520px;margin-bottom:40px;">
                        <div class="step-card" style="flex:1;text-align:center;padding:20px 16px;border-radius:16px;background:${isDark ? '#1e293b' : '#f9fafb'};border:1px solid ${isDark ? '#334155' : '#f3f4f6'};">
                            <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg, ${brandColor1}, ${brandColor2});color:white;font-size:14px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;margin-bottom:10px;">1</div>
                            <div class="step-title" style="font-size:13px;font-weight:700;color:${isDark ? '#e2e8f0' : '#374151'};margin-bottom:4px;">Open Camera</div>
                            <div class="step-desc" style="font-size:11px;color:${isDark ? '#64748b' : '#9ca3af'};line-height:1.4;">Use your phone's camera or QR scanner app</div>
                        </div>
                        <div class="step-card" style="flex:1;text-align:center;padding:20px 16px;border-radius:16px;background:${isDark ? '#1e293b' : '#f9fafb'};border:1px solid ${isDark ? '#334155' : '#f3f4f6'};">
                            <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg, ${brandColor1}, ${brandColor2});color:white;font-size:14px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;margin-bottom:10px;">2</div>
                            <div class="step-title" style="font-size:13px;font-weight:700;color:${isDark ? '#e2e8f0' : '#374151'};margin-bottom:4px;">Scan Code</div>
                            <div class="step-desc" style="font-size:11px;color:${isDark ? '#64748b' : '#9ca3af'};line-height:1.4;">Point camera at the QR code above</div>
                        </div>
                        <div class="step-card" style="flex:1;text-align:center;padding:20px 16px;border-radius:16px;background:${isDark ? '#1e293b' : '#f9fafb'};border:1px solid ${isDark ? '#334155' : '#f3f4f6'};">
                            <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg, ${brandColor1}, ${brandColor2});color:white;font-size:14px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;margin-bottom:10px;">3</div>
                            <div class="step-title" style="font-size:13px;font-weight:700;color:${isDark ? '#e2e8f0' : '#374151'};margin-bottom:4px;">Get Connected</div>
                            <div class="step-desc" style="font-size:11px;color:${isDark ? '#64748b' : '#9ca3af'};line-height:1.4;">Access your tenant portal instantly</div>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="footer-bar" style="position:relative;z-index:2;padding:20px 48px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid ${isDark ? '#1e293b' : '#f3f4f6'};margin-top:auto;">
                    <span class="footer-left" style="font-size:11px;color:${isDark ? '#475569' : '#d1d5db'};">Generated for ${sProp}</span>
                    <div class="footer-right" style="display:flex;align-items:center;gap:6px;">
                        <span style="font-size:11px;color:${isDark ? '#475569' : '#d1d5db'};">Powered by</span>
                        <span class="footer-sk" style="font-size:11px;font-weight:700;color:${isDark ? '#64748b' : '#9ca3af'};">Sama Kerr</span>
                    </div>
                </div>

                <!-- Bottom accent -->
                <div class="accent-bar"></div>
            </div>
            `;

            const container = document.createElement('div');
            container.innerHTML = html;
            container.style.position = 'fixed';
            container.style.left = '-9999px';
            container.style.top = '0';
            document.body.appendChild(container);

            // Wait for fonts to be loaded
            await new Promise(resolve => setTimeout(resolve, 500));

            const element = container.firstElementChild as HTMLElement;

            await html2pdf()
                .set({
                    margin: 0,
                    filename: `${property.name.replace(/\s+/g, '-')}-Setup-Kit-${selectedTemplate.name.replace(/\s+/g, '-')}.pdf`,
                    image: { type: 'png', quality: 1 },
                    html2canvas: {
                        scale: 2,
                        useCORS: true,
                        logging: false,
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    },
                    jsPDF: {
                        unit: 'mm',
                        format: 'a4',
                        orientation: 'portrait',
                    },
                })
                .from(element)
                .save();

            document.body.removeChild(container);
        } catch (err) {
            console.error('PDF generation failed:', err);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

                {/* Modal */}
                <motion.div
                    ref={modalRef}
                    initial={{ scale: 0.92, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative z-10 bg-white w-full max-w-[920px] max-h-[90vh] overflow-y-auto shadow-[0_32px_80px_rgba(0,0,0,0.35)]"
                    style={{ borderRadius: '16px' }}
                >
                    {/* Header bar with gradient accent */}
                    <div
                        className="relative px-7 py-5 flex items-center justify-between"
                        style={{
                            background: `linear-gradient(135deg, ${brandColor1}, ${brandColor2})`,
                        }}
                    >
                        <div className="flex items-center gap-3">
                            {companyLogoUrl && (
                                <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden border border-white/30">
                                    <img src={companyLogoUrl} alt="Logo" className="w-8 h-8 object-contain" />
                                </div>
                            )}
                            <div>
                                <h2 className="text-[17px] font-bold text-white tracking-tight">{companyName}</h2>
                                <p className="text-[12px] text-white/70">Tenant Setup Kit</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                        >
                            <X size={16} className="text-white" />
                        </button>
                    </div>

                    {/* Content — Two-panel layout */}
                    <div className="flex flex-col lg:flex-row">
                        {/* LEFT: QR Preview */}
                        <div
                            className="flex-1 flex flex-col items-center justify-center p-8 lg:p-10"
                            style={{ background: `linear-gradient(160deg, ${hexToRgba(brandColor1, 0.06)}, ${hexToRgba(brandColor2, 0.08)}, ${hexToRgba(brandColor1, 0.04)})` }}
                        >
                            {/* QR Container with decorative border */}
                            <div
                                className="relative p-5 rounded-2xl mb-6"
                                style={{
                                    background: selectedTemplate.darkMode
                                        ? 'linear-gradient(135deg, #1f2937, #111827)'
                                        : '#ffffff',
                                    boxShadow: selectedTemplate.darkMode
                                        ? `0 0 40px ${hexToRgba(brandColor1, 0.2)}, 0 8px 32px rgba(0,0,0,0.3)`
                                        : `0 4px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)`,
                                }}
                            >
                                {/* Decorative corner accents */}
                                <div className="absolute top-0 left-0 w-8 h-8 rounded-tl-2xl" style={{ borderTop: `3px solid ${brandColor1}`, borderLeft: `3px solid ${brandColor1}` }} />
                                <div className="absolute top-0 right-0 w-8 h-8 rounded-tr-2xl" style={{ borderTop: `3px solid ${brandColor2}`, borderRight: `3px solid ${brandColor2}` }} />
                                <div className="absolute bottom-0 left-0 w-8 h-8 rounded-bl-2xl" style={{ borderBottom: `3px solid ${brandColor2}`, borderLeft: `3px solid ${brandColor2}` }} />
                                <div className="absolute bottom-0 right-0 w-8 h-8 rounded-br-2xl" style={{ borderBottom: `3px solid ${brandColor1}`, borderRight: `3px solid ${brandColor1}` }} />

                                <BrandedQRCode
                                    ref={qrRef}
                                    value={qrValue}
                                    size={260}
                                    brandColor1={brandColor1}
                                    brandColor2={brandColor2}
                                    logoDataUrl={samaKerrLogo}
                                    template={selectedTemplate}
                                />
                            </div>

                            {/* Property info */}
                            <h3 className="text-xl font-bold text-gray-900 mb-1 text-center">{property.name}</h3>
                            <p className="text-sm text-gray-500 mb-1 text-center">{property.address}</p>
                            <div className="flex items-center gap-1.5 mt-2">
                                <Sparkles size={12} style={{ color: brandColor1 }} />
                                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: brandColor1 }}>
                                    {selectedTemplate.name}
                                </span>
                            </div>
                        </div>

                        {/* RIGHT: Template selector + actions */}
                        <div
                            className="w-full lg:w-[340px] border-t lg:border-t-0 lg:border-l flex flex-col"
                            style={{ borderColor: hexToRgba(brandColor1, 0.1), background: `linear-gradient(180deg, ${hexToRgba(brandColor1, 0.03)}, ${hexToRgba(brandColor2, 0.05)})` }}
                        >
                            {/* Template selector */}
                            <div className="p-6 flex-1">
                                <h4 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: brandColor1 }}>
                                    Choose Template
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {miniTemplates.map((tmpl) => {
                                        const isActive = selectedTemplate.id === tmpl.id;
                                        return (
                                            <button
                                                key={tmpl.id}
                                                onClick={() => setSelectedTemplate(tmpl)}
                                                className="group relative flex flex-col items-center rounded-xl p-3 transition-all duration-200 border-2"
                                                style={{
                                                    borderColor: isActive ? brandColor1 : 'transparent',
                                                    backgroundColor: isActive
                                                        ? hexToRgba(brandColor1, 0.04)
                                                        : '#f9fafb',
                                                }}
                                            >
                                                {isActive && (
                                                    <div
                                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
                                                        style={{ backgroundColor: brandColor1 }}
                                                    >
                                                        <Check size={11} className="text-white" strokeWidth={3} />
                                                    </div>
                                                )}

                                                {/* Mini QR preview */}
                                                <div
                                                    className="w-full aspect-square rounded-lg mb-2 flex items-center justify-center overflow-hidden"
                                                    style={{
                                                        backgroundColor: tmpl.darkMode ? '#111827' : '#ffffff',
                                                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
                                                    }}
                                                >
                                                    <BrandedQRCode
                                                        value={qrValue}
                                                        size={100}
                                                        brandColor1={brandColor1}
                                                        brandColor2={brandColor2}
                                                        template={tmpl}
                                                    />
                                                </div>

                                                <span className="text-[11px] font-semibold text-gray-600 group-hover:text-gray-900 transition-colors text-center leading-tight">
                                                    {tmpl.name}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="p-6 pt-0 flex flex-col gap-2.5">
                                <button
                                    onClick={handleGeneratePDF}
                                    disabled={generating}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-4 text-white text-[13px] font-bold rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                                    style={{
                                        background: `linear-gradient(135deg, ${brandColor1}, ${brandColor2})`,
                                    }}
                                >
                                    <FileDown size={16} />
                                    {generating ? 'Generating PDF...' : 'Download A4 PDF'}
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-4 text-[13px] font-bold rounded-xl border-2 transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                                    style={{
                                        borderColor: brandColor1,
                                        color: brandColor1,
                                        backgroundColor: hexToRgba(brandColor1, 0.03),
                                    }}
                                >
                                    <Download size={16} />
                                    Download QR Image
                                </button>
                                <p className="text-[11px] text-gray-400 text-center mt-1 leading-relaxed">
                                    PDF includes branded template with patterns<br />
                                    <span className="font-semibold text-gray-500">{selectedTemplate.name}</span> style
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
