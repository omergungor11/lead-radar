// Lead Skoru (PROMPT §2). Saf: DB'ye, saate (now verilirse) ve ağa dokunmaz.
// Düzenleme yetkisi: backend. Etiketler: `tr.scoreSignals`, `tr.scoreBands`.

export const SCORE_SIGNALS = [
  "reviewCount",
  "rating",
  "photos",
  "phone",
  "recency",
  "category",
] as const;

export type ScoreSignal = (typeof SCORE_SIGNALS)[number];

export interface ScoreInput {
  userRatingCount?: number | null;
  rating?: number | null;
  photoCount: number;
  hasPhone: boolean;
  lastReviewAt?: Date | null;
  primaryType?: string | null;
  types?: readonly string[];
  /** Test için sabit zaman; verilmezse `new Date()`. */
  now?: Date;
}

export interface ScoreBreakdownItem {
  signal: ScoreSignal;
  points: number;
}

export interface ScoreResult {
  score: number;
  breakdown: ScoreBreakdownItem[];
}

export type ScoreBand = "HOT" | "WARM" | "COLD";

const DAY_MS = 86_400_000;

// Yorum sayısı çapaları [yorum, puan]. Aralarda ln(1+n) uzayında doğrusal (parçalı log)
// interpolasyon yapılır: puan = p0 + (p1-p0) · (ln(1+n) - ln(1+n0)) / (ln(1+n1) - ln(1+n0)).
// ln(1+n) 0'da tanımlı ve monoton → çapalar tam tutar, aralar monoton ve içbükeydir
// (ilk yorumlar sonrakilerden daha değerli). Sonuç en yakın tamsayıya yuvarlanır.
const REVIEW_ANCHORS: readonly (readonly [number, number])[] = [
  [0, 0],
  [20, 15],
  [50, 25],
  [100, 30],
];
const REVIEW_MAX = 30;

export function reviewCountPoints(count: number | null | undefined): number {
  if (count == null || !Number.isFinite(count) || count <= 0) return 0;
  const last = REVIEW_ANCHORS[REVIEW_ANCHORS.length - 1];
  if (last && count >= last[0]) return REVIEW_MAX;

  for (let i = 1; i < REVIEW_ANCHORS.length; i++) {
    const lo = REVIEW_ANCHORS[i - 1];
    const hi = REVIEW_ANCHORS[i];
    if (!lo || !hi || count > hi[0]) continue;
    const [n0, p0] = lo;
    const [n1, p1] = hi;
    const t = (Math.log1p(count) - Math.log1p(n0)) / (Math.log1p(n1) - Math.log1p(n0));
    return Math.round(p0 + (p1 - p0) * t);
  }
  return REVIEW_MAX;
}

function ratingPoints(rating: number | null | undefined): number {
  if (rating == null || !Number.isFinite(rating)) return 0;
  if (rating >= 4.5) return 20;
  if (rating >= 4.0) return 15;
  if (rating >= 3.5) return 10;
  return 0;
}

function photoPoints(count: number): number {
  if (count >= 5) return 15;
  if (count >= 3) return 10;
  if (count >= 1) return 5;
  return 0;
}

function recencyPoints(lastReviewAt: Date | null | undefined, now: Date): number {
  if (!lastReviewAt || Number.isNaN(lastReviewAt.getTime())) return 0;
  const ageDays = (now.getTime() - lastReviewAt.getTime()) / DAY_MS;
  if (ageDays <= 30) return 10;
  if (ageDays <= 90) return 6;
  if (ageDays <= 180) return 3;
  return 0;
}

function categoryPoints(
  primaryType: string | null | undefined,
  types: readonly string[] | undefined,
  bonusCategories: readonly string[],
): number {
  const bonus = new Set(bonusCategories);
  if (primaryType && bonus.has(primaryType)) return 10;
  return (types ?? []).some((t) => bonus.has(t)) ? 10 : 0;
}

export function computeScore(
  input: ScoreInput,
  bonusCategories: readonly string[],
): ScoreResult {
  const now = input.now ?? new Date();
  const breakdown: ScoreBreakdownItem[] = [
    { signal: "reviewCount", points: reviewCountPoints(input.userRatingCount) },
    { signal: "rating", points: ratingPoints(input.rating) },
    { signal: "photos", points: photoPoints(input.photoCount) },
    { signal: "phone", points: input.hasPhone ? 15 : 0 },
    { signal: "recency", points: recencyPoints(input.lastReviewAt, now) },
    { signal: "category", points: categoryPoints(input.primaryType, input.types, bonusCategories) },
  ];
  const total = breakdown.reduce((sum, item) => sum + item.points, 0);
  return { score: Math.min(100, Math.max(0, total)), breakdown };
}

/** 80+ Sıcak, 50–79 Ilık, <50 Soğuk. */
export function scoreBand(score: number): ScoreBand {
  if (score >= 80) return "HOT";
  if (score >= 50) return "WARM";
  return "COLD";
}
