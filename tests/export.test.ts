import ExcelJS from "exceljs";
import { describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({ business: { findMany: vi.fn() } }));
vi.mock("@/lib/db", () => ({ db: dbMock }));

import { GET as exportRoute } from "@/app/api/export/route";
import { buildOrderBy } from "@/lib/businesses";
import {
  buildWorkbook,
  EXPORT_CONTENT_TYPE,
  EXPORT_MAX_ROWS,
  exportFileName,
  fetchExportRows,
  type ExportRow,
  websiteKindLabel,
} from "@/lib/export";
import { tr } from "@/lib/tr";

const HEADERS = [
  "İşletme",
  "Kategori",
  "Şehir",
  "İlçe",
  "Adres",
  "Telefon",
  "E-posta",
  "Mevcut link",
  "Link türü",
  "Puan",
  "Yorum Sayısı",
  "Lead Skoru",
  "Durum",
  "Son Temas",
  "Google Maps URL",
  "Fotoğraf 1 URL",
  "Notlar",
];

const FIXTURE: ExportRow[] = [
  {
    name: "Berber Ali",
    primaryType: "barber_shop",
    city: "Lefkoşa",
    district: null,
    address: "Dereboyu Cd. 12",
    phone: "+90 392 228 12 34",
    email: "ali@example.com",
    websiteUri: "https://www.instagram.com/berberali/",
    websiteKind: "SOCIAL",
    rating: 4.6,
    userRatingCount: 87,
    score: 85,
    status: "CONTACTED",
    lastContactedAt: new Date("2026-09-20T09:00:00Z"),
    googleMapsUri: "https://maps.google.com/?cid=1",
    photoUrl: "https://panel.example.com/api/photo?name=places%2Fa%2Fphotos%2F1",
    notes: ["İlk not", "Pazartesi ara", "Fiyat sordu"],
  },
  {
    name: "Kafe Deniz",
    primaryType: "unknown_type",
    city: "Girne",
    district: null,
    address: null,
    phone: "05331234567",
    email: null,
    websiteUri: null,
    websiteKind: "NONE",
    rating: null,
    userRatingCount: null,
    score: 40,
    status: "NEW",
    lastContactedAt: null,
    googleMapsUri: null,
    photoUrl: null,
    notes: [],
  },
  {
    name: "Telefonsuz",
    primaryType: null,
    city: "İstanbul",
    district: "Kadıköy",
    address: "Sahil yolu",
    phone: null,
    email: null,
    websiteUri: "https://www.booking.com/hotel/cy/x.html",
    websiteKind: "PLATFORM",
    rating: 3.9,
    userRatingCount: 4,
    score: 12,
    status: "SKIPPED",
    lastContactedAt: null,
    googleMapsUri: null,
    photoUrl: null,
    notes: ["Tek not"],
  },
];

async function readBack(buffer: Buffer): Promise<ExcelJS.Worksheet> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = wb.worksheets[0];
  if (!sheet) throw new Error("sayfa yok");
  return sheet;
}

function rowValues(sheet: ExcelJS.Worksheet, rowNumber: number): unknown[] {
  const row = sheet.getRow(rowNumber);
  return Array.from({ length: HEADERS.length }, (_, i) => row.getCell(i + 1).value ?? null);
}

describe("buildWorkbook", () => {
  it("§7 başlıkları sırasıyla, kalın, dondurulmuş, autoFilter", async () => {
    const sheet = await readBack(await buildWorkbook(FIXTURE));
    expect(sheet.name).toBe(tr.export.sheetName);
    expect(rowValues(sheet, 1)).toEqual(HEADERS);
    for (let c = 1; c <= HEADERS.length; c++) {
      expect(sheet.getRow(1).getCell(c).font?.bold).toBe(true);
    }
    expect(sheet.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
    expect(sheet.autoFilter).toBeTruthy();
    expect(sheet.getColumn(1).width).toBeGreaterThan(10);
    expect(sheet.rowCount).toBe(4);
  });

  it("hücre değerleri; notlar ' | ' ile eskiden yeniye", async () => {
    const sheet = await readBack(await buildWorkbook(FIXTURE));
    expect(rowValues(sheet, 2)).toEqual([
      "Berber Ali",
      "Berber",
      "Lefkoşa",
      "",
      "Dereboyu Cd. 12",
      "+90 392 228 12 34",
      "ali@example.com",
      "https://www.instagram.com/berberali/",
      "Sosyal medya (Instagram)",
      4.6,
      87,
      85,
      "Temas edildi",
      "20.09.2026",
      "https://maps.google.com/?cid=1",
      "https://panel.example.com/api/photo?name=places%2Fa%2Fphotos%2F1",
      "İlk not | Pazartesi ara | Fiyat sordu",
    ]);
    expect(rowValues(sheet, 3)).toEqual([
      "Kafe Deniz",
      "unknown_type",
      "Girne",
      "",
      null,
      "05331234567",
      null,
      null,
      "Yok",
      null,
      null,
      40,
      "Yeni",
      null,
      null,
      null,
      null,
    ]);
    expect(rowValues(sheet, 4)[1]).toBeNull();
    expect(rowValues(sheet, 4).slice(2, 4)).toEqual(["İstanbul", "Kadıköy"]);
    expect(rowValues(sheet, 4).slice(7, 9)).toEqual(["https://www.booking.com/hotel/cy/x.html", "Platform (Booking.com)"]);
    expect(rowValues(sheet, 4)[12]).toBe("Atlandı");
    expect(rowValues(sheet, 4)[16]).toBe("Tek not");
  });

  it("17 sütun; İlçe Şehir'den, link sütunları E-posta'dan hemen sonra", () => {
    expect(HEADERS).toHaveLength(17);
    expect(Object.values(tr.export.columns)).toEqual(HEADERS);
  });

  it("telefon hücresi metin (İlçe sonrası 6. sütun): string değer + numFmt '@'", async () => {
    const sheet = await readBack(await buildWorkbook(FIXTURE));
    expect(sheet.getRow(1).getCell(6).value).toBe("Telefon");
    for (const r of [2, 3]) {
      const cell = sheet.getRow(r).getCell(6);
      expect(typeof cell.value).toBe("string");
      expect(cell.type).toBe(ExcelJS.ValueType.String);
      expect(cell.numFmt).toBe("@");
    }
    expect(sheet.getRow(4).getCell(6).numFmt).toBe("@");
    // İlçe (5) sayı biçimine zorlanmaz
    expect(sheet.getRow(2).getCell(5).numFmt).not.toBe("@");
  });

  it("boş liste → yalnız başlık", async () => {
    const sheet = await readBack(await buildWorkbook([]));
    expect(sheet.rowCount).toBe(1);
  });
});

describe("websiteKindLabel", () => {
  it("tr etiket; SOCIAL/PLATFORM'da marka parantez içinde", () => {
    expect(websiteKindLabel("NONE", null)).toBe("Yok");
    expect(websiteKindLabel("WEBSITE", "https://ornek.com")).toBe("Web sitesi");
    expect(websiteKindLabel("SOCIAL", "https://fb.me/x")).toBe("Sosyal medya (Facebook)");
    expect(websiteKindLabel("PLATFORM", "https://www.yemeksepeti.com/x")).toBe("Platform (Yemeksepeti)");
    // Marka çözülemezse yalnız tür
    expect(websiteKindLabel("SOCIAL", null)).toBe("Sosyal medya");
  });
});

describe("exportFileName", () => {
  it("lead-radar-YYYY-MM-DD.xlsx (KKTC saati)", () => {
    expect(exportFileName(new Date("2026-09-22T10:00:00Z"))).toBe("lead-radar-2026-09-22.xlsx");
    // 22:30 UTC = ertesi gün 01:30 Lefkoşa (EEST)
    expect(exportFileName(new Date("2026-09-22T22:30:00Z"))).toBe("lead-radar-2026-09-23.xlsx");
  });
});

function dbRow(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: "A",
    primaryType: "cafe",
    city: "Girne",
    district: null,
    address: null,
    phone: null,
    email: null,
    websiteUri: null,
    websiteKind: "NONE",
    rating: null,
    userRatingCount: null,
    score: 50,
    status: "WEIRD",
    lastContactedAt: null,
    googleMapsUri: null,
    photos: JSON.stringify([{ name: "places/p/photos/9", url: "https://maps.googleapis.com/x?key=AIzaSIZINTI" }]),
    notes: [{ body: "n1" }, { body: "n2" }],
    ...over,
  };
}

describe("fetchExportRows", () => {
  it("fotoğraf: isteğin origin'iyle mutlak proxy URL'si, Google URL'si asla; bilinmeyen status → NEW", async () => {
    dbMock.business.findMany.mockResolvedValueOnce([dbRow()]);
    const { rows, truncated } = await fetchExportRows(
      { filters: { city: "Girne", sort: "recent" } },
      "https://panel.example.com/api/export?city=Girne",
    );
    expect(truncated).toBe(false);
    expect(rows[0]).toMatchObject({
      photoUrl: "https://panel.example.com/api/photo?name=places%2Fp%2Fphotos%2F9",
      status: "NEW",
      notes: ["n1", "n2"],
    });
    expect(JSON.stringify(rows)).not.toContain("AIza");
    expect(dbMock.business.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { city: "Girne" },
        orderBy: buildOrderBy("recent"),
        take: EXPORT_MAX_ROWS + 1,
      }),
    );
  });

  it("district filtresi where'e; ilçe satıra taşınır", async () => {
    dbMock.business.findMany.mockResolvedValueOnce([dbRow({ city: "İstanbul", district: "Kadıköy" })]);
    const { rows } = await fetchExportRows(
      { filters: { city: "İstanbul", district: "Kadıköy" } },
      "http://localhost/",
    );
    expect(rows[0]).toMatchObject({ city: "İstanbul", district: "Kadıköy" });
    expect(dbMock.business.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { city: "İstanbul", district: "Kadıköy" },
        select: expect.objectContaining({ district: true }),
      }),
    );
  });

  it("web filtresi where'e; link alanları satıra, bilinmeyen tür → NONE", async () => {
    dbMock.business.findMany.mockResolvedValueOnce([
      dbRow({ websiteUri: "https://www.instagram.com/a/", websiteKind: "SOCIAL" }),
      dbRow({ websiteKind: "BOGUS" }),
    ]);
    const { rows } = await fetchExportRows({ filters: { web: "SOCIAL" } }, "http://localhost/");
    expect(rows[0]).toMatchObject({ websiteUri: "https://www.instagram.com/a/", websiteKind: "SOCIAL" });
    expect(rows[1]?.websiteKind).toBe("NONE");
    expect(dbMock.business.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { websiteKind: "SOCIAL" },
        select: expect.objectContaining({ websiteUri: true, websiteKind: true }),
      }),
    );
  });

  it("ids verilirse filtre yerine id listesi; üst sınır aşılırsa truncated", async () => {
    dbMock.business.findMany.mockResolvedValueOnce(Array.from({ length: EXPORT_MAX_ROWS + 1 }, () => dbRow()));
    const { rows, truncated } = await fetchExportRows({ ids: ["a", "b"] }, "http://localhost/");
    expect(truncated).toBe(true);
    expect(rows).toHaveLength(EXPORT_MAX_ROWS);
    expect(dbMock.business.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { id: { in: ["a", "b"] } } }),
    );
  });
});

describe("GET /api/export", () => {
  it("xlsx başlıkları ve ids ayrıştırma", async () => {
    dbMock.business.findMany.mockResolvedValueOnce([dbRow()]);
    const res = await exportRoute(new Request("http://localhost/api/export?ids=a,%20b&ids=c&city=Girne"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe(EXPORT_CONTENT_TYPE);
    expect(res.headers.get("content-disposition")).toMatch(/^attachment; filename="lead-radar-\d{4}-\d{2}-\d{2}\.xlsx"$/);
    expect(dbMock.business.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { id: { in: ["a", "b", "c"] } } }),
    );
    const sheet = await readBack(Buffer.from(await res.arrayBuffer()));
    expect(sheet.getRow(2).getCell(16).value).toBe("http://localhost/api/photo?name=places%2Fp%2Fphotos%2F9");
  });

  it.each(["band=X", "web=instagram"])("geçersiz filtre %s → 400", async (qs) => {
    const res = await exportRoute(new Request(`http://localhost/api/export?${qs}`));
    expect(res.status).toBe(400);
  });
});
