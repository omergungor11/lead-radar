import type { NextResponse } from "next/server";
import { ok, readJson, validationError, type ApiErrorBody, type ApiSuccess } from "@/lib/api";
import { bulkStatusSchema, bulkUpdateStatus } from "@/lib/businesses";
import type { BulkStatusResult } from "@/lib/types";

export async function POST(
  request: Request,
): Promise<NextResponse<ApiSuccess<BulkStatusResult>> | NextResponse<ApiErrorBody>> {
  const parsed = bulkStatusSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  return ok(await bulkUpdateStatus(parsed.data.ids, parsed.data.status));
}
