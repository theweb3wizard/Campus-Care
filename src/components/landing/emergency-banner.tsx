'use client';

import * as React from 'react';
import { PhoneCall, AlertOctagon, Clock, MapPin, Ambulance, HeartPulse } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EmergencyBanner() {
  return (
    <section id="emergency" className="py-16 bg-gradient-to-b from-rose-50/50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-rose-600 via-rose-700 to-red-800 rounded-3xl p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden">
          {/* Subtle background emergency icon watermark */}
          <HeartPulse
            className="absolute -right-12 -bottom-12 h-80 w-80 text-rose-500/20 pointer-events-none"
            aria-hidden="true"
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Left: Emergency Alert */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-500/40 border border-rose-400 text-xs font-bold uppercase tracking-wider text-white">
                <AlertOctagon className="h-4 w-4 text-rose-200 animate-pulse" />
                <span>24/7 Campus Medical Emergency Service</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Facing a Medical Emergency on Campus?
              </h2>

              <p className="text-sm sm:text-base text-rose-100 max-w-xl leading-relaxed">
                For acute trauma, severe asthma attacks, collapse, or urgent distress, do not wait in standard clinic queues. Contact the campus ambulance dispatch or proceed immediately to Emergency Ward 1.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <a
                  href="tel:0800-226787-2273"
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-white text-rose-700 font-bold text-base hover:bg-rose-50 shadow-lg shadow-black/10 transition-all cursor-pointer"
                >
                  <PhoneCall className="h-5 w-5 text-rose-600" />
                  <span>Call 0800-CAMPUS-CARE</span>
                </a>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-rose-200">
                  <Ambulance className="h-4 w-4 shrink-0 text-white" />
                  <span>Campus Ambulance Standby 24 Hours</span>
                </div>
              </div>
            </div>

            {/* Right: Operating Hours & Location Card */}
            <div className="lg:col-span-5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Clock className="h-4 w-4 text-rose-200" />
                <span>Clinic Operating Schedule</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-white/15">
                  <span className="text-rose-100 font-medium">Monday — Friday</span>
                  <span className="font-bold font-mono text-white">08:00 AM — 08:00 PM</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-white/15">
                  <span className="text-rose-100 font-medium">Saturday — Sunday</span>
                  <span className="font-bold font-mono text-white">10:00 AM — 04:00 PM</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-white/15">
                  <span className="text-rose-100 font-medium">Emergency Ward</span>
                  <span className="font-bold font-mono text-emerald-300">24 / 7 Active</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-rose-100 font-medium">Pharmacy Window</span>
                  <span className="font-bold font-mono text-white">08:00 AM — 09:00 PM</span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/15 flex items-center gap-2 text-xs text-rose-200">
                <MapPin className="h-4 w-4 shrink-0 text-white" />
                <span>University Health Services Complex, Medical Crescent (Gate 2)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
