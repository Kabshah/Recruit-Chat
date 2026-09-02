"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Bot, Shield, Zap, Filter, Menu, X } from "lucide-react";
import Image from "next/image";
import { ChatWidget } from "@/components/chat-widget";

function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="w-full absolute top-0 left-0 z-50 bg-white md:bg-transparent">
      <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo Layer */}
        <div className="flex items-center gap-12">
          <div className="text-3xl font-display font-black tracking-tight" style={{ color: "var(--color-brand)" }}>
            H<span style={{ color: "var(--color-accent)" }}>R</span>S
          </div>
          
          {/* Desktop Left Nav */}
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-text-primary">
            <a href="#" className="hover:text-accent transition-colors">Candidates</a>
            <a href="#" className="hover:text-accent transition-colors">Employers</a>
          </div>
        </div>

        {/* Desktop Right Nav */}
        <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-text-primary">
          <a href="#" className="hover:text-accent transition-colors">Blog</a>
          <a href="#" className="hover:text-accent transition-colors">About us</a>
          <a href="#" className="hover:text-accent transition-colors">Contacts</a>
          <div className="flex items-center gap-1 cursor-pointer hover:text-accent transition-colors">
            <span>EN</span>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Mobile menu toggle */}
        <button className="md:hidden text-text-primary" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="absolute top-20 left-0 w-full bg-white shadow-xl py-6 px-6 flex flex-col gap-4 border-t border-surface-light md:hidden"
        >
          <a href="#" className="font-semibold text-lg text-text-primary hover:text-accent">Candidates</a>
          <a href="#" className="font-semibold text-lg text-text-primary hover:text-accent">Employers</a>
          <div className="h-px w-full bg-surface-light my-2"></div>
          <a href="#" className="font-medium text-text-secondary hover:text-accent">Blog</a>
          <a href="#" className="font-medium text-text-secondary hover:text-accent">About us</a>
          <a href="#" className="font-medium text-text-secondary hover:text-accent">Contacts</a>
        </motion.div>
      )}
    </nav>
  );
}

function Hero() {
  const scrollToChat = () => {
    const widgetBtn = document.querySelector('button[aria-label="Open screening chat"]');
    if (widgetBtn) (widgetBtn as HTMLElement).click();
  };

  return (
    <section className="relative min-h-[100svh] w-full bg-white md:p-8 flex items-center justify-center overflow-hidden">
      {/* Container simulating a framed page on desktop, filling screen on mobile */}
      <div className="w-full max-w-[1400px] bg-white rounded-none md:rounded-[40px] md:shadow-2xl md:shadow-brand/5 relative min-h-[85vh] flex flex-col md:flex-row items-stretch pt-24 md:pt-20 px-6 md:px-16 overflow-hidden border-0 md:border border-surface-light/50">
        
        {/* Left Content */}
        <div className="flex-1 flex flex-col justify-center py-10 md:py-20 z-10 w-full max-w-[600px]">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
            className="text-[clamp(2.75rem,5vw,4.5rem)] font-display font-medium tracking-tight text-brand leading-[1.1] mb-6"
            style={{ color: "var(--color-brand)" }}
          >
            The job you're dreaming of.<br/>
            The experts you're looking for.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
            className="text-base md:text-lg text-text-secondary mb-10 text-balance leading-relaxed"
          >
            No matter if you are a candidate or an employer, the right solution is just a click away. Trust our long-term experience in human resources and realize your full potential. Don't lose any more time searching!
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <button 
              onClick={scrollToChat}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white px-8 py-4 rounded-full font-semibold transition-all active:scale-95"
            >
              Find a job <ArrowRight size={18} />
            </button>
            <button 
              className="w-full sm:w-auto flex items-center justify-center bg-transparent border-2 border-brand text-brand hover:bg-brand/5 px-8 py-4 rounded-full font-semibold transition-all active:scale-95"
            >
              Find an employee
            </button>
          </motion.div>
        </div>

        {/* Right Content / Image Area */}
        <div className="flex-1 relative flex items-center justify-center mt-10 md:mt-0 pointer-events-none p-4 md:p-8">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.2 }}
            className="w-full max-w-[450px] aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl relative"
          >
            <img 
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&auto=format&fit=crop" 
              alt="Professional" 
              className="w-full h-full object-cover object-center" 
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ProblemSolution() {
  return (
    <section className="py-24 px-6 bg-white border-t border-surface-light relative">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-4xl md:text-5xl font-display font-medium text-text-primary mb-6">
              The Pain.
            </h2>
            <p className="text-xl text-text-secondary leading-relaxed">
              Recruiters are drowning in unscreened resumes. Manual triage is slow, biased, and leaves top candidates waiting for days in a black hole.
            </p>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
            <h2 className="text-4xl md:text-5xl font-display font-semibold text-brand mb-6" style={{ color: "var(--color-brand)" }}>
              The Fix.
            </h2>
            <p className="text-xl text-text-primary leading-relaxed font-semibold">
              AI screens inbound applicants conversationally in 3 minutes. Your team only reviews profiles that actually match the role.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}



function FinalCTA() {
  const scrollToChat = () => {
    const widgetBtn = document.querySelector('button[aria-label="Open screening chat"]');
    if (widgetBtn) (widgetBtn as HTMLElement).click();
  };

  return (
    <section className="py-24 px-6 md:px-12 bg-white relative">
      <div className="max-w-[1200px] mx-auto bg-brand rounded-[3rem] p-12 md:p-20 text-center flex flex-col items-center shadow-2xl relative overflow-hidden text-white" style={{ backgroundColor: "var(--color-brand)" }}>
        {/* Soft decorative glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-full bg-white/5 blur-[100px] rounded-full pointer-events-none"></div>
        
        <h2 className="text-[clamp(2.25rem,4vw,3.5rem)] font-display font-medium mb-6 relative z-10 leading-tight">
          Ready to automate <br className="hidden sm:block"/> your intake?
        </h2>
        <p className="text-white/80 text-lg mb-10 max-w-2xl relative z-10">
          Join leading agencies that accelerate their screening process without sacrificing the human touch. High matches, zero bias.
        </p>
        <button 
          onClick={scrollToChat}
          className="bg-accent hover:bg-accent-hover text-white px-10 py-5 rounded-full font-semibold text-lg transition-transform hover:scale-105 active:scale-95 shadow-xl relative z-10"
        >
          Start your free trial
        </button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-white pt-16 pb-8 px-6 border-t border-surface-light">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-1">
            <div className="text-3xl font-display font-black tracking-tight mb-4" style={{ color: "var(--color-brand)" }}>
              H<span style={{ color: "var(--color-accent)" }}>R</span>S
            </div>
            <p className="text-text-secondary leading-relaxed">
              Transforming human resources with intelligent, conversations-first candidate screening.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-brand mb-6" style={{ color: "var(--color-brand)" }}>Product</h4>
            <ul className="flex flex-col gap-4 text-text-secondary">
              <li><a href="#" className="hover:text-accent transition-colors">For Employers</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">For Candidates</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Security</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-brand mb-6" style={{ color: "var(--color-brand)" }}>Company</h4>
            <ul className="flex flex-col gap-4 text-text-secondary">
              <li><a href="#" className="hover:text-accent transition-colors">About</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-brand mb-6" style={{ color: "var(--color-brand)" }}>Legal</h4>
            <ul className="flex flex-col gap-4 text-text-secondary">
              <li><a href="#" className="hover:text-accent transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Cookie Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-surface-light text-text-secondary text-sm">
          <p>© {new Date().getFullYear()} HRS. All rights reserved.</p>
          <div className="flex items-center gap-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-brand transition-colors">LinkedIn</a>
            <a href="#" className="hover:text-brand transition-colors">Twitter</a>
            <a href="#" className="hover:text-brand transition-colors">Facebook</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <main className="bg-base text-text-primary min-h-screen font-sans selection:bg-accent selection:text-white">
      <Navigation />
      
      {/* Background shape behind the framed hero for desktop */}
      <div className="hidden md:block fixed top-0 left-0 w-full h-[50vh] bg-base -z-10 bg-gradient-to-b from-gray-100 to-transparent pointer-events-none"></div>

      <Hero />
      <ProblemSolution />
      
      <FinalCTA />
      <Footer />

      {/* The Chat Widget Holder */}
      <ChatWidget />
    </main>
  );
}
