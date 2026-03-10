"use client";

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

export interface QRTemplateConfig {
    id: string;
    name: string;
    dotsType: 'square' | 'dots' | 'rounded' | 'classy' | 'classy-rounded' | 'extra-rounded';
    cornersSquareType: 'square' | 'dot' | 'extra-rounded';
    cornersDotType: 'square' | 'dot';
    backgroundType: 'solid' | 'gradient';
    gradientType?: 'linear' | 'radial';
    gradientRotation?: number;
    useGradientDots?: boolean;
    darkMode?: boolean;
}

export interface BrandedQRCodeProps {
    value: string;
    size?: number;
    brandColor1: string;
    brandColor2: string;
    logoDataUrl?: string;
    template: QRTemplateConfig;
}

export interface BrandedQRCodeRef {
    download: (filename?: string) => void;
    getCanvas: () => HTMLCanvasElement | null;
}

const BrandedQRCode = forwardRef<BrandedQRCodeRef, BrandedQRCodeProps>(
    ({ value, size = 280, brandColor1, brandColor2, logoDataUrl, template }, ref) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const qrRef = useRef<any>(null);
        const [loaded, setLoaded] = useState(false);

        useImperativeHandle(ref, () => ({
            download: (filename = 'branded-qr-code') => {
                qrRef.current?.download({
                    name: filename,
                    extension: 'png',
                });
            },
            getCanvas: () => {
                return containerRef.current?.querySelector('canvas') || null;
            },
        }));

        useEffect(() => {
            let cancelled = false;

            const initQR = async () => {
                const QRCodeStyling = (await import('qr-code-styling')).default;
                if (cancelled) return;

                // Determine colors based on template
                const bgColor = template.darkMode ? '#111827' : '#ffffff';

                const dotsOptions: any = {
                    type: template.dotsType,
                };

                if (template.useGradientDots) {
                    dotsOptions.gradient = {
                        type: template.gradientType || 'linear',
                        rotation: template.gradientRotation ?? 45,
                        colorStops: [
                            { offset: 0, color: brandColor1 },
                            { offset: 1, color: brandColor2 },
                        ],
                    };
                } else {
                    dotsOptions.color = brandColor1;
                }

                const cornersSquareOptions: any = {
                    type: template.cornersSquareType,
                    color: brandColor1,
                };

                const cornersDotOptions: any = {
                    type: template.cornersDotType,
                    color: template.darkMode ? brandColor2 : brandColor1,
                };

                const backgroundOptions: any = {};
                if (template.backgroundType === 'gradient') {
                    backgroundOptions.gradient = {
                        type: 'linear',
                        rotation: 135,
                        colorStops: [
                            { offset: 0, color: template.darkMode ? '#1f2937' : '#ffffff' },
                            { offset: 1, color: template.darkMode ? '#111827' : '#f9fafb' },
                        ],
                    };
                } else {
                    backgroundOptions.color = bgColor;
                }

                const imageOptions: any = logoDataUrl
                    ? {
                        hideBackgroundDots: true,
                        imageSize: 0.25,
                        margin: 8,
                        crossOrigin: 'anonymous',
                    }
                    : {};

                // Render at 2x for crisp logo, display at 1x via CSS
                const renderSize = size * 2;

                const qrCode = new QRCodeStyling({
                    width: renderSize,
                    height: renderSize,
                    type: 'canvas',
                    data: value,
                    image: logoDataUrl || undefined,
                    dotsOptions,
                    cornersSquareOptions,
                    cornersDotOptions,
                    backgroundOptions,
                    imageOptions,
                    qrOptions: {
                        errorCorrectionLevel: 'H',
                    },
                });

                if (containerRef.current) {
                    containerRef.current.innerHTML = '';
                    qrCode.append(containerRef.current);

                    // Scale the canvas down for crisp rendering
                    const canvasEl = containerRef.current.querySelector('canvas');
                    if (canvasEl) {
                        canvasEl.style.width = `${size}px`;
                        canvasEl.style.height = `${size}px`;
                    }
                }

                qrRef.current = qrCode;
                setLoaded(true);
            };

            initQR();

            return () => {
                cancelled = true;
            };
        }, [value, size, brandColor1, brandColor2, logoDataUrl, template]);

        return (
            <div
                ref={containerRef}
                className="flex items-center justify-center"
                style={{
                    width: size,
                    height: size,
                    opacity: loaded ? 1 : 0,
                    transition: 'opacity 0.4s ease',
                }}
            />
        );
    }
);

BrandedQRCode.displayName = 'BrandedQRCode';

export default BrandedQRCode;

// ─── Template Presets ───────────────────────────────────────────
export const QR_TEMPLATES: QRTemplateConfig[] = [
    {
        id: 'corporate-classic',
        name: 'Corporate Classic',
        dotsType: 'square',
        cornersSquareType: 'extra-rounded',
        cornersDotType: 'dot',
        backgroundType: 'solid',
        useGradientDots: false,
    },
    {
        id: 'gradient-flow',
        name: 'Gradient Flow',
        dotsType: 'rounded',
        cornersSquareType: 'extra-rounded',
        cornersDotType: 'dot',
        backgroundType: 'solid',
        useGradientDots: true,
        gradientType: 'linear',
        gradientRotation: 45,
    },
    {
        id: 'dot-matrix',
        name: 'Dot Matrix',
        dotsType: 'dots',
        cornersSquareType: 'dot',
        cornersDotType: 'dot',
        backgroundType: 'solid',
        useGradientDots: false,
    },
    {
        id: 'diamond-grid',
        name: 'Diamond Grid',
        dotsType: 'classy-rounded',
        cornersSquareType: 'extra-rounded',
        cornersDotType: 'dot',
        backgroundType: 'gradient',
        useGradientDots: true,
        gradientType: 'radial',
    },
    {
        id: 'neon-edge',
        name: 'Neon Edge',
        dotsType: 'rounded',
        cornersSquareType: 'extra-rounded',
        cornersDotType: 'dot',
        backgroundType: 'solid',
        useGradientDots: true,
        gradientType: 'linear',
        gradientRotation: 180,
        darkMode: true,
    },
    {
        id: 'organic-blend',
        name: 'Organic Blend',
        dotsType: 'extra-rounded',
        cornersSquareType: 'extra-rounded',
        cornersDotType: 'dot',
        backgroundType: 'gradient',
        useGradientDots: true,
        gradientType: 'linear',
        gradientRotation: 90,
    },
];
