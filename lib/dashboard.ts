// Dashboard özeti (PROMPT §6, TASK-109). Saf toplama fonksiyonları + DB yükleyici.

import { db } from "@/lib/db";
import { toSearchJobDto } from "@/lib/search-jobs";
import { STATUSES, type Status } from "@/lib/status";
import type { DashboardData } from "@/lib/types";

const DAY_MS = 86_400_000;
export const HOT_SCORE = 80;
export const CONTACTED_WINDOW_DAYS = 7;
export const RECENT_JOBS_LIMIT = 10;

export interface StatusChangeRow {
  businessId: string;
  to: string;
  createdAt: Date;
}

export interface StatusChangeSummary {
  contactedThisWeek: number;
  replyRate: number | null;
}

/** Saf: son 7 günde CONTACTED'a geçen farklı işletme + (hiç REPLIED / hiç CONTACTED) oranı. */
export function summarizeStatusChanges(
  rows: readonly StatusChangeRow[],
  now: Date = new Date(),
): StatusChangeSummary {
  const since = now.getTime() - CONTACTED_WINDOW_DAYS * DAY_MS;
  const contactedEver = new Set<string>();
  const contactedRecent = new Set<string>();
  const repliedEver = new Set<string>();

  for (const row of rows) {
    if (row.to === "CONTACTED") {
      contactedEver.add(row.businessId);
      if (row.createdAt.getTime() >= since) contactedRecent.add(row.businessId);
    } else if (row.to === "REPLIED") {
      repliedEver.add(row.businessId);
    }
  }

  return {
    contactedThisWeek: contactedRecent.size,
    replyRate: contactedEver.size === 0 ? null : repliedEver.size / contactedEver.size,
  };
}

/** Saf: STATUSES sırasıyla, 0'lar dahil; bilinmeyen durum değerleri atlanır. */
export function buildFunnel(
  groups: readonly { status: string; count: number }[],
): { status: Status; count: number }[] {
  const counts = new Map<string, number>();
  for (const g of groups) counts.set(g.status, (counts.get(g.status) ?? 0) + g.count);
  return STATUSES.map((status) => ({ status, count: counts.get(status) ?? 0 }));
}

export async function getDashboardData(now: Date = new Date()): Promise<DashboardData> {
  const [businesses, hot, statusGroups, changes, costAgg, jobs] = await Promise.all([
    db.business.count(),
    db.business.count({ where: { score: { gte: HOT_SCORE } } }),
    db.business.groupBy({ by: ["status"], _count: { _all: true } }),
    db.statusChange.findMany({
      where: { to: { in: ["CONTACTED", "REPLIED"] } },
      select: { businessId: true, to: true, createdAt: true },
    }),
    db.searchJob.aggregate({ _sum: { estimatedCost: true } }),
    db.searchJob.findMany({ orderBy: { startedAt: "desc" }, take: RECENT_JOBS_LIMIT }),
  ]);

  const funnel = buildFunnel(statusGroups.map((g) => ({ status: g.status, count: g._count._all })));
  const { contactedThisWeek, replyRate } = summarizeStatusChanges(changes, now);

  return {
    totals: {
      businesses,
      hot,
      contactedThisWeek,
      replyRate,
      won: funnel.find((f) => f.status === "WON")?.count ?? 0,
      totalCost: Math.round((costAgg._sum.estimatedCost ?? 0) * 10_000) / 10_000,
    },
    funnel,
    recentJobs: jobs.map(toSearchJobDto),
  };
}
