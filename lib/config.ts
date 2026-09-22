// Varsayılan konfigürasyon. Şehirler ve bonus kategoriler seed ile `Setting` tablosuna
// yazılır; çalışma anında DB'deki değer esastır, buradakiler yalnızca başlangıç değeri.
// Düzenleme yetkisi: backend (agent-instructions §2).

export const DEFAULT_CITIES: readonly string[] = [
  "Lefkoşa",
  "Girne",
  "Gazimağusa",
  "Güzelyurt",
  "İskele",
];

// Places `primaryType` değerleri — "site ihtiyacı yüksek" kategoriler (PROMPT §2, +10 puan)
export const DEFAULT_BONUS_CATEGORIES: readonly string[] = [
  "restaurant",
  "cafe",
  "dental_clinic",
  "doctor",
  "beauty_salon",
  "hair_salon",
  "spa",
  "real_estate_agency",
  "hotel",
  "lawyer",
  "architect",
];

// Places API (New) yaklaşık birim maliyetleri, USD (PROMPT §1)
export const PLACES_COST = {
  textSearch: 0.032,
  details: 0.017,
} as const;

// Places Text Search sorgu başına üst sınır (3 sayfa × 20)
export const PLACES_MAX_RESULTS = 60;

// Google verisi bu kadar günden eskiyse "veri eski" (Places ToS cache sınırı)
export const STALE_AFTER_DAYS = 30;

export const SETTING_KEYS = {
  cities: "cities",
  bonusCategories: "bonusCategories",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];
