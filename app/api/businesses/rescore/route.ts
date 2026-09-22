import type { NextResponse } from "next/server";
import { ok, type ApiSuccess } from "@/lib/api";
import { rescoreAll } from "@/lib/rescore";

export async function POST(): Promise<NextResponse<ApiSuccess<{ updated: number }>>> {
  return ok({ updated: await rescoreAll() });
}
