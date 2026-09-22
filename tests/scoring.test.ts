import { describe, expect, it } from "vitest";
import {
  computeScore,
  reviewCountPoints,
  scoreBand,
  SCORE_SIGNALS,
  type ScoreInput,
  type ScoreSignal,
} from "@/lib/scoring";
import { tr } from "@/lib/tr";

const NOW = new Date("2026-09-01T12:00:00Z");
const DAY = 86_400_000;
const BONUS = ["restaurant", "dental_clinic"] as const;

function base(overrides: Partial<ScoreInput> = {}): ScoreInput {
  return { photoCount: 0, hasPhone: false, now: NOW, ...overrides };
}

function points(input: ScoreInput, signal: ScoreSignal, bonus: readonly string[] = BONUS): number {
  const found = computeScore(input, bonus).breakdown.find((b) => b.signal === signal);
  if (!found) throw new Error(`breakdown'da ${signal} yok`);
  return found.points;
}

describe("yorum sayısı (0–30, logaritmik)", () => {
  it("çapalar tam: 0→0, 20→15, 50→25, 100→30", () => {
    expect(reviewCountPoints(0)).toBe(0);
    expect(reviewCountPoints(20)).toBe(15);
    expect(reviewCountPoints(50)).toBe(25);
    expect(reviewCountPoints(100)).toBe(30);
  });

  it("100+ → 30 (tavan)", () => {
    expect(reviewCountPoints(101)).toBe(30);
    expect(reviewCountPoints(5000)).toBe(30);
  });

  it("null / undefined / negatif → 0", () => {
    expect(points(base({ userRatingCount: null }), "reviewCount")).toBe(0);
    expect(points(base(), "reviewCount")).toBe(0);
    expect(reviewCountPoints(-5)).toBe(0);
  });

  it("çapalar arası monoton artan, tamsayı, sınırlar içinde", () => {
    let prev = -1;
    for (let n = 0; n <= 150; n++) {
      const p = reviewCountPoints(n);
      expect(Number.isInteger(p)).toBe(true);
      expect(p).toBeGreaterThanOrEqual(prev);
      expect(p).toBeLessThanOrEqual(30);
      prev = p;
    }
  });

  it("logaritmik: ilk yorumlar sonrakilerden değerli", () => {
    expect(reviewCountPoints(1)).toBeGreaterThan(0);
    expect(reviewCountPoints(10)).toBeGreaterThan(7); // doğrusal olsa 7,5
    // Yuvarlama nedeniyle çapanın hemen altı (19 → 14,76) çapa değerine çıkabilir
    expect(reviewCountPoints(15)).toBeLessThan(15);
    expect(reviewCountPoints(21)).toBeGreaterThanOrEqual(15);
    expect(reviewCountPoints(40)).toBeLessThan(25);
    expect(reviewCountPoints(99)).toBeLessThanOrEqual(30);
  });
});

describe("rating (0–20)", () => {
  it.each([
    [null, 0],
    [1, 0],
    [3.49, 0],
    [3.5, 10],
    [3.99, 10],
    [4.0, 15],
    [4.49, 15],
    [4.5, 20],
    [5, 20],
  ])("%s → %i", (rating, expected) => {
    expect(points(base({ rating }), "rating")).toBe(expected);
  });
});

describe("fotoğraf (0–15)", () => {
  it.each([
    [0, 0],
    [1, 5],
    [2, 5],
    [3, 10],
    [4, 10],
    [5, 15],
    [10, 15],
  ])("%i foto → %i", (photoCount, expected) => {
    expect(points(base({ photoCount }), "photos")).toBe(expected);
  });
});

describe("telefon (0/15)", () => {
  it("var → 15, yok → 0", () => {
    expect(points(base({ hasPhone: true }), "phone")).toBe(15);
    expect(points(base({ hasPhone: false }), "phone")).toBe(0);
  });
});

describe("son yorum tarihi (0–10)", () => {
  const ago = (days: number): Date => new Date(NOW.getTime() - days * DAY);

  it.each([
    [0, 10],
    [30, 10],
    [31, 6],
    [90, 6],
    [91, 3],
    [180, 3],
    [181, 0],
    [1000, 0],
  ])("%i gün önce → %i", (days, expected) => {
    expect(points(base({ lastReviewAt: ago(days) }), "recency")).toBe(expected);
  });

  it("30 gün + 1 ms → 6 (sınır tam gün)", () => {
    const d = new Date(NOW.getTime() - 30 * DAY - 1);
    expect(points(base({ lastReviewAt: d }), "recency")).toBe(6);
  });

  it("null → 0; gelecek tarih → 10", () => {
    expect(points(base({ lastReviewAt: null }), "recency")).toBe(0);
    expect(points(base({ lastReviewAt: new Date(NOW.getTime() + DAY) }), "recency")).toBe(10);
  });
});

describe("kategori bonusu (0/10)", () => {
  it("primaryType listede → 10", () => {
    expect(points(base({ primaryType: "restaurant" }), "category")).toBe(10);
  });

  it("types içinden biri listede → 10", () => {
    expect(
      points(base({ primaryType: "store", types: ["store", "dental_clinic"] }), "category"),
    ).toBe(10);
  });

  it("listede değil / boş → 0", () => {
    expect(points(base({ primaryType: "store", types: ["store"] }), "category")).toBe(0);
    expect(points(base({ primaryType: null }), "category")).toBe(0);
    expect(points(base({ primaryType: "restaurant" }), "category", [])).toBe(0);
  });
});

describe("computeScore", () => {
  it("boş girdi → 0, breakdown her sinyali sırayla içerir", () => {
    const { score, breakdown } = computeScore(base(), BONUS);
    expect(score).toBe(0);
    expect(breakdown.map((b) => b.signal)).toEqual([...SCORE_SIGNALS]);
  });

  it("maksimum → 100", () => {
    const { score } = computeScore(
      base({
        userRatingCount: 500,
        rating: 4.8,
        photoCount: 10,
        hasPhone: true,
        lastReviewAt: NOW,
        primaryType: "restaurant",
      }),
      BONUS,
    );
    expect(score).toBe(100);
  });

  it("score = breakdown toplamı", () => {
    const { score, breakdown } = computeScore(
      base({ userRatingCount: 20, rating: 4.2, photoCount: 3, hasPhone: true }),
      BONUS,
    );
    expect(score).toBe(15 + 15 + 10 + 15);
    expect(breakdown.reduce((s, b) => s + b.points, 0)).toBe(score);
  });

  it("now verilmezse şimdiki zaman kullanılır", () => {
    const { breakdown } = computeScore(
      { photoCount: 0, hasPhone: false, lastReviewAt: new Date() },
      [],
    );
    expect(breakdown.find((b) => b.signal === "recency")?.points).toBe(10);
  });

  it("her sinyalin Türkçe etiketi var", () => {
    for (const s of SCORE_SIGNALS) expect(tr.scoreSignals[s]).toBeTruthy();
  });
});

describe("scoreBand", () => {
  it.each([
    [100, "HOT"],
    [80, "HOT"],
    [79, "WARM"],
    [50, "WARM"],
    [49, "COLD"],
    [0, "COLD"],
  ] as const)("%i → %s", (score, band) => {
    expect(scoreBand(score)).toBe(band);
  });

  it("etiketler: Sıcak / Ilık / Soğuk", () => {
    expect(tr.scoreBands.HOT).toBe("Sıcak");
    expect(tr.scoreBands.WARM).toBe("Ilık");
    expect(tr.scoreBands.COLD).toBe("Soğuk");
  });
});
