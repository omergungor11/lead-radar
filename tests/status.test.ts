import { describe, expect, it } from "vitest";
import {
  allowedTargets,
  canTransition,
  isStatus,
  requiresConfirmation,
  STATUSES,
  type Status,
} from "@/lib/status";
import { tr } from "@/lib/tr";

// Beklenen tam geçiş tablosu (PROMPT §5 + "Yasal ve etik sınırlar" + şablon kopyala akışı)
const EXPECTED: Record<Status, readonly Status[]> = {
  NEW: ["QUALIFIED", "CONTACTED", "SKIPPED"],
  QUALIFIED: ["CONTACTED", "SKIPPED"],
  CONTACTED: ["REPLIED", "LOST"],
  REPLIED: ["MEETING", "LOST"],
  MEETING: ["WON", "LOST"],
  WON: [],
  LOST: ["CONTACTED"],
  SKIPPED: ["CONTACTED"],
};

describe("STATUSES / isStatus", () => {
  it("8 durum, sıralı", () => {
    expect(STATUSES).toEqual([
      "NEW",
      "QUALIFIED",
      "CONTACTED",
      "REPLIED",
      "MEETING",
      "WON",
      "LOST",
      "SKIPPED",
    ]);
  });

  it("isStatus", () => {
    for (const s of STATUSES) expect(isStatus(s)).toBe(true);
    expect(isStatus("new")).toBe(false);
    expect(isStatus("")).toBe(false);
    expect(isStatus(null)).toBe(false);
    expect(isStatus(3)).toBe(false);
    expect(isStatus("toString")).toBe(false);
  });

  it("her durumun Türkçe etiketi var", () => {
    for (const s of STATUSES) expect(tr.status[s]).toBeTruthy();
  });
});

describe("canTransition — tam matris", () => {
  for (const from of STATUSES) {
    for (const to of STATUSES) {
      const expected = EXPECTED[from].includes(to);
      it(`${from} → ${to}: ${expected}`, () => {
        expect(canTransition(from, to)).toBe(expected);
      });
    }
  }

  it("WON → NEW false (kabul kriteri)", () => {
    expect(canTransition("WON", "NEW")).toBe(false);
  });

  it("aynı duruma geçiş false", () => {
    for (const s of STATUSES) expect(canTransition(s, s)).toBe(false);
  });

  it("bilinmeyen durum false", () => {
    expect(canTransition("NEW", "FOO")).toBe(false);
    expect(canTransition("FOO", "NEW")).toBe(false);
  });
});

describe("allowedTargets", () => {
  it("tabloyla aynı", () => {
    for (const s of STATUSES) expect(allowedTargets(s)).toEqual(EXPECTED[s]);
  });

  it("bilinmeyen → boş", () => {
    expect(allowedTargets("FOO")).toEqual([]);
  });
});

describe("requiresConfirmation", () => {
  it("SKIPPED/LOST → CONTACTED onay ister", () => {
    expect(requiresConfirmation("SKIPPED", "CONTACTED")).toBe(true);
    expect(requiresConfirmation("LOST", "CONTACTED")).toBe(true);
  });

  it("diğer geçişler onay istemez", () => {
    expect(requiresConfirmation("NEW", "CONTACTED")).toBe(false);
    expect(requiresConfirmation("QUALIFIED", "CONTACTED")).toBe(false);
    expect(requiresConfirmation("CONTACTED", "LOST")).toBe(false);
    expect(requiresConfirmation("WON", "CONTACTED")).toBe(false); // izinsiz geçiş → onay sorusu yok
  });
});
