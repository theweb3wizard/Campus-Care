import Link from 'next/link';
import { APP_NAME } from '@/lib/constants';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center">
      {/* Logo */}
      <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center mb-6">
        <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-white" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
            stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      <p className="text-sm font-semibold text-blue-600 mb-2 tracking-wide uppercase">
        404
      </p>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Page not found</h1>
      <p className="text-slate-500 text-sm max-w-xs mb-8">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        Back to {APP_NAME}
      </Link>
    </div>
  );
}
