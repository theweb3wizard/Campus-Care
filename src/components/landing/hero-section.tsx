'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ShieldCheck,
  Clock,
  Stethoscope,
  Pill,
  Users,
  CheckCircle2,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LandingHero() {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32">
      {/* Ambient background glows */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-tr from-blue-400/20 via-teal-300/20 to-indigo-400/10 blur-3xl -z-10 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -top-24 right-0 w-96 h-96 bg-teal-400/15 rounded-full blur-3xl -z-10 pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headlines & CTAs */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-6">
            {/* Status Announcement Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold shadow-xs">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              <span>Official University Health Services Platform</span>
              <span className="text-blue-300">|</span>
              <span className="text-blue-700 hidden sm:inline">Live Queue Active</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Modern Healthcare for Campus Life —{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-teal-600 to-indigo-600">
                Fast, Dignified, Connected.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Say goodbye to crowded clinic corridors, missing physical folders, and dispensary delays.
              CampusCare seamlessly connects students, medical officers, clinic reception, and pharmacy
              dispensaries in real time.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
              <Link href="/login" className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto px-7 py-3.5 text-base shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 transition-all cursor-pointer"
                  rightIcon={<ArrowRight className="h-5 w-5" />}
                >
                  Access Student Portal
                </Button>
              </Link>
              <Link href="/onboarding" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto px-6 py-3.5 text-base border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                  leftIcon={<ShieldCheck className="h-5 w-5 text-teal-600" />}
                >
                  First-Time Student Setup
                </Button>
              </Link>
            </div>

            {/* Staff shortcut hint */}
            <div className="pt-1 text-xs text-slate-500 flex items-center justify-center lg:justify-start gap-2">
              <span>Are you a Doctor, Nurse, Pharmacist, or Clinic Admin?</span>
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2">
                Staff Sign In &rarr;
              </Link>
            </div>

            {/* Trust Proof Badges */}
            <div className="pt-6 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-3 gap-4 text-left">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Zero Paper Files</p>
                  <p className="text-[11px] text-slate-500">100% Digital EMR</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Live Queue Tracking</p>
                  <p className="text-[11px] text-slate-500">Track from hostel</p>
                </div>
              </div>
              <div className="col-span-2 sm:col-span-1 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Secure & Confidential</p>
                  <p className="text-[11px] text-slate-500">Role-based RLS</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Clinic Mockup Card */}
          <div className="lg:col-span-5 relative">
            {/* Gradient backdrop card glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-teal-500 rounded-3xl blur-md opacity-30 group-hover:opacity-100 transition duration-1000 -z-10" />

            <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/90 shadow-2xl p-5 sm:p-6 space-y-5">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">University Clinic Live Status</h2>
                    <p className="text-[11px] text-slate-400">Campus Health Center • Today</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Open · Accepting Patients
                </span>
              </div>

              {/* Real-time stats row */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Avg. Wait</p>
                  <p className="text-lg font-extrabold text-blue-600 mt-0.5">~12m</p>
                  <p className="text-[10px] text-emerald-600 font-medium">Fast triage</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Doctors</p>
                  <p className="text-lg font-extrabold text-teal-600 mt-0.5">4 Active</p>
                  <p className="text-[10px] text-slate-500 font-medium">Consulting</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Pharmacy</p>
                  <p className="text-lg font-extrabold text-indigo-600 mt-0.5">98%</p>
                  <p className="text-[10px] text-slate-500 font-medium">Stock ready</p>
                </div>
              </div>

              {/* Sample Student Live Ticket Box */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-4 text-white shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-200">
                      Active Student Ticket
                    </span>
                    <div className="text-3xl font-black font-mono tracking-tight mt-0.5">#A-024</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white text-blue-700 shadow-xs">
                    Called to Room 2
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-400/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-blue-100">
                    <Stethoscope className="h-3.5 w-3.5" />
                    <span>Dr. Adebayo • Consultation</span>
                  </div>
                  <span className="font-mono text-blue-200">Est. 2 mins</span>
                </div>
              </div>

              {/* Connected Pharmacy Snippet */}
              <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <Pill className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Prescription Direct-to-Dispensary</p>
                    <p className="text-[11px] text-slate-500">Pick up at Window 1 after consultation</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                  Automated
                </span>
              </div>

              {/* Footer quick link */}
              <div className="text-center pt-1">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <span>Sign in to view your live queue ticket</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
