// Varsayılan konfigürasyon. Şehirler ve bonus kategoriler seed ile `Setting` tablosuna
// yazılır; çalışma anında DB'deki değer esastır, buradakiler yalnızca başlangıç değeri.
// Düzenleme yetkisi: backend (agent-instructions §2).

export const KKTC_CITIES: readonly string[] = [
  "Lefkoşa",
  "Girne",
  "Gazimağusa",
  "Güzelyurt",
  "İskele",
  "Lefke",
];

// Türkiye'nin 81 ili (alfabetik). Büyük illerde Places sorgu başına 60 sonuç sınırı dar kalır →
// arama formunda ilçe yazılması önerilir ("berber Kadıköy").
export const TURKEY_PROVINCES: readonly string[] = [
  "Adana",
  "Adıyaman",
  "Afyonkarahisar",
  "Ağrı",
  "Aksaray",
  "Amasya",
  "Ankara",
  "Antalya",
  "Ardahan",
  "Artvin",
  "Aydın",
  "Balıkesir",
  "Bartın",
  "Batman",
  "Bayburt",
  "Bilecik",
  "Bingöl",
  "Bitlis",
  "Bolu",
  "Burdur",
  "Bursa",
  "Çanakkale",
  "Çankırı",
  "Çorum",
  "Denizli",
  "Diyarbakır",
  "Düzce",
  "Edirne",
  "Elazığ",
  "Erzincan",
  "Erzurum",
  "Eskişehir",
  "Gaziantep",
  "Giresun",
  "Gümüşhane",
  "Hakkâri",
  "Hatay",
  "Iğdır",
  "Isparta",
  "İstanbul",
  "İzmir",
  "Kahramanmaraş",
  "Karabük",
  "Karaman",
  "Kars",
  "Kastamonu",
  "Kayseri",
  "Kilis",
  "Kırıkkale",
  "Kırklareli",
  "Kırşehir",
  "Kocaeli",
  "Konya",
  "Kütahya",
  "Malatya",
  "Manisa",
  "Mardin",
  "Mersin",
  "Muğla",
  "Muş",
  "Nevşehir",
  "Niğde",
  "Ordu",
  "Osmaniye",
  "Rize",
  "Sakarya",
  "Samsun",
  "Şanlıurfa",
  "Siirt",
  "Sinop",
  "Sivas",
  "Şırnak",
  "Tekirdağ",
  "Tokat",
  "Trabzon",
  "Tunceli",
  "Uşak",
  "Van",
  "Yalova",
  "Yozgat",
  "Zonguldak",
];

export const DEFAULT_CITIES: readonly string[] = [...KKTC_CITIES, ...TURKEY_PROVINCES];

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
