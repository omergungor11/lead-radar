import { afterEach, describe, expect, it, vi } from "vitest";
import {
  circleRestriction,
  createPlacesClient,
  DETAILS_FIELD_MASK,
  getPlacesClient,
  PlacesError,
  TEXT_SEARCH_FIELD_MASK,
} from "@/lib/places";
import {
  createMockPlacesClient,
  getMockAllFixtures,
  getMockSavedFixtures,
  haversineMeters,
} from "@/lib/places.mock";
import { classifyWebsite, isLeadWebsite } from "@/lib/website";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const noSleep = vi.fn(async () => {});

function headersOf(init: RequestInit | undefined): Record<string, string> {
  return (init?.headers ?? {}) as Record<string, string>;
}

describe("createPlacesClient", () => {
  it("Text Search: field mask birebir 5 alan, POST gövdesi ve anahtar header'ı", async () => {
    const fetchMock = vi.fn<(url: string | URL | Request, init?: RequestInit) => Promise<Response>>(async () =>
      jsonResponse({
        places: [{ id: "p1", displayName: { text: "A" }, businessStatus: "OPERATIONAL" }],
        nextPageToken: "tok2",
      }),
    );
    const client = createPlacesClient("KEY123", { fetch: fetchMock as typeof fetch, sleep: noSleep });

    const result = await client.searchText("berber Lefkoşa", "tok1");

    expect(TEXT_SEARCH_FIELD_MASK).toBe(
      "places.id,places.displayName,places.websiteUri,places.businessStatus,nextPageToken",
    );
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://places.googleapis.com/v1/places:searchText");
    expect(init?.method).toBe("POST");
    const headers = headersOf(init);
    expect(headers["X-Goog-FieldMask"]).toBe(TEXT_SEARCH_FIELD_MASK);
    expect(headers["X-Goog-Api-Key"]).toBe("KEY123");
    expect(JSON.parse(String(init?.body))).toEqual({
      textQuery: "berber Lefkoşa",
      languageCode: "tr",
      pageSize: 20,
      pageToken: "tok1",
    });
    expect(result).toEqual({
      places: [{ id: "p1", displayName: { text: "A" }, businessStatus: "OPERATIONAL" }],
      nextPageToken: "tok2",
    });
  });

  it("alan araması: gövdeye locationRestriction eklenir, field mask değişmez", async () => {
    const fetchMock = vi.fn<(url: string | URL | Request, init?: RequestInit) => Promise<Response>>(async () =>
      jsonResponse({ places: [] }),
    );
    const client = createPlacesClient("KEY", { fetch: fetchMock as typeof fetch, sleep: noSleep });

    await client.searchText("berber", undefined, {
      locationRestriction: circleRestriction({ lat: 35.1854, lng: 33.361, radiusM: 2500 }),
    });

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(init?.body))).toEqual({
      textQuery: "berber",
      languageCode: "tr",
      pageSize: 20,
      locationRestriction: {
        circle: { center: { latitude: 35.1854, longitude: 33.361 }, radius: 2500 },
      },
    });
    expect(headersOf(init)["X-Goog-FieldMask"]).toBe(TEXT_SEARCH_FIELD_MASK);
  });

  it("Details: GET, field mask, foto ve yorum en fazla 5", async () => {
    const fetchMock = vi.fn<(url: string | URL | Request, init?: RequestInit) => Promise<Response>>(async () =>
      jsonResponse({
        id: "p1",
        photos: Array.from({ length: 8 }, (_, i) => ({ name: `places/p1/photos/ph${i}` })),
        reviews: Array.from({ length: 7 }, (_, i) => ({ rating: 5, text: { text: `y${i}` } })),
      }),
    );
    const client = createPlacesClient("KEY", { fetch: fetchMock as typeof fetch, sleep: noSleep });

    const details = await client.getDetails("p1");

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://places.googleapis.com/v1/places/p1?languageCode=tr");
    expect(init?.method).toBe("GET");
    expect(headersOf(init)["X-Goog-FieldMask"]).toBe(DETAILS_FIELD_MASK);
    expect(DETAILS_FIELD_MASK.split(",")).toHaveLength(16);
    expect(details.photos).toHaveLength(5);
    expect(details.reviews).toHaveLength(5);
  });

  it("429 sonrası geri çekilip tekrar dener ve başarır", async () => {
    const fetchMock = vi
      .fn<(url: string | URL | Request, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(jsonResponse({ error: {} }, 429))
      .mockResolvedValueOnce(jsonResponse({ error: {} }, 503))
      .mockResolvedValueOnce(jsonResponse({ places: [] }));
    const sleep = vi.fn(async () => {});
    const client = createPlacesClient("KEY", { fetch: fetchMock as typeof fetch, sleep, baseBackoffMs: 100 });

    await expect(client.searchText("x")).resolves.toEqual({ places: [], nextPageToken: undefined });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map((c: unknown[]) => c[0])).toEqual([100, 200]);
  });

  it("3 başarısız denemeden sonra PlacesError fırlatır", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}, 429));
    const client = createPlacesClient("KEY", { fetch: fetchMock as typeof fetch, sleep: noSleep });

    const error = await client.searchText("x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PlacesError);
    expect((error as PlacesError).httpStatus).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("4xx (429 hariç) tekrar denenmez", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}, 403));
    const client = createPlacesClient("KEY", { fetch: fetchMock as typeof fetch, sleep: noSleep });
    await expect(client.getDetails("p1")).rejects.toBeInstanceOf(PlacesError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("şemaya uymayan yanıt → PlacesError", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ places: [{ displayName: "id yok" }] }));
    const client = createPlacesClient("KEY", { fetch: fetchMock as typeof fetch, sleep: noSleep });
    await expect(client.searchText("x")).rejects.toBeInstanceOf(PlacesError);
  });

  it("getPhotoUri: skipHttpRedirect ile photoUri döner", async () => {
    const fetchMock = vi.fn<(url: string | URL | Request, init?: RequestInit) => Promise<Response>>(async () =>
      jsonResponse({ name: "places/p/photos/x/media", photoUri: "https://lh3.googleusercontent.com/abc" }),
    );
    const client = createPlacesClient("KEY", { fetch: fetchMock as typeof fetch, sleep: noSleep });
    await expect(client.getPhotoUri("places/p/photos/x", 400)).resolves.toBe(
      "https://lh3.googleusercontent.com/abc",
    );
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://places.googleapis.com/v1/places/p/photos/x/media?maxWidthPx=400&skipHttpRedirect=true",
    );
  });
});

describe("getPlacesClient", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  function setEnv(extra: Record<string, string | undefined>): void {
    process.env.ADMIN_PASSWORD = "x";
    process.env.SESSION_SECRET = "s".repeat(32);
    for (const [k, v] of Object.entries(extra)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }

  it("anahtar yok + mock kapalı → null", () => {
    setEnv({ PLACES_MOCK: undefined, GOOGLE_PLACES_API_KEY: "" });
    expect(getPlacesClient()).toBeNull();
  });

  it("PLACES_MOCK=1 → istemci döner (anahtarsız)", () => {
    setEnv({ PLACES_MOCK: "1", GOOGLE_PLACES_API_KEY: undefined });
    expect(getPlacesClient()).not.toBeNull();
  });
});

describe("mock istemci", () => {
  it("17 kaydedilecek (2 sosyal/platform linkli) + 2 siteli + 1 kapalı; fotoğraf adları mock/photo-n", () => {
    const all = getMockAllFixtures();
    expect(all).toHaveLength(20);
    const saved = getMockSavedFixtures();
    expect(saved).toHaveLength(17);
    expect(
      saved.every((f) => isLeadWebsite(f.details.websiteUri) && f.details.businessStatus === "OPERATIONAL"),
    ).toBe(true);
    expect(saved.map((f) => classifyWebsite(f.details.websiteUri).kind).filter((k) => k !== "NONE").sort()).toEqual([
      "PLATFORM",
      "SOCIAL",
    ]);
    expect(all.filter((f) => classifyWebsite(f.details.websiteUri).kind === "WEBSITE")).toHaveLength(2);
    expect(all.filter((f) => f.details.businessStatus !== "OPERATIONAL")).toHaveLength(1);
    const names = all.flatMap((f) => (f.details.photos ?? []).map((p) => p.name));
    expect(names.every((n) => /^mock\/photo-\d+$/.test(n))).toBe(true);
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(saved.map((f) => f.city))).toEqual(
      new Set(["Lefkoşa", "Girne", "Gazimağusa", "Güzelyurt", "İskele"]),
    );
  });

  it("şehirsiz sorgu 2 sayfada 20 sonuç; şehirli sorgu o şehrin işletmeleri + 3 hariç kayıt", async () => {
    const client = createMockPlacesClient();
    const p1 = await client.searchText("berber");
    expect(p1.places).toHaveLength(10);
    expect(p1.nextPageToken).toBeDefined();
    const p2 = await client.searchText("berber", p1.nextPageToken);
    expect(p2.places).toHaveLength(10);
    expect(p2.nextPageToken).toBeUndefined();

    const girne = await client.searchText("kafe Girne");
    expect(girne.places).toHaveLength(7); // 4 Girne + 2 siteli + 1 kapalı
    const iskele = await client.searchText("kafe İskele");
    expect(iskele.places).toHaveLength(6);
  });

  it("locationRestriction: mesafeye göre filtreler, şehir metnini yok sayar", async () => {
    const client = createMockPlacesClient();
    const girneCenter = { lat: 35.3396, lng: 33.3205 };
    const restriction = (radiusM: number): { locationRestriction: ReturnType<typeof circleRestriction> } => ({
      locationRestriction: circleRestriction({ ...girneCenter, radiusM }),
    });

    // Sorguda "Lefkoşa" geçse de coğrafyayı daire belirler
    const near = await client.searchText("kafe Lefkoşa", undefined, restriction(3000));
    expect(near.places.map((p) => p.id).sort()).toEqual([
      "mock-place-04",
      "mock-place-05",
      "mock-place-06",
      "mock-place-17",
    ]);
    expect(near.nextPageToken).toBeUndefined();

    // Yarıçap büyükse hepsi (2 sayfa)
    const wide = await client.searchText("kafe", undefined, restriction(200_000));
    expect(wide.places).toHaveLength(10);
    expect(wide.nextPageToken).toBeDefined();
    const wide2 = await client.searchText("kafe", wide.nextPageToken, restriction(200_000));
    expect(wide2.places).toHaveLength(10);

    // Dar yarıçap → yalnız en yakın
    const tiny = await client.searchText("kafe", undefined, restriction(200));
    expect(tiny.places.map((p) => p.id)).toEqual(["mock-place-06"]);

    // Restriction yoksa şehir eşleşmesi davranışı aynı kalır
    const byCity = await client.searchText("kafe Girne");
    expect(byCity.places).toHaveLength(7);
  });

  it("haversineMeters bilinen mesafeyi hesaplar", () => {
    expect(haversineMeters({ lat: 35.3396, lng: 33.3205 }, { lat: 35.3396, lng: 33.3205 })).toBe(0);
    // 1 derece enlem ≈ 111 km
    expect(haversineMeters({ lat: 35, lng: 33 }, { lat: 36, lng: 33 })).toBeCloseTo(111_195, -2);
    // Lefkoşa – Girne ≈ 17 km
    expect(haversineMeters({ lat: 35.1854, lng: 33.361 }, { lat: 35.3396, lng: 33.3205 })).toBeGreaterThan(15_000);
    expect(haversineMeters({ lat: 35.1854, lng: 33.361 }, { lat: 35.3396, lng: 33.3205 })).toBeLessThan(20_000);
  });

  it("son 30 günde yorumu olan 5 işletme var (göreli tarih)", () => {
    const now = new Date("2026-09-22T12:00:00Z");
    const recent = getMockSavedFixtures(now).filter((f) =>
      (f.details.reviews ?? []).some(
        (r) => r.publishTime && now.getTime() - new Date(r.publishTime).getTime() <= 30 * 86_400_000,
      ),
    );
    expect(recent.map((f) => f.details.id).sort()).toEqual([
      "mock-place-01",
      "mock-place-04",
      "mock-place-07",
      "mock-place-16",
      "mock-place-17",
    ]);
  });
});
