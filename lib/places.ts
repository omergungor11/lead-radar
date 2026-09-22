// Google Places API (New) istemcisi. Sunucu tarafı — anahtar client'a asla gitmez.
// Her çağrıda `X-Goog-FieldMask` zorunlu (maskesiz çağrı en pahalı SKU'dan faturalanır).
// Kaynak seçimi: `getPlacesClient()` → PLACES_MOCK=1 ise mock, anahtar varsa gerçek, yoksa null.

import { z } from "zod";
import { getServerEnv } from "@/lib/env";
import { PlacesError } from "@/lib/places-error";
import { createMockPlacesClient } from "@/lib/places.mock";
import { tr } from "@/lib/tr";
import type { SearchArea } from "@/lib/types";

const API_BASE = "https://places.googleapis.com/v1";

/** Text Search field mask — TAM bu 5 alan (TASK-105 AC). */
export const TEXT_SEARCH_FIELD_MASK =
  "places.id,places.displayName,places.websiteUri,places.businessStatus,nextPageToken";

/** Place Details field mask — yalnızca sitesiz işletmeler için çağrılır. */
export const DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "websiteUri",
  "rating",
  "userRatingCount",
  "primaryType",
  "types",
  "regularOpeningHours",
  "photos",
  "reviews",
  "googleMapsUri",
  "location",
  "businessStatus",
].join(",");

export const TEXT_SEARCH_PAGE_SIZE = 20;
export const MAX_PHOTOS = 5;
export const MAX_REVIEWS = 5;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 500;
/** Mock modda çağrı başına gecikme: 15 işletmelik arama ~1,5 sn sürer, SSE ilerlemesi görünür. */
const MOCK_LATENCY_MS = 80;

// ─── Şemalar (dış veri → zod) ───────────────────────────────────────────────

const localizedText = z.object({ text: z.string().optional() }).loose();

const textSearchPlaceSchema = z
  .object({
    id: z.string().min(1),
    displayName: localizedText.optional(),
    websiteUri: z.string().optional(),
    businessStatus: z.string().optional(),
  })
  .loose();

const textSearchResponseSchema = z
  .object({
    places: z.array(textSearchPlaceSchema).optional(),
    nextPageToken: z.string().optional(),
  })
  .loose();

const reviewSchema = z
  .object({
    rating: z.number().optional(),
    text: localizedText.optional(),
    originalText: localizedText.optional(),
    authorAttribution: z.object({ displayName: z.string().optional() }).loose().optional(),
    publishTime: z.string().optional(),
  })
  .loose();

export const placeDetailsSchema = z
  .object({
    id: z.string().min(1),
    displayName: localizedText.optional(),
    formattedAddress: z.string().optional(),
    nationalPhoneNumber: z.string().optional(),
    internationalPhoneNumber: z.string().optional(),
    websiteUri: z.string().optional(),
    rating: z.number().optional(),
    userRatingCount: z.number().int().optional(),
    primaryType: z.string().optional(),
    types: z.array(z.string()).optional(),
    regularOpeningHours: z
      .object({ weekdayDescriptions: z.array(z.string()).optional() })
      .loose()
      .optional(),
    photos: z
      .array(z.object({ name: z.string().min(1) }).loose())
      .transform((photos) => photos.slice(0, MAX_PHOTOS))
      .optional(),
    reviews: z
      .array(reviewSchema)
      .transform((reviews) => reviews.slice(0, MAX_REVIEWS))
      .optional(),
    googleMapsUri: z.string().optional(),
    location: z.object({ latitude: z.number(), longitude: z.number() }).loose().optional(),
    businessStatus: z.string().optional(),
  })
  .loose();

const photoMediaSchema = z.object({ photoUri: z.url({ protocol: /^https$/ }) }).loose();

export type TextSearchPlace = z.output<typeof textSearchPlaceSchema>;
export type PlaceDetails = z.output<typeof placeDetailsSchema>;
export type PlaceDetailsInput = z.input<typeof placeDetailsSchema>;

export interface TextSearchResult {
  places: TextSearchPlace[];
  nextPageToken?: string;
}

/** Places API (New) `locationRestriction.circle` — yarıçap metre cinsinden. */
export interface CircleRestriction {
  circle: {
    center: { latitude: number; longitude: number };
    radius: number;
  };
}

export interface TextSearchOptions {
  /** Verilirse arama bu daireyle sınırlanır; sorgu metnine şehir/ilçe eklenmez. */
  locationRestriction?: CircleRestriction;
}

/** `SearchArea` → Places gövdesindeki `locationRestriction`. */
export function circleRestriction(area: SearchArea): CircleRestriction {
  return {
    circle: {
      center: { latitude: area.lat, longitude: area.lng },
      radius: area.radiusM,
    },
  };
}

export interface PlacesClient {
  searchText(query: string, pageToken?: string, options?: TextSearchOptions): Promise<TextSearchResult>;
  getDetails(placeId: string): Promise<PlaceDetails>;
  /** Kısa ömürlü googleusercontent URL'si — anahtar içermez. */
  getPhotoUri(name: string, maxWidthPx: number): Promise<string>;
}

// ─── Hata ───────────────────────────────────────────────────────────────────

// places.mock.ts da kullanır → ayrı dosyada (places ↔ mock döngüsel import olmasın).
export { PlacesError };

// ─── Gerçek istemci ─────────────────────────────────────────────────────────

export interface PlacesClientOptions {
  fetch?: typeof fetch;
  /** Test için enjekte edilebilir bekleme. */
  sleep?: (ms: number) => Promise<void>;
  baseBackoffMs?: number;
}

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

export function createPlacesClient(apiKey: string, options: PlacesClientOptions = {}): PlacesClient {
  const doFetch = options.fetch ?? fetch;
  const sleep = options.sleep ?? defaultSleep;
  const baseBackoff = options.baseBackoffMs ?? BASE_BACKOFF_MS;

  /** 429/5xx/ağ hatasında üstel geri çekilme (500 ms, 1 sn), toplam 3 deneme. */
  async function request<T>(
    url: string,
    init: { method: "GET" | "POST"; fieldMask: string; body?: unknown },
    schema: z.ZodType<T>,
  ): Promise<T> {
    let lastError: PlacesError | null = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) await sleep(baseBackoff * 2 ** (attempt - 1));

      let response: Response;
      try {
        response = await doFetch(url, {
          method: init.method,
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": init.fieldMask,
          },
          body: init.body === undefined ? undefined : JSON.stringify(init.body),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          cache: "no-store",
        });
      } catch {
        lastError = new PlacesError(tr.errors.placesUnavailable);
        continue;
      }

      if (response.ok) {
        const parsed = schema.safeParse(await response.json().catch(() => undefined));
        if (!parsed.success) throw new PlacesError(tr.errors.placesInvalidResponse, response.status);
        return parsed.data;
      }

      // Google hata gövdesi anahtar içermez ama loglamaya gerek yok; yalnız durum kodu yeterli.
      await response.body?.cancel().catch(() => undefined);
      if (!isRetryable(response.status)) {
        throw new PlacesError(tr.errors.placesRequestFailed(response.status), response.status);
      }
      lastError =
        response.status === 429
          ? new PlacesError(tr.errors.placesRateLimited, 429)
          : new PlacesError(tr.errors.placesRequestFailed(response.status), response.status);
    }

    throw lastError ?? new PlacesError(tr.errors.placesUnavailable);
  }

  return {
    async searchText(query, pageToken, options) {
      const body: Record<string, unknown> = {
        textQuery: query,
        languageCode: "tr",
        pageSize: TEXT_SEARCH_PAGE_SIZE,
      };
      if (pageToken) body.pageToken = pageToken;
      // Field mask değişmez; locationRestriction yalnız gövdede yer alır (ek SKU maliyeti yok).
      if (options?.locationRestriction) body.locationRestriction = options.locationRestriction;
      const data = await request(
        `${API_BASE}/places:searchText`,
        { method: "POST", fieldMask: TEXT_SEARCH_FIELD_MASK, body },
        textSearchResponseSchema,
      );
      return { places: data.places ?? [], nextPageToken: data.nextPageToken || undefined };
    },

    getDetails(placeId) {
      return request(
        `${API_BASE}/places/${encodeURIComponent(placeId)}?languageCode=tr`,
        { method: "GET", fieldMask: DETAILS_FIELD_MASK },
        placeDetailsSchema,
      );
    },

    async getPhotoUri(name, maxWidthPx) {
      // `name` çağıran tarafta regex ile doğrulanır (places/<id>/photos/<ref>) — encode etme, `/` içerir.
      const data = await request(
        `${API_BASE}/${name}/media?maxWidthPx=${maxWidthPx}&skipHttpRedirect=true`,
        { method: "GET", fieldMask: "photoUri" },
        photoMediaSchema,
      );
      return data.photoUri;
    },
  };
}

// ─── Kaynak seçimi ──────────────────────────────────────────────────────────

export function isPlacesMock(): boolean {
  return getServerEnv().placesMock;
}

/** Mock açıksa mock; anahtar varsa gerçek; yoksa `null` → route 503 `PLACES_NOT_CONFIGURED`. */
export function getPlacesClient(): PlacesClient | null {
  const env = getServerEnv();
  if (env.placesMock) return createMockPlacesClient({ latencyMs: MOCK_LATENCY_MS });
  if (env.googlePlacesApiKey) return createPlacesClient(env.googlePlacesApiKey);
  return null;
}
