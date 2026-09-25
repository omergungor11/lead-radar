// Places `primaryType` / `types` değerlerinin Türkçe karşılıkları (tablo, sheet, Ayarlar).
// Düzenleme yetkisi: backend. Frontend import eder.
// Liste bilinçli olarak eksik: eşleşmeyen tip ham haliyle gösterilir.

export const CATEGORY_LABELS: Record<string, string> = {
  // Yeme-içme
  restaurant: "Restoran",
  cafe: "Kafe",
  coffee_shop: "Kahve dükkânı",
  bakery: "Fırın",
  bar: "Bar",
  pub: "Pub",
  night_club: "Gece kulübü",
  fast_food_restaurant: "Fast food",
  pizza_restaurant: "Pizzacı",
  seafood_restaurant: "Balık restoranı",
  turkish_restaurant: "Türk mutfağı",
  meal_takeaway: "Paket servis",
  meal_delivery: "Yemek teslimatı",
  ice_cream_shop: "Dondurmacı",
  family_restaurant: "Aile restoranı",
  fine_dining_restaurant: "Fine dining restoran",
  middle_eastern_restaurant: "Ortadoğu mutfağı",
  kebab_shop: "Kebapçı",
  bar_and_grill: "Izgara & bar",
  hamburger_restaurant: "Hamburgerci",
  spanish_restaurant: "İspanyol restoranı",
  greek_restaurant: "Rum / Yunan restoranı",
  sandwich_shop: "Sandviççi",
  rest_stop: "Dinlenme tesisi",
  dessert_shop: "Tatlıcı",
  // Güzellik & bakım
  barber_shop: "Berber",
  hair_salon: "Kuaför",
  hair_care: "Saç bakımı",
  beauty_salon: "Güzellik salonu",
  nail_salon: "Tırnak salonu",
  spa: "Spa",
  massage: "Masaj salonu",
  tattoo_parlor: "Dövme stüdyosu",
  // Sağlık
  dentist: "Diş hekimi",
  dental_clinic: "Diş kliniği",
  doctor: "Doktor",
  hospital: "Hastane",
  medical_lab: "Tıbbi laboratuvar",
  physiotherapist: "Fizyoterapist",
  pharmacy: "Eczane",
  drugstore: "Eczane / kozmetik",
  veterinary_care: "Veteriner",
  // Spor
  gym: "Spor salonu",
  fitness_center: "Fitness merkezi",
  yoga_studio: "Yoga stüdyosu",
  // Profesyonel hizmetler
  lawyer: "Avukat",
  accounting: "Muhasebe",
  real_estate_agency: "Emlak ofisi",
  insurance_agency: "Sigorta acentesi",
  travel_agency: "Seyahat acentesi",
  architect: "Mimar",
  consultant: "Danışmanlık",
  plumber: "Tesisatçı",
  electrician: "Elektrikçi",
  painter: "Boyacı",
  roofing_contractor: "Çatı ustası",
  general_contractor: "Müteahhit",
  locksmith: "Çilingir",
  moving_company: "Nakliyat",
  laundry: "Çamaşırhane",
  photographer: "Fotoğrafçı",
  wedding_venue: "Düğün salonu",
  event_venue: "Etkinlik mekânı",
  // Konaklama
  hotel: "Otel",
  lodging: "Konaklama",
  motel: "Motel",
  guest_house: "Pansiyon",
  bed_and_breakfast: "Pansiyon (kahvaltılı)",
  hostel: "Hostel",
  resort_hotel: "Tatil köyü",
  // Otomotiv
  car_repair: "Oto tamir",
  car_dealer: "Oto galeri",
  car_wash: "Oto yıkama",
  car_rental: "Araç kiralama",
  gas_station: "Akaryakıt istasyonu",
  // Perakende
  clothing_store: "Giyim mağazası",
  florist: "Çiçekçi",
  furniture_store: "Mobilya mağazası",
  electronics_store: "Elektronik mağazası",
  cell_phone_store: "Cep telefonu mağazası",
  hardware_store: "Hırdavat",
  home_goods_store: "Ev eşyası",
  jewelry_store: "Kuyumcu",
  shoe_store: "Ayakkabı mağazası",
  book_store: "Kitapçı",
  gift_shop: "Hediyelik eşya",
  sporting_goods_store: "Spor malzemeleri",
  supermarket: "Süpermarket",
  grocery_store: "Market",
  convenience_store: "Bakkal",
  liquor_store: "Tekel bayi",
  butcher_shop: "Kasap",
  pet_store: "Pet shop",
  store: "Mağaza",
  shopping_mall: "Alışveriş merkezi",
  // Eğitim
  school: "Okul",
  preschool: "Anaokulu",
  primary_school: "İlkokul",
  secondary_school: "Ortaokul / lise",
  university: "Üniversite",
  driving_school: "Sürücü kursu",
  private_guest_room: "Pansiyon odası",
  // Genel
  point_of_interest: "İlgi noktası",
  establishment: "İşletme",
};

export function categoryLabel(type: string | null | undefined): string {
  if (!type) return "—";
  return CATEGORY_LABELS[type] ?? type;
}

function foldTr(value: string): string {
  return value.toLocaleLowerCase("tr-TR").trim();
}

/**
 * Serbest metin aramasındaki kategori eşleşmesi: Türkçe etiketi ("kafe", "balık restoranı") ya da
 * ham kodu ("cafe") `q`'yu içeren Places tip kodları. 2 harften kısa sorgu kategoriye bakmaz.
 */
export function matchCategoryCodes(q: string): string[] {
  const needle = foldTr(q);
  if (needle.length < 2) return [];
  return Object.entries(CATEGORY_LABELS)
    .filter(([code, label]) => foldTr(label).includes(needle) || code.includes(needle.replace(/\s+/g, "_")))
    .map(([code]) => code);
}
