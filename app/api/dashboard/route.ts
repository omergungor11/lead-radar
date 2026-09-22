import type { NextResponse } from "next/server";
import { ok, type ApiSuccess } from "@/lib/api";
import { getDashboardData } from "@/lib/dashboard";
import type { DashboardData } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<ApiSuccess<DashboardData>>> {
  return ok(await getDashboardData());
}
