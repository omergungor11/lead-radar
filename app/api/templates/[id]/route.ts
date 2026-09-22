import type { NextResponse } from "next/server";
import {
  apiError,
  ok,
  readJson,
  validationError,
  type ApiErrorBody,
  type ApiSuccess,
} from "@/lib/api";
import { db } from "@/lib/db";
import { toTemplateDto, updateTemplateSchema } from "@/lib/message-templates";
import type { Template } from "@/lib/templates";
import { tr } from "@/lib/tr";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function notFound(): NextResponse<ApiErrorBody> {
  return apiError(404, "NOT_FOUND", tr.errors.templateNotFound);
}

export async function PUT(
  request: Request,
  { params }: RouteContext,
): Promise<NextResponse<ApiSuccess<Template>> | NextResponse<ApiErrorBody>> {
  const { id } = await params;
  const parsed = updateTemplateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const existing = await db.messageTemplate.findUnique({ where: { id } });
  if (!existing) return notFound();

  const row = await db.messageTemplate.update({ where: { id }, data: parsed.data });
  return ok(toTemplateDto(row));
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext,
): Promise<NextResponse<ApiSuccess<{ id: string }>> | NextResponse<ApiErrorBody>> {
  const { id } = await params;
  // deleteMany: kayıt yoksa P2025 fırlatmaz, count 0 döner
  const { count } = await db.messageTemplate.deleteMany({ where: { id } });
  if (count === 0) return notFound();
  return ok({ id });
}
