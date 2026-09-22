// Satış süreci durumları ve izinli geçişler (PROMPT §5). Prisma enum değil — SQLite'ta string.
// Düzenleme yetkisi: backend. Etiketler: `tr.status`.

export const STATUSES = [
  "NEW",
  "QUALIFIED",
  "CONTACTED",
  "REPLIED",
  "MEETING",
  "WON",
  "LOST",
  "SKIPPED",
] as const;

export type Status = (typeof STATUSES)[number];

// Geçiş tablosu:
// - §5 ana hat: NEW → QUALIFIED → CONTACTED → REPLIED → MEETING → WON
// - CONTACTED / REPLIED / MEETING → LOST; NEW / QUALIFIED → SKIPPED
// - NEW → CONTACTED: detay sheet'te "şablon kopyala" nitelendirme adımını atlayıp doğrudan
//   temasa geçer (TASK-107), bu yüzden izinli.
// - SKIPPED / LOST → CONTACTED: "Yasal ve etik sınırlar" — izinli ama UI onay diyaloğu
//   göstermeli (`requiresConfirmation`).
// - WON terminal. Geri alma (undo) bu tabloyla yapılmaz; ayrı akışla ele alınmalı.
const TRANSITIONS: Readonly<Record<Status, readonly Status[]>> = {
  NEW: ["QUALIFIED", "CONTACTED", "SKIPPED"],
  QUALIFIED: ["CONTACTED", "SKIPPED"],
  CONTACTED: ["REPLIED", "LOST"],
  REPLIED: ["MEETING", "LOST"],
  MEETING: ["WON", "LOST"],
  WON: [],
  LOST: ["CONTACTED"],
  SKIPPED: ["CONTACTED"],
};

export function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

/** `from` durumundan gidilebilecek durumlar (dropdown için). Bilinmeyen → boş. */
export function allowedTargets(from: string): readonly Status[] {
  return isStatus(from) ? TRANSITIONS[from] : [];
}

export function canTransition(from: string, to: string): boolean {
  return isStatus(to) && allowedTargets(from).includes(to);
}

/** İzinli ama kullanıcı onayı gerektiren geçiş mi? (SKIPPED/LOST → CONTACTED) */
export function requiresConfirmation(from: string, to: string): boolean {
  return canTransition(from, to) && (from === "SKIPPED" || from === "LOST") && to === "CONTACTED";
}
