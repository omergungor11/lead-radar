import { z } from "zod";
import { apiError, ok, readJson, validationError } from "@/lib/api";
import type { ApiErrorBody, ApiSuccess } from "@/lib/api";
import { passwordMatches, SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { tr } from "@/lib/tr";
import type { NextResponse } from "next/server";

const loginSchema = z.object({
  password: z.string().min(1).max(512),
});

export async function POST(
  request: Request,
): Promise<NextResponse<ApiSuccess<{ ok: true }>> | NextResponse<ApiErrorBody>> {
  const parsed = loginSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const env = getServerEnv();
  if (!(await passwordMatches(parsed.data.password, env.adminPassword))) {
    return apiError(401, "INVALID_PASSWORD", tr.errors.invalidPassword);
  }

  const res = ok({ ok: true as const });
  res.cookies.set(SESSION_COOKIE, await signSession(env.sessionSecret), sessionCookieOptions());
  return res;
}
