import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";

const protectedRoutes = ["/dashboard", "/admin"];
const authRoutes = ["/login", "/register"];

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const pathname = nextUrl.pathname;

  // Read or generate a request ID. Respect upstream proxies (Render, Cloudflare)
  // so logs from the proxy and the app correlate.
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();

  const response = NextResponse.next();
  response.headers.set("x-request-id", requestId);

  // Log all protected route access
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );

  if (isProtectedRoute) {
    logger.info("Protected route accessed", {
      requestId,
      path: pathname,
      authenticated: !!session,
      userId: session?.user?.id || undefined,
      organizationId: session?.user?.organizationId || undefined,
      role: session?.user?.role || undefined,
    });

    if (!session) {
      logger.warn("Unauthenticated access blocked", {
        requestId,
        path: pathname,
      });
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
  }

  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return response;
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/register"],
};
