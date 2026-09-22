// Place Details → Business upsert (placeId ile). Sunucu tarafı.
// UPDATE'te yalnız Google alanları + skor + lastSyncedAt (+ searchJobId) yazılır;
// kullanıcının `status`, `email`, `lastContactedAt`, notları, `city` ve dolu `district` KORUNUR.

import type { Business } from "@prisma/client";
import { SETTING_KEYS } from "@/lib/config";
import { db } from "@/lib/db";
import { toE164 } from "@/lib/phone";
import type { PlaceDetails } from "@/lib/places";
import { toScoreInput } from "@/lib/rescore";
import { computeScore } from "@/lib/scoring";
import { getSetting } from "@/lib/settings";
import type { PhotoRef, ReviewDto } from "@/lib/types";
import { classifyWebsite, type WebsiteKind } from "@/lib/website";

/** Google'dan gelen, her senkronda yenilenen alanlar. */
export interface GoogleBusinessFields {
  name: string;
  primaryType: string | null;
  types: string;
  address: string | null;
  phone: string | null;
  phoneE164: string | null;
  /** Google'daki link (sosyal medya / platform profili olabilir); yoksa null */
  websiteUri: string | null;
  /** `classifyWebsite(websiteUri).kind` — yenilemede site edinmişse WEBSITE olur, kayıt silinmez */
  websiteKind: WebsiteKind;
  rating: number | null;
  userRatingCount: number | null;
  photos: string;
  reviews: string;
  openingHours: string | null;
  googleMapsUri: string | null;
  lat: number | null;
  lng: number | null;
}

export function photoProxyUrl(name: string): string {
  return `/api/photo?name=${encodeURIComponent(name)}`;
}

/** Saf: Details yanıtı → Business'ın Google alanları (JSON alanlar string). */
export function mapDetailsToFields(details: PlaceDetails): GoogleBusinessFields {
  const phone = details.nationalPhoneNumber?.trim() || null;
  const phoneE164 =
    toE164(details.internationalPhoneNumber) ?? toE164(details.nationalPhoneNumber) ?? null;

  const photos: PhotoRef[] = (details.photos ?? []).map((p) => ({
    name: p.name,
    url: photoProxyUrl(p.name),
  }));

  const reviews: ReviewDto[] = (details.reviews ?? []).map((r) => ({
    author: r.authorAttribution?.displayName ?? "",
    rating: r.rating ?? null,
    text: r.text?.text ?? r.originalText?.text ?? "",
    publishTime: r.publishTime ?? null,
  }));

  const hours = details.regularOpeningHours?.weekdayDescriptions;
  const websiteUri = details.websiteUri?.trim() || null;

  return {
    name: details.displayName?.text?.trim() || details.id,
    primaryType: details.primaryType ?? null,
    types: JSON.stringify(details.types ?? []),
    address: details.formattedAddress ?? null,
    phone,
    phoneE164,
    websiteUri,
    websiteKind: classifyWebsite(websiteUri).kind,
    rating: details.rating ?? null,
    userRatingCount: details.userRatingCount ?? null,
    photos: JSON.stringify(photos),
    reviews: JSON.stringify(reviews),
    openingHours: hours ? JSON.stringify(hours) : null,
    googleMapsUri: details.googleMapsUri ?? null,
    lat: details.location?.latitude ?? null,
    lng: details.location?.longitude ?? null,
  };
}

export interface UpsertOptions {
  /** Verilmezse DB'deki `bonusCategories` ayarı okunur (toplu işte bir kez okuyup geçin). */
  bonusCategories?: readonly string[];
  now?: Date;
  /**
   * Arama işinin ilçesi. CREATE'te yazılır; UPDATE'te yalnız mevcut kayıtta district NULL ise
   * doldurulur (işletme komşu ilçe aramasında da çıkabilir → ilk bulunduğu ilçe korunur).
   * Verilmezse / null → district'e dokunulmaz (Yenile).
   */
  district?: string | null;
}

/**
 * `jobId`: string → searchJobId yazılır; `null` → create'te boş, update'te dokunulmaz.
 * `city` yalnız create'te yazılır (mevcut kaydın şehri korunur).
 */
export async function upsertBusiness(
  details: PlaceDetails,
  city: string,
  jobId: string | null,
  options: UpsertOptions = {},
): Promise<Business> {
  const now = options.now ?? new Date();
  const bonusCategories = options.bonusCategories ?? (await getSetting(SETTING_KEYS.bonusCategories));
  const fields = mapDetailsToFields(details);
  const { score, breakdown } = computeScore(toScoreInput(fields, now), bonusCategories);

  const googleData = {
    ...fields,
    score,
    scoreBreakdown: JSON.stringify(breakdown),
    lastSyncedAt: now,
  };

  const district = options.district?.trim() || null;

  const business = await db.business.upsert({
    where: { placeId: details.id },
    create: {
      placeId: details.id,
      city,
      ...(district ? { district } : {}),
      ...googleData,
      firstSeenAt: now,
      ...(jobId ? { searchJobId: jobId } : {}),
    },
    update: {
      ...googleData,
      ...(jobId ? { searchJobId: jobId } : {}),
    },
  });

  // Prisma upsert'te koşullu alan yok → NULL ise ayrıca doldur (create'te zaten dolu, no-op).
  if (district && business.district === null) {
    await db.business.updateMany({ where: { id: business.id, district: null }, data: { district } });
    return { ...business, district };
  }
  return business;
}
