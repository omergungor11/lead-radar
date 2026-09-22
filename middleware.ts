// Edge runtime. `/login`, `/api/auth/login`, `/_next/*`, `favicon.ico` dışında her şey korunur.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { apiError } from "@/lib/api";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { tr } from "@/lib/tr";

const PUBLIC_API = new Set(["/api/auth/login"]);
const LOGIN_PATH = "/login";

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;

  if (PUBLIC_API.has(pathname)) return NextResponse.next();

  // Secret yoksa/kısaysa kimse doğrulanamaz (fail closed); açılış hatası instrumentation'da.
  const secret = process.env.SESSION_SECRET ?? "";
  const authed = await verifySession(request.cookies.get(SESSION_COOKIE)?.value, secret);

  if (pathname === LOGIN_PATH) {
    return authed ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }

  if (authed) return NextResponse.next();

  if (pathname === "/api" || pathname.startsWith("/api/")) {
    return apiError(401, "UNAUTHORIZED", tr.errors.unauthorized);
  }

  const loginUrl = new URL(LOGIN_PATH, request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/|favicon\\.ico$).*)"],
};
