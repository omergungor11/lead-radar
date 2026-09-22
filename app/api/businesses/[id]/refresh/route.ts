// Tek işletme "Yenile": Details yeniden çekilir, Google alanları + skor güncellenir (ToS 30 gün cache).
// Şehir, durum, e-posta, notlar korunur. İşletme kapanmış / site edinmiş olsa da silinmez, güncellenir.

import type { NextResponse } from "next/server";
import { apiError, ok, type ApiErrorBody, type ApiSuccess } from "@/lib/api";
import { db } from "@/lib/db";
import { upsertBusiness } from "@/lib/ingest";
import { getPlacesClient, PlacesError } from "@/lib/places";
import { tr } from "@/lib/tr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface RefreshResult {
  id: string;
  lastSyncedAt: string;
}

export async function POST(
  _request: Request,
  { params }: RouteContext,
): Promise<NextResponse<ApiSuccess<RefreshResult>> | NextResponse<ApiErrorBody>> {
  const { id } = await params;
  const business = await db.business.findUnique({
    where: { id },
    select: { id: true, placeId: true, city: true },
  });
  if (!business) return apiError(404, "NOT_FOUND", tr.errors.businessNotFound);

  const client = getPlacesClient();
  if (!client) return apiError(503, "PLACES_NOT_CONFIGURED", tr.errors.placesNotConfigured);

  try {
    const details = await client.getDetails(business.placeId);
    // Google kalıcı ID'yi değiştirmiş olsa bile aynı kaydı güncelle (kopya oluşmasın).
    const updated = await upsertBusiness({ ...details, id: business.placeId }, business.city, null);
    return ok({ id: updated.id, lastSyncedAt: updated.lastSyncedAt.toISOString() });
  } catch (error) {
    if (error instanceof PlacesError) {
      const status = error.httpStatus === 404 ? 404 : 502;
      return apiError(status, status === 404 ? "PLACE_NOT_FOUND" : "PLACES_ERROR", error.message);
    }
    throw error;
  }
}
