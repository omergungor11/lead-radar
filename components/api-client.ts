// Client-side fetch yardımcısı. `{ data }` döner, `{ error }` gelirse mesajla throw eder.
// Sadece bu component ağacı içinde kullanılır; lib/ altına yazılmaz (frontend scope kısıtı).

import type { ApiErrorBody } from "@/lib/api";
import { tr } from "@/lib/tr";

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = (await res.json().catch(() => null)) as
    | { data: T }
    | ApiErrorBody
    | null;

  if (!res.ok || !body || "error" in body) {
    const message =
      body && "error" in body ? body.error.message : tr.settings.requestError;
    throw new Error(message);
  }

  return body.data;
}
