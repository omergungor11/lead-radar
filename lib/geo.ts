// Şehir merkez koordinatları (harita ile alan aramasında haritayı konumlandırmak için).
// OpenStreetMap Nominatim ile 2026-09-22'de bir kerelik üretildi (ODbL); çalışma anında geocoding çağrısı YOK.
// Anahtarlar lib/config.ts KKTC_CITIES + TURKEY_PROVINCES ile birebir.

export interface LatLng {
  lat: number;
  lng: number;
}

export const CITY_COORDS: Readonly<Record<string, LatLng>> = {
  "Lefkoşa": { lat: 35.1854, lng: 33.361 },
  "Girne": { lat: 35.3396, lng: 33.3205 },
  "Gazimağusa": { lat: 35.1205, lng: 33.9388 },
  "Güzelyurt": { lat: 35.1993, lng: 32.9929 },
  "İskele": { lat: 35.2857, lng: 33.8931 },
  "Lefke": { lat: 35.1138, lng: 32.8496 },
  "Adana": { lat: 36.9864, lng: 35.3253 },
  "Adıyaman": { lat: 37.7894, lng: 38.3141 },
  "Afyonkarahisar": { lat: 38.6853, lng: 30.6427 },
  "Ağrı": { lat: 39.5292, lng: 43.3836 },
  "Aksaray": { lat: 38.4326, lng: 33.8977 },
  "Amasya": { lat: 40.6569, lng: 35.7727 },
  "Ankara": { lat: 39.9208, lng: 32.854 },
  "Antalya": { lat: 36.8866, lng: 30.703 },
  "Ardahan": { lat: 41.0373, lng: 42.7462 },
  "Artvin": { lat: 41.1605, lng: 41.8399 },
  "Aydın": { lat: 37.7406, lng: 28.0676 },
  "Balıkesir": { lat: 39.5401, lng: 28.0229 },
  "Bartın": { lat: 41.4948, lng: 32.4354 },
  "Batman": { lat: 37.7874, lng: 41.2574 },
  "Bayburt": { lat: 40.2023, lng: 40.2122 },
  "Bilecik": { lat: 40.1543, lng: 30.148 },
  "Bingöl": { lat: 39.0738, lng: 40.7296 },
  "Bitlis": { lat: 38.4951, lng: 42.1678 },
  "Bolu": { lat: 40.6212, lng: 31.646 },
  "Burdur": { lat: 37.5183, lng: 30.1691 },
  "Bursa": { lat: 40.1826, lng: 29.0675 },
  "Çanakkale": { lat: 40.055, lng: 26.9278 },
  "Çankırı": { lat: 40.6668, lng: 33.4526 },
  "Çorum": { lat: 40.5698, lng: 34.7269 },
  "Denizli": { lat: 37.8276, lng: 29.239 },
  "Diyarbakır": { lat: 37.9162, lng: 40.2364 },
  "Düzce": { lat: 40.8775, lng: 31.201 },
  "Edirne": { lat: 41.6759, lng: 26.5587 },
  "Elazığ": { lat: 38.5825, lng: 39.3962 },
  "Erzincan": { lat: 39.6073, lng: 39.2013 },
  "Erzurum": { lat: 39.9063, lng: 41.2728 },
  "Eskişehir": { lat: 39.7744, lng: 30.5191 },
  "Gaziantep": { lat: 37.0628, lng: 37.3793 },
  "Giresun": { lat: 40.6532, lng: 38.5172 },
  "Gümüşhane": { lat: 40.2533, lng: 39.385 },
  "Hakkâri": { lat: 37.4954, lng: 44.1055 },
  "Hatay": { lat: 36.3451, lng: 36.0748 },
  "Iğdır": { lat: 39.8945, lng: 43.9427 },
  "Isparta": { lat: 37.9465, lng: 30.9602 },
  "İstanbul": { lat: 41.0064, lng: 28.9759 },
  "İzmir": { lat: 38.4193, lng: 27.1285 },
  "Kahramanmaraş": { lat: 37.783, lng: 36.8307 },
  "Karabük": { lat: 41.111, lng: 32.6194 },
  "Karaman": { lat: 37.1797, lng: 33.3384 },
  "Kars": { lat: 40.4558, lng: 42.998 },
  "Kastamonu": { lat: 41.368, lng: 33.7619 },
  "Kayseri": { lat: 38.7219, lng: 35.4873 },
  "Kilis": { lat: 36.7797, lng: 37.1417 },
  "Kırıkkale": { lat: 39.886, lng: 33.8279 },
  "Kırklareli": { lat: 41.7078, lng: 27.6051 },
  "Kırşehir": { lat: 39.3303, lng: 34.1266 },
  "Kocaeli": { lat: 40.8217, lng: 29.9507 },
  "Konya": { lat: 37.8727, lng: 32.4924 },
  "Kütahya": { lat: 39.2523, lng: 29.4938 },
  "Malatya": { lat: 38.3487, lng: 38.3191 },
  "Manisa": { lat: 38.8574, lng: 28.0566 },
  "Mardin": { lat: 37.3611, lng: 40.8959 },
  "Mersin": { lat: 36.7978, lng: 34.6298 },
  "Muğla": { lat: 37.1642, lng: 28.2624 },
  "Muş": { lat: 38.9741, lng: 41.959 },
  "Nevşehir": { lat: 38.7235, lng: 34.7194 },
  "Niğde": { lat: 38.0665, lng: 34.7051 },
  "Ordu": { lat: 40.8293, lng: 37.4083 },
  "Osmaniye": { lat: 37.2518, lng: 36.2994 },
  "Rize": { lat: 40.957, lng: 40.8844 },
  "Sakarya": { lat: 40.7732, lng: 30.4816 },
  "Samsun": { lat: 41.2304, lng: 35.9683 },
  "Şanlıurfa": { lat: 37.2595, lng: 39.0408 },
  "Siirt": { lat: 37.8647, lng: 42.051 },
  "Sinop": { lat: 41.6476, lng: 34.956 },
  "Sivas": { lat: 39.4192, lng: 37.1012 },
  "Şırnak": { lat: 37.4553, lng: 42.5212 },
  "Tekirdağ": { lat: 41.0731, lng: 27.4102 },
  "Tokat": { lat: 40.3892, lng: 36.6315 },
  "Trabzon": { lat: 41.0055, lng: 39.7301 },
  "Tunceli": { lat: 39.2198, lng: 39.414 },
  "Uşak": { lat: 38.5769, lng: 29.373 },
  "Van": { lat: 38.325, lng: 43.659 },
  "Yalova": { lat: 40.5795, lng: 29.1687 },
  "Yozgat": { lat: 39.7152, lng: 35.171 },
  "Zonguldak": { lat: 41.2503, lng: 31.839 },
};

/** KKTC + Türkiye'yi kapsayan varsayılan görünüm (şehir bilinmiyorsa) */
export const DEFAULT_CENTER: LatLng = { lat: 39.0, lng: 35.0 };
export const DEFAULT_ZOOM = 5;
export const CITY_ZOOM = 11;

export function cityCenter(city: string | null | undefined): LatLng | null {
  return (city && CITY_COORDS[city]) || null;
}

/** Harita ile alan araması yarıçap sınırları (metre) */
export const SEARCH_RADIUS_MIN_M = 200;
export const SEARCH_RADIUS_MAX_M = 50_000;
export const SEARCH_RADIUS_DEFAULT_M = 2_000;

/** İki nokta arası mesafe (metre) — haversine */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Noktaya en yakın şehir. Harita ile alan aramasında `Business.city` etiketini otomatik
 * belirlemek için kullanılır (kullanıcı yine de değiştirebilir).
 * `cities` verilirse yalnız o liste (DB'deki şehirler) içinden seçer.
 */
export function nearestCity(point: LatLng, cities?: readonly string[]): string | null {
  const candidates = (cities ?? Object.keys(CITY_COORDS)).filter((c) => CITY_COORDS[c]);
  let best: { city: string; d: number } | null = null;
  for (const city of candidates) {
    const coords = CITY_COORDS[city];
    if (!coords) continue;
    const d = distanceMeters(point, coords);
    if (!best || d < best.d) best = { city, d };
  }
  return best?.city ?? null;
}
