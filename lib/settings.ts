// `Setting` tablosu erişimi (değer JSON string[]). Kayıt yoksa / bozuksa `lib/config.ts` varsayılanı.
// Sunucu tarafı — client component'ten import etme (Prisma).

import { z } from "zod";
import { DEFAULT_BONUS_CATEGORIES, DEFAULT_CITIES, SETTING_KEYS, type SettingKey } from "@/lib/config";
import { db } from "@/lib/db";

export const SETTING_ITEM_MAX_LENGTH = 60;
// 87 varsayılan şehir (KKTC + 81 il) + kullanıcının ekleyeceği ilçeler için pay
export const SETTING_MAX_ITEMS = 300;

const DEFAULTS: Readonly<Record<SettingKey, readonly string[]>> = {
  cities: DEFAULT_CITIES,
  bonusCategories: DEFAULT_BONUS_CATEGORIES,
};

const storedListSchema = z.array(z.string());

export function isSettingKey(key: string): key is SettingKey {
  return (Object.values(SETTING_KEYS) as string[]).includes(key);
}

/** Trim, boşları at, büyük/küçük harf duyarsız tekrarları at (ilk görülen yazım korunur). */
export function normalizeList(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (value === "") continue;
    const fold = value.toLocaleLowerCase("tr-TR");
    if (seen.has(fold)) continue;
    seen.add(fold);
    out.push(value);
  }
  return out;
}

/** PUT gövdesi: `{ value: string[] }` → normalize edilmiş liste. */
export const settingValueSchema = z.object({
  value: z
    .array(
      // Uzunluk trim sonrası ölçülür; boş öğeler hata değil, normalizeList atar
      z.string().trim().max(SETTING_ITEM_MAX_LENGTH),
    )
    .max(SETTING_MAX_ITEMS)
    .transform(normalizeList),
});

export async function getSetting(key: SettingKey): Promise<string[]> {
  const row = await db.setting.findUnique({ where: { key } });
  if (!row) return [...DEFAULTS[key]];
  try {
    const parsed = storedListSchema.safeParse(JSON.parse(row.value));
    return parsed.success ? parsed.data : [...DEFAULTS[key]];
  } catch {
    return [...DEFAULTS[key]];
  }
}

export async function setSetting(key: SettingKey, value: readonly string[]): Promise<string[]> {
  const list = [...value];
  const json = JSON.stringify(list);
  await db.setting.upsert({
    where: { key },
    update: { value: json },
    create: { key, value: json },
  });
  return list;
}

/** `GET /api/settings` → `data`. */
export interface SettingsResponse {
  cities: string[];
  bonusCategories: string[];
  /** Anahtarın değeri asla dönmez — yalnızca tanımlı olup olmadığı. */
  placesKeyConfigured: boolean;
  placesMock: boolean;
}
