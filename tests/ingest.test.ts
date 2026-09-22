import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_BONUS_CATEGORIES } from "@/lib/config";
import type { PlaceDetails } from "@/lib/places";
import { getMockSavedFixtures } from "@/lib/places.mock";
import { toScoreInput } from "@/lib/rescore";
import { computeScore, scoreBand } from "@/lib/scoring";

interface UpsertArgs {
  where: { placeId: string };
  create: Record<string, unknown>;
  update: Record<string, unknown>;
}

const mocks = vi.hoisted(() => ({
  upsert: vi.fn(async (args: UpsertArgs): Promise<Record<string, unknown>> => ({
    id: "b1",
    district: null,
    ...args.create,
  })),
  updateMany: vi.fn(async () => ({ count: 1 })),
  getSetting: vi.fn(async () => ["restaurant"]),
}));

vi.mock("@/lib/db", () => ({ db: { business: { upsert: mocks.upsert, updateMany: mocks.updateMany } } }));
vi.mock("@/lib/settings", () => ({ getSetting: mocks.getSetting }));

const { upsertBusiness, mapDetailsToFields } = await import("@/lib/ingest");

const DETAILS: PlaceDetails = {
  id: "place-1",
  displayName: { text: "Test Lokantası" },
  formattedAddress: "Adres 1, Lefkoşa",
  nationalPhoneNumber: "0392 228 12 34",
  internationalPhoneNumber: "+90 392 228 12 34",
  rating: 4.6,
  userRatingCount: 120,
  primaryType: "restaurant",
  types: ["restaurant", "food"],
  regularOpeningHours: { weekdayDescriptions: ["Pazartesi: 09:00–18:00"] },
  photos: [{ name: "places/place-1/photos/a" }, { name: "places/place-1/photos/b" }],
  reviews: [
    {
      rating: 5,
      text: { text: "Harika" },
      authorAttribution: { displayName: "Ali" },
      publishTime: "2026-09-01T10:00:00Z",
    },
    { rating: 4, originalText: { text: "Güzel" }, publishTime: "2026-08-01T10:00:00Z" },
  ],
  googleMapsUri: "https://maps.google.com/?cid=1",
  location: { latitude: 35.1, longitude: 33.3 },
  businessStatus: "OPERATIONAL",
};

beforeEach(() => {
  mocks.upsert.mockClear();
  mocks.updateMany.mockClear();
  mocks.getSetting.mockClear();
});

describe("mapDetailsToFields", () => {
  it("fotoğraflar proxy URL'si, yorumlar DTO'ya, telefon E.164'e", () => {
    const f = mapDetailsToFields(DETAILS);
    expect(f.name).toBe("Test Lokantası");
    expect(f.phone).toBe("0392 228 12 34");
    expect(f.phoneE164).toBe("+903922281234");
    expect(JSON.parse(f.photos)).toEqual([
      { name: "places/place-1/photos/a", url: "/api/photo?name=places%2Fplace-1%2Fphotos%2Fa" },
      { name: "places/place-1/photos/b", url: "/api/photo?name=places%2Fplace-1%2Fphotos%2Fb" },
    ]);
    expect(JSON.parse(f.reviews)).toEqual([
      { author: "Ali", rating: 5, text: "Harika", publishTime: "2026-09-01T10:00:00Z" },
      { author: "", rating: 4, text: "Güzel", publishTime: "2026-08-01T10:00:00Z" },
    ]);
    expect(JSON.parse(f.openingHours ?? "null")).toEqual(["Pazartesi: 09:00–18:00"]);
    expect(f.lat).toBe(35.1);
    expect(JSON.parse(f.types)).toEqual(["restaurant", "food"]);
  });

  it("uluslararası numara yoksa ulusaldan E.164, telefon yoksa null", () => {
    expect(mapDetailsToFields({ ...DETAILS, internationalPhoneNumber: undefined }).phoneE164).toBe(
      "+903922281234",
    );
    const none = mapDetailsToFields({ id: "x" });
    expect(none).toMatchObject({ name: "x", phone: null, phoneE164: null, openingHours: null });
    expect(none.photos).toBe("[]");
  });
});

describe("upsertBusiness", () => {
  it("placeId ile upsert; update status/email/lastContactedAt/city/notlara dokunmaz", async () => {
    const now = new Date("2026-09-22T12:00:00Z");
    await upsertBusiness(DETAILS, "Lefkoşa", "job-1", { now });

    const args = mocks.upsert.mock.calls[0]?.[0];
    expect(args?.where).toEqual({ placeId: "place-1" });

    for (const key of ["status", "email", "lastContactedAt", "city", "notes", "statusChanges", "firstSeenAt"]) {
      expect(args?.update).not.toHaveProperty(key);
    }
    expect(args?.update).toMatchObject({
      name: "Test Lokantası",
      lastSyncedAt: now,
      searchJobId: "job-1",
    });
    expect(typeof args?.update.score).toBe("number");
    expect(typeof args?.update.scoreBreakdown).toBe("string");

    expect(args?.create).toMatchObject({ placeId: "place-1", city: "Lefkoşa", searchJobId: "job-1" });
    expect(args?.create).not.toHaveProperty("status");
    expect(args?.create).not.toHaveProperty("email");
  });

  it("skor DB bonus kategorileriyle hesaplanır (restaurant +10)", async () => {
    const now = new Date("2026-09-22T12:00:00Z");
    await upsertBusiness(DETAILS, "Lefkoşa", null, { now });
    const args = mocks.upsert.mock.calls[0]?.[0];
    const breakdown = JSON.parse(String(args?.update.scoreBreakdown)) as { signal: string; points: number }[];
    expect(breakdown.find((b) => b.signal === "category")?.points).toBe(10);
    // 120 yorum 30 + 4.6 puan 20 + 2 foto 5 + telefon 15 + 21 gün önce yorum 10 + kategori 10
    expect(args?.update.score).toBe(90);
    expect(mocks.getSetting).toHaveBeenCalledOnce();
  });

  it("jobId null → searchJobId yazılmaz (Yenile mevcut bağı korur)", async () => {
    await upsertBusiness(DETAILS, "Girne", null, { bonusCategories: [] });
    const args = mocks.upsert.mock.calls[0]?.[0];
    expect(args?.update).not.toHaveProperty("searchJobId");
    expect(args?.create).not.toHaveProperty("searchJobId");
    expect(mocks.getSetting).not.toHaveBeenCalled();
  });
});

describe("upsertBusiness district", () => {
  it("create: district yazılır, update'te yok; yeni kayıt → ek sorgu yok", async () => {
    const b = await upsertBusiness(DETAILS, "İstanbul", "job-1", { bonusCategories: [], district: "Kadıköy" });
    const args = mocks.upsert.mock.calls[0]?.[0];
    expect(args?.create).toMatchObject({ city: "İstanbul", district: "Kadıköy" });
    expect(args?.update).not.toHaveProperty("district");
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(b.district).toBe("Kadıköy");
  });

  it("mevcut kayıtta district dolu → korunur (komşu ilçe araması)", async () => {
    mocks.upsert.mockResolvedValueOnce({ id: "b1", district: "Kadıköy" });
    const b = await upsertBusiness(DETAILS, "İstanbul", "job-2", { bonusCategories: [], district: "Üsküdar" });
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(b.district).toBe("Kadıköy");
  });

  it("mevcut kayıtta district NULL → koşullu doldurulur", async () => {
    mocks.upsert.mockResolvedValueOnce({ id: "b1", district: null });
    const b = await upsertBusiness(DETAILS, "İstanbul", "job-3", { bonusCategories: [], district: "Üsküdar" });
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "b1", district: null },
      data: { district: "Üsküdar" },
    });
    expect(b.district).toBe("Üsküdar");
  });

  it("district verilmez (Yenile / il geneli) → district'e dokunulmaz", async () => {
    mocks.upsert.mockResolvedValueOnce({ id: "b1", district: null });
    await upsertBusiness(DETAILS, "İstanbul", null, { bonusCategories: [] });
    const args = mocks.upsert.mock.calls[0]?.[0];
    expect(args?.create).not.toHaveProperty("district");
    expect(args?.update).not.toHaveProperty("district");
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});

describe("mock fixture skorları", () => {
  it("üç bant da temsil ediliyor", () => {
    const now = new Date("2026-09-22T12:00:00Z");
    const bands = getMockSavedFixtures(now).map(({ details }) => {
      const { score } = computeScore(toScoreInput(mapDetailsToFields(details), now), DEFAULT_BONUS_CATEGORIES);
      return scoreBand(score);
    });
    expect(new Set(bands)).toEqual(new Set(["HOT", "WARM", "COLD"]));
  });
});
