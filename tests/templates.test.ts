import { describe, expect, it } from "vitest";
import { hasOptOut, renderTemplate } from "@/lib/templates";

// prisma/seed.ts'deki şablonların opt-out cümleleri
const SEED_WHATSAPP_TAIL =
  'Bu tür mesajlar almak istemiyorsanız "istemiyorum" yazmanız yeterli, bir daha rahatsız etmeyeceğim.';
const SEED_EMAIL_TAIL =
  'Bu tür e-postalar almak istemiyorsanız bu mesaja "istemiyorum" yazarak yanıt vermeniz yeterli, bir daha rahatsız etmeyeceğim.';

describe("hasOptOut", () => {
  it("seed şablonları → true", () => {
    expect(hasOptOut(`Merhaba {{isletme}}\n\n${SEED_WHATSAPP_TAIL}`)).toBe(true);
    expect(hasOptOut(`Konu: teklif\n\n${SEED_EMAIL_TAIL}`)).toBe(true);
  });

  it("opt-out'suz metin → false", () => {
    expect(hasOptOut("Merhaba {{isletme}}, size web sitesi yapalım mı?")).toBe(false);
    expect(hasOptOut("")).toBe(false);
  });
});

describe("renderTemplate", () => {
  const vars = { isletme: "Deniz Kafe", sehir: "Girne", puan: 4.63, yorumSayisi: 128 };

  it("yer tutucular doldurulur; puan tr-TR tek ondalık", () => {
    expect(
      renderTemplate("{{isletme}} — {{sehir}} bölgesinde {{puan}} puan, {{yorumSayisi}} yorum", vars),
    ).toBe("Deniz Kafe — Girne bölgesinde 4,6 puan, 128 yorum");
  });

  it("tam sayı puan da tek ondalıklı", () => {
    expect(renderTemplate("{{puan}}", { ...vars, puan: 5 })).toBe("5,0");
  });

  it("puan / yorum yoksa —", () => {
    expect(renderTemplate("{{puan}} {{yorumSayisi}}", { isletme: "A", sehir: "B" })).toBe("— —");
    expect(renderTemplate("{{puan}} {{yorumSayisi}}", { isletme: "A", sehir: "B", puan: null, yorumSayisi: null })).toBe("— —");
  });

  it("boşluklu yer tutucu ve tekrar", () => {
    expect(renderTemplate("{{ isletme }} / {{isletme}}", vars)).toBe("Deniz Kafe / Deniz Kafe");
  });

  it("bilinmeyen yer tutucu olduğu gibi kalır", () => {
    expect(renderTemplate("Merhaba {{ad}} {{isletme}}", vars)).toBe("Merhaba {{ad}} Deniz Kafe");
  });

  it("değer içindeki {{…}} yeniden işlenmez", () => {
    expect(renderTemplate("{{isletme}}", { ...vars, isletme: "{{sehir}}" })).toBe("{{sehir}}");
  });
});
