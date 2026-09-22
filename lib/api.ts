// Route handler'lar için ortak response yardımcıları.
// Başarı: `{ data, meta? }` — Hata: `{ error: { statusCode, code, message } }` (conventions.md).

import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import { tr } from "@/lib/tr";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "INVALID_PASSWORD"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR"
  | (string & {});

export interface ApiSuccess<T, M = undefined> {
  data: T;
  meta?: M;
}

export interface ApiErrorBody {
  error: {
    statusCode: number;
    code: ApiErrorCode;
    message: string;
    details?: ValidationIssue[];
  };
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export function ok<T, M = undefined>(
  data: T,
  meta?: M,
  init?: ResponseInit,
): NextResponse<ApiSuccess<T, M>> {
  const body: ApiSuccess<T, M> = meta === undefined ? { data } : { data, meta };
  return NextResponse.json(body, init);
}

export function apiError(
  statusCode: number,
  code: ApiErrorCode,
  message: string,
  details?: ValidationIssue[],
): NextResponse<ApiErrorBody> {
  const error: ApiErrorBody["error"] = { statusCode, code, message };
  if (details && details.length > 0) error.details = details;
  return NextResponse.json({ error }, { status: statusCode });
}

export function validationError(err: ZodError): NextResponse<ApiErrorBody> {
  const details = err.issues.map((issue) => ({
    path: issue.path.map(String).join("."),
    message: issue.message,
  }));
  return apiError(400, "VALIDATION_ERROR", tr.errors.validation, details);
}

/** Gövdeyi JSON olarak okur; bozuk JSON'da `undefined` döner (zod 400'e çevirir). */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
