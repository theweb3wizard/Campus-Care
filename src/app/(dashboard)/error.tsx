'use client';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: Props) {
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="h-12 w-12 bg-rose-50 rounded-xl flex items-center justify-center mb-4">
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-rose-500" aria-hidden="true">
          <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <h2 className="text-base font-semibold text-slate-800 mb-1">Failed to load</h2>
      <p className="text-sm text-slate-500 max-w-xs mb-5">
        {error.message ?? 'Something went wrong loading this page.'}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
