// Sunucu ortam değişkenleri. Edge (middleware) ve Node'da çalışır — Node'a özgü import yok.
// Açılış kontrolü: kök `instrumentation.ts` → `getServerEnv()`.

import { z } from "zod";
import { tr } from "@/lib/tr";

export const SESSION_SECRET_MIN_LENGTH = 32;

const serverEnvSchema = z.object({
  ADMIN_PASSWORD: z.string().min(1, "ADMIN_PASSWORD tanımlı değil (panel giriş şifresi)"),
  SESSION_SECRET: z
    .string()
    .min(
      SESSION_SECRET_MIN_LENGTH,
      `SESSION_SECRET en az ${SESSION_SECRET_MIN_LENGTH} karakter olmalı (örn. \`openssl rand -hex 32\`)`,
    ),
  GOOGLE_PLACES_API_KEY: z.string().optional(),
  PLACES_MOCK: z.string().optional(),
});

export interface ServerEnv {
  adminPassword: string;
  sessionSecret: string;
  googlePlacesApiKey: string | undefined;
  placesMock: boolean;
}

export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvError";
  }
}

function emptyToUndefined(value: string | undefined): string | undefined {
  return value === undefined || value.trim() === "" ? undefined : value;
}

/** Zorunlu değişkenler eksik/geçersizse Türkçe, değişken adını içeren bir `EnvError` fırlatır. */
export function getServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse({
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? "",
    SESSION_SECRET: process.env.SESSION_SECRET ?? "",
    GOOGLE_PLACES_API_KEY: emptyToUndefined(process.env.GOOGLE_PLACES_API_KEY),
    PLACES_MOCK: process.env.PLACES_MOCK,
  });

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `- ${issue.message}`).join("\n");
    throw new EnvError(`${tr.errors.missingEnv}:\n${details}\n(.env.example dosyasına bakın)`);
  }

  return {
    adminPassword: parsed.data.ADMIN_PASSWORD,
    sessionSecret: parsed.data.SESSION_SECRET,
    googlePlacesApiKey: parsed.data.GOOGLE_PLACES_API_KEY,
    placesMock: parsed.data.PLACES_MOCK === "1",
  };
}

/**
 * Harita için tarayıcı anahtarı — client'a gider, bu yüzden Places anahtarından AYRI olmalı
 * (yalnız Maps JavaScript API + HTTP referrer kısıtı). Çalışma anında okunur, build'e gömülmez.
 */
export function getMapsBrowserKey(): string | null {
  return emptyToUndefined(process.env.GOOGLE_MAPS_BROWSER_KEY) ?? null;
}
