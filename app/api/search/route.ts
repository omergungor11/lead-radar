import type { NextResponse } from "next/server";
import { z } from "zod";
import {
  apiError,
  ok,
  readJson,
  validationError,
  type ApiErrorBody,
  type ApiSuccess,
} from "@/lib/api";
import { SETTING_KEYS } from "@/lib/config";
import { db } from "@/lib/db";
import { isDistrictOf } from "@/lib/districts";
import { getPlacesClient } from "@/lib/places";
import { startSearchJob } from "@/lib/search-job";
import { toSearchJobDto } from "@/lib/search-jobs";
import { getSetting } from "@/lib/settings";
import { tr } from "@/lib/tr";
import type { SearchJobDto } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RECENT_LIMIT = 20;

const searchBodySchema = z.object({
  query: z.string().trim().min(1).max(80),
  city: z.string().trim().min(1).max(60),
  /** Opsiyonel Türkiye ilçesi; boş string / null → il geneli */
  district: z.string().trim().max(60).nullish(),
});

export async function GET(): Promise<NextResponse<ApiSuccess<SearchJobDto[]>>> {
  const jobs = await db.searchJob.findMany({ orderBy: { startedAt: "desc" }, take: RECENT_LIMIT });
  return ok(jobs.map(toSearchJobDto));
}

export async function POST(
  request: Request,
): Promise<NextResponse<ApiSuccess<{ jobId: string }>> | NextResponse<ApiErrorBody>> {
  const parsed = searchBodySchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);
  const { query, city } = parsed.data;
  const district = parsed.data.district || null;

  const cities = await getSetting(SETTING_KEYS.cities);
  if (!cities.includes(city)) return apiError(400, "UNKNOWN_CITY", tr.errors.unknownCity);
  if (district && !isDistrictOf(city, district)) {
    return apiError(400, "UNKNOWN_DISTRICT", tr.errors.unknownDistrict);
  }

  const client = getPlacesClient();
  if (!client) return apiError(503, "PLACES_NOT_CONFIGURED", tr.errors.placesNotConfigured);

  const job = await db.searchJob.create({ data: { query, city, district, status: "RUNNING" } });
  startSearchJob({ jobId: job.id, query, city, ...(district ? { district } : {}) }, client);

  return ok({ jobId: job.id }, undefined, { status: 201 });
}
