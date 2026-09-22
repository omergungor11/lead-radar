// Mesaj şablonları: opt-out kontrolü ve {{yer tutucu}} doldurma.
// Düzenleme yetkisi: backend. Frontend import eder (şablon formu uyarısı).

// Opt-out cümlesi zorunlu (PROMPT "Yasal ve etik sınırlar"): yoksa form uyarır, engellemez.
const OPT_OUT_PATTERNS: readonly RegExp[] = [
  /istemiyor(sanız|san)/i,
  /rahatsız\s+etmeyece/i,
  /listeden\s+çık/i,
  /abonelikten\s+çık/i,
];

export function hasOptOut(body: string): boolean {
  return OPT_OUT_PATTERNS.some((pattern) => pattern.test(body));
}

export interface TemplateVars {
  isletme: string;
  sehir: string;
  puan?: number | null;
  yorumSayisi?: number | null;
  /** Sosyal medya / platform markası ("Instagram"); yoksa "sosyal medya" */
  platform?: string | null;
}

const EMPTY = "—";
const DEFAULT_PLATFORM = "sosyal medya";
const PLACEHOLDER = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;

const ratingFormat = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const countFormat = new Intl.NumberFormat("tr-TR");

/**
 * `{{isletme}}`, `{{sehir}}`, `{{puan}}` (4,6), `{{yorumSayisi}}`, `{{platform}}` (yoksa "sosyal medya") doldurur. Tek geçişte
 * çalışır: değer içindeki `{{…}}` yeniden işlenmez; bilinmeyen yer tutucu olduğu gibi kalır.
 */
export function renderTemplate(body: string, vars: TemplateVars): string {
  const values: Record<string, string> = {
    isletme: vars.isletme,
    sehir: vars.sehir,
    puan: vars.puan == null ? EMPTY : ratingFormat.format(vars.puan),
    yorumSayisi: vars.yorumSayisi == null ? EMPTY : countFormat.format(vars.yorumSayisi),
    platform: vars.platform?.trim() || DEFAULT_PLATFORM,
  };
  return body.replace(PLACEHOLDER, (match, key: string) =>
    Object.hasOwn(values, key) ? (values[key] ?? match) : match,
  );
}

export const TEMPLATE_CHANNELS = ["WHATSAPP", "EMAIL"] as const;
export type TemplateChannel = (typeof TEMPLATE_CHANNELS)[number];
export const TEMPLATE_NAME_MAX = 80;
export const TEMPLATE_BODY_MAX = 2000;

/** `/api/templates*` response şekli. */
export interface Template {
  id: string;
  name: string;
  channel: TemplateChannel;
  body: string;
  createdAt: string;
  hasOptOut: boolean;
}
