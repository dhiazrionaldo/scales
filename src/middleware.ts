import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get("cookie") ?? "");
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  let user = null;
  
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;
  } catch (error) {
    // If Supabase connection fails, treat as unauthenticated
    console.error("Middleware auth check failed:", error);
    user = null;
  }

  const pathname = request.nextUrl.pathname;
  
  // Auth pages (route group (auth) paths don't include the group name in URL)
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password";
  
  const isDashboard = pathname.startsWith("/dashboard");

  // Redirect authenticated users away from auth pages to dashboard
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect unauthenticated users away from dashboard to login
  if (!user && isDashboard) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Unauthenticated users can freely access auth pages
  // Authenticated users can freely access dashboard and other pages

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
