import type { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEARCH_RADIUS_MAX_M, SEARCH_RADIUS_MIN_M } from "@/lib/geo";
import type { SearchProgress } from "@/lib/types";

interface JobRow {
  id: string;
  query: string;
  city: string;
  district: string | null;
  lat: number | null;
  lng: number | null;
  radiusM: number | null;
  status: string;
  scanned: number;
  withoutWebsite: number;
  linkOnly: number;
  saved: number;
  estimatedCost: number;
  error: string | null;
  startedAt: Date;
  finishedAt: Date | null;
}

const store = vi.hoisted(() => ({ jobs: new Map<string, JobRow>(), seq: 0 }));
const startSearchJob = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  db: {
    searchJob: {
      create: vi.fn(
        async ({
          data,
        }: {
          data: {
            query: string;
            city: string;
            district: string | null;
            lat: number | null;
            lng: number | null;
            radiusM: number | null;
            status: string;
          };
        }) => {
          store.seq += 1;
          const row: JobRow = {
            id: `job-${store.seq}`,
            ...data,
            scanned: 0,
            withoutWebsite: 0,
            linkOnly: 0,
            saved: 0,
            estimatedCost: 0,
            error: null,
            startedAt: new Date(),
            finishedAt: null,
          };
          store.jobs.set(row.id, row);
          return row;
        },
      ),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => store.jobs.get(where.id) ?? null),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<JobRow> }) => {
        const row = { ...(store.jobs.get(where.id) as JobRow), ...data };
        store.jobs.set(where.id, row);
        return row;
      }),
    },
  },
}));
vi.mock("@/lib/settings", () => ({ getSetting: vi.fn(async () => ["Lefkoşa", "Girne", "İstanbul", "Aksaray"]) }));
vi.mock("@/lib/search-job", () => ({ startSearchJob }));

const { POST } = await import("@/app/api/search/route");
const { GET: STREAM } = await import("@/app/api/search/[jobId]/stream/route");
const { publishProgress, toSearchJobDto } = await import("@/lib/search-jobs");

const savedEnv = { ...process.env };

function setEnv(extra: Record<string, string | undefined>): void {
  process.env.ADMIN_PASSWORD = "x";
  process.env.SESSION_SECRET = "s".repeat(32);
  for (const [k, v] of Object.entries(extra)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

function post(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function stream(jobId: string, signal?: AbortSignal): Promise<Response> {
  return STREAM(new Request(`http://localhost/api/search/${jobId}/stream`, { signal }), {
    params: Promise.resolve({ jobId }),
  });
}

function parseFrames(text: string): SearchProgress[] {
  return text
    .split("\n\n")
    .filter((f) => f.startsWith("data: "))
    .map((f) => JSON.parse(f.slice(6)) as SearchProgress);
}

function addJob(partial: Partial<JobRow> & { id: string }): JobRow {
  const row: JobRow = {
    query: "berber",
    city: "Lefkoşa",
    district: null,
    lat: null,
    lng: null,
    radiusM: null,
    status: "RUNNING",
    scanned: 0,
    withoutWebsite: 0,
    linkOnly: 0,
    saved: 0,
    estimatedCost: 0,
    error: null,
    startedAt: new Date(),
    finishedAt: null,
    ...partial,
  };
  store.jobs.set(row.id, row);
  return row;
}

beforeEach(() => {
  store.jobs.clear();
  startSearchJob.mockClear();
  setEnv({ PLACES_MOCK: "1" });
});

afterEach(() => {
  process.env = { ...savedEnv };
});

describe("POST /api/search", () => {
  it("geçerli istek → 201 jobId, iş başlatılır (await edilmez)", async () => {
    const res = await post({ query: " berber ", city: "Lefkoşa" });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { jobId: string } };
    expect(body.data.jobId).toBe("job-1");
    expect(store.jobs.get("job-1")).toMatchObject({
      query: "berber",
      city: "Lefkoşa",
      district: null,
      status: "RUNNING",
    });
    expect(startSearchJob).toHaveBeenCalledWith(
      { jobId: "job-1", query: "berber", city: "Lefkoşa" },
      expect.objectContaining({ searchText: expect.any(Function) }),
    );
  });

  it("geçerli ilçe → 201; SearchJob'a ve yürütücüye district geçer", async () => {
    const res = await post({ query: "berber", city: "İstanbul", district: " Kadıköy " });
    expect(res.status).toBe(201);
    const { jobId } = ((await res.json()) as { data: { jobId: string } }).data;
    expect(store.jobs.get(jobId)).toMatchObject({ city: "İstanbul", district: "Kadıköy" });
    expect(startSearchJob).toHaveBeenCalledWith(
      { jobId, query: "berber", city: "İstanbul", district: "Kadıköy" },
      expect.anything(),
    );
  });

  it.each([[""], ["   "], [null]])("boş ilçe (%j) → il geneli (district null)", async (district) => {
    const res = await post({ query: "berber", city: "İstanbul", district });
    expect(res.status).toBe(201);
    const { jobId } = ((await res.json()) as { data: { jobId: string } }).data;
    expect(store.jobs.get(jobId)?.district).toBeNull();
    expect(startSearchJob).toHaveBeenCalledWith(
      { jobId, query: "berber", city: "İstanbul" },
      expect.anything(),
    );
  });

  it.each([
    [{ query: "berber", city: "İstanbul", district: "Çankaya" }],
    [{ query: "berber", city: "Lefkoşa", district: "Kadıköy" }],
    [{ query: "berber", city: "İstanbul", district: "Yokköy" }],
  ])("başka ilin / bilinmeyen ilçe → 400 UNKNOWN_DISTRICT (%j)", async (body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("UNKNOWN_DISTRICT");
    expect(store.jobs.size).toBe(0);
    expect(startSearchJob).not.toHaveBeenCalled();
  });

  it.each([
    [{ query: "", city: "Lefkoşa" }],
    [{ query: "berber", city: "İstanbul", district: 5 }],
    [{ query: "berber", city: "İstanbul", district: "x".repeat(61) }],
    [{ query: "x".repeat(81), city: "Lefkoşa" }],
    [{ city: "Lefkoşa" }],
    [null],
  ])("geçersiz gövde → 400 VALIDATION_ERROR (%j)", async (body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("VALIDATION_ERROR");
  });

  it("listede olmayan şehir → 400", async () => {
    const res = await post({ query: "berber", city: "Ankara", district: "Çankaya" });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("UNKNOWN_CITY");
    expect(store.jobs.size).toBe(0);
  });

  it("area → 201; daire SearchJob'a yazılır ve yürütücüye geçer", async () => {
    const area = { lat: 35.1854, lng: 33.361, radiusM: 2000 };
    const res = await post({ query: " berber ", city: "Lefkoşa", area });
    expect(res.status).toBe(201);
    const { jobId } = ((await res.json()) as { data: { jobId: string } }).data;
    expect(store.jobs.get(jobId)).toMatchObject({
      query: "berber",
      city: "Lefkoşa",
      district: null,
      lat: 35.1854,
      lng: 33.361,
      radiusM: 2000,
    });
    expect(startSearchJob).toHaveBeenCalledWith(
      { jobId, query: "berber", city: "Lefkoşa", area },
      expect.anything(),
    );
  });

  it("area + district birlikte: ilçe yalnız etiket olarak kaydedilir", async () => {
    const area = { lat: 41.0, lng: 29.03, radiusM: 1500 };
    const res = await post({ query: "berber", city: "İstanbul", district: "Kadıköy", area });
    expect(res.status).toBe(201);
    const { jobId } = ((await res.json()) as { data: { jobId: string } }).data;
    expect(store.jobs.get(jobId)).toMatchObject({ district: "Kadıköy", lat: 41.0, radiusM: 1500 });
    expect(startSearchJob).toHaveBeenCalledWith(
      { jobId, query: "berber", city: "İstanbul", district: "Kadıköy", area },
      expect.anything(),
    );
  });

  it.each([[null], [undefined]])("area %j → alan araması yok (lat/lng/radiusM null)", async (area) => {
    const res = await post({ query: "berber", city: "Lefkoşa", area });
    expect(res.status).toBe(201);
    const { jobId } = ((await res.json()) as { data: { jobId: string } }).data;
    expect(store.jobs.get(jobId)).toMatchObject({ lat: null, lng: null, radiusM: null });
    expect(startSearchJob).toHaveBeenCalledWith(
      { jobId, query: "berber", city: "Lefkoşa" },
      expect.anything(),
    );
  });

  it.each([
    ["yarıçap min altı", { lat: 35, lng: 33, radiusM: SEARCH_RADIUS_MIN_M - 1 }],
    ["yarıçap max üstü", { lat: 35, lng: 33, radiusM: SEARCH_RADIUS_MAX_M + 1 }],
    ["yarıçap ondalık", { lat: 35, lng: 33, radiusM: 1500.5 }],
    ["yarıçap metin", { lat: 35, lng: 33, radiusM: "2000" }],
    ["yarıçap yok", { lat: 35, lng: 33 }],
    ["lat > 90", { lat: 90.1, lng: 33, radiusM: 2000 }],
    ["lat < -90", { lat: -91, lng: 33, radiusM: 2000 }],
    ["lng > 180", { lat: 35, lng: 180.5, radiusM: 2000 }],
    ["lng < -180", { lat: 35, lng: -181, radiusM: 2000 }],
    ["lat metin", { lat: "35", lng: 33, radiusM: 2000 }],
    ["area dizi", []],
  ])("geçersiz area (%s) → 400 VALIDATION_ERROR, iş yaratılmaz", async (_label, area) => {
    const res = await post({ query: "berber", city: "Lefkoşa", area });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("VALIDATION_ERROR");
    expect(store.jobs.size).toBe(0);
    expect(startSearchJob).not.toHaveBeenCalled();
  });

  it.each([[SEARCH_RADIUS_MIN_M], [SEARCH_RADIUS_MAX_M]])("yarıçap sınırı %i kabul edilir", async (radiusM) => {
    const res = await post({ query: "berber", city: "Lefkoşa", area: { lat: 35, lng: 33, radiusM } });
    expect(res.status).toBe(201);
  });

  it("anahtar yok + mock kapalı → 503, iş yaratılmaz", async () => {
    setEnv({ PLACES_MOCK: undefined, GOOGLE_PLACES_API_KEY: "" });
    const res = await post({ query: "berber", city: "Lefkoşa" });
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("PLACES_NOT_CONFIGURED");
    expect(store.jobs.size).toBe(0);
    expect(startSearchJob).not.toHaveBeenCalled();
  });
});

describe("GET /api/search/[jobId]/stream", () => {
  it("bilinmeyen iş → 404", async () => {
    expect((await stream("yok")).status).toBe(404);
  });

  it("bitmiş iş → tek mesaj ve kapanır; SSE header'ları", async () => {
    addJob({ id: "done-1", status: "DONE", scanned: 20, withoutWebsite: 17, linkOnly: 2, saved: 17, estimatedCost: 0.319 });
    const res = await stream("done-1");
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    expect(res.headers.get("cache-control")).toBe("no-cache, no-transform");
    expect(res.headers.get("x-accel-buffering")).toBe("no");
    const frames = parseFrames(await res.text());
    expect(frames).toEqual([
      {
        jobId: "done-1",
        status: "DONE",
        scanned: 20,
        withoutWebsite: 17,
        linkOnly: 2,
        saved: 17,
        estimatedCost: 0.319,
        done: true,
      },
    ]);
  });

  it("çalışan iş: mevcut durum hemen, sonra yayınlar, done'da kapanır", async () => {
    addJob({ id: "run-1" });
    const base = { jobId: "run-1", withoutWebsite: 0, linkOnly: 0, saved: 0, estimatedCost: 0 };
    publishProgress({ ...base, status: "RUNNING", scanned: 5, done: false });

    const res = await stream("run-1");
    const textPromise = res.text();
    publishProgress({ ...base, status: "RUNNING", scanned: 10, done: false });
    publishProgress({ ...base, status: "DONE", scanned: 12, done: true });

    const frames = parseFrames(await textPromise);
    expect(frames.map((f) => f.scanned)).toEqual([5, 10, 12]);
    expect(frames.at(-1)?.done).toBe(true);
  });

  it("sunucu yeniden başlamış (bellekte yok, DB RUNNING) → FAILED yazılır ve bildirilir", async () => {
    addJob({ id: "orphan-1", scanned: 7 });
    const frames = parseFrames(await (await stream("orphan-1")).text());
    expect(frames).toHaveLength(1);
    expect(frames[0]).toMatchObject({ status: "FAILED", done: true, scanned: 7 });
    expect(frames[0]?.error).toBeTruthy();
    expect(store.jobs.get("orphan-1")?.status).toBe("FAILED");
    expect(store.jobs.get("orphan-1")?.finishedAt).toBeInstanceOf(Date);
  });

  it("istemci koparsa abonelik temizlenir", async () => {
    addJob({ id: "run-2" });
    publishProgress({
      jobId: "run-2",
      status: "RUNNING",
      scanned: 0,
      withoutWebsite: 0,
      linkOnly: 0,
      saved: 0,
      estimatedCost: 0,
      done: false,
    });
    const controller = new AbortController();
    const res = await stream("run-2", controller.signal);
    const reader = res.body?.getReader();
    const first = await reader?.read();
    expect(new TextDecoder().decode(first?.value)).toContain('"jobId":"run-2"');

    const reg = (globalThis as unknown as { __leadRadarSearchProgress: { emitter: EventEmitter } })
      .__leadRadarSearchProgress;
    expect(reg.emitter.listenerCount("run-2")).toBe(1);
    controller.abort();
    expect(reg.emitter.listenerCount("run-2")).toBe(0);
  });
});

describe("toSearchJobDto area", () => {
  it("üçü de doluysa nesne, eksikse null", () => {
    const base = addJob({ id: "dto-1" });
    expect(toSearchJobDto(base).area).toBeNull();
    expect(toSearchJobDto({ ...base, lat: 35.2, lng: 33.4, radiusM: 3000 }).area).toEqual({
      lat: 35.2,
      lng: 33.4,
      radiusM: 3000,
    });
    expect(toSearchJobDto({ ...base, lat: 35.2, lng: 33.4 }).area).toBeNull();
    expect(toSearchJobDto({ ...base, lat: 35.2, radiusM: 3000 }).area).toBeNull();
    expect(toSearchJobDto({ ...base, lng: 33.4, radiusM: 3000 }).area).toBeNull();
  });
});
