import { describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({
  businesses: [] as { id: string; score: number; status: string }[],
  changes: [] as { businessId: string; to: string; createdAt: Date }[],
  jobs: [] as {
    id: string;
    query: string;
    city: string;
    status: string;
    scanned: number;
    withoutWebsite: number;
    saved: number;
    estimatedCost: number;
    error: string | null;
    startedAt: Date;
    finishedAt: Date | null;
  }[],
}));

vi.mock("@/lib/db", () => ({
  db: {
    business: {
      count: vi.fn(async (args?: { where?: { score?: { gte: number } } }) => {
        const gte = args?.where?.score?.gte;
        return store.businesses.filter((b) => gte === undefined || b.score >= gte).length;
      }),
      groupBy: vi.fn(async () => {
        const counts = new Map<string, number>();
        for (const b of store.businesses) counts.set(b.status, (counts.get(b.status) ?? 0) + 1);
        return [...counts].map(([status, n]) => ({ status, _count: { _all: n } }));
      }),
    },
    statusChange: {
      findMany: vi.fn(async (args: { where: { to: { in: string[] } } }) =>
        store.changes.filter((c) => args.where.to.in.includes(c.to)),
      ),
    },
    searchJob: {
      aggregate: vi.fn(async () => ({
        _sum: { estimatedCost: store.jobs.length ? store.jobs.reduce((s, j) => s + j.estimatedCost, 0) : null },
      })),
      findMany: vi.fn(async (args: { take: number }) =>
        [...store.jobs].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime()).slice(0, args.take),
      ),
    },
  },
}));

const { buildFunnel, getDashboardData, summarizeStatusChanges } = await import("@/lib/dashboard");

const NOW = new Date("2026-09-22T12:00:00Z");
const daysAgo = (d: number): Date => new Date(NOW.getTime() - d * 86_400_000);

describe("summarizeStatusChanges", () => {
  it("payda 0 → replyRate null", () => {
    expect(summarizeStatusChanges([], NOW)).toEqual({ contactedThisWeek: 0, replyRate: null });
  });

  it("farklı işletmeler sayılır; 7 gün penceresi; oran REPLIED/CONTACTED", () => {
    const rows = [
      { businessId: "a", to: "CONTACTED", createdAt: daysAgo(1) },
      { businessId: "a", to: "CONTACTED", createdAt: daysAgo(2) }, // tekrar → 1 sayılır
      { businessId: "b", to: "CONTACTED", createdAt: daysAgo(6.9) },
      { businessId: "c", to: "CONTACTED", createdAt: daysAgo(10) }, // pencere dışı
      { businessId: "d", to: "CONTACTED", createdAt: daysAgo(30) },
      { businessId: "a", to: "REPLIED", createdAt: daysAgo(0.5) },
      { businessId: "a", to: "REPLIED", createdAt: daysAgo(0.2) },
      { businessId: "c", to: "REPLIED", createdAt: daysAgo(9) },
    ];
    expect(summarizeStatusChanges(rows, NOW)).toEqual({ contactedThisWeek: 2, replyRate: 0.5 });
  });
});

describe("buildFunnel", () => {
  it("STATUSES sırası, 0'lar dahil, bilinmeyen atlanır", () => {
    const funnel = buildFunnel([
      { status: "WON", count: 2 },
      { status: "NEW", count: 5 },
      { status: "BOGUS", count: 9 },
    ]);
    expect(funnel.map((f) => f.status)).toEqual([
      "NEW",
      "QUALIFIED",
      "CONTACTED",
      "REPLIED",
      "MEETING",
      "WON",
      "LOST",
      "SKIPPED",
    ]);
    expect(funnel.find((f) => f.status === "NEW")?.count).toBe(5);
    expect(funnel.find((f) => f.status === "MEETING")?.count).toBe(0);
  });
});

describe("getDashboardData", () => {
  it("DB ile tutarlı toplamlar, funnel ve son 10 iş", async () => {
    store.businesses = [
      { id: "a", score: 90, status: "REPLIED" },
      { id: "b", score: 80, status: "CONTACTED" },
      { id: "c", score: 79, status: "WON" },
      { id: "d", score: 20, status: "NEW" },
      { id: "e", score: 55, status: "NEW" },
    ];
    store.changes = [
      { businessId: "a", to: "CONTACTED", createdAt: daysAgo(3) },
      { businessId: "a", to: "REPLIED", createdAt: daysAgo(2) },
      { businessId: "b", to: "CONTACTED", createdAt: daysAgo(20) },
      { businessId: "c", to: "CONTACTED", createdAt: daysAgo(40) },
      { businessId: "c", to: "REPLIED", createdAt: daysAgo(39) },
      { businessId: "c", to: "MEETING", createdAt: daysAgo(30) },
      { businessId: "c", to: "WON", createdAt: daysAgo(25) },
    ];
    store.jobs = Array.from({ length: 12 }, (_, i) => ({
      id: `job-${i}`,
      query: "berber",
      city: "Lefkoşa",
      status: i === 0 ? "RUNNING" : "DONE",
      scanned: 20,
      withoutWebsite: 15,
      saved: 15,
      estimatedCost: 0.1,
      error: null,
      startedAt: daysAgo(12 - i),
      finishedAt: i === 0 ? null : daysAgo(12 - i),
    }));

    const data = await getDashboardData(NOW);

    expect(data.totals).toEqual({
      businesses: 5,
      hot: 2,
      contactedThisWeek: 1,
      replyRate: 2 / 3,
      won: 1,
      totalCost: 1.2,
    });
    expect(data.funnel).toHaveLength(8);
    expect(data.funnel.find((f) => f.status === "NEW")?.count).toBe(2);
    expect(data.recentJobs).toHaveLength(10);
    expect(data.recentJobs[0]?.id).toBe("job-11");
    expect(data.recentJobs[0]?.startedAt).toBe(daysAgo(1).toISOString());
    expect(data.recentJobs.at(-1)?.id).toBe("job-2");
  });

  it("boş DB → sıfırlar, replyRate null, maliyet 0", async () => {
    store.businesses = [];
    store.changes = [];
    store.jobs = [];
    const data = await getDashboardData(NOW);
    expect(data.totals).toEqual({
      businesses: 0,
      hot: 0,
      contactedThisWeek: 0,
      replyRate: null,
      won: 0,
      totalCost: 0,
    });
    expect(data.funnel.every((f) => f.count === 0)).toBe(true);
    expect(data.recentJobs).toEqual([]);
  });
});
