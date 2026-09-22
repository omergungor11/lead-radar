import type { NextResponse } from "next/server";
import { ok, readJson, validationError, type ApiErrorBody, type ApiSuccess } from "@/lib/api";
import { db } from "@/lib/db";
import { createTemplateSchema, toTemplateDto } from "@/lib/message-templates";
import type { Template } from "@/lib/templates";

export async function GET(): Promise<NextResponse<ApiSuccess<Template[]>>> {
  const rows = await db.messageTemplate.findMany({ orderBy: { createdAt: "asc" } });
  return ok(rows.map(toTemplateDto));
}

export async function POST(
  request: Request,
): Promise<NextResponse<ApiSuccess<Template>> | NextResponse<ApiErrorBody>> {
  const parsed = createTemplateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const row = await db.messageTemplate.create({ data: parsed.data });
  return ok(toTemplateDto(row), undefined, { status: 201 });
}
