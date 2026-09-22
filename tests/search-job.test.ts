import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlaceDetails } from "@/lib/places";
import { PlacesError } from "@/lib/places";
import { createMockPlacesClient } from "@/lib/places.mock";
import type { SearchProgress } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  jobUpdate: vi.fn<(args: { where: { id: string }; data: Record<string, unknown> }) => Promise<object>>(
    async () => ({}),
  ),
  upsertBusiness: vi.fn<
    (d: PlaceDetails, city: string, jobId: string | null, options?: { district?: string | null }) => Promise<object>
  >(
    async () => ({}),
  ),
}));

vi.mock("@/lib/db", () => ({ db: { searchJob: { update: mocks.jobUpdate } } }));
vi.mock("@/lib/ingest", () => ({ upsertBusiness: mocks.upsertBusiness }));
vi.mock("@/lib/settings", () => ({ getSetting: vi.fn(async () => ["restaurant"]) }));

const { runSearchJob, estimateCost, buildTextQuery } = await import("@/lib/search-job");
const { subscribeProgress, getLatestProgress } = await import("@/lib/search-jobs");

beforeEach(() => {
  mocks.jobUpdate.mockClear();
  mocks.upsertBusiness.mockClear();
});

describe("runSearchJob (mock istemci)", () => {
  it("şehirli sorgu: sayaçlar, yalnız sitesizlere Details, doğru maliyet", async () => {
    const client = createMockPlacesClient();
    const searchSpy = vi.spyOn(client, "searchText");
    const detailsSpy = vi.spyOn(client, "getDetails");

    const result = await runSearchJob({ jobId: "job-1", query: "berber", city: "Lefkoşa" }, client);

    expect(searchSpy).toHaveBeenCalledWith("berber Lefkoşa", undefined);
    // Lefkoşa: 3 sitesiz + 1 Booking.com linkli otel; 2 siteli + 1 kapalı elenir
    expect(result).toMatchObject({
      status: "DONE",
      done: true,
      scanned: 7,
      withoutWebsite: 4,
      linkOnly: 1,
      saved: 4,
    });
    expect(detailsSpy).toHaveBeenCalledTimes(4);
    const detailIds = detailsSpy.mock.calls.map((c) => c[0]);
    expect(detailIds.every((id) => !id.includes("web") && !id.includes("closed"))).toBe(true);
    expect(result.estimatedCost).toBe(estimateCost(1, 4));
    expect(result.estimatedCost).toBeCloseTo(0.032 + 4 * 0.017, 6);

    expect(mocks.upsertBusiness).toHaveBeenCalledTimes(4);
    for (const call of mocks.upsertBusiness.mock.calls) {
      expect(call[1]).toBe("Lefkoşa");
      expect(call[2]).toBe("job-1");
      expect(call[3]?.district).toBeNull();
    }
  });

  it("ilçeli iş: Places sorgusu ilçe + il, upsert'e district geçer", async () => {
    const client = createMockPlacesClient();
    const searchSpy = vi.spyOn(client, "searchText");
    await runSearchJob({ jobId: "job-d", query: "berber", city: "İstanbul", district: "Kadıköy" }, client);
    expect(searchSpy).toHaveBeenCalledWith("berber Kadıköy İstanbul", undefined);
    for (const call of mocks.upsertBusiness.mock.calls) {
      expect(call[1]).toBe("İstanbul");
      expect(call[3]?.district).toBe("Kadıköy");
    }
  });

  it("sayfalama + tüm liste: 20 tarandı, 17 sitesiz (2 linkli), 17 kaydedildi; siteli/kapalı kaydedilmez", async () => {
    const client = createMockPlacesClient();
    const searchSpy = vi.spyOn(client, "searchText");
    const detailsSpy = vi.spyOn(client, "getDetails");

    const result = await runSearchJob({ jobId: "job-2", query: "işletme", city: "Lapta" }, client);

    expect(searchSpy).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ status: "DONE", scanned: 20, withoutWebsite: 17, linkOnly: 2, saved: 17 });
    expect(detailsSpy).toHaveBeenCalledTimes(17);
    const savedIds = mocks.upsertBusiness.mock.calls.map((c) => c[0].id);
    expect(savedIds.some((id) => id.includes("web") || id.includes("closed"))).toBe(false);
    expect(result.estimatedCost).toBe(estimateCost(2, 17));

    // DB: her 5 taramada bir (5,10,15,20) + son (DONE, finishedAt)
    const statuses = mocks.jobUpdate.mock.calls.map((c) => c[0].data.status);
    expect(statuses).toEqual(["RUNNING", "RUNNING", "RUNNING", "RUNNING", "DONE"]);
    const last = mocks.jobUpdate.mock.calls.at(-1)?.[0].data;
    expect(last?.finishedAt).toBeInstanceOf(Date);
    expect(last?.error).toBeNull();
    expect(last).toMatchObject({ withoutWebsite: 17, linkOnly: 2, saved: 17 });
  });

  it("ilerleme abonelere her 5'te bir ve sonda yayınlanır", async () => {
    const seen: SearchProgress[] = [];
    const unsubscribe = subscribeProgress("job-3", (p) => seen.push(p));
    await runSearchJob({ jobId: "job-3", query: "x", city: "Lapta" }, createMockPlacesClient());
    unsubscribe();

    expect(seen.map((p) => p.scanned)).toEqual([5, 10, 15, 20, 20]);
    expect(seen.at(-1)).toMatchObject({ done: true, status: "DONE" });
    expect(getLatestProgress("job-3")?.done).toBe(true);
  });

  it("Details'te site çıkarsa kaydedilmez", async () => {
    const client = createMockPlacesClient();
    const original = client.getDetails.bind(client);
    vi.spyOn(client, "getDetails").mockImplementation(async (id) => ({
      ...(await original(id)),
      websiteUri: "https://yeni-site.example.com",
    }));
    const result = await runSearchJob({ jobId: "job-4", query: "x", city: "Girne" }, client);
    expect(result).toMatchObject({ withoutWebsite: 4, linkOnly: 1, saved: 0 });
    expect(mocks.upsertBusiness).not.toHaveBeenCalled();
  });

  it("sosyal / platform linkli sonuç kaydedilir ve linkOnly artar; gerçek siteli elenir", async () => {
    const client = createMockPlacesClient();
    vi.spyOn(client, "searchText").mockResolvedValue({
      places: [
        { id: "p-insta", websiteUri: "https://www.instagram.com/ornek/", businessStatus: "OPERATIONAL" },
        { id: "p-booking", websiteUri: "https://www.booking.com/hotel/cy/ornek.html", businessStatus: "OPERATIONAL" },
        { id: "p-none", businessStatus: "OPERATIONAL" },
        { id: "p-site", websiteUri: "https://ornek.com.tr/", businessStatus: "OPERATIONAL" },
        { id: "p-closed", websiteUri: "https://www.instagram.com/kapali/", businessStatus: "CLOSED_PERMANENTLY" },
      ],
    });
    const detailsSpy = vi.spyOn(client, "getDetails").mockImplementation(async (id) => ({
      id,
      businessStatus: "OPERATIONAL",
      ...(id === "p-insta" ? { websiteUri: "https://www.instagram.com/ornek/" } : {}),
      ...(id === "p-booking" ? { websiteUri: "https://www.booking.com/hotel/cy/ornek.html" } : {}),
    }));

    const result = await runSearchJob({ jobId: "job-s", query: "otel", city: "Girne" }, client);

    expect(result).toMatchObject({ status: "DONE", scanned: 5, withoutWebsite: 3, linkOnly: 2, saved: 3 });
    expect(detailsSpy.mock.calls.map((c) => c[0])).toEqual(["p-insta", "p-booking", "p-none"]);
    expect(mocks.upsertBusiness.mock.calls.map((c) => c[0].id)).toEqual(["p-insta", "p-booking", "p-none"]);
    expect(mocks.jobUpdate.mock.calls.at(-1)?.[0].data).toMatchObject({ linkOnly: 2, withoutWebsite: 3 });
  });

  it("hata → FAILED + mesaj + finishedAt", async () => {
    const client = createMockPlacesClient();
    vi.spyOn(client, "searchText").mockRejectedValue(new PlacesError("Kota aşıldı", 429));

    const result = await runSearchJob({ jobId: "job-5", query: "x", city: "Girne" }, client);

    expect(result).toMatchObject({ status: "FAILED", done: true, error: "Kota aşıldı" });
    const data = mocks.jobUpdate.mock.calls.at(-1)?.[0].data;
    expect(data).toMatchObject({ status: "FAILED", error: "Kota aşıldı" });
    expect(data?.finishedAt).toBeInstanceOf(Date);
  });

  it("Details 404 → o işletme atlanır, iş sürer", async () => {
    const client = createMockPlacesClient();
    const original = client.getDetails.bind(client);
    vi.spyOn(client, "getDetails").mockImplementation(async (id) => {
      if (id === "mock-place-04") throw new PlacesError("yok", 404);
      return original(id);
    });
    const result = await runSearchJob({ jobId: "job-6", query: "x", city: "Girne" }, client);
    expect(result).toMatchObject({ status: "DONE", withoutWebsite: 4, saved: 3 });
    expect(result.estimatedCost).toBe(estimateCost(1, 4));
  });
});

describe("yardımcılar", () => {
  it("buildTextQuery", () => {
    expect(buildTextQuery(" berber ", "Lefkoşa")).toBe("berber Lefkoşa");
    expect(buildTextQuery("berber", "Lefkoşa", null)).toBe("berber Lefkoşa");
    expect(buildTextQuery("berber", "Lefkoşa", "  ")).toBe("berber Lefkoşa");
    expect(buildTextQuery(" berber ", "İstanbul", " Kadıköy ")).toBe("berber Kadıköy İstanbul");
    // "Merkez" ilçe → il merkezi
    expect(buildTextQuery("berber", "Aksaray", "Merkez")).toBe("berber Aksaray merkez");
  });

  it("estimateCost 4 ondalığa yuvarlar", () => {
    expect(estimateCost(3, 60)).toBe(1.116);
    expect(estimateCost(0, 0)).toBe(0);
  });
});
