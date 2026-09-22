"use client";

// Bir arama işini canlı izler: önce SSE (`EventSource`), bağlantı koparsa
// `GET /api/search/[jobId]` ile 2 sn'de bir poll'a düşer. `done: true` gelince
// ilgili query'leri invalidate eder (searches, dashboard, businesses).

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/components/api-client";
import type { SearchJobDto, SearchProgress } from "@/lib/types";

const POLL_INTERVAL_MS = 2000;

function progressFromJob(job: SearchJobDto): SearchProgress {
  return {
    jobId: job.id,
    status: job.status,
    scanned: job.scanned,
    withoutWebsite: job.withoutWebsite,
    saved: job.saved,
    estimatedCost: job.estimatedCost,
    done: job.status !== "RUNNING",
    error: job.error ?? undefined,
  };
}

export function useSearchProgress(jobId: string | null): SearchProgress | null {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<SearchProgress | null>(null);

  useEffect(() => {
    if (!jobId) {
      setProgress(null);
      return;
    }

    let cancelled = false;
    let eventSource: EventSource | null = new EventSource(`/api/search/${jobId}/stream`);
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    function invalidateAll() {
      if (cancelled) return;
      queryClient.invalidateQueries({ queryKey: ["searches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
    }

    function stopPolling() {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }

    function startPolling() {
      if (pollTimer || cancelled) return;
      pollTimer = setInterval(async () => {
        try {
          const job = await apiFetch<SearchJobDto>(`/api/search/${jobId}`);
          if (cancelled) return;
          const next = progressFromJob(job);
          setProgress(next);
          if (next.done) {
            stopPolling();
            invalidateAll();
          }
        } catch {
          // Sunucu geçici erişilemez olabilir — bir sonraki tick'te tekrar dene.
        }
      }, POLL_INTERVAL_MS);
    }

    eventSource.onmessage = (event) => {
      if (cancelled) return;
      try {
        const data = JSON.parse(event.data) as SearchProgress;
        setProgress(data);
        if (data.done) {
          eventSource?.close();
          eventSource = null;
          stopPolling();
          invalidateAll();
        }
      } catch {
        // Bozuk mesaj — yoksay.
      }
    };

    eventSource.onerror = () => {
      eventSource?.close();
      eventSource = null;
      startPolling();
    };

    return () => {
      cancelled = true;
      eventSource?.close();
      stopPolling();
    };
  }, [jobId, queryClient]);

  return progress;
}
