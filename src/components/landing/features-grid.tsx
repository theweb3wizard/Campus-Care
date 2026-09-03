'use client';

import * as React from 'react';
import {
  Clock,
  ShieldCheck,
  Pill,
  ClipboardCheck,
  PackageCheck,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

const FEATURES = [
  {
    icon: <Clock className="h-6 w-6 text-blue-600" />,
    iconBg: 'bg-blue-50 border-blue-200',
    title: 'Live Queue & Smart Triage',
    description:
      'Students track their exact queue number and wait time in real time from their hostel rooms or libraries. No more suffocating in crowded clinic waiting bays.',
    tag: 'Real-Time Sync',
  },
  {
    icon: <ShieldCheck className="h-6 w-6 text-teal-600" />,
    iconBg: 'bg-teal-50 border-teal-200',
    title: 'Confidential Electronic Health Records',
    description:
      'Zero lost paper files. Comprehensive medical consultation history, diagnoses, and lab results are secured with database-level Row Level Security.',
    tag: '100% Confidential',
  },
  {
    icon: <Pill className="h-6 w-6 text-indigo-600" />,
    iconBg: 'bg-indigo-50 border-indigo-200',
    title: 'Digital Prescription Composer',
    description:
      'Eliminate handwriting errors. Doctors compose clear digital prescriptions with standardized dosage and frequency presets, delivered instantly to the pharmacy.',
    tag: 'Direct to Pharmacy',
  },
  {
    icon: <ClipboardCheck className="h-6 w-6 text-violet-600" />,
    iconBg: 'bg-violet-50 border-violet-200',
    title: 'Rapid Front-Desk Check-In',
    description:
      'Receptionists verify students via institutional matric numbers in seconds. Automatic sequential queue tickets are generated with instant physician assignment.',
    tag: 'Sub-second Search',
  },
  {
    icon: <PackageCheck className="h-6 w-6 text-emerald-600" />,
    iconBg: 'bg-emerald-50 border-emerald-200',
    title: 'Smart Pharmacy Inventory',
    description:
      'Automatic inventory decrements when prescriptions are dispensed. Automated threshold notifications alert pharmacists before life-saving drugs run out.',
    tag: 'Auto-decrementing',
  },
  {
    icon: <TrendingUp className="h-6 w-6 text-amber-600" />,
    iconBg: 'bg-amber-50 border-amber-200',
    title: 'Health Analytics & Audit Logs',
    description:
      'University health directors access high-level, anonymized operational metrics: visit volumes, dispensing ratios, peak clinic hours, and comprehensive security audit trails.',
    tag: 'Executive Insights',
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="py-24 relative overflow-hidden bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-teal-600" />
            <span>Engineered for Campus Healthcare</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Everything Required to Run a Modern University Clinic
          </h2>
          <p className="text-base text-slate-600">
            From the first triage check-in to doctor consultations and final pharmacy dispensing, CampusCare is designed from the ground up for university health centers.
          </p>
        </div>

        {/* Features 3x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((feature, index) => (
            <div
              key={index}
              className="group relative bg-white rounded-2xl p-7 border border-slate-200 shadow-xs hover:shadow-xl hover:border-slate-300 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div
                    className={`h-12 w-12 rounded-xl flex items-center justify-center border shadow-xs ${feature.iconBg}`}
                  >
                    {feature.icon}
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {feature.tag}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {feature.title}
                </h3>

                <p className="text-sm text-slate-600 leading-relaxed font-normal">
                  {feature.description}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-1 text-xs font-semibold text-blue-600">
                <span>Enterprise grade security & reliability</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
