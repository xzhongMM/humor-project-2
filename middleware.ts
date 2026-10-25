import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { checkSuperadmin } from "@/lib/auth-core";

/**
 * Login wall. Runs on EVERY request except static assets.
 * The only routes reachable without being a superadmin are the ones needed to
 * sign in / out and the "access denied" page — none of them touch app data.
 */
const PUBLIC_PATHS = ["/login", "/auth/callback", "/auth/signout", "/unauthorized"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Refreshes the session cookie if needed and verifies the user with Supabase Auth.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"))) return response;

  const redirectTo = (target: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = target;
    url.search = "";
    for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);
    const r = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => r.cookies.set(c)); // keep refreshed auth cookies
    return r;
  };

  if (!user) return redirectTo("/login", path !== "/" ? { next: path } : undefined);
  if (!(await checkSuperadmin(user.id))) return redirectTo("/unauthorized");

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
