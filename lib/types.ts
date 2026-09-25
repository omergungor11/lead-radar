// API sözleşmesi — route handler'ların döndürdüğü ve client'ın tükettiği DTO'lar.
// Client-safe: Prisma veya sunucu modülü import ETME. Tarihler ISO string.
// Düzenleme yetkisi: orchestrator. Değişiklik gerekiyorsa agent raporlar, kendisi değiştirmez.

import type { ScoreBand, ScoreBreakdownItem } from "@/lib/scoring";
import type { Status } from "@/lib/status";
import type { WebsiteKind } from "@/lib/website";

// ─── İşletme ────────────────────────────────────────────────────────────────

/** `url` her zaman `/api/photo?name=<encoded name>` — Google URL'si / anahtar client'a gelmez. */
export interface PhotoRef {
  name: string;
  url: string;
}

export interface ReviewDto {
  author: string;
  rating: number | null;
  text: string;
  publishTime: string | null;
}

export interface NoteDto {
  id: string;
  body: string;
  createdAt: string;
}

export interface StatusChangeDto {
  id: string;
  from: string;
  to: string;
  createdAt: string;
}

export interface BusinessListItem {
  id: string;
  placeId: string;
  name: string;
  primaryType: string | null;
  city: string;
  /** İlk bulunduğu ilçe araması (Türkiye); yoksa null */
  district: string | null;
  address: string | null;
  phone: string | null;
  phoneE164: string | null;
  email: string | null;
  /** Google'daki link — yalnız SOCIAL / PLATFORM (veya yenilemede site edinmişse WEBSITE) için dolu */
  websiteUri: string | null;
  /** NONE: link yok · SOCIAL: yalnız sosyal medya · PLATFORM: Booking/Yemeksepeti vb. profil · WEBSITE: sonradan site edinmiş */
  websiteKind: WebsiteKind;
  rating: number | null;
  userRatingCount: number | null;
  score: number;
  band: ScoreBand;
  status: Status;
  lastContactedAt: string | null;
  firstSeenAt: string;
  lastSyncedAt: string;
  /** lastSyncedAt 30 günden (STALE_AFTER_DAYS) eski → "veri eski" */
  isStale: boolean;
  /** İlk fotoğrafın proxy URL'si; yoksa null → baş harf avatarı */
  thumbnailUrl: string | null;
}

export interface BusinessDetail extends BusinessListItem {
  types: string[];
  googleMapsUri: string | null;
  lat: number | null;
  lng: number | null;
  photos: PhotoRef[];
  reviews: ReviewDto[];
  /** weekdayDescriptions */
  openingHours: string[];
  scoreBreakdown: ScoreBreakdownItem[];
  /** createdAt desc */
  notes: NoteDto[];
  /** createdAt desc */
  statusChanges: StatusChangeDto[];
}

export const BUSINESS_SORTS = [
  "score",
  "reviews",
  "recent",
  "name",
  "category",
  "city",
  "phone",
  "email",
  "rating",
  "status",
  "lastContact",
] as const;
export type BusinessSort = (typeof BUSINESS_SORTS)[number];

/** `GET /api/businesses/categories` öğesi */
export interface CategoryCount {
  code: string;
  count: number;
}

export const SORT_DIRS = ["asc", "desc"] as const;
export type SortDir = (typeof SORT_DIRS)[number];

/** `dir` verilmezse: metin kolonları A→Z, sayı/tarih kolonları büyükten küçüğe. */
export const DEFAULT_SORT_DIR: Readonly<Record<BusinessSort, SortDir>> = {
  score: "desc",
  reviews: "desc",
  recent: "desc",
  name: "asc",
  category: "asc",
  city: "asc",
  phone: "asc",
  email: "asc",
  rating: "desc",
  status: "asc",
  lastContact: "desc",
};

/**
 * `GET /api/businesses` ve `GET /api/export` aynı query parametrelerini alır:
 * `city, district (city ile birlikte anlamlı), category (primaryType), status, web (NONE|SOCIAL|PLATFORM|WEBSITE), band (HOT|WARM|COLD), q (ad/telefon/kategori içerir),
 * sort (varsayılan score), dir (asc|desc; yoksa DEFAULT_SORT_DIR), page (1'den), pageSize (varsayılan 50, max 200)`.
 * Export ek olarak `ids=a,b,c` alır (verilirse filtre yerine yalnız bunlar).
 */
export interface BusinessFilters {
  city?: string;
  district?: string;
  web?: WebsiteKind;
  category?: string;
  status?: Status;
  band?: ScoreBand;
  q?: string;
  sort?: BusinessSort;
  dir?: SortDir;
  page?: number;
  pageSize?: number;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * `PATCH /api/businesses/[id]` gövdesi. En az bir alan.
 * - `status`: `canTransition` false → 400 `INVALID_TRANSITION`;
 *   `requiresConfirmation` true ve `confirm !== true` → 409 `CONFIRMATION_REQUIRED`.
 *   Geçiş `StatusChange` yazar; hedef CONTACTED ise `lastContactedAt = now`.
 * - `undo: true`: son StatusChange'i geri alır (status = onun `from`'u, kaydı siler,
 *   lastContactedAt'i kalan son CONTACTED değişikliğine / null'a çeker). Başka alanla birlikte gönderilmez.
 * - `email: null` / `phone: null` temizler; phone değişirse phoneE164 yeniden hesaplanır.
 * Yanıt: `{ data: BusinessDetail }`.
 */
export interface BusinessPatch {
  email?: string | null;
  phone?: string | null;
  status?: Status;
  confirm?: boolean;
  undo?: true;
}

/** `POST /api/businesses/bulk-status` `{ ids, status }` → geçersiz/onay gerektiren geçişler atlanır. */
export interface BulkStatusResult {
  updated: number;
  skipped: { id: string; reason: "INVALID_TRANSITION" | "CONFIRMATION_REQUIRED" | "NOT_FOUND" }[];
}

// ─── Arama işi ──────────────────────────────────────────────────────────────

export const SEARCH_JOB_STATUSES = ["RUNNING", "DONE", "FAILED"] as const;
export type SearchJobStatus = (typeof SEARCH_JOB_STATUSES)[number];

/**
 * `POST /api/search` gövdesi: `{ query, city, district?, area? }`.
 * `area` verilirse Places çağrısı bu daireyle sınırlanır (locationRestriction) ve sorgu metnine
 * şehir/ilçe eklenmez; `city` yine kayıt/filtre etiketi olarak zorunludur.
 */
export interface SearchArea {
  lat: number;
  lng: number;
  /** metre — SEARCH_RADIUS_MIN_M..SEARCH_RADIUS_MAX_M (lib/geo.ts) */
  radiusM: number;
}

export interface SearchJobDto {
  id: string;
  query: string;
  city: string;
  district: string | null;
  /** Harita ile alan araması yapıldıysa dolu */
  area: SearchArea | null;
  status: SearchJobStatus;
  scanned: number;
  /** Kendi sitesi olmayanlar (link yok + sosyal + platform) */
  withoutWebsite: number;
  /** withoutWebsite içinden yalnız sosyal medya / platform linki olanlar */
  linkOnly: number;
  saved: number;
  estimatedCost: number;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

/**
 * `GET /api/search/[jobId]/stream` — `text/event-stream`, her mesaj `data: <JSON SearchProgress>\n\n`.
 * Bağlanınca mevcut durumu hemen yollar; `done: true` mesajından sonra akış kapanır.
 * İş bitmişse tek mesaj yollayıp kapanır.
 */
export interface SearchProgress {
  jobId: string;
  status: SearchJobStatus;
  scanned: number;
  withoutWebsite: number;
  linkOnly: number;
  saved: number;
  estimatedCost: number;
  done: boolean;
  error?: string;
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export interface DashboardData {
  totals: {
    businesses: number;
    /** score >= 80 */
    hot: number;
    /** Son 7 günde CONTACTED'a geçiş yapan farklı işletme sayısı */
    contactedThisWeek: number;
    /**
     * Hiç REPLIED'a ulaşmış işletme / hiç CONTACTED'a ulaşmış işletme (StatusChange'ten).
     * Payda 0 ise null → UI "—".
     */
    replyRate: number | null;
    /** status === WON */
    won: number;
    /** Tüm SearchJob.estimatedCost toplamı (USD) */
    totalCost: number;
  };
  /** STATUSES sırasıyla, 0 olanlar dahil */
  funnel: { status: Status; count: number }[];
  /** startedAt desc, en fazla 10 */
  recentJobs: SearchJobDto[];
}
