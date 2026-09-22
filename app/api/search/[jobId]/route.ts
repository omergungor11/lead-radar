import type { NextResponse } from "next/server";
import { apiError, ok, type ApiErrorBody, type ApiSuccess } from "@/lib/api";
import { db } from "@/lib/db";
import { toSearchJobDto } from "@/lib/search-jobs";
import { tr } from "@/lib/tr";
import type { SearchJobDto } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

export async function GET(
  _request: Request,
  { params }: RouteContext,
): Promise<NextResponse<ApiSuccess<SearchJobDto>> | NextResponse<ApiErrorBody>> {
  const { jobId } = await params;
  const job = await db.searchJob.findUnique({ where: { id: jobId } });
  if (!job) return apiError(404, "NOT_FOUND", tr.errors.searchJobNotFound);
  return ok(toSearchJobDto(job));
}
