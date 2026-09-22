// SearchJob DTO dönüşümü + süreç içi ilerleme yayını (SSE aboneleri için).
// Yayın durumu `globalThis`'te tutulur → dev hot-reload'da modül yeniden yüklense de kaybolmaz.
// Süreç yeniden başlarsa bellek boşalır; SSE route o durumda DB'den okur.

import { EventEmitter } from "node:events";
import type { SearchJob } from "@prisma/client";
import {
  SEARCH_JOB_STATUSES,
  type SearchJobDto,
  type SearchJobStatus,
  type SearchProgress,
} from "@/lib/types";

/** Bitmiş işin bellekteki son durumu bu süre sonra atılır (SSE sonrası DB'den okunur). */
const RETAIN_DONE_MS = 60_000;

export function isSearchJobStatus(value: unknown): value is SearchJobStatus {
  return typeof value === "string" && (SEARCH_JOB_STATUSES as readonly string[]).includes(value);
}

type JobRow = Pick<
  SearchJob,
  | "id"
  | "query"
  | "city"
  | "status"
  | "scanned"
  | "withoutWebsite"
  | "saved"
  | "estimatedCost"
  | "error"
  | "startedAt"
  | "finishedAt"
>;

export function toSearchJobDto(job: JobRow): SearchJobDto {
  return {
    id: job.id,
    query: job.query,
    city: job.city,
    status: isSearchJobStatus(job.status) ? job.status : "FAILED",
    scanned: job.scanned,
    withoutWebsite: job.withoutWebsite,
    saved: job.saved,
    estimatedCost: job.estimatedCost,
    error: job.error,
    startedAt: job.startedAt.toISOString(),
    finishedAt: job.finishedAt ? job.finishedAt.toISOString() : null,
  };
}

export function toSearchProgress(job: JobRow): SearchProgress {
  const status = isSearchJobStatus(job.status) ? job.status : "FAILED";
  const progress: SearchProgress = {
    jobId: job.id,
    status,
    scanned: job.scanned,
    withoutWebsite: job.withoutWebsite,
    saved: job.saved,
    estimatedCost: job.estimatedCost,
    done: status !== "RUNNING",
  };
  if (job.error) progress.error = job.error;
  return progress;
}

// ─── İlerleme kaydı ─────────────────────────────────────────────────────────

interface ProgressRegistry {
  emitter: EventEmitter;
  latest: Map<string, SearchProgress>;
}

const globalForProgress = globalThis as unknown as {
  __leadRadarSearchProgress?: ProgressRegistry;
};

function registry(): ProgressRegistry {
  if (!globalForProgress.__leadRadarSearchProgress) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(0); // aynı işi birden çok sekme izleyebilir
    globalForProgress.__leadRadarSearchProgress = { emitter, latest: new Map() };
  }
  return globalForProgress.__leadRadarSearchProgress;
}

/** İşin bu süreçte yürütülüp yürütülmediği / en son yayınlanan durum. */
export function getLatestProgress(jobId: string): SearchProgress | undefined {
  return registry().latest.get(jobId);
}

export function publishProgress(progress: SearchProgress): void {
  const reg = registry();
  reg.latest.set(progress.jobId, progress);
  reg.emitter.emit(progress.jobId, progress);
  if (progress.done) {
    const timer = setTimeout(() => {
      if (reg.latest.get(progress.jobId) === progress) reg.latest.delete(progress.jobId);
    }, RETAIN_DONE_MS);
    timer.unref?.();
  }
}

/** Abone ol; dönen fonksiyon aboneliği kaldırır. */
export function subscribeProgress(
  jobId: string,
  listener: (progress: SearchProgress) => void,
): () => void {
  const { emitter } = registry();
  emitter.on(jobId, listener);
  return () => {
    emitter.off(jobId, listener);
  };
}
