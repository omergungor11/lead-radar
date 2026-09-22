// Tüm işletmelerin Lead Skorunu DB'deki bonus kategorilerle yeniden hesaplar (Ayarlar →
// "Yeniden hesapla"). Business'taki JSON alanlarından `ScoreInput` türetir. Sunucu tarafı.

import { z } from "zod";
import { SETTING_KEYS } from "@/lib/config";
import { db } from "@/lib/db";
import { computeScore, type ScoreInput } from "@/lib/scoring";
import { getSetting } from "@/lib/settings";

export interface ScorableBusiness {
  primaryType: string | null;
  types: string;
  phone: string | null;
  phoneE164: string | null;
  rating: number | null;
  userRatingCount: number | null;
  photos: string;
  reviews: string;
}

const stringArray = z.array(z.string());
const anyArray = z.array(z.unknown());
const reviewsSchema = z.array(z.object({ publishTime: z.unknown().optional() }).loose());

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function latestReviewAt(raw: string): Date | null {
  const parsed = reviewsSchema.safeParse(parseJson(raw));
  if (!parsed.success) return null;
  let latest: Date | null = null;
  for (const review of parsed.data) {
    if (typeof review.publishTime !== "string") continue;
    const d = new Date(review.publishTime);
    if (Number.isNaN(d.getTime())) continue;
    if (!latest || d > latest) latest = d;
  }
  return latest;
}

/** Business satırı → skor girdisi. Bozuk JSON sessizce "veri yok" sayılır. */
export function toScoreInput(b: ScorableBusiness, now?: Date): ScoreInput {
  const types = stringArray.safeParse(parseJson(b.types));
  const photos = anyArray.safeParse(parseJson(b.photos));
  return {
    userRatingCount: b.userRatingCount,
    rating: b.rating,
    photoCount: photos.success ? photos.data.length : 0,
    hasPhone: Boolean(b.phoneE164?.trim() || b.phone?.trim()),
    lastReviewAt: latestReviewAt(b.reviews),
    primaryType: b.primaryType,
    types: types.success ? types.data : [],
    now,
  };
}

export async function rescoreAll(now: Date = new Date()): Promise<number> {
  const bonusCategories = await getSetting(SETTING_KEYS.bonusCategories);
  const businesses = await db.business.findMany({
    select: {
      id: true,
      primaryType: true,
      types: true,
      phone: true,
      phoneE164: true,
      rating: true,
      userRatingCount: true,
      photos: true,
      reviews: true,
    },
  });
  if (businesses.length === 0) return 0;

  const updates = businesses.map((b) => {
    const { score, breakdown } = computeScore(toScoreInput(b, now), bonusCategories);
    return db.business.update({
      where: { id: b.id },
      data: { score, scoreBreakdown: JSON.stringify(breakdown) },
    });
  });
  await db.$transaction(updates);
  return businesses.length;
}
