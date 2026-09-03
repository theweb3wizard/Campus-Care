'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu, X, ArrowRight, Activity, ShieldCheck } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';
import { Button } from '@/components/ui/button';

export function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 bg-gradient-to-br from-blue-600 to-teal-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
              {APP_NAME}
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Live status" />
            </span>
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
              University Health Services
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#features" className="hover:text-blue-600 transition-colors">
            Features
          </a>
          <a href="#portals" className="hover:text-blue-600 transition-colors">
            Clinical Portals
          </a>
          <a href="#how-it-works" className="hover:text-blue-600 transition-colors">
            How It Works
          </a>
          <a href="#emergency" className="hover:text-rose-600 font-semibold transition-colors flex items-center gap-1">
            <Activity className="h-3.5 w-3.5 text-rose-500" />
            Emergency & Hours
          </a>
          <a href="#faq" className="hover:text-blue-600 transition-colors">
            FAQ
          </a>
        </nav>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <Link href="/onboarding">
            <Button variant="ghost" size="sm" className="text-slate-700 hover:text-blue-600">
              Student Setup
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="primary" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Sign In
            </Button>
          </Link>
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center gap-2">
          <Link href="/login" className="sm:hidden">
            <Button variant="primary" size="sm">
              Sign In
            </Button>
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-6 space-y-4 animate-fade-in shadow-lg">
          <nav className="flex flex-col space-y-3 pt-2">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-slate-700 font-medium hover:bg-slate-100 transition-colors"
            >
              Features
            </a>
            <a
              href="#portals"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-slate-700 font-medium hover:bg-slate-100 transition-colors"
            >
              Clinical Portals
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-slate-700 font-medium hover:bg-slate-100 transition-colors"
            >
              How It Works
            </a>
            <a
              href="#emergency"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-rose-600 font-semibold hover:bg-rose-50 transition-colors flex items-center gap-2"
            >
              <Activity className="h-4 w-4 text-rose-500" />
              Emergency & Clinic Hours
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-slate-700 font-medium hover:bg-slate-100 transition-colors"
            >
              Frequently Asked Questions
            </a>
          </nav>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
            <Link href="/onboarding" onClick={() => setMobileMenuOpen(false)} className="w-full">
              <Button variant="outline" size="lg" className="w-full justify-center" leftIcon={<ShieldCheck className="h-4 w-4" />}>
                First-Time Student Setup
              </Button>
            </Link>
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="w-full">
              <Button variant="primary" size="lg" className="w-full justify-center" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Sign In to Portal
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
