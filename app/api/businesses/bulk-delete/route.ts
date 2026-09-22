import type { NextResponse } from "next/server";
import { ok, readJson, validationError, type ApiErrorBody, type ApiSuccess } from "@/lib/api";
import { bulkDeleteSchema, deleteBusinesses } from "@/lib/businesses";

/**
 * Toplu silme: bulunamayan id'ler sessizce atlanır (tek `deleteMany`), dönen sayı silinenlerdir.
 * Not/durum geçmişi şemadaki `onDelete: Cascade` ile birlikte gider.
 * Not: silinen işletme sonraki aramada yeniden bulunup upsert edilebilir — bu bilinçli.
 * Kalıcı olarak listeden çıkarmak için SKIPPED durumu kullanılır.
 */
export async function POST(
  request: Request,
): Promise<NextResponse<ApiSuccess<{ deleted: number }>> | NextResponse<ApiErrorBody>> {
  const parsed = bulkDeleteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  return ok({ deleted: await deleteBusinesses(parsed.data.ids) });
}
