import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { createServerClient } from '@supabase/ssr';
import type { UserRole } from '@/types/roles';
import { ROLE_HOME_ROUTES } from '@/lib/constants';

// Routes accessible without authentication
const PUBLIC_ROUTES = ['/login', '/onboarding'];

// Route prefix → required role(s)
const PROTECTED_ROUTES: { prefix: string; roles: UserRole[] }[] = [
  { prefix: '/student', roles: ['student'] },
  { prefix: '/reception', roles: ['receptionist'] },
  { prefix: '/doctor', roles: ['doctor'] },
  { prefix: '/pharmacy', roles: ['pharmacist'] },
  { prefix: '/admin', roles: ['admin'] },
  { prefix: '/management', roles: ['management', 'admin'] },
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Refresh session cookies
  const { supabaseResponse, user } = await updateSession(request);

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return supabaseResponse;
  }

  const hasEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  // Public routes — redirect authenticated users to their home
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    if (user && hasEnv) {
      // Fetch role to redirect correctly
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll: () => request.cookies.getAll(),
            setAll: () => {},
          },
        }
      );

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role) {
        const homeRoute = ROLE_HOME_ROUTES[profile.role as UserRole];
        return NextResponse.redirect(new URL(homeRoute, request.url));
      }
    }
    return supabaseResponse;
  }

  // Root route — render landing page for unauthenticated visitors, redirect logged-in users to their role home
  if (pathname === '/') {
    if (!user || !hasEnv) {
      return supabaseResponse;
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {},
        },
      }
    );

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role) {
      const homeRoute = ROLE_HOME_ROUTES[profile.role as UserRole];
      return NextResponse.redirect(new URL(homeRoute, request.url));
    }

    return supabaseResponse;
  }

  // Protected routes — require auth + correct role
  const matchedRoute = PROTECTED_ROUTES.find((r) =>
    pathname.startsWith(r.prefix)
  );

  if (matchedRoute) {
    if (!user || !hasEnv) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verify role at database level
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {},
        },
      }
    );

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (!profile || profile.status === 'inactive' || profile.status === 'suspended') {
      return NextResponse.redirect(new URL('/login?error=account_inactive', request.url));
    }

    if (!matchedRoute.roles.includes(profile.role as UserRole)) {
      // Redirect to their actual home
      const homeRoute = ROLE_HOME_ROUTES[profile.role as UserRole];
      return NextResponse.redirect(new URL(homeRoute, request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
