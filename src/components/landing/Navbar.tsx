"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const navLinks = [
  { label: "Vantagens", href: "#vantagens" },
  { label: "Funcionalidades", href: "#funcionalidades" },
  { label: "Planos", href: "#planos" },
  { label: "FAQ", href: "#faq" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-slate-950/85 backdrop-blur-md border-b border-white/10 shadow-sm"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-blue flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <span 
              className={`text-xl font-extrabold tracking-tight transition-colors duration-300 ${
                scrolled ? "text-landing-text" : "text-white"
              }`} 
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Lexon<span className="text-gradient-brand">Agenda</span>
            </span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors duration-200 ${
                  scrolled
                    ? "text-landing-text-muted hover:text-brand-blue"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className={`text-sm font-semibold transition-colors px-4 py-2 ${
                scrolled
                  ? "text-landing-text-muted hover:text-landing-text"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Entrar
            </Link>
            <a
              href="#planos"
              className={`btn-primary !py-2.5 !px-5 !text-sm !rounded-lg transition-all duration-200 ${
                scrolled
                  ? ""
                  : "shadow-[0_4px_12px_rgba(0,107,255,0.3)] hover:shadow-[0_4px_18px_rgba(0,107,255,0.5)] hover:-translate-y-0.5"
              }`}
            >
              Começar Agora
            </a>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden flex flex-col items-center justify-center w-10 h-10 gap-1.5 cursor-pointer animate-none"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            <motion.span
              animate={mobileOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
              className={`block w-5 h-0.5 rounded-full origin-center transition-colors duration-200 ${
                scrolled || mobileOpen ? "bg-landing-text" : "bg-white"
              }`}
            />
            <motion.span
              animate={mobileOpen ? { opacity: 0 } : { opacity: 1 }}
              className={`block w-5 h-0.5 rounded-full transition-colors duration-200 ${
                scrolled || mobileOpen ? "bg-landing-text" : "bg-white"
              }`}
            />
            <motion.span
              animate={mobileOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
              className={`block w-5 h-0.5 rounded-full origin-center transition-colors duration-200 ${
                scrolled || mobileOpen ? "bg-landing-text" : "bg-white"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden overflow-hidden border-t border-white/10 bg-slate-950/95 backdrop-blur-xl"
          >
            <div className="px-6 py-5 flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-base font-medium text-landing-text hover:text-brand-blue transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <hr className="border-landing-border" />
              <Link
                href="/login"
                className="text-base font-medium text-landing-text-muted"
              >
                Entrar
              </Link>
              <a href="#planos" className="btn-primary text-center" onClick={() => setMobileOpen(false)}>
                Começar Agora
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
