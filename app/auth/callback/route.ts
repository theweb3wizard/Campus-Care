import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/** Supabase email-link landing: exchange code for session, then go to ?next=. */
export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const code = request.nextUrl.searchParams.get("code");
  const rawNext = request.nextUrl.searchParams.get("next") ?? "/profile";
  // Open-redirect guard: only single-slash relative paths.
  const next = /^\/[^/]/.test(rawNext) || rawNext === "/" ? rawNext : "/profile";

  if (!url || !anon || !code) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const res = NextResponse.redirect(new URL(next, request.url));
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?expired=1", request.url));
  }
  return res;
}
