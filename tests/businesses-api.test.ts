import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Bellek içi sahte Prisma — sadece bu route'ların kullandığı çağrılar ve argüman şekilleri.
interface BusinessRow {
  id: string;
  placeId: string;
  name: string;
  primaryType: string | null;
  types: string;
  address: string | null;
  city: string;
  district: string | null;
  phone: string | null;
  phoneE164: string | null;
  email: string | null;
  websiteUri: string | null;
  websiteKind: string;
  rating: number | null;
  userRatingCount: number | null;
  photos: string;
  reviews: string;
  openingHours: string | null;
  googleMapsUri: string | null;
  lat: number | null;
  lng: number | null;
  score: number;
  scoreBreakdown: string;
  status: string;
  lastContactedAt: Date | null;
  firstSeenAt: Date;
  lastSyncedAt: Date;
  searchJobId: string | null;
}
interface NoteRow {
  id: string;
  businessId: string;
  body: string;
  createdAt: Date;
}
interface ChangeRow {
  id: string;
  businessId: string;
  from: string;
  to: string;
  createdAt: Date;
}

const store = vi.hoisted(() => ({
  businesses: new Map<string, BusinessRow>(),
  notes: [] as NoteRow[],
  changes: [] as ChangeRow[],
  seq: 0,
}));

function nextId(prefix: string): string {
  store.seq += 1;
  return `${prefix}-${String(store.seq).padStart(4, "0")}`;
}

const newestFirst = <T extends { createdAt: Date; id: string }>(a: T, b: T): number =>
  b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id);

const dbMock = vi.hoisted(() => ({
  business: {
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  statusChange: { findFirst: vi.fn(), create: vi.fn(), delete: vi.fn() },
  note: { create: vi.fn() },
  $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
}));

vi.mock("@/lib/db", () => ({ db: dbMock }));

function installDb(): void {
  dbMock.business.findMany.mockImplementation(async (args: { where?: { id?: { in: string[] } } }) => {
    const ids = args.where?.id?.in;
    const all = [...store.businesses.values()];
    return ids ? all.filter((b) => ids.includes(b.id)) : all;
  });
  dbMock.business.count.mockImplementation(async () => store.businesses.size);
  dbMock.business.findUnique.mockImplementation(
    async (args: { where: { id: string }; include?: unknown }) => {
      const row = store.businesses.get(args.where.id);
      if (!row) return null;
      if (!args.include) return { ...row };
      return {
        ...row,
        notes: store.notes.filter((n) => n.businessId === row.id),
        statusChanges: store.changes.filter((c) => c.businessId === row.id),
      };
    },
  );
  dbMock.business.update.mockImplementation(
    async ({ where, data }: { where: { id: string }; data: Partial<BusinessRow> }) => {
      const existing = store.businesses.get(where.id);
      if (!existing) throw new Error("P2025");
      const row = { ...existing, ...data };
      store.businesses.set(row.id, row);
      return row;
    },
  );
  // Gerçek şemada Note/StatusChange `onDelete: Cascade` → sahte DB de aynı davranır.
  const cascade = (businessId: string): void => {
    store.notes = store.notes.filter((n) => n.businessId !== businessId);
    store.changes = store.changes.filter((c) => c.businessId !== businessId);
  };
  dbMock.business.delete.mockImplementation(async ({ where }: { where: { id: string } }) => {
    const row = store.businesses.get(where.id);
    if (!row) throw new Error("P2025");
    store.businesses.delete(where.id);
    cascade(where.id);
    return row;
  });
  dbMock.business.deleteMany.mockImplementation(
    async ({ where }: { where?: { id?: { in: string[] } } }) => {
      const ids = where?.id?.in ?? [...store.businesses.keys()];
      let count = 0;
      for (const id of ids) {
        if (store.businesses.delete(id)) {
          cascade(id);
          count += 1;
        }
      }
      return { count };
    },
  );
  dbMock.statusChange.findFirst.mockImplementation(
    async ({ where }: { where: { businessId: string; to?: string; id?: { not: string } } }) =>
      store.changes
        .filter(
          (c) =>
            c.businessId === where.businessId &&
            (where.to === undefined || c.to === where.to) &&
            (where.id === undefined || c.id !== where.id.not),
        )
        .sort(newestFirst)[0] ?? null,
  );
  dbMock.statusChange.create.mockImplementation(
    async ({ data }: { data: Omit<ChangeRow, "id" | "createdAt"> & { createdAt?: Date } }) => {
      const row: ChangeRow = { id: nextId("sc"), createdAt: data.createdAt ?? new Date(), ...data };
      store.changes.push(row);
      return row;
    },
  );
  dbMock.statusChange.delete.mockImplementation(async ({ where }: { where: { id: string } }) => {
    const idx = store.changes.findIndex((c) => c.id === where.id);
    if (idx < 0) throw new Error("P2025");
    return store.changes.splice(idx, 1)[0];
  });
  dbMock.note.create.mockImplementation(async ({ data }: { data: { businessId: string; body: string } }) => {
    const row: NoteRow = { id: nextId("note"), createdAt: new Date(), ...data };
    store.notes.push(row);
    return row;
  });
}

import { GET as listRoute } from "@/app/api/businesses/route";
import {
  DELETE as deleteRoute,
  GET as detailRoute,
  PATCH as patchRoute,
} from "@/app/api/businesses/[id]/route";
import { POST as notesRoute } from "@/app/api/businesses/[id]/notes/route";
import { POST as bulkRoute } from "@/app/api/businesses/bulk-status/route";
import { POST as bulkDeleteRoute } from "@/app/api/businesses/bulk-delete/route";
import {
  buildOrderBy,
  buildWhere,
  parseBusinessFilters,
  toBusinessDetail,
  toBusinessListItem,
} from "@/lib/businesses";
import type { BulkStatusResult, BusinessDetail, BusinessListItem, NoteDto, PageMeta } from "@/lib/types";

const DAY = 86_400_000;

function business(id: string, over: Partial<BusinessRow> = {}): BusinessRow {
  const row: BusinessRow = {
    id,
    placeId: `place-${id}`,
    name: `İşletme ${id}`,
    primaryType: "barber_shop",
    types: JSON.stringify(["barber_shop", "establishment"]),
    address: "Dereboyu Cd. 1",
    city: "Lefkoşa",
    district: null,
    phone: "0392 228 12 34",
    phoneE164: "+903922281234",
    email: null,
    websiteUri: null,
    websiteKind: "NONE",
    rating: 4.6,
    userRatingCount: 87,
    photos: JSON.stringify([{ name: "places/x/photos/1", url: "https://maps.googleapis.com/?key=AIzaSIZINTI" }]),
    reviews: JSON.stringify([{ author: "A", rating: 5, text: "İyi", publishTime: "2026-09-01T00:00:00Z" }]),
    openingHours: JSON.stringify(["Pazartesi: 09:00–18:00"]),
    googleMapsUri: "https://maps.google.com/?cid=1",
    lat: 35.18,
    lng: 33.36,
    score: 85,
    scoreBreakdown: JSON.stringify([{ signal: "rating", points: 20 }, { signal: "bogus", points: 5 }]),
    status: "NEW",
    lastContactedAt: null,
    firstSeenAt: new Date("2026-09-01T00:00:00Z"),
    lastSyncedAt: new Date(),
    searchJobId: null,
    ...over,
  };
  store.businesses.set(id, row);
  return row;
}

function jsonRequest(method: string, body: unknown): Request {
  return new Request("http://localhost/api/x", {
    method,
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function ctx(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

async function json<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

interface ErrorBody {
  error: { statusCode: number; code: string };
}

function patch(id: string, body: unknown): Promise<Response> {
  return patchRoute(jsonRequest("PATCH", body), ctx(id));
}

beforeEach(() => {
  store.businesses.clear();
  store.notes.length = 0;
  store.changes.length = 0;
  store.seq = 0;
  vi.clearAllMocks();
  installDb();
});

// ─── Filtreler ──────────────────────────────────────────────────────────────

describe("parseBusinessFilters", () => {
  it("varsayılanlar; boş parametreler yok sayılır", () => {
    const r = parseBusinessFilters(new URLSearchParams("city=&district=&q=%20%20"));
    expect(r).toEqual({ success: true, data: { sort: "score", page: 1, pageSize: 50 } });
  });

  it("tüm alanlar; sayılar coerce", () => {
    const r = parseBusinessFilters(
      new URLSearchParams(
        "city=Girne&district=%20Kad%C4%B1k%C3%B6y%20&web=SOCIAL&category=cafe&status=CONTACTED&band=WARM&q=%20berber%20&sort=recent&page=3&pageSize=200",
      ),
    );
    expect(r).toEqual({
      success: true,
      data: {
        city: "Girne",
        district: "Kadıköy",
        web: "SOCIAL",
        category: "cafe",
        status: "CONTACTED",
        band: "WARM",
        q: "berber",
        sort: "recent",
        page: 3,
        pageSize: 200,
      },
    });
  });

  it.each([
    ["status=FOO"],
    ["band=hot"],
    ["web=social"],
    ["web=INSTAGRAM"],
    ["sort=foo"],
    ["dir=up"],
    ["page=0"],
    ["page=abc"],
    ["pageSize=201"],
    ["page=1.5"],
  ])("geçersiz: %s", (qs) => {
    expect(parseBusinessFilters(new URLSearchParams(qs)).success).toBe(false);
  });
});

describe("buildWhere / buildOrderBy", () => {
  it("eşitlik filtreleri + band aralıkları", () => {
    expect(buildWhere({ city: "Girne", category: "cafe", status: "NEW", band: "HOT" })).toEqual({
      city: "Girne",
      primaryType: "cafe",
      status: "NEW",
      score: { gte: 80 },
    });
    expect(buildWhere({ city: "İstanbul", district: "Kadıköy" })).toEqual({
      city: "İstanbul",
      district: "Kadıköy",
    });
    expect(buildWhere({ web: "PLATFORM" })).toEqual({ websiteKind: "PLATFORM" });
    expect(buildWhere({ band: "WARM" })).toEqual({ score: { gte: 50, lt: 80 } });
    expect(buildWhere({ band: "COLD" })).toEqual({ score: { lt: 50 } });
    expect(buildWhere({})).toEqual({});
  });

  it("q: ad/telefon/E164 contains; telefon rakamları baştaki 0'sız aranır", () => {
    expect(buildWhere({ q: "Yıldız" })).toEqual({
      OR: [{ name: { contains: "Yıldız" } }, { phone: { contains: "Yıldız" } }, { phoneE164: { contains: "Yıldız" } }],
    });
    expect(buildWhere({ q: "0392 228" }).OR).toContainEqual({ phoneE164: { contains: "392228" } });
  });

  it("q: kategori etiketi/kodu → birincil tip ya da types listesi", () => {
    const or = buildWhere({ q: "kafe" }).OR;
    expect(or).toContainEqual({ primaryType: "cafe" });
    expect(or).toContainEqual({ types: { contains: '"cafe"' } });
    expect(buildWhere({ q: "KAFE" }).OR).toContainEqual({ primaryType: "cafe" });
    expect(buildWhere({ q: "restaurant" }).OR).toContainEqual({ primaryType: "seafood_restaurant" });
    expect(buildWhere({ q: "k" }).OR).toHaveLength(3);
  });

  it("kolon sıralaması: varsayılan yön, dir ile ters çevirme, boşlar sonda", () => {
    expect(buildOrderBy("name")).toEqual([{ name: "asc" }, { id: "asc" }]);
    expect(buildOrderBy("name", "desc")).toEqual([{ name: "desc" }, { id: "asc" }]);
    expect(buildOrderBy("category")[0]).toEqual({ primaryType: { sort: "asc", nulls: "last" } });
    expect(buildOrderBy("email", "desc")[0]).toEqual({ email: { sort: "desc", nulls: "last" } });
    expect(buildOrderBy("rating")[0]).toEqual({ rating: { sort: "desc", nulls: "last" } });
    expect(buildOrderBy("lastContact")[0]).toEqual({ lastContactedAt: { sort: "desc", nulls: "last" } });
    expect(buildOrderBy("score", "asc")[0]).toEqual({ score: "asc" });
    for (const sort of ["city", "phone", "status"] as const) {
      expect(buildOrderBy(sort).at(-1)).toEqual({ id: "asc" });
    }
  });

  it("dir parse edilir", () => {
    const r = parseBusinessFilters(new URLSearchParams("sort=name&dir=desc"));
    expect(r.success && r.data.dir).toBe("desc");
  });

  it("sıralama", () => {
    expect(buildOrderBy("score")).toEqual([
      { score: "desc" },
      { userRatingCount: { sort: "desc", nulls: "last" } },
      { id: "asc" },
    ]);
    expect(buildOrderBy("reviews")[0]).toEqual({ userRatingCount: { sort: "desc", nulls: "last" } });
    expect(buildOrderBy("recent")[0]).toEqual({ firstSeenAt: "desc" });
    expect(buildOrderBy()).toEqual(buildOrderBy("score"));
  });
});

// ─── Serileştirme ───────────────────────────────────────────────────────────

describe("toBusinessListItem / toBusinessDetail", () => {
  const now = new Date("2026-09-22T12:00:00Z");

  it("band, isStale, proxy thumbnail (Google URL'si sızmaz), bilinmeyen status → NEW", () => {
    const row = business("b1", {
      status: "ARCHIVED",
      lastSyncedAt: new Date(now.getTime() - 31 * DAY),
      score: 60,
    });
    const item = toBusinessListItem(row, now);
    expect(item).toMatchObject({ band: "WARM", isStale: true, status: "NEW" });
    expect(item.thumbnailUrl).toBe("/api/photo?name=places%2Fx%2Fphotos%2F1");
    expect(JSON.stringify(item)).not.toContain("AIza");

    expect(item.district).toBeNull();
    expect(toBusinessListItem(business("b3", { district: "Kadıköy" }), now).district).toBe("Kadıköy");

    expect(item).toMatchObject({ websiteUri: null, websiteKind: "NONE" });
    const social = toBusinessListItem(
      business("b4", { websiteUri: "https://www.instagram.com/x/", websiteKind: "SOCIAL" }),
      now,
    );
    expect(social).toMatchObject({ websiteUri: "https://www.instagram.com/x/", websiteKind: "SOCIAL" });
    // DB'de bilinmeyen tür → NONE
    expect(toBusinessListItem(business("b5", { websiteKind: "OTHER" }), now).websiteKind).toBe("NONE");

    const fresh = toBusinessListItem(business("b2", { lastSyncedAt: new Date(now.getTime() - 29 * DAY) }), now);
    expect(fresh.isStale).toBe(false);
  });

  it("bozuk JSON → boş diziler; foto yok → thumbnail null", () => {
    const row = business("b1", {
      photos: "bozuk",
      reviews: "{",
      types: "null",
      openingHours: null,
      scoreBreakdown: "x",
    });
    const d = toBusinessDetail({ ...row, notes: [], statusChanges: [] }, now);
    expect(d).toMatchObject({ photos: [], reviews: [], types: [], openingHours: [], scoreBreakdown: [], thumbnailUrl: null });
  });

  it("geçerli JSON; bilinmeyen skor sinyali atlanır; notlar/geçmiş createdAt desc", () => {
    const row = business("b1");
    const d = toBusinessDetail(
      {
        ...row,
        notes: [
          { id: "n1", businessId: "b1", body: "eski", createdAt: new Date("2026-09-01") },
          { id: "n2", businessId: "b1", body: "yeni", createdAt: new Date("2026-09-10") },
        ],
        statusChanges: [
          { id: "s1", businessId: "b1", from: "NEW", to: "QUALIFIED", createdAt: new Date("2026-09-01") },
          { id: "s2", businessId: "b1", from: "QUALIFIED", to: "CONTACTED", createdAt: new Date("2026-09-05") },
        ],
      },
      now,
    );
    expect(d.types).toEqual(["barber_shop", "establishment"]);
    expect(d.reviews).toEqual([{ author: "A", rating: 5, text: "İyi", publishTime: "2026-09-01T00:00:00Z" }]);
    expect(d.scoreBreakdown).toEqual([{ signal: "rating", points: 20 }]);
    expect(d.notes.map((n) => n.body)).toEqual(["yeni", "eski"]);
    expect(d.statusChanges.map((s) => s.id)).toEqual(["s2", "s1"]);
    expect(d.firstSeenAt).toBe("2026-09-01T00:00:00.000Z");
    expect(d.district).toBeNull();
  });
});

// ─── Route'lar ──────────────────────────────────────────────────────────────

describe("GET /api/businesses", () => {
  it("sayfalama + filtre Prisma'ya iletilir; { data, meta }", async () => {
    business("b1");
    business("b2");
    const res = await listRoute(new Request("http://localhost/api/businesses?city=Girne&band=HOT&page=2&pageSize=10&sort=reviews"));
    expect(res.status).toBe(200);
    const body = await json<{ data: BusinessListItem[]; meta: PageMeta }>(res);
    expect(body.meta).toEqual({ page: 2, pageSize: 10, total: 2 });
    expect(body.data).toHaveLength(2);
    expect(dbMock.business.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { city: "Girne", score: { gte: 80 } },
        skip: 10,
        take: 10,
        orderBy: buildOrderBy("reviews"),
      }),
    );
    expect(dbMock.business.count).toHaveBeenCalledWith({ where: { city: "Girne", score: { gte: 80 } } });
  });

  it("district filtresi + listSelect district içerir", async () => {
    business("b1", { city: "İstanbul", district: "Kadıköy" });
    const res = await listRoute(
      new Request("http://localhost/api/businesses?city=%C4%B0stanbul&district=Kad%C4%B1k%C3%B6y"),
    );
    expect(res.status).toBe(200);
    const body = await json<{ data: BusinessListItem[] }>(res);
    expect(body.data[0]?.district).toBe("Kadıköy");
    expect(dbMock.business.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { city: "İstanbul", district: "Kadıköy" },
        select: expect.objectContaining({ district: true }),
      }),
    );
  });

  it("web filtresi websiteKind'e iner; listSelect link alanlarını içerir", async () => {
    business("b1", { websiteUri: "https://www.booking.com/hotel/cy/x.html", websiteKind: "PLATFORM" });
    const res = await listRoute(new Request("http://localhost/api/businesses?web=PLATFORM"));
    expect(res.status).toBe(200);
    const body = await json<{ data: BusinessListItem[] }>(res);
    expect(body.data[0]).toMatchObject({
      websiteUri: "https://www.booking.com/hotel/cy/x.html",
      websiteKind: "PLATFORM",
    });
    expect(dbMock.business.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { websiteKind: "PLATFORM" },
        select: expect.objectContaining({ websiteUri: true, websiteKind: true }),
      }),
    );
  });

  it.each(["status=NOPE", "web=YOUTUBE"])("geçersiz filtre %s → 400 VALIDATION_ERROR", async (qs) => {
    const res = await listRoute(new Request(`http://localhost/api/businesses?${qs}`));
    expect(res.status).toBe(400);
    expect((await json<ErrorBody>(res)).error.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/businesses/[id]", () => {
  it("detay / 404", async () => {
    business("b1");
    const res = await detailRoute(new Request("http://localhost"), ctx("b1"));
    expect((await json<{ data: BusinessDetail }>(res)).data).toMatchObject({ id: "b1", notes: [], statusChanges: [] });
    const missing = await detailRoute(new Request("http://localhost"), ctx("yok"));
    expect(missing.status).toBe(404);
    expect((await json<ErrorBody>(missing)).error.code).toBe("NOT_FOUND");
  });
});

describe("PATCH /api/businesses/[id]", () => {
  it("geçerli geçiş → StatusChange + CONTACTED'da lastContactedAt, tek transaction", async () => {
    business("b1");
    const res = await patch("b1", { status: "CONTACTED" });
    expect(res.status).toBe(200);
    const { data } = await json<{ data: BusinessDetail }>(res);
    expect(data.status).toBe("CONTACTED");
    expect(data.lastContactedAt).not.toBeNull();
    expect(data.statusChanges).toEqual([
      expect.objectContaining({ from: "NEW", to: "CONTACTED", createdAt: data.lastContactedAt }),
    ]);
    expect(dbMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it("CONTACTED dışı geçişte lastContactedAt değişmez", async () => {
    business("b1");
    const { data } = await json<{ data: BusinessDetail }>(await patch("b1", { status: "QUALIFIED" }));
    expect(data).toMatchObject({ status: "QUALIFIED", lastContactedAt: null });
  });

  it("izinsiz geçiş → 400 INVALID_TRANSITION, yazma yok", async () => {
    business("b1");
    const res = await patch("b1", { status: "WON" });
    expect(res.status).toBe(400);
    expect((await json<ErrorBody>(res)).error.code).toBe("INVALID_TRANSITION");
    expect(store.changes).toHaveLength(0);
    expect(store.businesses.get("b1")?.status).toBe("NEW");
  });

  it("LOST → CONTACTED: confirm'süz 409, confirm ile 200", async () => {
    business("b1", { status: "LOST" });
    const res = await patch("b1", { status: "CONTACTED" });
    expect(res.status).toBe(409);
    expect((await json<ErrorBody>(res)).error.code).toBe("CONFIRMATION_REQUIRED");
    expect(store.changes).toHaveLength(0);

    const ok = await patch("b1", { status: "CONTACTED", confirm: true });
    expect(ok.status).toBe(200);
    expect(store.businesses.get("b1")?.status).toBe("CONTACTED");
    expect(store.changes).toHaveLength(1);
  });

  it("aynı duruma PATCH no-op (StatusChange yok)", async () => {
    business("b1", { status: "CONTACTED" });
    const res = await patch("b1", { status: "CONTACTED", email: "a@b.co" });
    expect(res.status).toBe(200);
    expect(store.changes).toHaveLength(0);
    expect(store.businesses.get("b1")?.email).toBe("a@b.co");
  });

  it("undo: son değişikliği geri alır, lastContactedAt önceki CONTACTED'a döner", async () => {
    business("b1", { status: "REPLIED" });
    const first = new Date("2026-09-01T10:00:00Z");
    store.changes.push(
      { id: "sc-a", businessId: "b1", from: "NEW", to: "CONTACTED", createdAt: first },
      { id: "sc-b", businessId: "b1", from: "CONTACTED", to: "REPLIED", createdAt: new Date("2026-09-02T10:00:00Z") },
    );
    store.businesses.set("b1", { ...store.businesses.get("b1")!, lastContactedAt: first });

    const res = await patch("b1", { undo: true });
    expect(res.status).toBe(200);
    const { data } = await json<{ data: BusinessDetail }>(res);
    expect(data.status).toBe("CONTACTED");
    expect(data.lastContactedAt).toBe(first.toISOString());
    expect(store.changes.map((c) => c.id)).toEqual(["sc-a"]);

    // İkinci undo: CONTACTED → NEW, kalan CONTACTED yok → null
    const again = await json<{ data: BusinessDetail }>(await patch("b1", { undo: true }));
    expect(again.data).toMatchObject({ status: "NEW", lastContactedAt: null, statusChanges: [] });

    const none = await patch("b1", { undo: true });
    expect(none.status).toBe(409);
    expect((await json<ErrorBody>(none)).error.code).toBe("NOTHING_TO_UNDO");
  });

  it("şablon kopyala akışı: NEW → CONTACTED sonra undo → NEW", async () => {
    business("b1");
    await patch("b1", { status: "CONTACTED" });
    const { data } = await json<{ data: BusinessDetail }>(await patch("b1", { undo: true }));
    expect(data).toMatchObject({ status: "NEW", lastContactedAt: null });
  });

  it("email: boş string → null, geçersiz → 400; phone → phoneE164 yeniden", async () => {
    business("b1", { email: "eski@x.com" });
    const cleared = await json<{ data: BusinessDetail }>(await patch("b1", { email: "  " }));
    expect(cleared.data.email).toBeNull();

    expect((await patch("b1", { email: "değil-eposta" })).status).toBe(400);

    const phoned = await json<{ data: BusinessDetail }>(await patch("b1", { phone: " 0533 123 45 67 " }));
    expect(phoned.data).toMatchObject({ phone: "0533 123 45 67", phoneE164: "+905331234567" });

    const nulled = await json<{ data: BusinessDetail }>(await patch("b1", { phone: null }));
    expect(nulled.data).toMatchObject({ phone: null, phoneE164: null });
  });

  it.each([
    ["boş gövde", {}],
    ["undo + status", { undo: true, status: "NEW" }],
    ["undo false", { undo: false }],
    ["bilinmeyen status", { status: "FOO" }],
    ["bozuk JSON", "not-json"],
  ])("400: %s", async (_label, body) => {
    business("b1");
    const res = await patch("b1", body);
    expect(res.status).toBe(400);
    expect((await json<ErrorBody>(res)).error.code).toBe("VALIDATION_ERROR");
  });

  it("olmayan id → 404", async () => {
    const res = await patch("yok", { email: "a@b.co" });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/businesses/[id]/notes", () => {
  it("201 + trim; olmayan işletme 404; boş/uzun 400", async () => {
    business("b1");
    const res = await notesRoute(jsonRequest("POST", { body: "  Pazartesi ara  " }), ctx("b1"));
    expect(res.status).toBe(201);
    const { data } = await json<{ data: NoteDto }>(res);
    expect(data).toMatchObject({ body: "Pazartesi ara" });
    expect(new Date(data.createdAt).toISOString()).toBe(data.createdAt);

    const missing = await notesRoute(jsonRequest("POST", { body: "x" }), ctx("yok"));
    expect(missing.status).toBe(404);

    expect((await notesRoute(jsonRequest("POST", { body: "   " }), ctx("b1"))).status).toBe(400);
    expect((await notesRoute(jsonRequest("POST", { body: "a".repeat(2001) }), ctx("b1"))).status).toBe(400);
    expect((await notesRoute(jsonRequest("POST", { body: "a".repeat(2000) }), ctx("b1"))).status).toBe(201);
  });
});

describe("POST /api/businesses/bulk-status", () => {
  it("geçerlileri günceller; onay gerektiren / izinsiz / olmayan atlanır", async () => {
    business("new", { status: "NEW" });
    business("qual", { status: "QUALIFIED" });
    business("lost", { status: "LOST" });
    business("won", { status: "WON" });

    const res = await bulkRoute(
      jsonRequest("POST", { ids: ["new", "qual", "lost", "won", "yok", "new"], status: "CONTACTED" }),
    );
    expect(res.status).toBe(200);
    const { data } = await json<{ data: BulkStatusResult }>(res);
    expect(data.updated).toBe(2);
    expect(data.skipped).toEqual([
      { id: "lost", reason: "CONFIRMATION_REQUIRED" },
      { id: "won", reason: "INVALID_TRANSITION" },
      { id: "yok", reason: "NOT_FOUND" },
    ]);
    expect(store.businesses.get("new")?.status).toBe("CONTACTED");
    expect(store.businesses.get("new")?.lastContactedAt).toBeInstanceOf(Date);
    expect(store.businesses.get("lost")?.status).toBe("LOST");
    expect(store.changes.map((c) => [c.businessId, c.from, c.to])).toEqual([
      ["new", "NEW", "CONTACTED"],
      ["qual", "QUALIFIED", "CONTACTED"],
    ]);
    expect(dbMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it("hiç uygun yoksa transaction açılmaz", async () => {
    business("won", { status: "WON" });
    const { data } = await json<{ data: BulkStatusResult }>(
      await bulkRoute(jsonRequest("POST", { ids: ["won"], status: "LOST" })),
    );
    expect(data).toEqual({ updated: 0, skipped: [{ id: "won", reason: "INVALID_TRANSITION" }] });
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    ["ids boş", { ids: [], status: "NEW" }],
    ["501 id", { ids: Array.from({ length: 501 }, (_, i) => `b${i}`), status: "NEW" }],
    ["status yok", { ids: ["a"] }],
    ["geçersiz status", { ids: ["a"], status: "X" }],
  ])("400: %s", async (_label, body) => {
    const res = await bulkRoute(jsonRequest("POST", body));
    expect(res.status).toBe(400);
  });
});

// ─── Silme ──────────────────────────────────────────────────────────────────

describe("DELETE /api/businesses/[id]", () => {
  it("200 { id }; kayıt ve (cascade) not + durum geçmişi gider", async () => {
    business("b1");
    business("b2");
    store.notes.push({ id: "n1", businessId: "b1", body: "ara", createdAt: new Date() });
    store.notes.push({ id: "n2", businessId: "b2", body: "kalsın", createdAt: new Date() });
    store.changes.push({
      id: "sc-1",
      businessId: "b1",
      from: "NEW",
      to: "CONTACTED",
      createdAt: new Date(),
    });

    const res = await deleteRoute(new Request("http://localhost/api/businesses/b1", { method: "DELETE" }), ctx("b1"));

    expect(res.status).toBe(200);
    expect(await json<{ data: { id: string } }>(res)).toEqual({ data: { id: "b1" } });
    expect(store.businesses.has("b1")).toBe(false);
    expect(store.businesses.has("b2")).toBe(true);
    expect(store.notes.map((n) => n.id)).toEqual(["n2"]);
    expect(store.changes).toHaveLength(0);
  });

  it("olmayan id → 404 NOT_FOUND, silme çağrılmaz", async () => {
    const res = await deleteRoute(new Request("http://localhost/api/businesses/yok", { method: "DELETE" }), ctx("yok"));
    expect(res.status).toBe(404);
    expect((await json<ErrorBody>(res)).error.code).toBe("NOT_FOUND");
    expect(dbMock.business.delete).not.toHaveBeenCalled();
  });

  it("şemada Note/StatusChange onDelete: Cascade", async () => {
    const schema = await readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
    const relations = [...schema.matchAll(/business\s+Business\s+@relation\([^)]*\)/g)].map((m) => m[0]);
    expect(relations).toHaveLength(2);
    for (const relation of relations) expect(relation).toContain("onDelete: Cascade");
  });
});

describe("POST /api/businesses/bulk-delete", () => {
  it("bulunanları siler, olmayanlar sessizce atlanır; tek deleteMany", async () => {
    business("b1");
    business("b2");
    business("b3");
    store.notes.push({ id: "n1", businessId: "b2", body: "x", createdAt: new Date() });

    const res = await bulkDeleteRoute(jsonRequest("POST", { ids: ["b1", "b2", "yok", "b1"] }));

    expect(res.status).toBe(200);
    expect(await json<{ data: { deleted: number } }>(res)).toEqual({ data: { deleted: 2 } });
    expect([...store.businesses.keys()]).toEqual(["b3"]);
    expect(store.notes).toHaveLength(0);
    expect(dbMock.business.deleteMany).toHaveBeenCalledTimes(1);
    // Tekrarlı id'ler teke indirilir
    expect(dbMock.business.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["b1", "b2", "yok"] } } });
  });

  it("hiçbiri yoksa deleted 0", async () => {
    const { data } = await json<{ data: { deleted: number } }>(
      await bulkDeleteRoute(jsonRequest("POST", { ids: ["yok"] })),
    );
    expect(data).toEqual({ deleted: 0 });
  });

  it.each([
    ["ids boş", { ids: [] }],
    ["501 id", { ids: Array.from({ length: 501 }, (_, i) => `b${i}`) }],
    ["ids yok", {}],
    ["ids dizi değil", { ids: "b1" }],
    ["boş id", { ids: [""] }],
    ["bozuk JSON", "not-json"],
  ])("400: %s", async (_label, body) => {
    business("b1");
    const res = await bulkDeleteRoute(jsonRequest("POST", body));
    expect(res.status).toBe(400);
    expect((await json<ErrorBody>(res)).error.code).toBe("VALIDATION_ERROR");
    expect(store.businesses.has("b1")).toBe(true);
  });

  it("500 id sınırı kabul edilir", async () => {
    const res = await bulkDeleteRoute(
      jsonRequest("POST", { ids: Array.from({ length: 500 }, (_, i) => `b${i}`) }),
    );
    expect(res.status).toBe(200);
  });
});
