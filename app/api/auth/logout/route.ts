import type { NextResponse } from "next/server";
import { ok } from "@/lib/api";
import type { ApiSuccess } from "@/lib/api";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export async function POST(): Promise<NextResponse<ApiSuccess<{ ok: true }>>> {
  const res = ok({ ok: true as const });
  res.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
  return res;
}
