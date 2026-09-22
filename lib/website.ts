// Google'ın `websiteUri` alanını sınıflandırır. Sosyal medya / link-in-bio / platform profili olan işletmelerin
// kendi web sitesi yoktur → lead sayılır (D-008). Yalnız `WEBSITE` elenir. Saf, client-safe.

export const WEBSITE_KINDS = ["NONE", "SOCIAL", "PLATFORM", "WEBSITE"] as const;
export type WebsiteKind = (typeof WEBSITE_KINDS)[number];

/** Lead olarak kaydedilen türler (kendi sitesi olmayanlar) */
export const LEAD_WEBSITE_KINDS: readonly WebsiteKind[] = ["NONE", "SOCIAL", "PLATFORM"];

export function isWebsiteKind(value: unknown): value is WebsiteKind {
  return typeof value === "string" && (WEBSITE_KINDS as readonly string[]).includes(value);
}

interface LinkRule {
  /** Görünen ad (marka) */
  label: string;
  kind: "SOCIAL" | "PLATFORM";
  /** Alan adı; alt alan adları da eşleşir (m.facebook.com → facebook.com) */
  hosts: readonly string[];
  /** Verilirse yalnız bu yol önekleriyle eşleşir (google.com/maps gibi) */
  paths?: readonly string[];
}

const RULES: readonly LinkRule[] = [
  // Sosyal medya ve link-in-bio
  { label: "Instagram", kind: "SOCIAL", hosts: ["instagram.com", "instagr.am"] },
  { label: "Facebook", kind: "SOCIAL", hosts: ["facebook.com", "fb.com", "fb.me"] },
  { label: "WhatsApp", kind: "SOCIAL", hosts: ["wa.me", "whatsapp.com", "api.whatsapp.com"] },
  { label: "TikTok", kind: "SOCIAL", hosts: ["tiktok.com"] },
  { label: "X", kind: "SOCIAL", hosts: ["twitter.com", "x.com"] },
  { label: "YouTube", kind: "SOCIAL", hosts: ["youtube.com", "youtu.be"] },
  { label: "Telegram", kind: "SOCIAL", hosts: ["t.me", "telegram.me"] },
  { label: "LinkedIn", kind: "SOCIAL", hosts: ["linkedin.com"] },
  { label: "Pinterest", kind: "SOCIAL", hosts: ["pinterest.com"] },
  {
    label: "Link sayfası",
    kind: "SOCIAL",
    hosts: ["linktr.ee", "linkin.bio", "bio.link", "beacons.ai", "taplink.cc", "lnk.bio", "campsite.bio"],
  },
  // Google'ın kendi yüzeyleri (business.site 2024'te kapandı → Maps'e yönlenir)
  { label: "Google", kind: "PLATFORM", hosts: ["business.site", "g.page", "goo.gl"] },
  { label: "Google", kind: "PLATFORM", hosts: ["google.com"], paths: ["/maps", "/search"] },
  { label: "Google", kind: "PLATFORM", hosts: ["maps.app.goo.gl"] },
  // Yemek / sipariş
  { label: "Yemeksepeti", kind: "PLATFORM", hosts: ["yemeksepeti.com"] },
  { label: "Getir", kind: "PLATFORM", hosts: ["getir.com"] },
  { label: "Trendyol", kind: "PLATFORM", hosts: ["trendyol.com", "tgoyemek.com"] },
  { label: "Migros Yemek", kind: "PLATFORM", hosts: ["migrosyemek.com"] },
  // Konaklama / seyahat
  { label: "Booking.com", kind: "PLATFORM", hosts: ["booking.com"] },
  { label: "Airbnb", kind: "PLATFORM", hosts: ["airbnb.com", "airbnb.com.tr"] },
  { label: "Tripadvisor", kind: "PLATFORM", hosts: ["tripadvisor.com", "tripadvisor.com.tr"] },
  { label: "Hotels.com", kind: "PLATFORM", hosts: ["hotels.com"] },
  { label: "Expedia", kind: "PLATFORM", hosts: ["expedia.com"] },
  { label: "Agoda", kind: "PLATFORM", hosts: ["agoda.com"] },
  { label: "Otelz", kind: "PLATFORM", hosts: ["otelz.com"] },
  { label: "ETS Tur", kind: "PLATFORM", hosts: ["etstur.com"] },
  { label: "Jolly", kind: "PLATFORM", hosts: ["jollytur.com"] },
  { label: "Tatilbudur", kind: "PLATFORM", hosts: ["tatilbudur.com"] },
  { label: "Tatilsepeti", kind: "PLATFORM", hosts: ["tatilsepeti.com"] },
  { label: "HotelsCombined", kind: "PLATFORM", hosts: ["hotelscombined.com"] },
  // İlan / hizmet / randevu
  { label: "Sahibinden", kind: "PLATFORM", hosts: ["sahibinden.com"] },
  { label: "Hepsiemlak", kind: "PLATFORM", hosts: ["hepsiemlak.com"] },
  { label: "Emlakjet", kind: "PLATFORM", hosts: ["emlakjet.com"] },
  { label: "Armut", kind: "PLATFORM", hosts: ["armut.com"] },
  { label: "Doktortakvimi", kind: "PLATFORM", hosts: ["doktortakvimi.com"] },
  { label: "Hepsiburada", kind: "PLATFORM", hosts: ["hepsiburada.com"] },
  { label: "Fresha", kind: "PLATFORM", hosts: ["fresha.com"] },
  { label: "Treatwell", kind: "PLATFORM", hosts: ["treatwell.com"] },
];

export interface WebsiteClassification {
  kind: WebsiteKind;
  /** SOCIAL / PLATFORM için marka adı ("Instagram", "Booking.com"); aksi halde null */
  label: string | null;
}

function parseHost(uri: string): { host: string; path: string } | null {
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(uri) ? uri : `https://${uri}`;
  try {
    const url = new URL(withScheme);
    return { host: url.hostname.toLowerCase().replace(/^www\./, ""), path: url.pathname.toLowerCase() };
  } catch {
    return null;
  }
}

function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

export function classifyWebsite(uri: string | null | undefined): WebsiteClassification {
  const trimmed = uri?.trim();
  if (!trimmed) return { kind: "NONE", label: null };

  const parsed = parseHost(trimmed);
  // Ayrıştırılamayan değer gerçek bir site sayılmaz
  if (!parsed || !parsed.host.includes(".")) return { kind: "NONE", label: null };

  for (const rule of RULES) {
    if (!rule.hosts.some((h) => hostMatches(parsed.host, h))) continue;
    if (rule.paths && !rule.paths.some((p) => parsed.path.startsWith(p))) continue;
    return { kind: rule.kind, label: rule.label };
  }
  return { kind: "WEBSITE", label: null };
}

/** Kendi web sitesi olmayan (lead) mi? */
export function isLeadWebsite(uri: string | null | undefined): boolean {
  return classifyWebsite(uri).kind !== "WEBSITE";
}
