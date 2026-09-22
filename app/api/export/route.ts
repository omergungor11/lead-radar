import { z } from "zod";
import { validationError } from "@/lib/api";
import { parseBusinessFilters } from "@/lib/businesses";
import {
  buildWorkbook,
  EXPORT_CONTENT_TYPE,
  EXPORT_MAX_IDS,
  exportFileName,
  fetchExportRows,
  type ExportQuery,
} from "@/lib/export";

// `ids=a,b,c` (tekrarlı `ids=` de olur) — verilirse filtreler yok sayılır.
const idsSchema = z.array(z.string().min(1).max(64)).max(EXPORT_MAX_IDS);

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.searchParams);

  const rawIds = params
    .getAll("ids")
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter((v) => v !== "");
  params.delete("ids");

  let query: ExportQuery;
  if (rawIds.length > 0) {
    const ids = idsSchema.safeParse([...new Set(rawIds)]);
    if (!ids.success) return validationError(ids.error);
    query = { ids: ids.data };
  } else {
    const filters = parseBusinessFilters(params);
    if (!filters.success) return validationError(filters.error);
    query = { filters: filters.data };
  }

  const { rows, truncated } = await fetchExportRows(query, url);
  const buffer = await buildWorkbook(rows);

  const headers = new Headers({
    "Content-Type": EXPORT_CONTENT_TYPE,
    "Content-Disposition": `attachment; filename="${exportFileName()}"`,
    "Content-Length": String(buffer.byteLength),
    "Cache-Control": "no-store",
  });
  if (truncated) headers.set("X-Export-Truncated", "1");
  return new Response(new Uint8Array(buffer), { status: 200, headers });
}
