// PLACES_MOCK=1 için sahte Places istemcisi — ağ yok, deterministik. Seed ve Playwright bununla çalışır.
// 17 KKTC işletmesi (OPERATIONAL + kendi sitesi yok; 16 Booking.com, 17 Instagram linkli) + sayaç testleri
// için 2 siteli + 1 kapalı kayıt.
// Yorum tarihleri `now`'a göre göreli üretilir (recency sinyali zamanla bozulmasın).

import type {
  PlaceDetails,
  PlacesClient,
  TextSearchOptions,
  TextSearchPlace,
  TextSearchResult,
} from "@/lib/places";
import { PlacesError } from "@/lib/places-error";

const DAY_MS = 86_400_000;
export const MOCK_PAGE_SIZE = 10;
const PAGE_TOKEN_PREFIX = "mock-page-";

interface FixtureSeed {
  id: string;
  name: string;
  city: string;
  address: string;
  primaryType: string;
  types: string[];
  /** Ulusal format, örn. "0392 228 45 61"; null → telefonsuz */
  phone: string | null;
  rating: number | null;
  userRatingCount: number;
  photoCount: number;
  /** Her yorum için kaç gün önce yazıldığı (max 5) */
  reviewDaysAgo: number[];
  lat: number;
  lng: number;
  websiteUri?: string;
  businessStatus?: string;
}

export interface MockFixture {
  city: string;
  details: PlaceDetails;
}

const HOURS_STANDARD = [
  "Pazartesi: 09:00–19:00",
  "Salı: 09:00–19:00",
  "Çarşamba: 09:00–19:00",
  "Perşembe: 09:00–19:00",
  "Cuma: 09:00–19:00",
  "Cumartesi: 09:00–17:00",
  "Pazar: Kapalı",
];

const HOURS_RESTAURANT = [
  "Pazartesi: 11:00–23:00",
  "Salı: 11:00–23:00",
  "Çarşamba: 11:00–23:00",
  "Perşembe: 11:00–23:00",
  "Cuma: 11:00–00:00",
  "Cumartesi: 11:00–00:00",
  "Pazar: 12:00–22:00",
];

const REVIEW_AUTHORS = ["Mehmet Y.", "Ayşe K.", "Hasan D.", "Elif Ş.", "Mustafa Ö."];
const REVIEW_TEXTS = [
  "Çok memnun kaldık, herkese tavsiye ederim.",
  "Hizmet hızlı ve güler yüzlü, fiyatlar makul.",
  "Temiz ve düzenli bir yer, tekrar geleceğim.",
  "Fena değil ama biraz bekledik.",
  "İlgili personel, işini bilen bir ekip.",
];

// Skor bantları (varsayılan bonus kategorilerle, yaklaşık):
// HOT: 1, 2, 4, 7, 16, 17 · WARM: 5, 6, 8, 10, 12, 13 · COLD: 3, 9, 11, 14, 15
// Son 30 günde yorumu olanlar: 1, 4, 7, 16, 17.
const SAVED_SEEDS: FixtureSeed[] = [
  // Lefkoşa
  {
    id: "mock-place-01",
    name: "Usta Berber Hüseyin",
    city: "Lefkoşa",
    address: "Mehmet Akif Cad. No:42, Lefkoşa",
    primaryType: "barber_shop",
    types: ["barber_shop", "hair_care", "establishment"],
    phone: "0533 861 24 17",
    rating: 4.8,
    userRatingCount: 142,
    photoCount: 5,
    reviewDaysAgo: [5, 12, 40, 70, 150],
    lat: 35.1856,
    lng: 33.3823,
  },
  {
    id: "mock-place-02",
    name: "Sarayönü Kebap Evi",
    city: "Lefkoşa",
    address: "Sarayönü Meydanı No:7, Lefkoşa",
    primaryType: "restaurant",
    types: ["restaurant", "food", "establishment"],
    phone: "0392 228 45 61",
    rating: 4.4,
    userRatingCount: 87,
    photoCount: 4,
    reviewDaysAgo: [45, 80, 100],
    lat: 35.1764,
    lng: 33.3622,
  },
  {
    id: "mock-place-03",
    name: "Dereboyu Oto Servis",
    city: "Lefkoşa",
    address: "Dereboyu Cad. No:118, Lefkoşa",
    primaryType: "car_repair",
    types: ["car_repair", "establishment"],
    phone: "0533 842 90 13",
    rating: 3.9,
    userRatingCount: 14,
    photoCount: 1,
    reviewDaysAgo: [200, 300],
    lat: 35.1901,
    lng: 33.3558,
  },
  // Girne
  {
    id: "mock-place-04",
    name: "Liman Balık Restaurant",
    city: "Girne",
    address: "Eski Liman No:12, Girne",
    primaryType: "restaurant",
    types: ["restaurant", "seafood_restaurant", "food", "establishment"],
    phone: "0392 815 33 20",
    rating: 4.6,
    userRatingCount: 230,
    photoCount: 5,
    reviewDaysAgo: [3, 9, 20, 60, 120],
    lat: 35.3415,
    lng: 33.3192,
  },
  {
    id: "mock-place-05",
    name: "Girne Gülüş Diş Kliniği",
    city: "Girne",
    address: "Ziya Rızkı Cad. No:25, Girne",
    primaryType: "dental_clinic",
    types: ["dental_clinic", "dentist", "health", "establishment"],
    phone: "0392 815 72 48",
    rating: 4.3,
    userRatingCount: 38,
    photoCount: 3,
    reviewDaysAgo: [60, 95],
    lat: 35.3364,
    lng: 33.3181,
  },
  {
    id: "mock-place-06",
    name: "Kordon Kafe",
    city: "Girne",
    address: "Kordon Boyu No:3, Girne",
    primaryType: "cafe",
    types: ["cafe", "food", "establishment"],
    phone: "0533 862 11 05",
    rating: 4.1,
    userRatingCount: 22,
    photoCount: 2,
    reviewDaysAgo: [100, 170],
    lat: 35.3398,
    lng: 33.3225,
  },
  // Gazimağusa
  {
    id: "mock-place-07",
    name: "Surlariçi Kahvecisi",
    city: "Gazimağusa",
    address: "Namık Kemal Meydanı No:5, Gazimağusa",
    primaryType: "cafe",
    types: ["cafe", "coffee_shop", "establishment"],
    phone: "0392 366 18 72",
    rating: 4.5,
    userRatingCount: 64,
    photoCount: 5,
    reviewDaysAgo: [15, 50],
    lat: 35.1251,
    lng: 33.9411,
  },
  {
    id: "mock-place-08",
    name: "Salamis Güzellik Salonu",
    city: "Gazimağusa",
    address: "Salamis Yolu No:61, Gazimağusa",
    primaryType: "beauty_salon",
    types: ["beauty_salon", "establishment"],
    phone: "0533 867 40 29",
    rating: 4.0,
    userRatingCount: 9,
    photoCount: 1,
    reviewDaysAgo: [130],
    lat: 35.1403,
    lng: 33.9202,
  },
  {
    id: "mock-place-09",
    name: "Mağusa Emlak Ofisi",
    city: "Gazimağusa",
    address: "İsmet İnönü Bulvarı No:19, Gazimağusa",
    primaryType: "real_estate_agency",
    types: ["real_estate_agency", "establishment"],
    phone: null,
    rating: 3.2,
    userRatingCount: 4,
    photoCount: 0,
    reviewDaysAgo: [400],
    lat: 35.1188,
    lng: 33.9305,
  },
  // Güzelyurt
  {
    id: "mock-place-10",
    name: "Güzelyurt Narenciye Lokantası",
    city: "Güzelyurt",
    address: "Ecevit Cad. No:14, Güzelyurt",
    primaryType: "restaurant",
    types: ["restaurant", "food", "establishment"],
    phone: "0392 714 25 36",
    rating: 4.2,
    userRatingCount: 31,
    photoCount: 3,
    reviewDaysAgo: [75, 110],
    lat: 35.1985,
    lng: 32.9933,
  },
  {
    id: "mock-place-11",
    name: "Kemal Usta Oto Elektrik",
    city: "Güzelyurt",
    address: "Sanayi Bölgesi No:8, Güzelyurt",
    primaryType: "car_repair",
    types: ["car_repair", "establishment"],
    phone: "0533 870 14 62",
    rating: 4.7,
    userRatingCount: 12,
    photoCount: 0,
    reviewDaysAgo: [250],
    lat: 35.2041,
    lng: 32.9871,
  },
  {
    id: "mock-place-12",
    name: "Aydın Kuaför",
    city: "Güzelyurt",
    address: "Belediye Cad. No:22, Güzelyurt",
    primaryType: "hair_salon",
    types: ["hair_salon", "hair_care", "establishment"],
    phone: "0533 855 60 78",
    rating: 4.4,
    userRatingCount: 18,
    photoCount: 2,
    reviewDaysAgo: [35, 140],
    lat: 35.1968,
    lng: 32.9955,
  },
  // İskele
  {
    id: "mock-place-13",
    name: "Boğaz Balıkçısı",
    city: "İskele",
    address: "Boğaz Limanı No:2, İskele",
    primaryType: "restaurant",
    types: ["restaurant", "seafood_restaurant", "food", "establishment"],
    phone: "0392 371 29 84",
    rating: 3.8,
    userRatingCount: 45,
    photoCount: 4,
    reviewDaysAgo: [85],
    lat: 35.2873,
    lng: 33.8912,
  },
  {
    id: "mock-place-14",
    name: "İskele Dental Klinik",
    city: "İskele",
    address: "Long Beach Yolu No:9, İskele",
    primaryType: "dental_clinic",
    types: ["dental_clinic", "health", "establishment"],
    phone: "0533 879 03 51",
    rating: null,
    userRatingCount: 0,
    photoCount: 0,
    reviewDaysAgo: [],
    lat: 35.2811,
    lng: 33.9003,
  },
  {
    id: "mock-place-15",
    name: "Long Beach Berber",
    city: "İskele",
    address: "Long Beach Sahil Yolu No:31, İskele",
    primaryType: "barber_shop",
    types: ["barber_shop", "establishment"],
    phone: null,
    rating: 4.0,
    userRatingCount: 7,
    photoCount: 1,
    reviewDaysAgo: [190],
    lat: 35.2766,
    lng: 33.9054,
  },
  // Kendi sitesi yok, Google'da yalnız sosyal medya / platform linki var → lead (D-008)
  {
    id: "mock-place-16",
    name: "Lefkoşa Merkez Otel",
    city: "Lefkoşa",
    address: "Osman Paşa Cad. No:1, Lefkoşa",
    primaryType: "hotel",
    types: ["hotel", "lodging", "establishment"],
    phone: "0392 227 00 00",
    rating: 4.2,
    userRatingCount: 310,
    photoCount: 5,
    reviewDaysAgo: [2],
    lat: 35.1833,
    lng: 33.3667,
    websiteUri: "https://www.booking.com/hotel/cy/lefkosa-merkez-otel.html",
  },
  {
    id: "mock-place-17",
    name: "Girne Marina Cafe & Bistro",
    city: "Girne",
    address: "Marina No:4, Girne",
    primaryType: "cafe",
    types: ["cafe", "establishment"],
    phone: "0392 815 99 99",
    rating: 4.4,
    userRatingCount: 180,
    photoCount: 5,
    reviewDaysAgo: [4],
    lat: 35.3421,
    lng: 33.3301,
    websiteUri: "https://www.instagram.com/girnemarinabistro/",
  },
];

// Kaydedilmeyecekler: 2 siteli + 1 kapalı (sitesiz ama OPERATIONAL değil). Her aramada döner.
const EXCLUDED_SEEDS: FixtureSeed[] = [
  {
    id: "mock-place-web-3",
    name: "Mağusa Hukuk Bürosu",
    city: "Gazimağusa",
    address: "Polatpaşa Bulvarı No:40, Gazimağusa",
    primaryType: "lawyer",
    types: ["lawyer", "establishment"],
    phone: "0392 366 55 44",
    rating: 4.9,
    userRatingCount: 26,
    photoCount: 1,
    reviewDaysAgo: [30],
    lat: 35.1222,
    lng: 33.9377,
    websiteUri: "https://magusahukuk.example.com/",
  },
  {
    id: "mock-place-web-4",
    name: "İskele Rent a Car",
    city: "İskele",
    address: "Ana Yol No:77, İskele",
    primaryType: "car_rental",
    types: ["car_rental", "establishment"],
    phone: "0533 888 77 66",
    rating: 4.1,
    userRatingCount: 58,
    photoCount: 2,
    reviewDaysAgo: [10],
    lat: 35.2855,
    lng: 33.8899,
    websiteUri: "https://iskelerent.example.com/",
  },
  {
    id: "mock-place-closed-1",
    name: "Eski Çarşı Terzisi",
    city: "Lefkoşa",
    address: "Arasta Sok. No:6, Lefkoşa",
    primaryType: "clothing_store",
    types: ["clothing_store", "establishment"],
    phone: "0392 228 10 10",
    rating: 4.6,
    userRatingCount: 40,
    photoCount: 2,
    reviewDaysAgo: [365],
    lat: 35.1749,
    lng: 33.3641,
    businessStatus: "CLOSED_PERMANENTLY",
  },
];

function toInternational(national: string): string {
  // "0392 228 45 61" → "+90 392 228 45 61"
  return `+90 ${national.replace(/^0/, "")}`;
}

function buildDetails(seed: FixtureSeed, photoStart: number, now: Date): PlaceDetails {
  const photos = Array.from({ length: seed.photoCount }, (_, i) => ({
    name: `mock/photo-${photoStart + i}`,
  }));
  const reviews = seed.reviewDaysAgo.slice(0, 5).map((days, i) => {
    const text = REVIEW_TEXTS[i % REVIEW_TEXTS.length] ?? "";
    return {
      rating: Math.max(1, Math.min(5, Math.round(seed.rating ?? 4) - (i % 2))),
      text: { text },
      originalText: { text },
      authorAttribution: { displayName: REVIEW_AUTHORS[i % REVIEW_AUTHORS.length] ?? "Google kullanıcısı" },
      publishTime: new Date(now.getTime() - days * DAY_MS).toISOString(),
    };
  });
  const isFood = seed.types.includes("food") || seed.primaryType === "cafe";

  return {
    id: seed.id,
    displayName: { text: seed.name },
    formattedAddress: seed.address,
    nationalPhoneNumber: seed.phone ?? undefined,
    internationalPhoneNumber: seed.phone ? toInternational(seed.phone) : undefined,
    websiteUri: seed.websiteUri,
    rating: seed.rating ?? undefined,
    userRatingCount: seed.userRatingCount,
    primaryType: seed.primaryType,
    types: seed.types,
    regularOpeningHours: { weekdayDescriptions: isFood ? HOURS_RESTAURANT : HOURS_STANDARD },
    photos,
    reviews,
    googleMapsUri: `https://maps.google.com/?cid=${seed.id.replace(/\D/g, "") || "0"}`,
    location: { latitude: seed.lat, longitude: seed.lng },
    businessStatus: seed.businessStatus ?? "OPERATIONAL",
  };
}

interface BuiltFixtures {
  saved: MockFixture[];
  excluded: MockFixture[];
}

function buildAll(now: Date): BuiltFixtures {
  let photoCounter = 1;
  const build = (seed: FixtureSeed): MockFixture => {
    const details = buildDetails(seed, photoCounter, now);
    photoCounter += seed.photoCount;
    return { city: seed.city, details };
  };
  return { saved: SAVED_SEEDS.map(build), excluded: EXCLUDED_SEEDS.map(build) };
}

/** Kaydedilmesi gereken 17 işletme (OPERATIONAL + kendi sitesi yok; 2'si yalnız sosyal/platform linkli) — seed bunu kullanır. */
export function getMockSavedFixtures(now: Date = new Date()): MockFixture[] {
  return buildAll(now).saved;
}

/** Tüm 20 kayıt (17 kaydedilecek + 2 siteli + 1 kapalı). */
export function getMockAllFixtures(now: Date = new Date()): MockFixture[] {
  const { saved, excluded } = buildAll(now);
  return [...saved, ...excluded];
}

function foldTr(value: string): string {
  return value.toLocaleLowerCase("tr-TR");
}

function toTextSearchPlace(d: PlaceDetails): TextSearchPlace {
  return {
    id: d.id,
    displayName: d.displayName,
    websiteUri: d.websiteUri,
    businessStatus: d.businessStatus,
  };
}

const EARTH_RADIUS_M = 6_371_008.8;

/** İki koordinat arası büyük daire mesafesi (metre) — alan aramasının mock karşılığı. */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function withinRestriction(details: PlaceDetails, options?: TextSearchOptions): boolean {
  const circle = options?.locationRestriction?.circle;
  if (!circle) return true;
  const location = details.location;
  if (!location) return false;
  const distance = haversineMeters(
    { lat: circle.center.latitude, lng: circle.center.longitude },
    { lat: location.latitude, lng: location.longitude },
  );
  return distance <= circle.radius;
}

/**
 * Filtre iki türlü:
 * - `locationRestriction` verilirse (harita ile alan araması) tüm fixture'lar merkeze olan
 *   haversine mesafesine göre elenir; şehir metni yok sayılır. Yarıçap büyükse hepsi döner.
 * - Verilmezse: sorgu bir fixture şehrini içeriyorsa o şehrin işletmeleri (Lefkoşa/Girne 4,
 *   diğerleri 3), değilse 17'nin tamamı.
 * Siteli 2 + kapalı 1 kayıt her zaman eklenir (sayaçlar için). Sayfa boyu 10 (sayfalama denensin).
 */
export interface MockClientOptions {
  now?: () => Date;
  /** Her çağrıya yapay gecikme (ms) — canlı SSE ilerlemesi görünsün diye; testlerde 0. */
  latencyMs?: number;
}

export function createMockPlacesClient(options: MockClientOptions = {}): PlacesClient {
  const now = options.now ?? (() => new Date());
  const latency = options.latencyMs ?? 0;
  const delay = (): Promise<void> =>
    latency > 0 ? new Promise((resolve) => setTimeout(resolve, latency)) : Promise.resolve();

  return {
    async searchText(
      query: string,
      pageToken?: string,
      options?: TextSearchOptions,
    ): Promise<TextSearchResult> {
      await delay();
      const { saved, excluded } = buildAll(now());
      let fixtures: MockFixture[];
      if (options?.locationRestriction) {
        fixtures = [...saved, ...excluded].filter((f) => withinRestriction(f.details, options));
      } else {
        const q = foldTr(query);
        const cities = [...new Set(saved.map((f) => f.city))].filter((c) => q.includes(foldTr(c)));
        const matched = cities.length > 0 ? saved.filter((f) => cities.includes(f.city)) : saved;
        fixtures = [...matched, ...excluded];
      }
      const all = fixtures.map((f) => toTextSearchPlace(f.details));

      const offset = pageToken?.startsWith(PAGE_TOKEN_PREFIX)
        ? Number(pageToken.slice(PAGE_TOKEN_PREFIX.length)) || 0
        : 0;
      const places = all.slice(offset, offset + MOCK_PAGE_SIZE);
      const next = offset + MOCK_PAGE_SIZE;
      return next < all.length ? { places, nextPageToken: `${PAGE_TOKEN_PREFIX}${next}` } : { places };
    },

    async getDetails(placeId: string): Promise<PlaceDetails> {
      await delay();
      const found = getMockAllFixtures(now()).find((f) => f.details.id === placeId);
      if (!found) throw new PlacesError(`Mock: bilinmeyen placeId ${placeId}`, 404);
      return found.details;
    },

    async getPhotoUri(name: string): Promise<string> {
      // Mock modda /api/photo dışarı çıkmaz, SVG üretir; bu yalnızca arayüz tamlığı için.
      return `https://mock.invalid/${name}`;
    },
  };
}
