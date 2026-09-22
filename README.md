# Lead Radar

**Web sitesi olmayan işletmeleri bul, puanla, ulaş, sat.**

Lead Radar, Google Haritalar'da kayıtlı olup **web sitesi olmayan** işletmeleri bulan, Lead Skoru ile puanlayan, telefon/fotoğraf/e-posta bilgilerini tek panelde toplayan ve web sitesi satış sürecini (NEW → WON) yöneten lead-generation aracıdır. Dijital ajanslar ve freelance web geliştiriciler için yapılmıştır.

İlk pazar: KKTC (Lefkoşa, Girne, Gazimağusa, Güzelyurt, İskele). İlk kullanıcı: Piton Studios.

---

## Neden

- **Sitesiz işletme = sıcak müşteri adayı** — Küçük işletmelerin çoğu Google Haritalar'da var (puan, yorum, müşteri), ama web sitesi yok. Bu, işletmenin ihtiyacını kanıtlı ve ulaşılabilir kılıyor.

- **Google puanı ve yorumları = kişiselleştirilmiş kanca** — "Google'da 4,6 puan ve 230 yorumunuz var ama web siteniz yok" cümlesi genel bir tekliften çok daha güçlüdür. Lead Skoru, bu kancanın en güçlü olduğu işletmeleri öne çıkarır.

- **Manuel ama hızlı outreach** — Dakikalar içinde 60 işletmeyi bulur, durum geçişlerini (NEW → CONTACTED → REPLIED → WON) düzenli tutar. Toplu mesaj göndermez — her iletişim kullanıcı eliyle (WhatsApp, e-posta), ama şablonlar ve otomatik kopya sayesinde hızlı.

---

## Özellikler

- **Arama (Keşif)** — Kategori (serbest metin: "berber", "restoran") × şehir (dropdown) → Google Places Text Search ile max 60 işletmeyi tara, sitesiz olanları filtrele, bulduklarını panoya al. Her arama işi `SearchJob` kaydıyla tutulur; ilerleme SSE ile canlı akıyor (sayfayı kapatsan da iş devam eder).

- **Lead Skoru (0–100)** — 6 sinyal: yorum sayısı (0–30), puan (0–20), fotoğraf (0–15), telefon (15), son yorum tarihi (0–10), kategori bonusu (0–10). Sınırlar: 80+ **Sıcak**, 50–79 **Ilık**, <50 **Soğuk**. Tablo ve detayda renkli rozet + skorun nasıl hesaplandığı görülür.

- **Tablo + Filtreler** — Sütunlar: Fotoğraf, İşletme, Kategori, Şehir, Telefon, E-posta, Puan, Lead Skoru, Durum, Son Temas. Filtreler: şehir, kategori, durum, skor bandı, metin arama (ad/telefon). Sıralama: skor (varsayılan), yorum sayısı, ekleme tarihi.

- **Detay Paneli (Sağdan açılır)** — Fotoğraf galerisi, adres, telefon (kopyala/WhatsApp/Ara), e-posta (inline düzenlenebilir), puan, yorumlar (5'e kadar), çalışma saatleri, Lead Skoru kırılımı, durum geçmişi, notlar, ilgili şablon.

- **Mesaj Şablonları** — Hazır şablonlar (WhatsApp, E-posta). İşletme verisiyle otomatik doldurma: `{{isletme}}`, `{{sehir}}`, `{{puan}}`, `{{yorumSayisi}}`. Kopyala + WhatsApp'ı aç tek butonla. Durum otomatik `CONTACTED` olur, `lastContactedAt` güncellenir (geri alınabilir).

- **Satış Pipeline** — Durum geçişleri: NEW → QUALIFIED → CONTACTED → REPLIED → MEETING → WON / LOST / SKIPPED. Her geçiş `StatusChange` tablosuna yazılır; dashboard ve raporlarda izlenebilir.

- **Dashboard** — 6 kart: Toplam işletme, Sıcak lead sayısı, Bu hafta temas, Cevap oranı (hiç "Cevap verdi"ye ulaşan / hiç "Temas edildi"ye ulaşan işletme), Kazanılan, Toplam API maliyeti. Altında funnel grafiği (durum başına sayı) ve son 10 arama işi tablosu.

- **Excel Export** — Filtreli listeyi `.xlsx` olarak indir. Sütunlar: İşletme, Kategori, Şehir, Adres, Telefon (metin formatında, Excel'in sayıya çevirmesini engelle), E-posta, Puan, Yorum Sayısı, Lead Skoru, Durum, Son Temas, Google Maps URL, Fotoğraf URL, Notlar.

- **Ayarlar** — Şehir listesi (ekle/sil), Kategori bonus listesi, Mesaj şablonları (CRUD), API anahtarı durumu (tanımlı/değil).

---

## Hızlı başlangıç (anahtarsız, mock veriyle)

### Gereksinimler

- Node.js 22+
- pnpm 10+

### Kurulum

```bash
git clone https://github.com/omergungor11/lead-radar.git
cd lead-radar
pnpm install
```

### Ortam ayarları

```bash
cp .env.example .env
```

`.env` dosyasında şu alanları düzenle:

- `ADMIN_PASSWORD` — Panel şifresi (benzersiz seç)
- `SESSION_SECRET` — 32+ karakter rasgele dize: `openssl rand -hex 32`
- `PLACES_MOCK=1` — Anahtar olmadan 15 mock işletmeyle çalış

Örnek:
```
ADMIN_PASSWORD="guclu-sifremi-buraya"
SESSION_SECRET="a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
PLACES_MOCK=1
```

### Veritabanı

```bash
pnpm db:migrate
pnpm db:seed  # 2 şablon + KKTC şehirleri + (PLACES_MOCK=1 iken) 15 örnek işletme
```

### Başlat

```bash
pnpm dev
```

Adres: http://localhost:3000

Şifre: `.env`'deki `ADMIN_PASSWORD`

**Not:** 3000 portu başka projeyle dolu ise: `pnpm dev --port 3100` (sonra açılacak URL de 3100 olur).

---

## Ortam değişkenleri

| Değişken | Gerekli | Varsayılan | Açıklama |
|---|---|---|---|
| `DATABASE_URL` | ✓ | `file:./dev.db` | SQLite veritabanı yolu. Dev'de bu kalır; Postgres'e geçiş Phase 4 |
| `ADMIN_PASSWORD` | ✓ | — | Panel giriş şifresi. Benzersiz seç, güçlü olsun |
| `SESSION_SECRET` | ✓ | — | Cookie imzası, min 32 karakter. `openssl rand -hex 32` ile üret |
| `GOOGLE_PLACES_API_KEY` | ✗ | — | Google Places API (New) anahtarı. Yoksa arama `503` döner, PLACES_MOCK=1 gerekir |
| `PLACES_MOCK` | ✗ | `0` | `1` → anahtar gerekmez, 15 sabit işletmeyle geliştir. Üretim'de `0` |

**Eksik zorunlu değişken:** Uygulama başlangıçta net hata verir ve kapanır.

---

## Google Places API anahtarı alma

API anahtarı olmadan `PLACES_MOCK=1` ile sınırsız test edebilirsin. Gerçek aramaları yapacaksan:

1. [Google Cloud Console](https://console.cloud.google.com/) sayfasına git
2. **Yeni proje** oluştur (ad: Lead Radar veya istediğin)
3. **APIs & Services → Library** → Ara: "Places API"
4. **Places API (New)** → Enable (eski "Places API" değil — yeni sürümü seç)
5. **APIs & Services → Credentials** → **Create Credentials** → **API key**
6. Oluşan anahtarı **kısıtla**:
   - **API restrictions** → **Places API (New)** seç (sadece bu API etkin)
   - **Application restrictions** (opsiyonel ama önerilen) → **IP address** → Sunucu IP'niz (ör. VPS üzerindeyse onun IP'si; dev'de localhost'tan çekmiyorsan skip)
7. Anahtarı kopyala; `.env`'e ekle:
   ```
   GOOGLE_PLACES_API_KEY="AIza..."
   PLACES_MOCK=0
   ```
8. **Billing** sayfasında (Google Cloud Console) **Budgets & alerts** kur; aylık max harcama belirle (ör. $50)
9. Uygulamayı yeniden başlat; `/settings` → "Anahtar tanımlı ✓" görünmeli

---

## Maliyet

Google Places API (New) ücretlendirilir. Kütüphane **field mask** ile sadece gerekli alanları çekmek suretiyle maliyeti düşürür.

### Birim fiyatları

| Çağrı | Fiyat | Ne zaman | Kullanım |
|---|---|---|---|
| **Text Search** | ~$0.032/çağrı | Her arama sorgusu | Max 20 sonuç/çağrı; 60 işletme = 3 çağrı |
| **Place Details** | ~$0.017/işletme | Sadece sitesiz işletmelere | Siteli olanlar atlanır (ücret yok) |
| **Place Photos** | ücretli (fiyat sayfasına bakın) | Tablo thumbnail'ı + detay galerisi | Her görüntüleme bir `/api/photo` çağrısı; tarayıcı yönlendirmeyi 1 saat önbellekler |

> Fotoğraf maliyeti arama işinin tahmini maliyetine **dahil değildir** — tablo sayfası başına en fazla 50 thumbnail yüklenir. Fotoğraflar indirilmez / sunucuda saklanmaz (Places ToS).

### Pratik örnek

60 sonuçlu bir arama:
- Text Search: 3 × $0.032 = **~$0.10**
- Sitesiz işletme: 20 tane × $0.017 = **~$0.34**
- **Toplam: ~$0.44**

Birim fiyatlar ve SKU başına aylık ücretsiz kullanım kotaları Google tarafından değiştirilebilir — güncel değerler için [Places API fiyatlandırması](https://developers.google.com/maps/billing-and-pricing/pricing)'na bakın; sabitler `lib/config.ts`'te.

Her arama işinin tahmini maliyeti Aramalar sayfasında, toplamı Dashboard'daki "Toplam API maliyeti" kartında görünür.

---

## Komutlar

```bash
# Geliştirme sunucusu (Turbopack ile hızlı reload)
pnpm dev

# Tarayıcıda test (şifre gerekli)
pnpm dev --port 3100    # 3000 başka projelerin dolması durumunda

# TypeScript ve ESLint check
pnpm typecheck
pnpm lint

# Birim testler (skorlama, durum, export)
pnpm test               # Bir kez çalıştır
pnpm test:watch        # Dosya değişiminde yeniden çalıştır

# E2E testler (Playwright, mock modda)
pnpm test:e2e                # Kendi sunucusunu açar (varsayılan 3000): prisma/e2e.db + mock Places + test şifresi
E2E_PORT=3100 pnpm test:e2e  # 3000 doluysa

# Veritabanı yönetimi
pnpm db:migrate        # Yeni migration uygula (Prisma)
pnpm db:seed           # `prisma/seed.ts`'i çalıştır
pnpm db:studio         # Prisma Studio web UI (http://localhost:5555)

# Production build
pnpm build             # `.next/` oluşturur
pnpm start             # Production modda sunucu başlat (build gerekli)
```

---

## Mimari (kısa)

**Tek Next.js 15 uygulaması** — App Router, TypeScript strict, Tailwind + shadcn/ui.

- **Frontend** — React Server Components (performans), Client Components (etkileşim). TanStack Query ile API cache.
- **API** — Route Handlers (`/api/*`). Tüm body'ler **zod** ile doğrulanır. Hata şekli: `{ error: { statusCode, code, message } }`.
- **Veritabanı** — SQLite + Prisma (MVP). Postgres'e geçiş: `schema.prisma`'da `provider = "postgresql"` değişimi + migration.
- **Arka plan işi** — Kuyruk yok. Arama işi Next.js sunucu sürecinin içinde çalışır (istek bitse de sürer); ilerleme **Server-Sent Events (SSE)** ile panele akar. Bu yüzden **tek instance** gerekir: serverless (Vercel) yerine VPS'te `pnpm build && pnpm start` önerilir. Çoklu instance gerekirse kuyruk (BullMQ/Redis) eklenir.
- **Güvenlik**
  - Google Places API anahtarı **asla client'a gitmez**. `/api/photo?name=...` proxy route'u, sunucuda anahtarsız `photoUri` alıp tarayıcıyı ona yönlendirir (302).
  - Giriş: tek şifre → HMAC imzalı **httpOnly cookie** → middleware'de kontrol.
- **Test** — Vitest (birim), Playwright (smoke e2e).

**Dizin yapısı:**
```
app/                    → Next.js (login, panel sayfaları, API route'ları)
components/             → React bileşenleri (tablo, detay, form, UI lib)
lib/                    → Fonksiyonlar (Places, skorlama, export, auth, config)
prisma/                 → Veri modeli, migration, seed
tests/                  → Test dosyaları
lead-*/                 → Proje metadata (plan, task, docs, config)
```

---

## Yasal ve etik notlar

### Temel ilkeler

- **Bulur ama toplu gönderim yapmaz** — Her WhatsApp, SMS, e-posta **kullanıcı tarafından elle** gönderilir. Otomatik/toplu mesaj Phase 3'te (WhatsApp Business API, İYS).
- **Her şablonda opt-out zorunlu** — "İlgilenmiyorsanız yazın" cümlesi. Şablon kaydında yoksa uyarı verilir.
- **Reddedene yeniden temas** — LOST/SKIPPED işletmeye yeniden CONTACTED geçişi onay diyaloğu ister.
- **Veri 30 günden eskiyse "Yenile"** — Google Places ToS cache kuralı; panel "veri eski" işareti koyar, detayda "Yenile" butonu sunulur.

### Yargı alanları

**Türkiye:**
- **6563 sayılı Kanun** (ticari elektronik iletiler) — kural olarak önceden onay gerekir; tacir/esnafa gönderim için istisnalar vardır ama ret hakkı her durumda saklıdır.
- **İYS (İleti Yönetim Sistemi)** — gönderici yükümlülükleri (kayıt, ret yönetimi) için güncel mevzuatı kontrol edin.
- **KVKK (Kişisel Verileri Koruma Kanunu)** — İşletme sahibi kişi ise kişisel veri sayılır; sadece kendi satış işinde kullanılmalı, üçüncü tarafa aktarılmamalı.

**KKTC:**
- **89/2007 Kişisel Verilerin Korunması Yasası** — işletme sahibinin adı/telefonu kişisel veri sayılabilir; yalnızca amaçla sınırlı kullanın.
- **WhatsApp'ın kendi politikası** — Kişisel hesaptan toplu mesaj gönderimi platform kuralı ihlal eder; account kalıcı olarak yasaklanabilir.

**AB muhatapları (GDPR):**
- İlk temas için "meşru menfaat" dayanağı değerlendirilmelidir; ülkeye göre elektronik pazarlama için ayrıca onay gerekebilir.
- İtiraz / listeden çıkma talepleri gecikmeksizin işlenmeli ve bir daha temas edilmemelidir.

### Yasal tavsiye

**Bu hukuki tavsiye değildir.** Ölçeklemeden (günde 100+ mesaj) önce bir avukata danışın — özellikle ülkenize göre İYS / GDPR / KVKK uyumluluğu kontrol et.

---

## Güvenlik notu

Panel internete açılacaksa:

- **Güçlü ADMIN_PASSWORD** — 15+ karakter, rasgele, defteri (password manager) koru.
- **HTTPS** — HTTP'de cookie Secure flag olmaz; HTTPS arkasında çalıştır (reverse proxy veya platform desteği).
- **Rate limiting** — Login'de rate limit henüz yok; production'da reverse proxy (nginx, Cloudflare) ile `/api/auth/login` başına max 5 deneme/5 dakika kur.
- **Oturumları düşürmek** — Çıkış yalnızca o tarayıcının cookie'sini siler; çalınmış bir oturumu tek tek iptal etme mekanizması yok. `SESSION_SECRET`'ı değiştirmek tüm oturumları düşürür.
- **Log ve izleme** — Başarısız girişlerin loglanması henüz yok; reverse proxy loglarından izleyin.

---

## Yol haritası

| Phase | Ne | Durum |
|---|---|---|
| **0** | Proje kurulumu, spesifikasyon | ✅ Bitti |
| **1** | MVP — arama, skor, panel, pipeline, Excel, dashboard | ✅ Bitti |
| **2** | Önizleme site üretimi — Maps verisi + fotoğraflardan otomatik landing page | 📋 Planlandı |
| **3** | Kanal otomasyonu — WhatsApp Business API, SMTP, İYS entegrasyonu | 📋 Planlandı |
| **4** | Ürünleştirme — multi-tenant, Postgres, Stripe abonelik | 💡 Fikirler aşamasında |

Ön koşullar: Phase 2 için Phase 1 ile en az 5 gerçek temas; Phase 3 için Phase 2'de dönüşüm görülmesi; Phase 4 için kendi ajansta 3 ay kullanım.

---

## Proje meta dizinleri

| Dizin | İçerik |
|---|---|
| `lead-plans/` | MVP spesifikasyonu (`PROMPT.md`), phase detayları |
| `lead-tasks/` | Task dashboard, phase bazlı detay, session notları |
| `lead-docs/` | Mimari kararlar (`DECISIONS.md`), değişiklik kaydı (`CHANGELOG.md`), kalıcı hafıza (`MEMORY.md`) |
| `lead-config/` | Kod standartları, tech stack, orkestrasyon kuralları, agent talimatları |

---

## Geliştirme

- **Spesifikasyon** — `lead-plans/PROMPT.md` (tüm MVP kararları)
- **Task'lar** — `lead-tasks/task-index.md`
- **Kararlar** — `lead-docs/DECISIONS.md`
- Commit formatı: `feat(TASK-XXX): kısa açıklama`

---

**Sorular?** `lead-docs/MEMORY.md` ve `lead-config/conventions.md` teknolojik detaylar için kaynaktır.
