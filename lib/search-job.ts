// Arama işi yürütücüsü: Text Search sayfaları → kendi sitesi olmayan (link yok / yalnız sosyal medya /
// platform profili — `lib/website.ts`) + OPERATIONAL olanlar için Details → upsert.
// Route handler işi await etmeden başlatır (`startSearchJob`); istek bitse de süreç içinde sürer.
// İlerleme her 5 taranan işletmede bir ve sonda hem DB'ye hem SSE abonelerine yazılır.

import { PLACES_COST, PLACES_MAX_RESULTS, SETTING_KEYS } from "@/lib/config";
import { db } from "@/lib/db";
import { upsertBusiness } from "@/lib/ingest";
import { PlacesError, TEXT_SEARCH_PAGE_SIZE, type PlacesClient } from "@/lib/places";
import { publishProgress } from "@/lib/search-jobs";
import { getSetting } from "@/lib/settings";
import { tr } from "@/lib/tr";
import type { SearchProgress } from "@/lib/types";
import { classifyWebsite } from "@/lib/website";

export const PROGRESS_EVERY = 5;
const MAX_PAGES = Math.ceil(PLACES_MAX_RESULTS / TEXT_SEARCH_PAGE_SIZE);

export interface SearchJobInput {
  jobId: string;
  query: string;
  city: string;
  /** Türkiye ilçesi (`isDistrictOf(city, district)` route'ta doğrulanır); yoksa il geneli */
  district?: string | null;
}

interface Counters {
  scanned: number;
  withoutWebsite: number;
  linkOnly: number;
  saved: number;
  textSearchCalls: number;
  detailsCalls: number;
}

/** USD, 4 ondalık (kayan nokta gürültüsünü temizler). */
export function estimateCost(textSearchCalls: number, detailsCalls: number): number {
  const raw = textSearchCalls * PLACES_COST.textSearch + detailsCalls * PLACES_COST.details;
  return Math.round(raw * 10_000) / 10_000;
}

/** İlçe adı "Merkez" olan (il merkezi) ilçeler — Places "Merkez"i yer adı olarak anlamaz. */
const CENTRAL_DISTRICT = "Merkez";

/**
 * Places Text Search sorgusu:
 * - ilçesiz: `berber Lefkoşa`
 * - ilçeli:  `berber Kadıköy İstanbul`
 * - "Merkez" ilçe: `berber Aksaray merkez` — "berber Merkez Aksaray" Places'te anlamsız/yanıltıcı;
 *   il adı + "merkez" il merkezini hedefler.
 */
export function buildTextQuery(query: string, city: string, district?: string | null): string {
  const q = query.trim();
  const c = city.trim();
  const d = district?.trim();
  if (!d) return `${q} ${c}`;
  if (d === CENTRAL_DISTRICT) return `${q} ${c} merkez`;
  return `${q} ${d} ${c}`;
}

function toProgress(jobId: string, c: Counters, status: SearchProgress["status"], error?: string): SearchProgress {
  const progress: SearchProgress = {
    jobId,
    status,
    scanned: c.scanned,
    withoutWebsite: c.withoutWebsite,
    linkOnly: c.linkOnly,
    saved: c.saved,
    estimatedCost: estimateCost(c.textSearchCalls, c.detailsCalls),
    done: status !== "RUNNING",
  };
  if (error) progress.error = error;
  return progress;
}

function errorMessage(error: unknown): string {
  if (error instanceof PlacesError) return error.message;
  const detail = error instanceof Error && error.message ? `: ${error.message}` : "";
  return `${tr.errors.searchFailed}${detail}`;
}

async function persist(progress: SearchProgress): Promise<void> {
  await db.searchJob.update({
    where: { id: progress.jobId },
    data: {
      status: progress.status,
      scanned: progress.scanned,
      withoutWebsite: progress.withoutWebsite,
      linkOnly: progress.linkOnly,
      saved: progress.saved,
      estimatedCost: progress.estimatedCost,
      ...(progress.done ? { finishedAt: new Date(), error: progress.error ?? null } : {}),
    },
  });
}

/**
 * İşi sonuna kadar yürütür; hata fırlatmaz — FAILED durumunu DB'ye yazıp döner.
 * Dönen değer son yayınlanan ilerlemedir.
 */
export async function runSearchJob(input: SearchJobInput, client: PlacesClient): Promise<SearchProgress> {
  const { jobId } = input;
  const c: Counters = {
    scanned: 0,
    withoutWebsite: 0,
    linkOnly: 0,
    saved: 0,
    textSearchCalls: 0,
    detailsCalls: 0,
  };

  const report = async (): Promise<void> => {
    const progress = toProgress(jobId, c, "RUNNING");
    publishProgress(progress);
    await persist(progress);
  };

  try {
    const bonusCategories = await getSetting(SETTING_KEYS.bonusCategories);
    const textQuery = buildTextQuery(input.query, input.city, input.district);
    let pageToken: string | undefined;

    for (let page = 0; page < MAX_PAGES && c.scanned < PLACES_MAX_RESULTS; page++) {
      const result = await client.searchText(textQuery, pageToken);
      c.textSearchCalls += 1;

      for (const place of result.places) {
        if (c.scanned >= PLACES_MAX_RESULTS) break;
        c.scanned += 1;

        // Yalnız kendi web sitesi olanlar elenir; sosyal medya / platform profili lead sayılır.
        const kind = classifyWebsite(place.websiteUri).kind;
        if (kind !== "WEBSITE" && place.businessStatus === "OPERATIONAL") {
          c.withoutWebsite += 1;
          if (kind !== "NONE") c.linkOnly += 1;
          let details;
          try {
            details = await client.getDetails(place.id);
          } catch (error) {
            // Kayıt Google'dan silinmiş olabilir → bu işletmeyi atla, işi düşürme.
            if (error instanceof PlacesError && error.httpStatus === 404) details = null;
            else throw error;
          } finally {
            c.detailsCalls += 1;
          }
          if (details && classifyWebsite(details.websiteUri).kind !== "WEBSITE") {
            await upsertBusiness(details, input.city, jobId, {
              bonusCategories,
              district: input.district ?? null,
            });
            c.saved += 1;
          }
        }

        if (c.scanned % PROGRESS_EVERY === 0) await report();
      }

      pageToken = result.nextPageToken;
      if (!pageToken) break;
    }

    const final = toProgress(jobId, c, "DONE");
    await persist(final);
    publishProgress(final);
    return final;
  } catch (error) {
    const failed = toProgress(jobId, c, "FAILED", errorMessage(error));
    try {
      await persist(failed);
    } catch (persistError) {
      console.error("[search-job] FAILED durumu yazılamadı", persistError);
    }
    publishProgress(failed);
    return failed;
  }
}

/** Başlangıç durumunu hemen yayınlar (SSE bağlanınca boş kalmasın) ve işi await etmeden başlatır. */
export function startSearchJob(input: SearchJobInput, client: PlacesClient): void {
  publishProgress({
    jobId: input.jobId,
    status: "RUNNING",
    scanned: 0,
    withoutWebsite: 0,
    linkOnly: 0,
    saved: 0,
    estimatedCost: 0,
    done: false,
  });
  void runSearchJob(input, client).catch((error: unknown) => {
    console.error("[search-job] beklenmeyen hata", error);
  });
}
