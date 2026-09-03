import * as React from 'react';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex flex-col">
      {/* Top brand bar */}
      <header className="px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5 text-white"
              aria-hidden="true"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M12 7v10M7 12h10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <span className="text-lg font-bold text-slate-900 tracking-tight">
              {APP_NAME}
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8">
            {/* Heading */}
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-slate-500 mt-1.5">{subtitle}</p>
              )}
            </div>

            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center">
        <p className="text-xs text-slate-400">{APP_TAGLINE}</p>
      </footer>
    </div>
  );
}
