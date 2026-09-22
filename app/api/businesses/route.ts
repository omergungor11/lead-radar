import type { NextResponse } from "next/server";
import { ok, validationError, type ApiErrorBody, type ApiSuccess } from "@/lib/api";
import { listBusinesses, parseBusinessFilters } from "@/lib/businesses";
import type { BusinessListItem, PageMeta } from "@/lib/types";

export async function GET(
  request: Request,
): Promise<NextResponse<ApiSuccess<BusinessListItem[], PageMeta>> | NextResponse<ApiErrorBody>> {
  const filters = parseBusinessFilters(new URL(request.url).searchParams);
  if (!filters.success) return validationError(filters.error);

  const { items, meta } = await listBusinesses(filters.data);
  return ok(items, meta);
}
