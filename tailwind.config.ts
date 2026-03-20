import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                'primary-bg': '#ffffff',
                'secondary-bg': '#f3f3f3',
                'primary-text': '#242424',
                'secondary-text': '#5c5c5c',
                'accent-blue': '#0067c0',
                'accent-hover': '#005ba1',
                'border-subtle': 'rgba(0, 0, 0, 0.05)',
                'acrylic-light': 'rgba(255, 255, 255, 0.7)',
                'acrylic-dark': 'rgba(0, 0, 0, 0.7)',
            },
            boxShadow: {
                'fluent-sm': '0 2px 4px rgba(0,0,0,0.04), 0 0 2px rgba(0,0,0,0.06)',
                'fluent-md': '0 4px 8px rgba(0,0,0,0.04), 0 0 2px rgba(0,0,0,0.06)',
                'fluent-lg': '0 8px 16px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.08)',
            },
            fontFamily: {
                inter: ['var(--font-inter)', 'sans-serif'],
                outfit: ['var(--font-outfit)', 'sans-serif'],
                playfair: ['var(--font-playfair)', 'serif'],
            },
            borderRadius: {
                'fluent': '6px',
                'fluent-lg': '8px',
                'fluent-xl': '12px',
            },
            keyframes: {
                'fade-slide-up': {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                }
            },
            animation: {
                'fade-slide-up': 'fade-slide-up 0.4s ease-out forwards',
            }
        },
    },
    plugins: [],
};
export default config;
