'use client';

import * as React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = React.useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = crypto.randomUUID();
      const duration = toast.duration ?? 4000;
      setToasts((prev) => [...prev, { ...toast, id }]);
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  const success = React.useCallback(
    (title: string, message?: string) =>
      addToast({ type: 'success', title, message }),
    [addToast]
  );
  const error = React.useCallback(
    (title: string, message?: string) =>
      addToast({ type: 'error', title, message, duration: 6000 }),
    [addToast]
  );
  const warning = React.useCallback(
    (title: string, message?: string) =>
      addToast({ type: 'warning', title, message }),
    [addToast]
  );
  const info = React.useCallback(
    (title: string, message?: string) =>
      addToast({ type: 'info', title, message }),
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, success, error, warning, info }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const toastConfig: Record<
  ToastType,
  { icon: React.ReactNode; containerClass: string; iconClass: string }
> = {
  success: {
    icon: <CheckCircle2 className="h-5 w-5" />,
    containerClass: 'border-emerald-200 bg-white',
    iconClass: 'text-emerald-500',
  },
  error: {
    icon: <XCircle className="h-5 w-5" />,
    containerClass: 'border-rose-200 bg-white',
    iconClass: 'text-rose-500',
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5" />,
    containerClass: 'border-amber-200 bg-white',
    iconClass: 'text-amber-500',
  },
  info: {
    icon: <Info className="h-5 w-5" />,
    containerClass: 'border-blue-200 bg-white',
    iconClass: 'text-blue-500',
  },
};

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const config = toastConfig[toast.type];

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'flex items-start gap-3 w-full max-w-sm p-4 rounded-xl border shadow-panel',
        'animate-slide-in',
        config.containerClass
      )}
    >
      <span className={cn('shrink-0 mt-0.5', config.iconClass)}>
        {config.icon}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{toast.title}</p>
        {toast.message && (
          <p className="text-sm text-slate-600 mt-0.5">{toast.message}</p>
        )}
      </div>

      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors mt-0.5"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:right-6 sm:bottom-6 z-[100] flex flex-col gap-2 pointer-events-none items-center sm:items-end"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}
