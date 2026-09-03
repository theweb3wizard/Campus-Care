'use client';

import { useEffect } from 'react';
import { APP_NAME } from '@/lib/constants';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    // Log to monitoring service in production
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="h-12 w-12 bg-rose-100 rounded-xl flex items-center justify-center mb-6">
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-rose-500" aria-hidden="true">
          <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      <h1 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h1>
      <p className="text-sm text-slate-500 max-w-xs mb-8">
        An unexpected error occurred. Our team has been notified. Please try again.
      </p>

      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
        <a
          href="/"
          className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
        >
          Go home
        </a>
      </div>

      {process.env.NODE_ENV === 'development' && error.message && (
        <details className="mt-6 text-left max-w-md w-full">
          <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">
            Error details (dev only)
          </summary>
          <pre className="mt-2 p-3 bg-slate-100 rounded-lg text-xs text-slate-600 overflow-auto">
            {error.message}
            {error.stack && '\n\n' + error.stack}
          </pre>
        </details>
      )}
    </div>
  );
}
