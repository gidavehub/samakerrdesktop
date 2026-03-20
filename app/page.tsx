"use client";

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CheckCircle2, Building, Shield, ArrowRight } from 'lucide-react';
import Header from './components/Header';

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<HTMLDivElement[]>([]);

  const addToRefs = (el: HTMLDivElement | null) => {
    if (el && !sectionsRef.current.includes(el)) {
      sectionsRef.current.push(el);
    }
  };

  useEffect(() => {
    // Hero Text Animation
    if (textRef.current) {
      gsap.fromTo(
        textRef.current.children,
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.2,
          ease: "power3.out",
          delay: 0.5
        }
      );
    }

    // Story Sections Scroll Animation
    sectionsRef.current.forEach((section) => {
      gsap.fromTo(
        section.querySelectorAll('.animate-element'),
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            start: "top 75%",
            toggleActions: "play none none reverse"
          }
        }
      );
    });
  }, []);

  return (
    <main className="min-h-screen bg-primary-bg font-outfit">
      <Header />

      {/* Hero Section */}
      <section className="relative h-[100dvh] w-full overflow-hidden bg-black" ref={heroRef}>
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute top-0 left-0 w-full h-full object-cover opacity-70"
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>

        <div className="relative z-10 flex flex-col items-center justify-end h-full w-full pb-[60px] bg-gradient-to-t from-black/50 to-transparent">
          <div className="text-center text-white max-w-[900px] px-5" ref={textRef}>
            <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] font-semibold mb-6 leading-[1.1] tracking-tight">
              The ultimate real estate management suite
            </h1>
            <div className="flex justify-center">
              <Link href="/auth" className="bg-accent-blue text-white px-8 py-4 rounded-fluent-lg font-semibold hover:bg-accent-hover transition-colors">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Corporate Layer */}
      <section className="px-10 py-[100px] max-w-[1400px] mx-auto" ref={addToRefs} id="corporate">
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-20">
          <div className="relative rounded-fluent-xl overflow-hidden shadow-fluent-lg flex-[1.2] w-full aspect-[16/10] group animate-element">
            <Image
              src="/office-collaboration.png"
              alt="Corporate Collaboration"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute bottom-0 left-0 w-full p-8 pt-16 bg-gradient-to-t from-black/85 to-transparent text-white">
              <p className="text-[0.85rem] font-semibold uppercase tracking-wider mb-2 opacity-80">Corporate Layer</p>
              <h3 className="text-2xl font-medium">Empower Your Workforce</h3>
            </div>
          </div>
          <div className="flex-1 animate-element">
            <h2 className="text-[clamp(2rem,3vw,3rem)] mb-6 leading-[1.2] font-semibold text-primary-text">Manage corporate activity with unparalleled clarity.</h2>
            <p className="text-lg text-secondary-text leading-relaxed mb-5">
              The Corporate Layer of Sama Kerr is engineered to facilitate communication and workflow across your entire enterprise. Our tools encompass everything from AI-driven meeting transcribers to comprehensive internal resource planners.
            </p>
            <p className="text-lg text-secondary-text leading-relaxed mb-5">
              We bring the best digital infrastructure so your teams can collaborate effortlessly. By automating the mundane tasks, we empower your workforce to focus on high-impact decision-making, ensuring seamless corporate operations and a unified vision.
            </p>
          </div>
        </div>
      </section>

      {/* Management Layer */}
      <section className="px-10 py-[100px] max-w-[1400px] mx-auto" ref={addToRefs} id="desktop">
        <div className="flex flex-col lg:flex-row-reverse items-center gap-10 lg:gap-20">
          <div className="flex-1 animate-element">
            <h2 className="text-[clamp(2rem,3vw,3rem)] mb-6 leading-[1.2] font-semibold text-primary-text">Complete Control over your properties.</h2>
            <p className="text-lg text-secondary-text leading-relaxed mb-5">
              At the heart of Sama Kerr lies the Management Layer—a robust, unified ledger designed to handle the complexities of modern real estate. Get an instant, bird's-eye view of all your properties spread across the map.
            </p>
            <p className="text-lg text-secondary-text leading-relaxed mb-5">
              Track financial lifecycles, monitor construction progress, and generate unique QR codes for each property. The Management Layer is built for the seasoned executive who commands absolute oversight, transforming scattered data into actionable, confident leadership.
            </p>
          </div>
          <div className="relative rounded-fluent-xl overflow-hidden shadow-fluent-lg flex-[1.2] w-full aspect-[16/10] group animate-element">
            <Image
              src="/management-confidence.png"
              alt="Management Confidence"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute bottom-0 left-0 w-full p-8 pt-16 bg-gradient-to-t from-black/85 to-transparent text-white">
              <p className="text-[0.85rem] font-semibold uppercase tracking-wider mb-2 opacity-80">Management Layer</p>
              <h3 className="text-2xl font-medium">The Unified Property Ledger</h3>
            </div>
          </div>
        </div>
      </section>

      {/* Client Layer - Landscape Features */}
      <section className="px-10 py-[100px] max-w-[1400px] mx-auto" ref={addToRefs}>
        <div className="text-center max-w-[800px] mx-auto mb-16 animate-element">
          <h2 className="text-[clamp(2rem,3vw,3rem)] mb-5 font-semibold">The Client Layer: Delivering Peace of Mind</h2>
          <p className="text-lg text-secondary-text leading-relaxed">Bring the digital revolution directly to the doorsteps of your clients. From tracking the joy of their home's construction progress to seamlessly automating utility payments like NAWEC directly from the app.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="relative rounded-fluent-xl overflow-hidden shadow-fluent-lg w-full aspect-[16/10] group animate-element">
            <Image
              src="/nawec-relief.png"
              alt="NAWEC Relief"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute bottom-0 left-0 w-full p-8 pt-16 bg-gradient-to-t from-black/85 to-transparent text-white">
              <h3 className="text-2xl font-medium">Utility Bills Sorted</h3>
            </div>
          </div>
          <div className="relative rounded-fluent-xl overflow-hidden shadow-fluent-lg w-full aspect-[16/10] group animate-element">
            <Image
              src="/progress-joy.png"
              alt="Track Construction Progress"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute bottom-0 left-0 w-full p-8 pt-16 bg-gradient-to-t from-black/85 to-transparent text-white">
              <h3 className="text-2xl font-medium">Track Construction Joy</h3>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile App PWA Layer - Portrait Features */}
      <section className="px-10 py-[100px] max-w-[1400px] mx-auto" ref={addToRefs} id="mobile">
        <div className="text-center max-w-[800px] mx-auto mb-16 animate-element">
          <h2 className="text-[clamp(2rem,3vw,3rem)] mb-5 font-semibold">Sama Kerr Mobile App</h2>
          <p className="text-lg text-secondary-text leading-relaxed">A native-feeling Progressive Web App designed for the end user. Instant onboarding via QR code scanning connects clients to their specific property, enabling hassle-free maintenance requests and complete control over their smart home ecosystem.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="relative rounded-fluent-xl overflow-hidden shadow-fluent-lg w-full aspect-[9/16] group animate-element">
            <Image src="/the-qr-scan.png" alt="QR Scan" fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute bottom-0 left-0 w-full p-8 pt-16 bg-gradient-to-t from-black/85 to-transparent text-white">
              <h3 className="text-xl font-medium">Instant QR Onboarding</h3>
            </div>
          </div>
          <div className="relative rounded-fluent-xl overflow-hidden shadow-fluent-lg w-full aspect-[9/16] group animate-element">
            <Image src="/maintenance-ease.png" alt="Maintenance" fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute bottom-0 left-0 w-full p-8 pt-16 bg-gradient-to-t from-black/85 to-transparent text-white">
              <h3 className="text-xl font-medium">Hassle-free Maintenance</h3>
            </div>
          </div>
          <div className="relative rounded-fluent-xl overflow-hidden shadow-fluent-lg w-full aspect-[9/16] group animate-element">
            <Image src="/digital-lifestyle.png" alt="Digital Lifestyle" fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute bottom-0 left-0 w-full p-8 pt-16 bg-gradient-to-t from-black/85 to-transparent text-white">
              <h3 className="text-xl font-medium">The Ultimate Digital Lifestyle</h3>
            </div>
          </div>
        </div>
      </section>

      {/* B2B Microsoft-Style Pricing Section */}
      <section className="relative min-h-screen flex items-center justify-center p-5 md:p-24 overflow-hidden" ref={addToRefs}>
        <div className="absolute inset-0 z-0">
          <Image
            src="/pricing-background.png"
            alt="Pricing Background"
            fill
            className="object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>

        <div className="relative z-10 w-full max-w-[1200px] flex flex-col items-center">
          <div className="text-center mb-12 animate-element">
            <h2 className="text-[clamp(2.5rem,5vw,3.5rem)] font-semibold text-white mb-5 tracking-tight">Your real estate portfolio, supercharged</h2>
            <p className="text-lg text-white/90 max-w-[600px] mx-auto leading-relaxed">
              Get leading property management apps with built-in AI, advanced corporate ledger security, and client layer tools—all in one B2B plan.
            </p>
          </div>

          <div className="flex bg-primary-bg rounded-full p-1.5 gap-2 mb-16 shadow-lg animate-element">
            <button className="px-8 py-3 rounded-full text-[15px] font-semibold bg-primary-text text-primary-bg transition-colors">For Business</button>
            <button className="px-8 py-3 rounded-full text-[15px] font-medium text-secondary-text hover:text-primary-text transition-colors">For Enterprise</button>
            <button className="px-8 py-3 rounded-full text-[15px] font-medium text-secondary-text hover:text-primary-text transition-colors">Custom Suites</button>
          </div>

          <div className="flex justify-center w-full animate-element">
            <div className="bg-primary-bg rounded-3xl w-full max-w-[440px] overflow-hidden shadow-fluent-lg border-2 border-accent-blue transition-transform hover:-translate-y-2 duration-300">
              <div className="p-8 pb-8 border-b border-border-subtle">
                <h3 className="text-xl font-semibold mb-5 text-primary-text">Sama Kerr Suite</h3>
                <div className="flex items-start mb-6 text-primary-text">
                  <span className="text-lg font-medium mt-1.5 mr-1">$</span>
                  <span className="text-5xl font-semibold leading-none">1999</span>
                  <span className="self-end mb-1 ml-1 text-secondary-text">/year</span>
                </div>
                <p className="text-sm text-secondary-text leading-relaxed mb-8 min-h-[42px]">Complete AI infrastructure and Management Ledger functionality for modern real estate portfolios.</p>
                <Link href="/auth" className="block w-full text-center bg-accent-blue text-white px-6 py-3.5 rounded-fluent-lg font-semibold hover:bg-accent-hover transition-colors mb-4">Get Started</Link>
                <Link href="#" className="flex justify-center items-center gap-1.5 text-accent-blue text-sm font-semibold hover:underline">Contact Sales <ArrowRight size={14} /></Link>
              </div>
              <div className="p-8 bg-secondary-bg">
                <p className="text-sm font-semibold mb-5 text-primary-text">Plan includes everything you need:</p>
                <ul className="flex flex-col gap-4">
                  <li className="flex items-start gap-3 text-sm text-secondary-text"><CheckCircle2 size={16} className="text-accent-blue shrink-0 mt-0.5" /> Unlimited Properties & Ledger Access</li>
                  <li className="flex items-start gap-3 text-sm text-secondary-text"><CheckCircle2 size={16} className="text-accent-blue shrink-0 mt-0.5" /> Corporate Layer & Internal Tools</li>
                  <li className="flex items-start gap-3 text-sm text-secondary-text"><CheckCircle2 size={16} className="text-accent-blue shrink-0 mt-0.5" /> White-label Client Mobile App</li>
                  <li className="flex items-start gap-3 text-sm text-secondary-text"><CheckCircle2 size={16} className="text-accent-blue shrink-0 mt-0.5" /> AI Meeting Transcriber</li>
                  <li className="flex items-start gap-3 text-sm text-secondary-text"><CheckCircle2 size={16} className="text-accent-blue shrink-0 mt-0.5" /> Advanced Analytics & Reports</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
