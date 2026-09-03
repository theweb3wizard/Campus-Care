'use client';

import * as React from 'react';
import Link from 'next/link';
import { ShieldCheck, Heart, Phone, Mail, MapPin } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

export function LandingFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Col 1: Brand & Purpose */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white" aria-hidden="true">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </div>
              <span className="text-base font-bold text-white tracking-tight">{APP_NAME}</span>
            </div>

            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              Official University Health Services (UHS) clinical management software. Providing dignified, real-time medical triage, electronic health records, and integrated pharmacy dispensing.
            </p>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
              <ShieldCheck className="h-4 w-4 text-teal-400" />
              <span>Protected by PostgreSQL Row Level Security (RLS)</span>
            </div>
          </div>

          {/* Col 2: Clinical Portals */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Portals</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Student Portal
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Doctor Workspace
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Pharmacy Dispensary
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Reception Triage
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Health Administration
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Student Services */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Students</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/onboarding" className="hover:text-white transition-colors">
                  First-Time Account Setup
                </Link>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  How Triage Works
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition-colors">
                  Student Health FAQs
                </a>
              </li>
              <li>
                <a href="#emergency" className="hover:text-rose-400 transition-colors">
                  Emergency Protocols
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Clinic Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Contact & Hours</h4>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <span>Ambulance: 0800-CAMPUS-CARE</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <span>uhs@university.edu.ng</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
                <span>UHS Medical Complex, Gate 2</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>
            &copy; {new Date().getFullYear()} {APP_NAME} — Directorate of University Health Services. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-400 transition-colors">Confidential Medical Records</span>
            <span>·</span>
            <span className="hover:text-slate-400 transition-colors">HIPAA / NDPR Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
