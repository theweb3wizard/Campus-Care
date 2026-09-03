'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Stethoscope,
  Pill,
  ClipboardList,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Clock,
  AlertTriangle,
  FileText,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type RoleTab = 'student' | 'doctor' | 'pharmacy' | 'reception' | 'management';

interface PortalInfo {
  id: RoleTab;
  title: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  subtitle: string;
  description: string;
  highlights: string[];
  ctaText: string;
  ctaHref: string;
  mockup: React.ReactNode;
}

export function PortalsShowcase() {
  const [activeTab, setActiveTab] = React.useState<RoleTab>('student');

  const portals: Record<RoleTab, PortalInfo> = {
    student: {
      id: 'student',
      title: 'Student Health Portal',
      badge: 'Student Experience',
      badgeColor: 'bg-blue-100 text-blue-700',
      icon: <GraduationCap className="h-5 w-5" />,
      subtitle: 'Personalized clinic access directly from your phone or laptop',
      description:
        'Students can monitor their live queue ticket without standing in crowded waiting rooms, access full medical consultation history, view prescribed medications, and check clinic registration files.',
      highlights: [
        'Live queue ticket advancement with estimated call time',
        'Direct alerts when doctor sends medication to the dispensary',
        'Official clinic registration with blood group, genotype & allergy alerts',
        'Schedule upcoming clinic follow-up appointments easily',
      ],
      ctaText: 'Access Student Portal',
      ctaHref: '/login',
      mockup: (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <p className="text-xs text-slate-400 font-medium">Student Dashboard</p>
              <h4 className="text-sm font-bold text-slate-900">Hello, Tobi 👋</h4>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
              Active Visit
            </span>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-medium">Your Queue Ticket</span>
              <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                Called
              </span>
            </div>
            <div className="text-3xl font-extrabold font-mono text-slate-900">#A-012</div>
            <p className="text-xs text-slate-600 mt-2">
              Proceed to Consultation Room 1 · Dr. Adebayo
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Registration Number</span>
            <span className="font-mono font-bold text-slate-800">ENG/2022/0142</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Clinic File Number</span>
            <span className="font-mono font-bold text-slate-800">UHS-2024-0089</span>
          </div>
        </div>
      ),
    },
    doctor: {
      id: 'doctor',
      title: 'Doctor & Clinical Workspace',
      badge: 'Physicians & Medical Officers',
      badgeColor: 'bg-teal-100 text-teal-700',
      icon: <Stethoscope className="h-5 w-5" />,
      subtitle: 'Streamlined consultation notes, vitals, and electronic prescriptions',
      description:
        'Designed specifically for university physicians. Manage waiting patients, review medical history with critical allergy warnings, record vitals, and compose prescriptions in under 60 seconds.',
      highlights: [
        'Single-click consultation initiation and queue advancement',
        'Automatic allergy alerts right before prescription authoring',
        'Integrated formulary search with unit and dosage presets',
        'Secure upsert of diagnoses, assessments, and follow-up plans',
      ],
      ctaText: 'Doctor Workspace Sign In',
      ctaHref: '/login',
      mockup: (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <p className="text-xs text-slate-400 font-medium">Clinical Consultation</p>
              <h4 className="text-sm font-bold text-slate-900">Patient: Sarah Okon</h4>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">
              In Consultation
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span className="text-xs font-semibold text-rose-700">
              Known Allergy: Penicillin & Sulfa Drugs
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 bg-slate-50 rounded-lg">
              <span className="text-slate-400 block text-[10px]">BP</span>
              <span className="font-bold text-slate-800">118/78</span>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <span className="text-slate-400 block text-[10px]">Pulse</span>
              <span className="font-bold text-slate-800">72 bpm</span>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <span className="text-slate-400 block text-[10px]">Temp</span>
              <span className="font-bold text-slate-800">36.8°C</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
            <p className="font-semibold text-slate-800">Primary Diagnosis</p>
            <p className="text-slate-600">Acute viral nasopharyngitis · Prescribed paracetamol & rest</p>
          </div>
        </div>
      ),
    },
    pharmacy: {
      id: 'pharmacy',
      title: 'Dispensary & Pharmacy',
      badge: 'Clinical Pharmacists',
      badgeColor: 'bg-cyan-100 text-cyan-700',
      icon: <Pill className="h-5 w-5" />,
      subtitle: 'Real-time prescription fulfillment with automated inventory control',
      description:
        'Pharmacists receive prescriptions the moment the consulting doctor clicks finalize. Decrements inventory automatically, provides out-of-stock guards, and logs immutable transaction audit records.',
      highlights: [
        'Live pending prescriptions queue powered by Supabase Realtime',
        'Per-item dispensing verification with partial fulfillment support',
        'Automated stock level tracking with critical low-stock alerts',
        'One-click batch restock modal with transaction history recording',
      ],
      ctaText: 'Pharmacy Sign In',
      ctaHref: '/login',
      mockup: (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <p className="text-xs text-slate-400 font-medium">Dispensary Order #RX-104</p>
              <h4 className="text-sm font-bold text-slate-900">Queue #A-012</h4>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
              Ready to Dispense
            </span>
          </div>

          <div className="space-y-2">
            <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-800">Amoxicillin 500mg</p>
                <p className="text-slate-500">1 cap 3x daily · 5 days</p>
              </div>
              <span className="text-emerald-700 font-semibold">15 caps · In Stock</span>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-800">Paracetamol 500mg</p>
                <p className="text-slate-500">2 tabs 3x daily · 3 days</p>
              </div>
              <span className="text-emerald-700 font-semibold">18 tabs · In Stock</span>
            </div>
          </div>

          <div className="pt-2 flex justify-between items-center text-xs text-slate-500">
            <span>Inventory auto-decrement</span>
            <span className="font-bold text-emerald-600">✓ Synchronized</span>
          </div>
        </div>
      ),
    },
    reception: {
      id: 'reception',
      title: 'Reception & Triage Desk',
      badge: 'Clinic Front Desk',
      badgeColor: 'bg-violet-100 text-violet-700',
      icon: <ClipboardList className="h-5 w-5" />,
      subtitle: 'Fast check-in, registration lookup, and real-time waiting room control',
      description:
        'Front-desk officers can search students by name, email, or matric number within milliseconds. Seamlessly issue walk-in queue tickets and assign patients to available clinical consulting rooms.',
      highlights: [
        'Instant student lookup with debounced search and active profile linking',
        'Automatic ticket number generator (A-001... sequential series)',
        'Live overhead queue display support for waiting rooms',
        'Complete clinic registration flow: blood group, genotype & allergies',
      ],
      ctaText: 'Reception Sign In',
      ctaHref: '/login',
      mockup: (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <p className="text-xs text-slate-400 font-medium">Walk-in Triage</p>
              <h4 className="text-sm font-bold text-slate-900">Check-in Counter 1</h4>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
              Live Queue: 6 Waiting
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-400 font-medium">Search Patient</span>
            <div className="text-xs font-medium text-slate-800 mt-1">Murtala Khalid (ENG/2021/045)</div>
            <span className="text-[10px] text-emerald-600 font-bold">✓ Registered UHS Student</span>
          </div>

          <div className="p-3 bg-violet-50 rounded-xl border border-violet-200 text-center">
            <span className="text-xs text-violet-700 font-medium">Ticket Issued</span>
            <div className="text-2xl font-black font-mono text-violet-900">#A-013</div>
            <p className="text-[11px] text-violet-600 mt-0.5">Assigned to General Waiting</p>
          </div>
        </div>
      ),
    },
    management: {
      id: 'management',
      title: 'Management & Analytics',
      badge: 'Health Services Administration',
      badgeColor: 'bg-amber-100 text-amber-700',
      icon: <BarChart3 className="h-5 w-5" />,
      subtitle: 'High-level operational metrics and privacy-first clinical insights',
      description:
        'University health directors and administrators gain visibility into patient volume trends, average triage duration, prescription fulfillment ratios, and drug inventory movements.',
      highlights: [
        'Aggregated 30-day visit trends with pure CSS chart visualizations',
        'Prescription dispensing success rate and stockout frequency',
        'Staff account management with role-based access control',
        'Complete audit log viewer for clinical data compliance',
      ],
      ctaText: 'Management Sign In',
      ctaHref: '/login',
      mockup: (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <p className="text-xs text-slate-400 font-medium">UHS Executive Summary</p>
              <h4 className="text-sm font-bold text-slate-900">Clinic Operations</h4>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
              Healthy
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 text-[10px] uppercase font-bold">Total Visits (30d)</span>
              <p className="text-xl font-bold text-slate-900">1,248</p>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 text-[10px] uppercase font-bold">Dispensing Rate</span>
              <p className="text-xl font-bold text-emerald-600">96.4%</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs font-semibold text-slate-700 mb-1">Peak Consultation Hours</p>
            <div className="flex items-end gap-1.5 h-12 pt-2">
              <div className="flex-1 bg-blue-200 rounded-t h-4" />
              <div className="flex-1 bg-blue-300 rounded-t h-7" />
              <div className="flex-1 bg-blue-600 rounded-t h-11" />
              <div className="flex-1 bg-blue-500 rounded-t h-9" />
              <div className="flex-1 bg-blue-300 rounded-t h-5" />
            </div>
            <div className="flex justify-between text-[9px] text-slate-400 mt-1">
              <span>9am</span>
              <span>11am</span>
              <span>1pm</span>
              <span>3pm</span>
              <span>5pm</span>
            </div>
          </div>
        </div>
      ),
    },
  };

  const current = portals[activeTab];

  return (
    <section id="portals" className="py-20 bg-slate-50/70 border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
            Tailored Roles & Dedicated Workspaces
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Purpose-Built Portals for Every Member of Campus Health
          </h2>
          <p className="text-base text-slate-600">
            Whether you are a student seeking immediate medical attention or a clinical pharmacist managing medications, CampusCare provides a customized, focused interface.
          </p>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-4 gap-2 no-scrollbar">
          {(Object.keys(portals) as RoleTab[]).map((tabKey) => {
            const tab = portals[tabKey];
            const isActive = activeTab === tabKey;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {tab.icon}
                <span>{tab.title}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Box */}
        <div className="mt-8 bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-10 lg:p-12 transition-all">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left: Role Details & Highlights */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-2">
                <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${current.badgeColor}`}>
                  {current.badge}
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {current.title}
                </h3>
                <p className="text-sm sm:text-base font-medium text-slate-600">
                  {current.subtitle}
                </p>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                {current.description}
              </p>

              <div className="space-y-3 pt-2">
                {current.highlights.map((highlight, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700 font-medium">{highlight}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex items-center gap-4">
                <Link href={current.ctaHref}>
                  <Button variant="primary" size="md" rightIcon={<ArrowRight className="h-4 w-4" />}>
                    {current.ctaText}
                  </Button>
                </Link>
                <Link href="/onboarding" className="text-xs font-semibold text-slate-500 hover:text-slate-800">
                  First time? Set up account &rarr;
                </Link>
              </div>
            </div>

            {/* Right: Live Interactive Mockup */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-sm">
                {current.mockup}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
