import * as React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({
  children,
  className,
  hover = false,
  padding = 'md',
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'card',
        hover && 'card-hover',
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-start justify-between mb-4', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-base font-semibold text-slate-800', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-slate-500 mt-0.5', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-between pt-4 mt-4 border-t border-slate-100',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Stat card for dashboards — displays a metric with label and optional trend.
 */
interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: { value: number; positive?: boolean };
  className?: string;
}

export function StatCard({
  label,
  value,
  description,
  icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-label mb-1">{label}</p>
          <p className="text-3xl font-bold text-slate-900 leading-none mb-1">
            {value}
          </p>
          {description && (
            <p className="text-caption mt-1">{description}</p>
          )}
          {trend !== undefined && (
            <p
              className={cn(
                'text-xs font-medium mt-2',
                trend.positive !== false ? 'text-emerald-600' : 'text-rose-600'
              )}
            >
              {trend.value > 0 ? '+' : ''}
              {trend.value}% vs yesterday
            </p>
          )}
        </div>
        {icon && (
          <div className="shrink-0 ml-4 p-2.5 bg-slate-100 rounded-xl text-slate-600">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
