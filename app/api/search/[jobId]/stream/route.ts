// SSE: `data: <SearchProgress JSON>\n\n`. Bağlanınca mevcut durum hemen gider; `done` sonrası kapanır.
// İş bu süreçte yürütülmüyorsa (sunucu yeniden başladı) DB'den okunur; RUNNING kalmışsa yetim → FAILED.

import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import {
  getLatestProgress,
  subscribeProgress,
  toSearchProgress,
} from "@/lib/search-jobs";
import { tr } from "@/lib/tr";
import type { SearchProgress } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PING_INTERVAL_MS = 15_000;

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;

function frame(progress: SearchProgress): string {
  return `data: ${JSON.stringify(progress)}\n\n`;
}

export async function GET(request: Request, { params }: RouteContext): Promise<Response> {
  const { jobId } = await params;
  const job = await db.searchJob.findUnique({ where: { id: jobId } });
  if (!job) return apiError(404, "NOT_FOUND", tr.errors.searchJobNotFound);

  let initial = getLatestProgress(jobId) ?? toSearchProgress(job);

  // DB RUNNING ama bu süreçte yürüten yok → sunucu yeniden başlamış; iş asla bitmeyecek.
  if (!initial.done && !getLatestProgress(jobId)) {
    const failed = await db.searchJob.update({
      where: { id: jobId },
      data: { status: "FAILED", error: tr.errors.searchInterrupted, finishedAt: new Date() },
    });
    initial = toSearchProgress(failed);
  }

  const encoder = new TextEncoder();

  if (initial.done) {
    return new Response(encoder.encode(frame(initial)), { headers: SSE_HEADERS });
  }

  let cleanup = (): void => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let unsubscribe = (): void => {};
      const timers: { ping?: ReturnType<typeof setInterval> } = {};

      const close = (): void => {
        if (closed) return;
        closed = true;
        unsubscribe();
        if (timers.ping) clearInterval(timers.ping);
        request.signal.removeEventListener("abort", close);
        try {
          controller.close();
        } catch {
          // istemci zaten koptu
        }
      };
      cleanup = close;

      const write = (chunk: string): void => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          close();
        }
      };

      const send = (progress: SearchProgress): void => {
        write(frame(progress));
        if (progress.done) close();
      };

      // Önce abone ol, sonra güncel durumu oku → aradaki güncelleme kaçmaz.
      unsubscribe = subscribeProgress(jobId, send);
      send(getLatestProgress(jobId) ?? initial);
      if (closed) return;

      timers.ping = setInterval(() => write(": ping\n\n"), PING_INTERVAL_MS);
      request.signal.addEventListener("abort", close);
      if (request.signal.aborted) close();
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
