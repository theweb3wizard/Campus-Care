'use client';

import * as React from 'react';
import { UserCheck, Smartphone, Stethoscope, Pill } from 'lucide-react';

const STEPS = [
  {
    step: '01',
    title: 'Fast Check-in & Triage',
    icon: <UserCheck className="h-6 w-6 text-blue-600" />,
    description:
      'Arrive at the clinic reception. Staff instantly verify your university registration number and generate your digital queue ticket with emergency triage level.',
  },
  {
    step: '02',
    title: 'Live Queue Tracking',
    icon: <Smartphone className="h-6 w-6 text-teal-600" />,
    description:
      'Wait comfortably in the clinic or follow your queue position on your phone. Realtime updates notify you the second you are called to a consultation room.',
  },
  {
    step: '03',
    title: 'Doctor Consultation',
    icon: <Stethoscope className="h-6 w-6 text-indigo-600" />,
    description:
      'Meet your attending physician. Medical history, allergy warnings, and vital signs are updated seamlessly in your permanent electronic medical record.',
  },
  {
    step: '04',
    title: 'Instant Pharmacy Dispensing',
    icon: <Pill className="h-6 w-6 text-emerald-600" />,
    description:
      'Your digital prescription is already waiting at the pharmacy dispensary window. Collect your medication and view dosage instructions anytime on your portal.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-slate-50 border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
            Patient Journey
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            How CampusCare Works for Students
          </h2>
          <p className="text-base text-slate-600">
            A seamless, dignified healthcare experience from clinic entry to pharmacy checkout.
          </p>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {STEPS.map((s, index) => (
            <div
              key={index}
              className="relative bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                    {s.icon}
                  </div>
                  <span className="text-3xl font-black text-slate-200 font-mono">
                    {s.step}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-2">
                  {s.title}
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {s.description}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                <span>Step {index + 1} of 4</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
