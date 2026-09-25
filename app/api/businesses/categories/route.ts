import type { NextResponse } from "next/server";
import { ok, type ApiSuccess } from "@/lib/api";
import { listCategoryCounts } from "@/lib/businesses";
import type { CategoryCount } from "@/lib/types";

/** Kategori filtresi için: kayıtlı işletmelerdeki `primaryType` değerleri + adetleri. */
export async function GET(): Promise<NextResponse<ApiSuccess<CategoryCount[]>>> {
  return ok(await listCategoryCounts());
}
