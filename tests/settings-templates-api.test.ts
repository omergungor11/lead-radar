import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Bellek içi sahte Prisma: sadece bu route'ların kullandığı çağrılar.
interface SettingRow {
  key: string;
  value: string;
}
interface TemplateRow {
  id: string;
  name: string;
  channel: string;
  body: string;
  createdAt: Date;
}
interface BusinessRow {
  id: string;
  primaryType: string | null;
  types: string;
  phone: string | null;
  phoneE164: string | null;
  rating: number | null;
  userRatingCount: number | null;
  photos: string;
  reviews: string;
  score: number;
  scoreBreakdown: string;
}

const store = vi.hoisted(() => ({
  settings: new Map<string, SettingRow>(),
  templates: new Map<string, TemplateRow>(),
  businesses: new Map<string, BusinessRow>(),
  seq: 0,
}));

vi.mock("@/lib/db", () => ({
  db: {
    setting: {
      findUnique: vi.fn(async ({ where }: { where: { key: string } }) => store.settings.get(where.key) ?? null),
      upsert: vi.fn(
        async ({ where, update, create }: { where: { key: string }; update: { value: string }; create: SettingRow }) => {
          const existing = store.settings.get(where.key);
          const row = existing ? { ...existing, ...update } : { ...create };
          store.settings.set(where.key, row);
          return row;
        },
      ),
    },
    messageTemplate: {
      findMany: vi.fn(async () =>
        [...store.templates.values()].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
      ),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => store.templates.get(where.id) ?? null),
      create: vi.fn(async ({ data }: { data: Omit<TemplateRow, "id" | "createdAt"> }) => {
        store.seq += 1;
        const row: TemplateRow = { id: `tpl-${store.seq}`, createdAt: new Date(Date.UTC(2026, 0, store.seq)), ...data };
        store.templates.set(row.id, row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<TemplateRow> }) => {
        const existing = store.templates.get(where.id);
        if (!existing) throw new Error("P2025");
        const row = { ...existing, ...data };
        store.templates.set(row.id, row);
        return row;
      }),
      deleteMany: vi.fn(async ({ where }: { where: { id: string } }) => ({
        count: store.templates.delete(where.id) ? 1 : 0,
      })),
    },
    business: {
      findMany: vi.fn(async () => [...store.businesses.values()]),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<BusinessRow> }) => {
        const existing = store.businesses.get(where.id);
        if (!existing) throw new Error("P2025");
        const row = { ...existing, ...data };
        store.businesses.set(row.id, row);
        return row;
      }),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

import { GET as getSettings } from "@/app/api/settings/route";
import { GET as getSetting, PUT as putSetting } from "@/app/api/settings/[key]/route";
import { GET as listTemplates, POST as createTemplate } from "@/app/api/templates/route";
import { DELETE as deleteTemplate, PUT as updateTemplate } from "@/app/api/templates/[id]/route";
import { POST as rescore } from "@/app/api/businesses/rescore/route";
import { DEFAULT_CITIES } from "@/lib/config";
import { SETTING_MAX_ITEMS } from "@/lib/settings";

const OPT_OUT = 'Bu tür mesajlar almak istemiyorsanız "istemiyorum" yazmanız yeterli.';

function jsonRequest(method: string, body: unknown): Request {
  return new Request("http://localhost/api/x", {
    method,
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function ctx<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return { params: Promise.resolve(params) };
}

async function json<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

interface ErrorBody {
  error: { statusCode: number; code: string; details?: { path: string }[] };
}

beforeEach(() => {
  store.settings.clear();
  store.templates.clear();
  store.businesses.clear();
  store.seq = 0;
  vi.stubEnv("ADMIN_PASSWORD", "x");
  vi.stubEnv("SESSION_SECRET", "s".repeat(32));
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/settings", () => {
  it("kayıt yoksa varsayılanlar; anahtar değeri sızmaz", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "AIzaGIZLI");
    vi.stubEnv("PLACES_MOCK", "1");
    const res = await getSettings();
    const raw = await res.text();
    expect(raw).not.toContain("AIza");
    const { data } = JSON.parse(raw) as { data: Record<string, unknown> };
    expect(data).toEqual({
      cities: [...DEFAULT_CITIES],
      bonusCategories: expect.arrayContaining(["restaurant"]) as unknown,
      placesKeyConfigured: true,
      placesMock: true,
    });
  });

  it("anahtar boş → placesKeyConfigured false", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", " ");
    vi.stubEnv("PLACES_MOCK", "");
    const { data } = await json<{ data: { placesKeyConfigured: boolean; placesMock: boolean } }>(
      await getSettings(),
    );
    expect(data.placesKeyConfigured).toBe(false);
    expect(data.placesMock).toBe(false);
  });

  it("bozuk JSON kayıt → varsayılan", async () => {
    store.settings.set("cities", { key: "cities", value: "{bozuk" });
    const { data } = await json<{ data: { cities: string[] } }>(await getSettings());
    expect(data.cities).toEqual([...DEFAULT_CITIES]);
  });
});

describe("/api/settings/[key]", () => {
  it("geçersiz key → 404 NOT_FOUND (GET ve PUT)", async () => {
    const g = await getSetting(new Request("http://localhost"), ctx({ key: "apiKey" }));
    expect(g.status).toBe(404);
    const p = await putSetting(jsonRequest("PUT", { value: ["a"] }), ctx({ key: "apiKey" }));
    expect(p.status).toBe(404);
    expect((await json<ErrorBody>(p)).error.code).toBe("NOT_FOUND");
  });

  it("PUT: trim, boşları at, büyük/küçük harf duyarsız tekrarları at", async () => {
    const res = await putSetting(
      jsonRequest("PUT", { value: ["  Girne ", "", "   ", "girne", "İskele", "iskele", "GİRNE", "Lefkoşa"] }),
      ctx({ key: "cities" }),
    );
    expect(res.status).toBe(200);
    expect(await json<unknown>(res)).toEqual({
      data: { key: "cities", value: ["Girne", "İskele", "Lefkoşa"] },
    });

    const got = await getSetting(new Request("http://localhost"), ctx({ key: "cities" }));
    expect(await json<unknown>(got)).toEqual({
      data: { key: "cities", value: ["Girne", "İskele", "Lefkoşa"] },
    });
  });

  it("PUT: boş liste kabul edilir", async () => {
    const res = await putSetting(jsonRequest("PUT", { value: [] }), ctx({ key: "bonusCategories" }));
    expect(await json<unknown>(res)).toEqual({ data: { key: "bonusCategories", value: [] } });
  });

  it.each([
    ["value yok", {}],
    ["string değil", { value: "Girne" }],
    ["sayı öğe", { value: [1] }],
    ["61 karakter", { value: ["a".repeat(61)] }],
    ["max+1 öğe", { value: Array.from({ length: SETTING_MAX_ITEMS + 1 }, (_, i) => `s${i}`) }],
    ["bozuk JSON", "not-json"],
  ])("PUT 400: %s", async (_label, body) => {
    const res = await putSetting(jsonRequest("PUT", body), ctx({ key: "cities" }));
    expect(res.status).toBe(400);
    expect((await json<ErrorBody>(res)).error.code).toBe("VALIDATION_ERROR");
  });

  it("PUT: 60 karakter (trim sonrası) ve max öğe kabul", async () => {
    const res = await putSetting(
      jsonRequest("PUT", {
        value: [`  ${"a".repeat(60)}  `, ...Array.from({ length: SETTING_MAX_ITEMS - 1 }, (_, i) => `s${i}`)],
      }),
      ctx({ key: "cities" }),
    );
    expect(res.status).toBe(200);
    expect((await json<{ data: { value: string[] } }>(res)).data.value).toHaveLength(SETTING_MAX_ITEMS);
  });
});

describe("/api/templates", () => {
  interface TplBody {
    data: { id: string; name: string; channel: string; body: string; createdAt: string; hasOptOut: boolean };
  }

  it("POST → 201 Template; GET createdAt artan", async () => {
    const a = await createTemplate(jsonRequest("POST", { name: " İlk ", channel: "WHATSAPP", body: `Merhaba\n${OPT_OUT}` }));
    expect(a.status).toBe(201);
    const created = (await json<TplBody>(a)).data;
    expect(created).toMatchObject({ name: "İlk", channel: "WHATSAPP", hasOptOut: true });
    expect(new Date(created.createdAt).toISOString()).toBe(created.createdAt);

    await createTemplate(jsonRequest("POST", { name: "İkinci", channel: "EMAIL", body: "Opt-out yok" }));
    const list = await json<{ data: TplBody["data"][] }>(await listTemplates());
    expect(list.data.map((t) => t.name)).toEqual(["İlk", "İkinci"]);
    expect(list.data[1]?.hasOptOut).toBe(false);
  });

  it.each([
    ["ad boş", { name: "  ", channel: "EMAIL", body: "x" }],
    ["ad 81", { name: "a".repeat(81), channel: "EMAIL", body: "x" }],
    ["kanal", { name: "a", channel: "SMS", body: "x" }],
    ["gövde boş", { name: "a", channel: "EMAIL", body: "   " }],
    ["gövde 2001", { name: "a", channel: "EMAIL", body: "a".repeat(2001) }],
  ])("POST 400: %s", async (_label, body) => {
    const res = await createTemplate(jsonRequest("POST", body));
    expect(res.status).toBe(400);
    expect((await json<ErrorBody>(res)).error.code).toBe("VALIDATION_ERROR");
  });

  it("PUT kısmi güncelleme; hasOptOut yeniden hesaplanır", async () => {
    const { data } = await json<TplBody>(
      await createTemplate(jsonRequest("POST", { name: "A", channel: "EMAIL", body: "yok" })),
    );
    const res = await updateTemplate(jsonRequest("PUT", { body: OPT_OUT }), ctx({ id: data.id }));
    expect(res.status).toBe(200);
    expect((await json<TplBody>(res)).data).toMatchObject({ id: data.id, name: "A", channel: "EMAIL", hasOptOut: true });
  });

  it("PUT boş gövde → 400; olmayan id → 404", async () => {
    const { data } = await json<TplBody>(
      await createTemplate(jsonRequest("POST", { name: "A", channel: "EMAIL", body: "x" })),
    );
    expect((await updateTemplate(jsonRequest("PUT", {}), ctx({ id: data.id }))).status).toBe(400);
    const res = await updateTemplate(jsonRequest("PUT", { name: "B" }), ctx({ id: "yok" }));
    expect(res.status).toBe(404);
    expect((await json<ErrorBody>(res)).error.code).toBe("NOT_FOUND");
  });

  it("DELETE → { id }; ikinci kez 404", async () => {
    const { data } = await json<TplBody>(
      await createTemplate(jsonRequest("POST", { name: "A", channel: "EMAIL", body: "x" })),
    );
    const res = await deleteTemplate(new Request("http://localhost", { method: "DELETE" }), ctx({ id: data.id }));
    expect(await json<unknown>(res)).toEqual({ data: { id: data.id } });
    const again = await deleteTemplate(new Request("http://localhost", { method: "DELETE" }), ctx({ id: data.id }));
    expect(again.status).toBe(404);
  });
});

describe("POST /api/businesses/rescore", () => {
  it("boş DB → updated 0", async () => {
    expect(await json<unknown>(await rescore())).toEqual({ data: { updated: 0 } });
  });

  it("DB'deki bonus listesiyle yeniden hesaplar", async () => {
    store.settings.set("bonusCategories", { key: "bonusCategories", value: JSON.stringify(["florist"]) });
    store.businesses.set("b1", {
      id: "b1",
      primaryType: "store",
      types: JSON.stringify(["store", "florist"]),
      phone: "0392 228 12 34",
      phoneE164: null,
      rating: 4.6,
      userRatingCount: 20,
      photos: JSON.stringify([{ name: "p1", url: "" }, { name: "p2", url: "" }, { name: "p3", url: "" }]),
      reviews: JSON.stringify([
        { author: "a", rating: 5, text: "", publishTime: "2000-01-01T00:00:00Z" },
        { author: "b", rating: 5, text: "", publishTime: new Date().toISOString() },
      ]),
      score: 0,
      scoreBreakdown: "[]",
    });
    store.businesses.set("b2", {
      id: "b2",
      primaryType: null,
      types: "bozuk",
      phone: null,
      phoneE164: null,
      rating: null,
      userRatingCount: null,
      photos: "bozuk",
      reviews: "bozuk",
      score: 42,
      scoreBreakdown: "[]",
    });

    expect(await json<unknown>(await rescore())).toEqual({ data: { updated: 2 } });
    // 15 yorum + 20 puan + 10 foto + 15 telefon + 10 güncel yorum + 10 bonus
    expect(store.businesses.get("b1")?.score).toBe(80);
    const breakdown = JSON.parse(store.businesses.get("b1")?.scoreBreakdown ?? "[]") as { signal: string; points: number }[];
    expect(breakdown.find((b) => b.signal === "category")?.points).toBe(10);
    expect(store.businesses.get("b2")?.score).toBe(0);
  });
});
