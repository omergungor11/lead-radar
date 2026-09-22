import type { NextResponse } from "next/server";
import {
  apiError,
  ok,
  readJson,
  validationError,
  type ApiErrorBody,
  type ApiSuccess,
} from "@/lib/api";
import {
  businessPatchSchema,
  deleteBusiness,
  getBusinessDetail,
  patchBusiness,
  type PatchFailure,
} from "@/lib/businesses";
import { tr } from "@/lib/tr";
import type { BusinessDetail } from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const FAILURES: Record<PatchFailure, { statusCode: number; message: string }> = {
  NOT_FOUND: { statusCode: 404, message: tr.errors.businessNotFound },
  INVALID_TRANSITION: { statusCode: 400, message: tr.errors.invalidTransition },
  CONFIRMATION_REQUIRED: { statusCode: 409, message: tr.errors.confirmationRequired },
  NOTHING_TO_UNDO: { statusCode: 409, message: tr.errors.nothingToUndo },
};

export async function GET(
  _request: Request,
  { params }: RouteContext,
): Promise<NextResponse<ApiSuccess<BusinessDetail>> | NextResponse<ApiErrorBody>> {
  const { id } = await params;
  const detail = await getBusinessDetail(id);
  if (!detail) return apiError(404, "NOT_FOUND", tr.errors.businessNotFound);
  return ok(detail);
}

export async function PATCH(
  request: Request,
  { params }: RouteContext,
): Promise<NextResponse<ApiSuccess<BusinessDetail>> | NextResponse<ApiErrorBody>> {
  const { id } = await params;
  const parsed = businessPatchSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const result = await patchBusiness(id, parsed.data);
  if (!result.ok) {
    const { statusCode, message } = FAILURES[result.code];
    return apiError(statusCode, result.code, message);
  }
  return ok(result.data);
}

/**
 * Kaydı ve (cascade ile) notlarını + durum geçmişini siler.
 * Not: silinen işletme sonraki aramada yeniden bulunup upsert edilebilir — bu bilinçli.
 * Kalıcı olarak listeden çıkarmak için SKIPPED durumu kullanılır.
 */
export async function DELETE(
  _request: Request,
  { params }: RouteContext,
): Promise<NextResponse<ApiSuccess<{ id: string }>> | NextResponse<ApiErrorBody>> {
  const { id } = await params;
  const deleted = await deleteBusiness(id);
  if (!deleted) return apiError(404, "NOT_FOUND", tr.errors.businessNotFound);
  return ok({ id });
}
