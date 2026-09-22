import { describe, expect, it } from "vitest";
import { classifyWebsite, isLeadWebsite, isWebsiteKind } from "@/lib/website";

describe("classifyWebsite", () => {
  it("boş / null / undefined → NONE", () => {
    for (const value of [null, undefined, "", "   "]) {
      expect(classifyWebsite(value)).toEqual({ kind: "NONE", label: null });
    }
  });

  it.each([
    ["https://www.instagram.com/ustaberber/", "Instagram"],
    ["https://m.instagram.com/ustaberber", "Instagram"],
    ["https://instagram.com/ustaberber?igsh=abc123&utm_source=qr", "Instagram"],
    ["https://www.facebook.com/kordonkafe", "Facebook"],
    ["https://m.facebook.com/profile.php?id=1000", "Facebook"],
    ["https://fb.me/kordonkafe", "Facebook"],
    ["https://linktr.ee/kordonkafe", "Link sayfası"],
    ["https://wa.me/905338612417", "WhatsApp"],
  ])("%s → SOCIAL (%s)", (uri, label) => {
    expect(classifyWebsite(uri)).toEqual({ kind: "SOCIAL", label });
  });

  it.each([
    ["https://www.booking.com/hotel/cy/merkez-otel.html", "Booking.com"],
    ["https://www.yemeksepeti.com/kktc/sarayonu-kebap", "Yemeksepeti"],
    ["https://www.sahibinden.com/magaza/magusa-emlak", "Sahibinden"],
    ["https://www.google.com/maps/place/Usta+Berber", "Google"],
    ["https://ustaberber.business.site/", "Google"],
  ])("%s → PLATFORM (%s)", (uri, label) => {
    expect(classifyWebsite(uri)).toEqual({ kind: "PLATFORM", label });
  });

  it.each([
    "https://www.google.com/",
    "https://ustaberber.com",
    "http://www.kordonkafe.com.tr/menu",
    "https://kordonkafe.wixsite.com/site",
    "https://girne.kordonkafe.com/",
    "instagram.com.fake.tr",
    "https://instagram.com.fake.tr/x",
    "https://notinstagram.com/x",
  ])("%s → WEBSITE", (uri) => {
    expect(classifyWebsite(uri)).toEqual({ kind: "WEBSITE", label: null });
  });

  it("şemasız sosyal link → SOCIAL", () => {
    expect(classifyWebsite("instagram.com/ustaberber")).toEqual({ kind: "SOCIAL", label: "Instagram" });
    expect(classifyWebsite("  www.facebook.com/x  ")).toEqual({ kind: "SOCIAL", label: "Facebook" });
  });

  it("büyük harf alan adı eşleşir", () => {
    expect(classifyWebsite("HTTPS://WWW.INSTAGRAM.COM/X").kind).toBe("SOCIAL");
  });

  it("bozuk değer → NONE", () => {
    for (const value of ["http://", "not a url", "foo", "https://exa mple.com"]) {
      expect(classifyWebsite(value)).toEqual({ kind: "NONE", label: null });
    }
  });
});

describe("isLeadWebsite / isWebsiteKind", () => {
  it("yalnız WEBSITE lead değildir", () => {
    expect(isLeadWebsite(null)).toBe(true);
    expect(isLeadWebsite("https://instagram.com/x")).toBe(true);
    expect(isLeadWebsite("https://booking.com/hotel/x")).toBe(true);
    expect(isLeadWebsite("https://ornek.com")).toBe(false);
  });

  it("isWebsiteKind", () => {
    for (const k of ["NONE", "SOCIAL", "PLATFORM", "WEBSITE"]) expect(isWebsiteKind(k)).toBe(true);
    for (const k of ["social", "", null, 1, "OTHER"]) expect(isWebsiteKind(k)).toBe(false);
  });
});
