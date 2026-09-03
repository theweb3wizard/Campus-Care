import * as React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default:  'bg-slate-100 text-slate-600',
  primary:  'bg-blue-100 text-blue-700',
  success:  'bg-emerald-100 text-emerald-700',
  warning:  'bg-amber-100 text-amber-700',
  danger:   'bg-rose-100 text-rose-700',
  info:     'bg-cyan-100 text-cyan-700',
  neutral:  'bg-slate-100 text-slate-500',
};

const dotColors: Record<BadgeVariant, string> = {
  default:  'bg-slate-400',
  primary:  'bg-blue-500',
  success:  'bg-emerald-500',
  warning:  'bg-amber-500',
  danger:   'bg-rose-500',
  info:     'bg-cyan-500',
  neutral:  'bg-slate-400',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        variantClasses[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotColors[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

/**
 * Pre-composed status badge — pass a className directly for custom colors.
 * Used throughout the app for visit/queue/prescription status.
 */
export function StatusBadge({
  label,
  colorClass,
  dot = true,
}: {
  label: string;
  colorClass: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap',
        colorClass
      )}
    >
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70 shrink-0" />
      )}
      {label}
    </span>
  );
}
