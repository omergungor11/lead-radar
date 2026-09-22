import { describe, expect, it } from "vitest";
import { CITY_COORDS, distanceMeters, nearestCity } from "@/lib/geo";
import { KKTC_CITIES, TURKEY_PROVINCES } from "@/lib/config";

describe("geo", () => {
  it("her şehir için koordinat var ve KKTC/Türkiye sınırları içinde", () => {
    for (const city of [...KKTC_CITIES, ...TURKEY_PROVINCES]) {
      const c = CITY_COORDS[city];
      expect(c, city).toBeDefined();
      expect(c!.lat).toBeGreaterThan(34);
      expect(c!.lat).toBeLessThan(43);
      expect(c!.lng).toBeGreaterThan(25);
      expect(c!.lng).toBeLessThan(45);
    }
  });

  it("distanceMeters bilinen mesafeyi yaklaşık verir (Lefkoşa–Girne kuş uçuşu ~17,5 km)", () => {
    const d = distanceMeters(CITY_COORDS["Lefkoşa"]!, CITY_COORDS["Girne"]!);
    expect(d).toBeGreaterThan(15_000);
    expect(d).toBeLessThan(25_000);
  });

  it("nearestCity: Kadıköy koordinatı → İstanbul", () => {
    expect(nearestCity({ lat: 40.9903, lng: 29.0304 })).toBe("İstanbul");
  });

  it("nearestCity: Girne merkezi → Girne", () => {
    expect(nearestCity({ lat: 35.3396, lng: 33.3205 })).toBe("Girne");
  });

  it("nearestCity yalnız verilen liste içinden seçer (Kadıköy'e İzmir, Ankara'dan yakın)", () => {
    expect(nearestCity({ lat: 40.9903, lng: 29.0304 }, ["Ankara", "İzmir"])).toBe("İzmir");
    expect(nearestCity({ lat: 40.9903, lng: 29.0304 }, ["Ankara", "Van"])).toBe("Ankara");
  });

  it("nearestCity boş listede null döner", () => {
    expect(nearestCity({ lat: 40, lng: 29 }, [])).toBeNull();
  });
});
