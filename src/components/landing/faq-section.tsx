'use client';

import * as React from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

const FAQS = [
  {
    question: 'How do I activate my student health account on CampusCare?',
    answer:
      'All matriculated university students have an account pre-provisioned in the system. Click "Student Setup" at the top of this page, enter your university registration number (e.g. ENG/2022/0142) and institutional email address to verify your identity, then set your personal password. Once completed, your student medical profile is ready.',
  },
  {
    question: 'Can I track my queue position without sitting in the clinic waiting bay?',
    answer:
      'Yes! Once the receptionist checks you in, your active queue ticket number (e.g. #A-012) is displayed directly on your Student Health Portal. You can see real-time updates as patients ahead of you are consulted, allowing you to wait in your department, library, or hostel room until your number is called.',
  },
  {
    question: 'Are my medical records confidential from other students or unauthorized staff?',
    answer:
      'Yes, 100%. CampusCare enforces PostgreSQL Row Level Security (RLS) policies directly at the database engine. Only licensed medical officers assigned to your consultation and you (the student) can read your clinical notes and medical history. Other staff members only see operational data necessary for their specific job role.',
  },
  {
    question: 'How does digital prescription collection work at the pharmacy?',
    answer:
      'When your attending doctor completes your consultation, they author a digital prescription with precise dosage, frequency, and instructions. The prescription is dispatched electronically to the dispensary window. You will see an alert on your portal when it is packaged and ready for collection.',
  },
  {
    question: 'How do clinic doctors, receptionists, and pharmacists access their workspaces?',
    answer:
      'Clinic healthcare workers sign in using their official staff credentials via the standard "Sign In" button. CampusCare automatically identifies your authorized clinical role (Doctor, Pharmacist, Receptionist, or Administrator) and directs you straight to your dedicated clinical workspace.',
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center space-y-3 mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
            <HelpCircle className="h-3.5 w-3.5 text-blue-600" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Everything you need to know about navigating the university clinic platform.
          </p>
        </div>

        {/* FAQ List Accordion */}
        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="border border-slate-200 rounded-2xl overflow-hidden transition-all bg-white"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between p-5 text-left font-semibold text-slate-900 hover:text-blue-600 hover:bg-slate-50 transition-colors cursor-pointer text-sm sm:text-base gap-4"
                  aria-expanded={isOpen}
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-blue-600' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 animate-fade-in bg-slate-50/50">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
