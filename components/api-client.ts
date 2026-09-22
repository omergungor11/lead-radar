// Client-side fetch yardımcıları. Başarı `{ data, meta? }`; `{ error }` gelirse `ApiRequestError`
// fırlatır (statusCode + code taşır → 409 CONFIRMATION_REQUIRED gibi kodlara göre dallanılabilir).

import type { ApiErrorBody } from "@/lib/api";
import { tr } from "@/lib/tr";

export class ApiRequestError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

async function send<B>(url: string, init?: RequestInit): Promise<B> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = (await res.json().catch(() => null)) as B | ApiErrorBody | null;

  if (body && typeof body === "object" && "error" in body) {
    const { statusCode, code, message } = (body as ApiErrorBody).error;
    throw new ApiRequestError(statusCode, code, message);
  }
  if (!res.ok || !body) {
    throw new ApiRequestError(res.status, "INTERNAL_ERROR", tr.common.error);
  }
  return body as B;
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  return (await send<{ data: T }>(url, init)).data;
}

export async function apiFetchWithMeta<T, M>(
  url: string,
  init?: RequestInit,
): Promise<{ data: T; meta: M }> {
  return send<{ data: T; meta: M }>(url, init);
}
