"use client";

// `/searches` sayfasının istemci tarafı: form, canlı ilerleme kartı ve geçmiş tablosu.
// Sayfa açıldığında sunucuda hâlâ RUNNING durumda bir iş varsa ona otomatik bağlanır.

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchForm } from "@/components/search-form";
import { SearchProgressCard } from "./search-progress-card";
import { SearchJobsTable } from "./search-jobs-table";
import { useSearchProgress } from "./use-search-progress";
import { apiFetch } from "@/components/api-client";
import type { SearchJobDto } from "@/lib/types";
import { tr } from "@/lib/tr";

interface ActiveJob {
  id: string;
  city: string;
}

export function SearchesView() {
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);
  const attachedFromHistory = useRef(false);

  const { data: jobs, isLoading, isError } = useQuery({
    queryKey: ["searches"],
    queryFn: () => apiFetch<SearchJobDto[]>("/api/search"),
    refetchInterval: (query) =>
      query.state.data?.some((job) => job.status === "RUNNING") ? 3000 : false,
  });

  // Sayfa açılışında sürmekte olan bir iş varsa otomatik bağlan (yalnızca bir kez).
  useEffect(() => {
    if (attachedFromHistory.current || activeJob || !jobs) return;
    const running = jobs.find((job) => job.status === "RUNNING");
    if (running) {
      setActiveJob({ id: running.id, city: running.city });
    }
    attachedFromHistory.current = true;
  }, [jobs, activeJob]);

  const progress = useSearchProgress(activeJob?.id ?? null);
  // Job daha yeni başladı ve ilk SSE mesajı henüz gelmedi → RUNNING varsay.
  const isJobRunning = activeJob !== null && (progress ? progress.status === "RUNNING" : true);

  return (
    <div className="flex flex-col gap-6">
      <SearchForm
        disabled={isJobRunning}
        onStarted={(jobId, city) => setActiveJob({ id: jobId, city })}
      />

      {activeJob ? <SearchProgressCard progress={progress} city={activeJob.city} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>{tr.searches.history.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {isError ? (
            <p className="text-sm text-destructive">{tr.searches.history.loadError}</p>
          ) : (
            <SearchJobsTable jobs={jobs ?? []} isLoading={isLoading} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
