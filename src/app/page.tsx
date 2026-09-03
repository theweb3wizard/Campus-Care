import type { Metadata } from 'next';
import { LandingNavbar } from '@/components/landing/navbar';
import { LandingHero } from '@/components/landing/hero-section';
import { FeaturesGrid } from '@/components/landing/features-grid';
import { PortalsShowcase } from '@/components/landing/portals-showcase';
import { HowItWorks } from '@/components/landing/how-it-works';
import { EmergencyBanner } from '@/components/landing/emergency-banner';
import { FaqSection } from '@/components/landing/faq-section';
import { LandingFooter } from '@/components/landing/footer';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';

export const metadata: Metadata = {
  title: `${APP_NAME} — University Health Services & Real-time Clinic Operations`,
  description: `${APP_TAGLINE}. Live queue tracking, zero-paper electronic medical records, and integrated pharmacy dispensing for university health centers.`,
};

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Top sticky navigation bar */}
      <LandingNavbar />

      {/* Main landing content */}
      <main className="flex-1">
        {/* Hero with live queue preview card */}
        <LandingHero />

        {/* Feature pillars */}
        <FeaturesGrid />

        {/* Interactive role portals showcase (Students, Doctors, Pharmacy, Reception, Management) */}
        <PortalsShowcase />

        {/* Step-by-step patient journey */}
        <HowItWorks />

        {/* 24/7 Campus Emergency Hotline and Clinic Operating Hours */}
        <EmergencyBanner />

        {/* Frequently Asked Questions */}
        <FaqSection />
      </main>

      {/* Footer with portal shortcuts and compliance notes */}
      <LandingFooter />
    </div>
  );
}
