"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Building2, Flame, MessageCircle, Percent, Trophy, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatCard } from "./stat-card";
import { PipelineFunnel } from "./pipeline-funnel";
import { SearchJobsTable } from "@/components/searches/search-jobs-table";
import { apiFetch } from "@/components/api-client";
import type { DashboardData } from "@/lib/types";
import { tr } from "@/lib/tr";

function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("tr-TR", { style: "percent", maximumFractionDigits: 0 }).format(
    value,
  );
}

function formatCost(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function DashboardView() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardData>("/api/dashboard"),
    refetchInterval: (query) =>
      query.state.data?.recentJobs.some((job) => job.status === "RUNNING") ? 3000 : false,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return <p className="text-sm text-destructive">{tr.dashboard.loadError}</p>;
  }

  const isEmpty = data.totals.businesses === 0 && data.recentJobs.length === 0;

  if (isEmpty) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <h2 className="text-lg font-semibold text-foreground">{tr.dashboard.empty.title}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {tr.dashboard.empty.description}
          </p>
          <Button asChild>
            <Link href="/searches">{tr.dashboard.empty.cta}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title={tr.dashboard.cards.businesses}
          value={String(data.totals.businesses)}
          icon={Building2}
          href="/businesses"
        />
        <StatCard
          title={tr.dashboard.cards.hot}
          value={String(data.totals.hot)}
          icon={Flame}
          href="/businesses?band=HOT"
        />
        <StatCard
          title={tr.dashboard.cards.contactedThisWeek}
          value={String(data.totals.contactedThisWeek)}
          icon={MessageCircle}
        />
        <StatCard
          title={tr.dashboard.cards.replyRate}
          value={formatPercent(data.totals.replyRate)}
          icon={Percent}
        />
        <StatCard
          title={tr.dashboard.cards.won}
          value={String(data.totals.won)}
          icon={Trophy}
          href="/businesses?status=WON"
        />
        <StatCard
          title={tr.dashboard.cards.totalCost}
          value={formatCost(data.totals.totalCost)}
          icon={DollarSign}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{tr.dashboard.funnel.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <PipelineFunnel funnel={data.funnel} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr.dashboard.recentSearches.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <SearchJobsTable jobs={data.recentJobs} />
        </CardContent>
      </Card>
    </div>
  );
}
