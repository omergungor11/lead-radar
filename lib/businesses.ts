// İşletme sorguları, serileştirme ve durum/iletişim güncellemeleri (TASK-106/107).
// Sunucu tarafı — route handler'lar ve export kullanır. Client `lib/types.ts` DTO'larını görür.

import type { Business, Note, Prisma, StatusChange } from "@prisma/client";
import { z } from "zod";
import { STALE_AFTER_DAYS } from "@/lib/config";
import { db } from "@/lib/db";
import { toE164 } from "@/lib/phone";
import { SCORE_SIGNALS, scoreBand, type ScoreBand, type ScoreBreakdownItem } from "@/lib/scoring";
import { canTransition, isStatus, requiresConfirmation, STATUSES, type Status } from "@/lib/status";
import { tr } from "@/lib/tr";
import {
  BUSINESS_SORTS,
  type BulkStatusResult,
  type BusinessDetail,
  type BusinessFilters,
  type BusinessListItem,
  type BusinessSort,
  type NoteDto,
  type PageMeta,
  type PhotoRef,
  type ReviewDto,
  type StatusChangeDto,
} from "@/lib/types";
import { isWebsiteKind, WEBSITE_KINDS, type WebsiteKind } from "@/lib/website";

const DAY_MS = 86_400_000;
const SCORE_BANDS = ["HOT", "WARM", "COLD"] as const satisfies readonly ScoreBand[];

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;
export const NOTE_BODY_MAX = 2000;
export const BULK_MAX_IDS = 500;

// ─── Filtreler ──────────────────────────────────────────────────────────────

/** `?city=` gibi boş parametreler "filtre yok" sayılır. */
function blankToUndefined(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

const optionalText = z.preprocess(blankToUndefined, z.string().trim().max(200).optional());

export const businessFiltersSchema = z.object({
  city: optionalText,
  district: optionalText,
  web: z.preprocess(blankToUndefined, z.enum(WEBSITE_KINDS).optional()),
  category: optionalText,
  status: z.preprocess(blankToUndefined, z.enum(STATUSES).optional()),
  band: z.preprocess(blankToUndefined, z.enum(SCORE_BANDS).optional()),
  q: optionalText,
  sort: z.preprocess(blankToUndefined, z.enum(BUSINESS_SORTS).default("score")),
  page: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).default(1)),
  pageSize: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  ),
});

/** Varsayılanları uygulanmış filtreler (sort/page/pageSize her zaman dolu). */
export type ParsedBusinessFilters = BusinessFilters & {
  sort: BusinessSort;
  page: number;
  pageSize: number;
};

export type ParseResult<T> = { success: true; data: T } | { success: false; error: z.ZodError };

/** Query string → filtreler. Geçersiz status/band/web/sort/page → `success: false` (route 400 döner). */
export function parseBusinessFilters(
  searchParams: URLSearchParams,
): ParseResult<ParsedBusinessFilters> {
  // Aynı anahtar birden çok kez gelirse ilki geçerli
  const raw: Record<string, string> = {};
  for (const [key, value] of searchParams) {
    if (!(key in raw)) raw[key] = value;
  }
  const parsed = businessFiltersSchema.safeParse(raw);
  return parsed.success ? { success: true, data: parsed.data } : { success: false, error: parsed.error };
}

export function buildWhere(filters: BusinessFilters): Prisma.BusinessWhereInput {
  const where: Prisma.BusinessWhereInput = {};
  if (filters.city) where.city = filters.city;
  if (filters.district) where.district = filters.district;
  if (filters.web) where.websiteKind = filters.web;
  if (filters.category) where.primaryType = filters.category;
  if (filters.status) where.status = filters.status;

  if (filters.band === "HOT") where.score = { gte: 80 };
  else if (filters.band === "WARM") where.score = { gte: 50, lt: 80 };
  else if (filters.band === "COLD") where.score = { lt: 50 };

  if (filters.q) {
    // SQLite'ta Prisma `mode: "insensitive"` yok; `contains` LIKE'a düşer ve yalnız ASCII
    // harflerde büyük/küçük duyarsızdır ("şişli" ≠ "ŞİŞLİ"). MVP için yeterli.
    const or: Prisma.BusinessWhereInput[] = [
      { name: { contains: filters.q } },
      { phone: { contains: filters.q } },
      { phoneE164: { contains: filters.q } },
    ];
    // "0392 228 12" gibi yazılan numara E.164'te "+90392228…" olarak durur → rakamları ara
    const digits = filters.q.replace(/\D/g, "").replace(/^0+/, "");
    if (digits.length >= 3 && digits !== filters.q) or.push({ phoneE164: { contains: digits } });
    where.OR = or;
  }
  return where;
}

/** Hepsi azalan; `id` eşitlikte sayfalamayı kararlı tutar. */
export function buildOrderBy(sort: BusinessSort = "score"): Prisma.BusinessOrderByWithRelationInput[] {
  switch (sort) {
    case "reviews":
      return [{ userRatingCount: { sort: "desc", nulls: "last" } }, { id: "asc" }];
    case "recent":
      return [{ firstSeenAt: "desc" }, { id: "asc" }];
    case "score":
      return [{ score: "desc" }, { userRatingCount: { sort: "desc", nulls: "last" } }, { id: "asc" }];
  }
}

// ─── JSON alanları ──────────────────────────────────────────────────────────

function parseJson(raw: string | null | undefined): unknown {
  if (raw == null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** JSON dizi → her öğe `item` şemasıyla; bozuk öğe atlanır, bozuk dizi → []. */
function parseArray<T>(raw: string | null | undefined, item: z.ZodType<T>): T[] {
  const value = parseJson(raw);
  if (!Array.isArray(value)) return [];
  const out: T[] = [];
  for (const entry of value) {
    const parsed = item.safeParse(entry);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

const photoSchema = z.object({ name: z.string().min(1), url: z.string().optional() }).loose();
const reviewSchema = z
  .object({
    author: z.string().catch(""),
    rating: z.number().nullable().catch(null),
    text: z.string().catch(""),
    publishTime: z.string().nullable().catch(null),
  })
  .loose();
const breakdownSchema = z.object({ signal: z.enum(SCORE_SIGNALS), points: z.number() });

/** Proxy URL'si — Google URL'si / API anahtarı client'a gitmesin diye DB'deki url'e güvenilmez. */
export function photoProxyUrl(name: string): string {
  return `/api/photo?name=${encodeURIComponent(name)}`;
}

export function parsePhotos(raw: string | null | undefined): PhotoRef[] {
  return parseArray(raw, photoSchema).map((p) => ({ name: p.name, url: photoProxyUrl(p.name) }));
}

function parseReviews(raw: string | null | undefined): ReviewDto[] {
  return parseArray(raw, reviewSchema).map((r) => ({
    author: r.author,
    rating: r.rating,
    text: r.text,
    publishTime: r.publishTime,
  }));
}

function parseBreakdown(raw: string | null | undefined): ScoreBreakdownItem[] {
  return parseArray(raw, breakdownSchema);
}

function parseStrings(raw: string | null | undefined): string[] {
  return parseArray(raw, z.string());
}

// ─── DTO dönüşümü ───────────────────────────────────────────────────────────

/** Liste için gereken kolonlar — reviews/openingHours gibi ağır JSON'lar çekilmez. */
export const listSelect = {
  id: true,
  placeId: true,
  name: true,
  primaryType: true,
  city: true,
  district: true,
  address: true,
  phone: true,
  phoneE164: true,
  email: true,
  websiteUri: true,
  websiteKind: true,
  rating: true,
  userRatingCount: true,
  score: true,
  status: true,
  lastContactedAt: true,
  firstSeenAt: true,
  lastSyncedAt: true,
  photos: true,
} as const satisfies Prisma.BusinessSelect;

export type BusinessListRow = Prisma.BusinessGetPayload<{ select: typeof listSelect }>;
export type BusinessDetailRow = Business & { notes: Note[]; statusChanges: StatusChange[] };

export const detailInclude = {
  notes: { orderBy: [{ createdAt: "desc" }, { id: "desc" }] },
  statusChanges: { orderBy: [{ createdAt: "desc" }, { id: "desc" }] },
} as const satisfies Prisma.BusinessInclude;

/** DB'de bilinmeyen link türü → NONE. */
export function normalizeWebsiteKind(value: string): WebsiteKind {
  return isWebsiteKind(value) ? value : "NONE";
}

/** DB'de bilinmeyen durum (elle düzenleme vb.) → NEW. */
export function normalizeStatus(value: string): Status {
  return isStatus(value) ? value : "NEW";
}

export function isStale(lastSyncedAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - lastSyncedAt.getTime() > STALE_AFTER_DAYS * DAY_MS;
}

export function toBusinessListItem(row: BusinessListRow, now: Date = new Date()): BusinessListItem {
  const photos = parsePhotos(row.photos);
  return {
    id: row.id,
    placeId: row.placeId,
    name: row.name,
    primaryType: row.primaryType,
    city: row.city,
    district: row.district,
    address: row.address,
    phone: row.phone,
    phoneE164: row.phoneE164,
    email: row.email,
    websiteUri: row.websiteUri,
    websiteKind: normalizeWebsiteKind(row.websiteKind),
    rating: row.rating,
    userRatingCount: row.userRatingCount,
    score: row.score,
    band: scoreBand(row.score),
    status: normalizeStatus(row.status),
    lastContactedAt: row.lastContactedAt?.toISOString() ?? null,
    firstSeenAt: row.firstSeenAt.toISOString(),
    lastSyncedAt: row.lastSyncedAt.toISOString(),
    isStale: isStale(row.lastSyncedAt, now),
    thumbnailUrl: photos[0]?.url ?? null,
  };
}

function toNoteDto(note: Note): NoteDto {
  return { id: note.id, body: note.body, createdAt: note.createdAt.toISOString() };
}

function toStatusChangeDto(change: StatusChange): StatusChangeDto {
  return { id: change.id, from: change.from, to: change.to, createdAt: change.createdAt.toISOString() };
}

function byCreatedAtDesc<T extends { createdAt: Date }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function toBusinessDetail(row: BusinessDetailRow, now: Date = new Date()): BusinessDetail {
  return {
    ...toBusinessListItem(row, now),
    types: parseStrings(row.types),
    googleMapsUri: row.googleMapsUri,
    lat: row.lat,
    lng: row.lng,
    photos: parsePhotos(row.photos),
    reviews: parseReviews(row.reviews),
    openingHours: parseStrings(row.openingHours),
    scoreBreakdown: parseBreakdown(row.scoreBreakdown),
    notes: byCreatedAtDesc(row.notes).map(toNoteDto),
    statusChanges: byCreatedAtDesc(row.statusChanges).map(toStatusChangeDto),
  };
}

// ─── Sorgular ───────────────────────────────────────────────────────────────

export async function listBusinesses(
  filters: ParsedBusinessFilters,
): Promise<{ items: BusinessListItem[]; meta: PageMeta }> {
  const where = buildWhere(filters);
  const [rows, total] = await db.$transaction([
    db.business.findMany({
      where,
      orderBy: buildOrderBy(filters.sort),
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: listSelect,
    }),
    db.business.count({ where }),
  ]);
  const now = new Date();
  return {
    items: rows.map((row) => toBusinessListItem(row, now)),
    meta: { page: filters.page, pageSize: filters.pageSize, total },
  };
}

export async function getBusinessDetail(id: string): Promise<BusinessDetail | null> {
  const row = await db.business.findUnique({ where: { id }, include: detailInclude });
  return row ? toBusinessDetail(row) : null;
}

// ─── Güncellemeler ──────────────────────────────────────────────────────────

/** Trim; boş string → null. */
function blankToNull(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export const businessPatchSchema = z
  .object({
    email: z.preprocess(blankToNull, z.email().max(254).nullable()).optional(),
    phone: z.preprocess(blankToNull, z.string().max(40).nullable()).optional(),
    status: z.enum(STATUSES).optional(),
    confirm: z.boolean().optional(),
    undo: z.literal(true).optional(),
  })
  .superRefine((value, ctx) => {
    const hasField =
      value.email !== undefined || value.phone !== undefined || value.status !== undefined;
    if (value.undo && (hasField || value.confirm !== undefined)) {
      ctx.addIssue({ code: "custom", path: ["undo"], message: tr.errors.undoWithOtherFields });
    } else if (!value.undo && !hasField) {
      ctx.addIssue({ code: "custom", path: [], message: tr.errors.emptyUpdate });
    }
  });

export type BusinessPatchInput = z.infer<typeof businessPatchSchema>;

export type PatchFailure =
  | "NOT_FOUND"
  | "INVALID_TRANSITION"
  | "CONFIRMATION_REQUIRED"
  | "NOTHING_TO_UNDO";

export type PatchResult = { ok: true; data: BusinessDetail } | { ok: false; code: PatchFailure };

/** Hedef CONTACTED ise lastContactedAt = now. */
function statusData(to: Status, now: Date): Prisma.BusinessUpdateInput {
  return to === "CONTACTED" ? { status: to, lastContactedAt: now } : { status: to };
}

/**
 * `lib/types.ts#BusinessPatch` kuralları. Aynı duruma "geçiş" (status === mevcut) no-op'tur:
 * StatusChange yazılmaz, hata da dönülmez (form diğer alanlarla birlikte mevcut durumu yollayabilir).
 */
export async function patchBusiness(
  id: string,
  patch: BusinessPatchInput,
  now: Date = new Date(),
): Promise<PatchResult> {
  const current = await db.business.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!current) return { ok: false, code: "NOT_FOUND" };

  if (patch.undo) {
    const last = await db.statusChange.findFirst({
      where: { businessId: id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    if (!last) return { ok: false, code: "NOTHING_TO_UNDO" };
    const previousContact = await db.statusChange.findFirst({
      where: { businessId: id, to: "CONTACTED", id: { not: last.id } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    await db.$transaction([
      db.statusChange.delete({ where: { id: last.id } }),
      db.business.update({
        where: { id },
        data: {
          status: normalizeStatus(last.from),
          lastContactedAt: previousContact?.createdAt ?? null,
        },
      }),
    ]);
  } else {
    const data: Prisma.BusinessUpdateInput = {};
    if (patch.email !== undefined) data.email = patch.email;
    if (patch.phone !== undefined) {
      data.phone = patch.phone;
      data.phoneE164 = toE164(patch.phone);
    }

    const target = patch.status;
    const transition = target !== undefined && target !== current.status;
    if (transition) {
      if (!canTransition(current.status, target)) return { ok: false, code: "INVALID_TRANSITION" };
      if (requiresConfirmation(current.status, target) && patch.confirm !== true) {
        return { ok: false, code: "CONFIRMATION_REQUIRED" };
      }
      Object.assign(data, statusData(target, now));
      await db.$transaction([
        db.business.update({ where: { id }, data }),
        db.statusChange.create({
          data: { businessId: id, from: current.status, to: target, createdAt: now },
        }),
      ]);
    } else if (Object.keys(data).length > 0) {
      await db.business.update({ where: { id }, data });
    }
  }

  const detail = await getBusinessDetail(id);
  return detail ? { ok: true, data: detail } : { ok: false, code: "NOT_FOUND" };
}

export const noteCreateSchema = z.object({
  body: z.string().trim().min(1).max(NOTE_BODY_MAX),
});

export async function addNote(businessId: string, body: string): Promise<NoteDto | null> {
  const exists = await db.business.findUnique({ where: { id: businessId }, select: { id: true } });
  if (!exists) return null;
  const note = await db.note.create({ data: { businessId, body } });
  return toNoteDto(note);
}

export const bulkStatusSchema = z.object({
  ids: z.array(z.string().min(1).max(64)).min(1).max(BULK_MAX_IDS),
  status: z.enum(STATUSES),
});

/**
 * Toplu durum değişikliği. Onay gerektiren (SKIPPED/LOST → CONTACTED), izinsiz (aynı durum dahil)
 * ve bulunamayan kayıtlar atlanır. Geçerli olanlar tek transaction'da yazılır.
 */
export async function bulkUpdateStatus(
  ids: readonly string[],
  target: Status,
  now: Date = new Date(),
): Promise<BulkStatusResult> {
  const unique = [...new Set(ids)];
  const rows = await db.business.findMany({
    where: { id: { in: unique } },
    select: { id: true, status: true },
  });
  const statusById = new Map(rows.map((r) => [r.id, r.status]));

  const skipped: BulkStatusResult["skipped"] = [];
  const eligible: { id: string; from: string }[] = [];
  for (const id of unique) {
    const from = statusById.get(id);
    if (from === undefined) skipped.push({ id, reason: "NOT_FOUND" });
    else if (!canTransition(from, target)) skipped.push({ id, reason: "INVALID_TRANSITION" });
    else if (requiresConfirmation(from, target)) skipped.push({ id, reason: "CONFIRMATION_REQUIRED" });
    else eligible.push({ id, from });
  }

  if (eligible.length > 0) {
    await db.$transaction(
      eligible.flatMap(({ id, from }) => [
        db.business.update({ where: { id }, data: statusData(target, now) }),
        db.statusChange.create({ data: { businessId: id, from, to: target, createdAt: now } }),
      ]),
    );
  }
  return { updated: eligible.length, skipped };
}
