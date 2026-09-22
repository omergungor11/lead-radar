// Telefon normalizasyonu. KKTC numaraları Türkiye ülke kodunu kullanır: sabit hat +90 392 …,
// mobiller +90 5xx … — bu yüzden libphonenumber-js "TR" bölgesiyle ayrıştırılır.
// Düzenleme yetkisi: backend.

import { parsePhoneNumberFromString } from "libphonenumber-js";

export type CountryHint = "KKTC" | "TR";

const KKTC_AREA_CODE = "392";
const LOCAL_DIGITS = 7;

/** Serbest formatlı numarayı E.164'e çevirir (`+903922281234`); geçersizse `null`. */
export function toE164(
  national: string | null | undefined,
  countryHint: CountryHint = "KKTC",
): string | null {
  if (!national) return null;
  let input = national.trim();
  if (input === "") return null;

  // KKTC'de alan kodu olmadan yazılan 7 haneli yerel numara → 392 eklenir.
  // TR'de alan kodu tahmin edilemez → ayrıştırıcıya bırakılır (geçersiz çıkar).
  const digits = input.replace(/\D/g, "");
  if (countryHint === "KKTC" && !input.startsWith("+") && digits.length === LOCAL_DIGITS) {
    input = `0${KKTC_AREA_CODE}${digits}`;
  }

  const parsed = parsePhoneNumberFromString(input, "TR");
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;
}

/** WhatsApp tıkla-sohbet bağlantısı: `https://wa.me/<rakamlar>?text=<encoded>`. */
export function waLink(e164: string, text?: string): string {
  const url = `https://wa.me/${e164.replace(/\D/g, "")}`;
  return text ? `${url}?text=${encodeURIComponent(text)}` : url;
}
