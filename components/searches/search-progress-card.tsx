"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { SearchProgress } from "@/lib/types";
import { tr } from "@/lib/tr";

const PROGRESS_MAX = 60;

interface SearchProgressCardProps {
  progress: SearchProgress | null;
  city: string;
  district?: string;
}

export function SearchProgressCard({ progress, city, district }: SearchProgressCardProps) {
  if (!progress) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const barPercent = Math.min(100, Math.round((progress.scanned / PROGRESS_MAX) * 100));
  const title =
    progress.status === "FAILED"
      ? tr.searches.progress.failedTitle
      : progress.done
        ? tr.searches.progress.doneTitle
        : tr.searches.progress.runningTitle;
  const badgeVariant =
    progress.status === "FAILED" ? "destructive" : progress.done ? "secondary" : "outline";
  const badgeLabel =
    progress.status === "FAILED"
      ? tr.searches.table.statusFailed
      : progress.done
        ? tr.searches.table.statusDone
        : tr.searches.table.statusRunning;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>{title}</CardTitle>
        <Badge variant={badgeVariant}>{badgeLabel}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-foreground">
          {progress.scanned} {tr.searches.progress.scanned} · {progress.withoutWebsite}{" "}
          {tr.searches.progress.withoutWebsite}
          {progress.linkOnly > 0 ? ` ${tr.searches.progress.linkOnlySuffix(progress.linkOnly)}` : ""} ·{" "}
          {progress.saved} {tr.searches.progress.saved}
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${barPercent}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {tr.searches.progress.estimatedCost}: ${progress.estimatedCost.toFixed(3)}
        </p>

        {progress.status === "FAILED" ? (
          <p className="text-sm text-destructive">{progress.error ?? tr.common.error}</p>
        ) : null}

        {progress.done && progress.status === "DONE" ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {tr.searches.progress.summary(progress.scanned, progress.withoutWebsite)}
            </p>
            <Button asChild size="sm">
              <Link
                href={`/businesses?city=${encodeURIComponent(city)}${
                  district ? `&district=${encodeURIComponent(district)}` : ""
                }`}
              >
                {tr.searches.progress.viewResults}
              </Link>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
