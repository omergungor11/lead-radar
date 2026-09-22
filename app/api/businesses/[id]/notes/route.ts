import type { NextResponse } from "next/server";
import {
  apiError,
  ok,
  readJson,
  validationError,
  type ApiErrorBody,
  type ApiSuccess,
} from "@/lib/api";
import { addNote, noteCreateSchema } from "@/lib/businesses";
import { tr } from "@/lib/tr";
import type { NoteDto } from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: Request,
  { params }: RouteContext,
): Promise<NextResponse<ApiSuccess<NoteDto>> | NextResponse<ApiErrorBody>> {
  const { id } = await params;
  const parsed = noteCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const note = await addNote(id, parsed.data.body);
  if (!note) return apiError(404, "NOT_FOUND", tr.errors.businessNotFound);
  return ok(note, undefined, { status: 201 });
}
