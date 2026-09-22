import { readFileSync } from "node:fs";
import { join } from "node:path";
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

/** prisma/seed.ts'deki bir `const X = [ "...", ... ].join(…)` şablonunun paragrafları */
function seedParagraphs(constName: string): string[] {
  const source = readFileSync(join(process.cwd(), "prisma/seed.ts"), "utf8");
  const match = new RegExp(`const ${constName} = \\[([\\s\\S]*?)\\]\\.join`).exec(source);
  if (!match?.[1]) throw new Error(`${constName} bulunamadı`);
  return JSON.parse(`[${match[1].trim().replace(/,$/, "")}]`) as string[];
}

describe("seed: sosyal medyası olan WhatsApp şablonu", () => {
  const paragraphs = seedParagraphs("WHATSAPP_SOCIAL_BODY");
  const body = paragraphs.join("\n\n");

  it("opt-out cümlesi sonda, hasOptOut true", () => {
    expect(paragraphs.at(-1)).toBe(SEED_WHATSAPP_TAIL);
    expect(hasOptOut(body)).toBe(true);
  });

  it("paragraf içinde satır kırma yok; şehir eki yok", () => {
    expect(paragraphs.every((p) => !p.includes("\n"))).toBe(true);
    expect(body).not.toMatch(/\{\{sehir\}\}'/);
    expect(body).toContain("{{sehir}} bölgesinde");
  });

  it("{{platform}} ve diğer yer tutucular dolar", () => {
    const out = renderTemplate(body, {
      isletme: "Kordon Kafe",
      sehir: "Girne",
      puan: 4.4,
      yorumSayisi: 180,
      platform: "Instagram",
    });
    expect(out).toContain("Kordon Kafe işletmenizin Instagram hesabını");
    expect(out).toContain("Girne bölgesinde 4,4 puan ve 180 yorumla");
    expect(out).not.toMatch(/\{\{/);
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

  it("{{platform}}: marka verilirse o, yoksa / boşsa \"sosyal medya\"", () => {
    expect(renderTemplate("{{platform}} hesabınız", { ...vars, platform: "Instagram" })).toBe("Instagram hesabınız");
    expect(renderTemplate("{{platform}} hesabınız", vars)).toBe("sosyal medya hesabınız");
    expect(renderTemplate("{{ platform }}", { ...vars, platform: null })).toBe("sosyal medya");
    expect(renderTemplate("{{platform}}", { ...vars, platform: "  " })).toBe("sosyal medya");
  });

  it("değer içindeki {{…}} yeniden işlenmez", () => {
    expect(renderTemplate("{{isletme}}", { ...vars, isletme: "{{sehir}}" })).toBe("{{sehir}}");
  });
});
