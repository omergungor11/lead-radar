// Excel export (TASK-108, PROMPT §7). `buildWorkbook` saf (DB'siz) → testlenebilir;
// `fetchExportRows` filtre/ids ile DB'den satırları getirir. Sunucu tarafı.

import ExcelJS from "exceljs";
import {
  buildOrderBy,
  buildWhere,
  normalizeStatus,
  normalizeWebsiteKind,
  parsePhotos,
} from "@/lib/businesses";
import { categoryLabel } from "@/lib/categories";
import { db } from "@/lib/db";
import type { Status } from "@/lib/status";
import { tr } from "@/lib/tr";
import type { BusinessFilters } from "@/lib/types";
import { classifyWebsite, type WebsiteKind } from "@/lib/website";

export const EXPORT_MAX_ROWS = 5000;
export const EXPORT_MAX_IDS = EXPORT_MAX_ROWS;
/** KKTC saat dilimi — "Son Temas" ve dosya adındaki tarih bu bölgeye göre. */
export const EXPORT_TIME_ZONE = "Europe/Nicosia";
export const EXPORT_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const NOTES_SEPARATOR = " | ";

/** Excel hücre metni üst sınırı. */
const CELL_TEXT_MAX = 32_767;

export interface ExportRow {
  name: string;
  primaryType: string | null;
  city: string;
  district: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  /** Google'daki link (sosyal medya / platform profili) */
  websiteUri: string | null;
  websiteKind: WebsiteKind;
  rating: number | null;
  userRatingCount: number | null;
  score: number;
  status: Status;
  lastContactedAt: Date | null;
  googleMapsUri: string | null;
  /** Mutlak proxy URL'si (`https://host/api/photo?name=…`); Google URL'si ASLA (anahtar sızar). */
  photoUrl: string | null;
  /** Eskiden yeniye */
  notes: string[];
}

type ColumnKey = keyof typeof tr.export.columns;

// §7 sırası. Genişlikler karakter cinsinden.
const COLUMNS: readonly { key: ColumnKey; width: number }[] = [
  { key: "name", width: 32 },
  { key: "category", width: 20 },
  { key: "city", width: 14 },
  { key: "district", width: 16 },
  { key: "address", width: 40 },
  { key: "phone", width: 18 },
  { key: "email", width: 28 },
  { key: "websiteUri", width: 40 },
  { key: "websiteKind", width: 24 },
  { key: "rating", width: 8 },
  { key: "userRatingCount", width: 13 },
  { key: "score", width: 11 },
  { key: "status", width: 14 },
  { key: "lastContactedAt", width: 12 },
  { key: "googleMapsUri", width: 40 },
  { key: "photoUrl", width: 40 },
  { key: "notes", width: 60 },
];

const PHONE_COLUMN = COLUMNS.findIndex((c) => c.key === "phone") + 1;

export function formatExportDate(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: EXPORT_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/** `lead-radar-YYYY-MM-DD.xlsx` */
export function exportFileName(now: Date = new Date()): string {
  // en-CA biçimi YYYY-MM-DD
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: EXPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return `lead-radar-${day}.xlsx`;
}

function clip(text: string): string {
  return text.length > CELL_TEXT_MAX ? text.slice(0, CELL_TEXT_MAX) : text;
}

/** "Yok" · "Web sitesi" · "Sosyal medya (Instagram)" · "Platform (Booking.com)" */
export function websiteKindLabel(kind: WebsiteKind, uri: string | null): string {
  const base = tr.export.websiteKind[kind];
  if (kind !== "SOCIAL" && kind !== "PLATFORM") return base;
  const brand = classifyWebsite(uri).label;
  return brand ? `${base} (${brand})` : base;
}

function rowValues(row: ExportRow): Record<ColumnKey, string | number | null> {
  return {
    name: row.name,
    category: row.primaryType ? categoryLabel(row.primaryType) : null,
    city: row.city,
    district: row.district ?? "",
    address: row.address,
    phone: row.phone,
    email: row.email,
    websiteUri: row.websiteUri,
    websiteKind: websiteKindLabel(row.websiteKind, row.websiteUri),
    rating: row.rating,
    userRatingCount: row.userRatingCount,
    score: row.score,
    status: tr.status[row.status],
    lastContactedAt: row.lastContactedAt ? formatExportDate(row.lastContactedAt) : null,
    googleMapsUri: row.googleMapsUri,
    photoUrl: row.photoUrl,
    notes: row.notes.length > 0 ? clip(row.notes.join(NOTES_SEPARATOR)) : null,
  };
}

export async function buildWorkbook(rows: readonly ExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = tr.app.name;
  const sheet = workbook.addWorksheet(tr.export.sheetName, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = COLUMNS.map(({ key, width }) => ({
    header: tr.export.columns[key],
    key,
    width,
  }));
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    const added = sheet.addRow(rowValues(row));
    // Telefon metin: Excel `+90…`'ı sayıya çevirmesin
    const phone = added.getCell(PHONE_COLUMN);
    phone.numFmt = "@";
    if (row.phone !== null) phone.value = String(row.phone);
  }

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: COLUMNS.length },
  };

  const out = await workbook.xlsx.writeBuffer();
  return Buffer.from(out);
}

export type ExportQuery = { ids: string[] } | { filters: BusinessFilters };

/**
 * Filtreye (veya ids'e) uyan satırlar, liste sıralamasıyla, en fazla EXPORT_MAX_ROWS.
 * `origin`: fotoğraf proxy URL'sini mutlak yapmak için isteğin URL'si.
 */
export async function fetchExportRows(
  query: ExportQuery,
  origin: string | URL,
): Promise<{ rows: ExportRow[]; truncated: boolean }> {
  const where = "ids" in query ? { id: { in: query.ids } } : buildWhere(query.filters);
  const sort = "ids" in query ? undefined : query.filters.sort;
  const dir = "ids" in query ? undefined : query.filters.dir;
  const found = await db.business.findMany({
    where,
    orderBy: buildOrderBy(sort, dir),
    take: EXPORT_MAX_ROWS + 1,
    select: {
      name: true,
      primaryType: true,
      city: true,
      district: true,
      address: true,
      phone: true,
      email: true,
      websiteUri: true,
      websiteKind: true,
      rating: true,
      userRatingCount: true,
      score: true,
      status: true,
      lastContactedAt: true,
      googleMapsUri: true,
      photos: true,
      notes: { select: { body: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
    },
  });

  const truncated = found.length > EXPORT_MAX_ROWS;
  const rows = found.slice(0, EXPORT_MAX_ROWS).map((b): ExportRow => {
    const photo = parsePhotos(b.photos)[0];
    return {
      name: b.name,
      primaryType: b.primaryType,
      city: b.city,
      district: b.district,
      address: b.address,
      phone: b.phone,
      email: b.email,
      websiteUri: b.websiteUri,
      websiteKind: normalizeWebsiteKind(b.websiteKind),
      rating: b.rating,
      userRatingCount: b.userRatingCount,
      score: b.score,
      status: normalizeStatus(b.status),
      lastContactedAt: b.lastContactedAt,
      googleMapsUri: b.googleMapsUri,
      // Proxy göreli → mutlak. Bağlantı oturum çerezi ister (middleware); Excel'den açılınca
      // tarayıcıda giriş yapılmış olmalı.
      photoUrl: photo ? new URL(photo.url, origin).toString() : null,
      notes: b.notes.map((n) => n.body),
    };
  });
  return { rows, truncated };
}
