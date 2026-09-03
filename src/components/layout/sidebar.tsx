'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  ClipboardList,
  Stethoscope,
  FlaskConical,
  Settings,
  BarChart3,
  Bell,
  LogOut,
  Menu,
  X,
  UserCircle,
  Pill,
  Package,
  CalendarDays,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/lib/constants';
import type { UserRole } from '@/types/roles';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/features/notifications/components/notification-bell';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  exact?: boolean;
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  student: [
    { label: 'My Health', href: '/student', icon: <Home className="h-4 w-4" />, exact: true },
    { label: 'Appointments', href: '/student/appointments', icon: <CalendarDays className="h-4 w-4" /> },
    { label: 'Prescriptions', href: '/student/prescriptions', icon: <Pill className="h-4 w-4" /> },
    { label: 'Notifications', href: '/student/notifications', icon: <Bell className="h-4 w-4" /> },
    { label: 'My Profile', href: '/student/profile', icon: <UserCircle className="h-4 w-4" /> },
  ],
  receptionist: [
    { label: 'Dashboard', href: '/reception', icon: <Home className="h-4 w-4" />, exact: true },
    { label: 'Patient Search', href: '/reception/search', icon: <Users className="h-4 w-4" /> },
    { label: 'Queue', href: '/reception/queue', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Walk-in Check-in', href: '/reception/check-in', icon: <UserCircle className="h-4 w-4" /> },
  ],
  doctor: [
    { label: 'Dashboard', href: '/doctor', icon: <Home className="h-4 w-4" />, exact: true },
    { label: 'Queue', href: '/doctor/queue', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Consultations', href: '/doctor/consultation', icon: <Stethoscope className="h-4 w-4" /> },
  ],
  pharmacist: [
    { label: 'Dashboard', href: '/pharmacy', icon: <Home className="h-4 w-4" />, exact: true },
    { label: 'Prescriptions', href: '/pharmacy/prescriptions', icon: <Pill className="h-4 w-4" /> },
    { label: 'Inventory', href: '/pharmacy/inventory', icon: <Package className="h-4 w-4" /> },
  ],
  admin: [
    { label: 'Dashboard', href: '/admin', icon: <Home className="h-4 w-4" />, exact: true },
    { label: 'Staff', href: '/admin/staff', icon: <Users className="h-4 w-4" /> },
    { label: 'Settings', href: '/admin/settings', icon: <Settings className="h-4 w-4" /> },
    { label: 'Audit Log', href: '/admin/audit', icon: <ShieldCheck className="h-4 w-4" /> },
  ],
  management: [
    { label: 'Overview', href: '/management', icon: <BarChart3 className="h-4 w-4" />, exact: true },
    { label: 'Analytics', href: '/management/analytics', icon: <FlaskConical className="h-4 w-4" /> },
  ],
};

const ROLE_LABELS: Record<UserRole, { name: string; color: string }> = {
  student: { name: 'Student', color: 'bg-blue-100 text-blue-700' },
  receptionist: { name: 'Receptionist', color: 'bg-violet-100 text-violet-700' },
  doctor: { name: 'Doctor', color: 'bg-teal-100 text-teal-700' },
  pharmacist: { name: 'Pharmacist', color: 'bg-cyan-100 text-cyan-700' },
  admin: { name: 'Administrator', color: 'bg-slate-100 text-slate-700' },
  management: { name: 'Management', color: 'bg-amber-100 text-amber-700' },
};

// Roles that have in-app notifications
const NOTIFICATION_HREF: Partial<Record<UserRole, string>> = {
  student: '/student/notifications',
};

interface SidebarProps {
  role: UserRole;
  userName: string;
  profileId: string;
  onSignOut: () => Promise<void>;
}

export function Sidebar({ role, userName, profileId, onSignOut }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const navItems = NAV_ITEMS[role] ?? [];
  const roleInfo = ROLE_LABELS[role];
  const notificationHref = NOTIFICATION_HREF[role];

  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
                stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-base font-bold text-slate-900 tracking-tight">{APP_NAME}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn('nav-item', isActive(item) && 'nav-item-active')}
          >
            <span className="shrink-0">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{userName}</p>
            <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded-full', roleInfo.color)}>
              {roleInfo.name}
            </span>
          </div>
          {/* Notification bell for student sidebar */}
          {notificationHref && (
            <NotificationBell profileId={profileId} href={notificationHref} />
          )}
        </div>

        <button
          onClick={onSignOut}
          className="nav-item w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 h-screen bg-white border-r border-slate-200 sticky top-0 shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
                stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-base font-bold text-slate-900">{APP_NAME}</span>
        </div>
        <div className="flex items-center gap-2">
          {notificationHref && (
            <NotificationBell profileId={profileId} href={notificationHref} />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 h-screen w-64 bg-white z-50 shadow-xl">
            <div className="absolute top-4 right-4">
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
                <X className="h-5 w-5" />
              </Button>
            </div>
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
