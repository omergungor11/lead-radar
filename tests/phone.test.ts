import { describe, expect, it } from "vitest";
import { toE164, waLink } from "@/lib/phone";

describe("toE164 — KKTC (varsayılan)", () => {
  it.each([
    ["0392 228 12 34", "+903922281234"],
    ["03922281234", "+903922281234"],
    ["(0392) 228-12-34", "+903922281234"],
    ["392 228 12 34", "+903922281234"],
    ["+90 392 228 12 34", "+903922281234"],
    ["+903922281234", "+903922281234"],
    ["0090 392 228 12 34", "+903922281234"],
    ["0533 123 45 67", "+905331234567"],
    ["0542 888 77 66", "+905428887766"],
    ["+90 533 123 45 67", "+905331234567"],
    ["228 12 34", "+903922281234"],
    ["2281234", "+903922281234"],
  ])("%s → %s", (input, expected) => {
    expect(toE164(input)).toBe(expected);
    expect(toE164(input, "KKTC")).toBe(expected);
  });

  it.each([null, undefined, "", "   ", "abc", "12", "123456", "0392 228 12 34 56 78", "+1 202"])(
    "çöp → null (%s)",
    (input) => {
      expect(toE164(input)).toBeNull();
    },
  );
});

describe("toE164 — TR", () => {
  it("TR numaraları", () => {
    expect(toE164("0212 555 12 34", "TR")).toBe("+902125551234");
    expect(toE164("0533 123 45 67", "TR")).toBe("+905331234567");
    expect(toE164("0392 228 12 34", "TR")).toBe("+903922281234");
  });

  it("7 haneli yerel numara TR'de null (alan kodu tahmin edilmez)", () => {
    expect(toE164("228 12 34", "TR")).toBeNull();
  });
});

describe("waLink", () => {
  it("sadece rakamlar", () => {
    expect(waLink("+903922281234")).toBe("https://wa.me/903922281234");
  });

  it("metin URL-encode edilir", () => {
    expect(waLink("+905331234567", "Merhaba & hoş geldiniz?")).toBe(
      "https://wa.me/905331234567?text=Merhaba%20%26%20ho%C5%9F%20geldiniz%3F",
    );
  });

  it("boş metin → text parametresi yok", () => {
    expect(waLink("+905331234567", "")).toBe("https://wa.me/905331234567");
  });
});
