# Lead Radar — MVP İnşa Prompt'u

> Bu dosya, Claude Code'a (veya herhangi bir agent'a) verilecek **ilk inşa prompt'udur**.
> Tamamını tek seferde ver; agent bunu okuyup Phase 1'i uçtan uca kurar.
> Kararlar bilinçli olarak burada verilmiştir — agent'ın "hangisini istersin?" diye
> sorması gereken hiçbir şey bırakılmadı.

---

## Rol ve bağlam

Sen bu projede kıdemli full-stack geliştiricisin. Proje kökündeki `CLAUDE.md`,
`lead-config/tech-stack.md` ve `lead-config/conventions.md` dosyalarını oku, sonra
aşağıdaki spesifikasyona göre **Lead Radar MVP**'sini inşa et.

**Lead Radar nedir:** Google Haritalar'da kayıtlı olup **web sitesi olmayan** işletmeleri
bulan, bunları puanlayıp zenginleştiren, kişiselleştirilmiş web sitesi teklifi göndermeyi
ve satış sürecini tek panelden yönetmeyi sağlayan bir lead-generation aracıdır.

**Kullanıcı:** Tek kişilik bir dijital ajans (Piton Studios). Günde 20–50 işletmeyi
inceleyip 10–20 tanesine ulaşacak. Ekip yok, çoklu kullanıcı yok, rol yok.

**İlk pazar:** KKTC — Lefkoşa, Girne, Gazimağusa, Güzelyurt, İskele. Dil: Türkçe arayüz.
Türkiye şehirleri sonraki aşamada eklenecek; şehir listesi konfigürasyondan gelmeli,
koda gömülmemeli.

---

## Kesin kararlar (tartışma yok)

| Konu | Karar | Neden |
|---|---|---|
| Veri kaynağı | **Google Places API (New)** — Text Search + Place Details | `websiteUri` alanı boş olanlar hedef. Scraping yok; ToS ihlali ve kırılganlık riski alınmıyor |
| Framework | **Next.js 15 (App Router) + TypeScript strict** | Panel + API + job tetikleyici tek uygulamada |
| Veritabanı | **SQLite via Prisma** | Tek kullanıcı, lokal çalışma, Docker gerekmez. Prisma sayesinde Postgres'e geçiş tek satır |
| UI | **Tailwind CSS + shadcn/ui** | Hızlı, tutarlı, sade |
| Veri çekme (client) | **TanStack Query** | Tablo/detay cache'i |
| Arka plan iş | **Yok** — arama işi bir Route Handler içinde senkron çalışır, ilerleme SSE ile panele akar | BullMQ/Redis MVP için gereksiz ağırlık. Phase 2'de eklenebilir |
| Excel | **exceljs** ile `.xlsx` export | Kullanıcı filtreli listeyi Excel'e alabilmeli |
| Outreach kanalı | **Manuel** — panelden `wa.me` derin link + `mailto:` + kopyalanabilir mesaj şablonu | WhatsApp Business API onayı ve İYS kaydı MVP'yi geciktirir. Otomatik gönderim Phase 3 |
| Önizleme site üretimi | **Kapsam dışı (Phase 2)** | Önce pipeline'ın çalıştığı ve müşteri getirdiği doğrulanır |
| Auth | **Tek şifreli giriş** (`ADMIN_PASSWORD` env) + httpOnly cookie | Multi-user yok; ama panel internete çıkarsa açık kalmamalı |
| Paket yöneticisi | **pnpm** | |
| Test | Vitest (skorlama + export birim testleri), Playwright (1 smoke: giriş → arama → tablo) | |

---

## Kapsam — MVP'de OLACAKLAR

### 1. Arama (Keşif)

- Kullanıcı panelde **kategori** (serbest metin: "berber", "restoran", "diş kliniği")
  ve **şehir** (dropdown, config'den) seçer, "Tara" der.
- Sistem Places Text Search'ü sayfalayarak çeker (`pageToken` ile max 60 sonuç/sorgu —
  API limiti). Her sonuç için Place Details çağırır ve şu alanları alır:
  `id, displayName, formattedAddress, nationalPhoneNumber, internationalPhoneNumber,
  websiteUri, rating, userRatingCount, primaryType, types, regularOpeningHours,
  photos (max 5), reviews (max 5), googleMapsUri, location, businessStatus`.
- **`websiteUri` dolu olanlar kaydedilmez** (sadece sayaç olarak raporlanır: "42 tarandı,
  17 sitesiz").
- `businessStatus !== "OPERATIONAL"` olanlar kaydedilmez.
- Aynı `placeId` daha önce kaydedilmişse **upsert** — mevcut durum (status, notlar) korunur,
  Google verisi güncellenir.
- Arama işi bir `SearchJob` kaydı oluşturur: `query, city, startedAt, finishedAt,
  scanned, withoutWebsite, saved, status (RUNNING|DONE|FAILED), error`.
- İlerleme panele SSE ile akar; kullanıcı sayfayı kapatsa iş devam eder ve sonuç
  `SearchJob`'da durur.
- Fotoğraflar: Places Photo endpoint'inden **URL üretilir, dosya indirilmez**.
  URL'ler `Business.photos` JSON alanında saklanır. (Places ToS: fotoğraf cache'leme yok;
  panelde her seferinde Google'dan yüklenir.)
- Places API maliyeti panelde görünür: her `SearchJob` için yaklaşık maliyet
  (`textSearch × $0.032 + details × $0.017` — sabitler config'de) hesaplanır ve gösterilir.

### 2. Skorlama (Nitelik)

Her işletme için 0–100 arası bir **Lead Skoru** hesaplanır. Saf fonksiyon, birim testli,
`lib/scoring.ts`:

| Sinyal | Puan | Mantık |
|---|---|---|
| `userRatingCount` | 0–30 | 0→0, 20→15, 50→25, 100+→30 (logaritmik) |
| `rating` | 0–20 | <3.5→0, 3.5–4.0→10, 4.0–4.5→15, ≥4.5→20 |
| Fotoğraf sayısı | 0–15 | 0→0, 1–2→5, 3–4→10, 5+→15 |
| Telefon var | 0/15 | Ulaşılabilirlik olmadan lead değersiz |
| Son yorum tarihi | 0–10 | ≤30 gün→10, ≤90→6, ≤180→3, sonrası 0 |
| Kategori bonusu | 0–10 | Config'de listelenen "site ihtiyacı yüksek" kategoriler (restoran, klinik, güzellik, emlak, otel, avukat, mimar) → 10; diğer → 0 |

Skor bantları: **80+ Sıcak**, **50–79 Ilık**, **<50 Soğuk**. Tabloda renkli rozet.

### 3. İşletme listesi (ana ekran)

Tablo — sütunlar sırasıyla:

1. **Fotoğraf** (küçük kare thumbnail, ilk fotoğraf; yoksa baş harf avatarı)
2. **İşletme adı** (tıkla → detay)
3. **Kategori** (`primaryType`, Türkçeleştirilmiş etiket; eşleşme yoksa ham değer)
4. **Şehir**
5. **Telefon** (tıkla → kopyala; yanında WhatsApp ikonu → `wa.me/<E164>` yeni sekme)
6. **E-posta** (Google vermez; kullanıcı elle girer — inline düzenlenebilir hücre)
7. **Puan / Yorum** ("4.6 · 87")
8. **Lead Skoru** (rozet)
9. **Durum** (dropdown, inline değiştirilebilir)
10. **Son temas** (tarih)

Filtreler (URL query'de tutulur, paylaşılabilir): şehir, kategori, durum, skor bandı,
metin arama (ad/telefon). Sıralama: skor (varsayılan, azalan), yorum sayısı, eklenme tarihi.

Toplu işlemler: seçilenleri **Excel'e aktar**, seçilenlerin durumunu değiştir.

### 4. İşletme detayı

Sağdan açılan panel (sheet) veya `/businesses/[id]` sayfası — ikisi de olur, sheet tercih:

- Fotoğraf galerisi (5 fotoğraf, büyük)
- Ad, adres, telefon (kopyala + WhatsApp + Ara), e-posta (düzenlenebilir), Google Maps linki
- Puan, yorum sayısı, çalışma saatleri
- En iyi 5 yorum (yazar, puan, metin, tarih)
- Lead skoru **kırılımıyla** (hangi sinyal kaç puan verdi)
- **Durum** ve **durum geçmişi** (kim değil — tek kullanıcı — ama ne zaman)
- **Notlar** (serbest metin, çoklu, tarih damgalı)
- **Mesaj şablonu** butonu: seçilen şablonu işletme verisiyle doldurur
  (`{{isletme}}`, `{{sehir}}`, `{{puan}}`, `{{yorumSayisi}}`), panoya kopyalar ve
  isteğe bağlı `wa.me/<tel>?text=<encoded>` ile WhatsApp'ı açar. Kopyalandığında
  durum otomatik `CONTACTED` olur ve `lastContactedAt` güncellenir (kullanıcı geri alabilir).

### 5. Satış süreci (pipeline)

Durumlar ve izinli geçişler:

```
NEW → QUALIFIED → CONTACTED → REPLIED → MEETING → WON
                     ↓           ↓         ↓
                    LOST        LOST      LOST
NEW/QUALIFIED → SKIPPED   (ilgisiz/kapalı/zaten sitesi var)
```

Her geçiş `StatusChange` tablosuna yazılır. Dashboard bu tablodan beslenir.

### 6. Dashboard (`/`)

Kartlar: Toplam işletme · Sıcak lead sayısı · Bu hafta temas · Cevap oranı
(REPLIED+MEETING+WON / CONTACTED) · Kazanılan · Toplam API maliyeti (tahmini).
Altında: pipeline funnel (durum başına sayı, yatay bar) ve son 10 arama işi tablosu.

### 7. Excel export

`GET /api/export?<aynı filtreler>` → `.xlsx`. Sütunlar: İşletme, Kategori, Şehir, Adres,
Telefon, E-posta, Puan, Yorum Sayısı, Lead Skoru, Durum, Son Temas, Google Maps URL,
Fotoğraf 1 URL, Notlar (birleştirilmiş). Başlık satırı kalın, sütun genişlikleri ayarlı,
telefon sütunu metin formatında (Excel'in `+90…`'ı sayıya çevirmesini engelle).

### 8. Ayarlar (`/settings`)

- Şehir listesi (ekle/sil) — `Setting` tablosunda JSON
- Kategori bonus listesi
- Mesaj şablonları (CRUD; en az 2 hazır şablon seed'lenir: "İlk temas — WhatsApp",
  "İlk temas — E-posta")
- Places API anahtarı **burada gösterilmez, girilmez** — sadece env'den okunur;
  panelde "anahtar tanımlı ✓ / tanımlı değil ✗" gösterilir

---

## Kapsam — MVP'de OLMAYACAKLAR

Bunları **yapma**, önerme de:

- Otomatik mesaj gönderimi (WhatsApp API, SMS, SMTP toplu gönderim)
- Önizleme web sitesi üretimi
- Çoklu kullanıcı, roller, ekip
- Instagram / Yandex / başka kaynaklar
- Fotoğraf indirme / S3
- Redis, BullMQ, Docker (docker-compose dosyası yazma — SQLite yeterli)
- i18n altyapısı — arayüz sadece Türkçe, metinler `lib/tr.ts`'de tek dosyada

---

## Veri modeli (Prisma)

```prisma
model Business {
  id                  String   @id @default(cuid())
  placeId             String   @unique
  name                String
  primaryType         String?
  types               String   // JSON string[]
  address             String?
  city                String
  phone               String?  // national format, görüntüleme için
  phoneE164           String?  // wa.me için
  email               String?  // elle girilir
  rating              Float?
  userRatingCount     Int?
  photos              String   // JSON: { name: string, url: string }[]
  reviews             String   // JSON: { author, rating, text, publishTime }[]
  openingHours        String?  // JSON string[] (weekdayDescriptions)
  googleMapsUri       String?
  lat                 Float?
  lng                 Float?
  score               Int      @default(0)
  scoreBreakdown      String   // JSON: { signal: string, points: number }[]
  status              String   @default("NEW")
  lastContactedAt     DateTime?
  firstSeenAt         DateTime @default(now())
  lastSyncedAt        DateTime @default(now())
  searchJobId         String?
  searchJob           SearchJob? @relation(fields: [searchJobId], references: [id])
  notes               Note[]
  statusChanges       StatusChange[]

  @@index([city, status])
  @@index([score])
}

model SearchJob {
  id              String   @id @default(cuid())
  query           String
  city            String
  status          String   @default("RUNNING") // RUNNING | DONE | FAILED
  scanned         Int      @default(0)
  withoutWebsite  Int      @default(0)
  saved           Int      @default(0)
  estimatedCost   Float    @default(0)
  error           String?
  startedAt       DateTime @default(now())
  finishedAt      DateTime?
  businesses      Business[]
}

model Note {
  id          String   @id @default(cuid())
  businessId  String
  business    Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  body        String
  createdAt   DateTime @default(now())
}

model StatusChange {
  id          String   @id @default(cuid())
  businessId  String
  business    Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  from        String
  to          String
  createdAt   DateTime @default(now())
}

model MessageTemplate {
  id        String   @id @default(cuid())
  name      String
  channel   String   // WHATSAPP | EMAIL
  body      String
  createdAt DateTime @default(now())
}

model Setting {
  key   String @id
  value String // JSON
}
```

`status` için Prisma enum yerine string + TypeScript `const` union kullan (SQLite enum
desteklemiyor, geçişte sürpriz olmasın).

---

## API yüzeyi (Route Handlers)

| Method | Path | İş |
|---|---|---|
| POST | `/api/auth/login` | `{ password }` → cookie |
| POST | `/api/auth/logout` | |
| POST | `/api/search` | `{ query, city }` → `SearchJob` oluştur, işi başlat, `{ jobId }` döndür |
| GET | `/api/search/[jobId]/stream` | SSE: `{ scanned, withoutWebsite, saved, done, error? }` |
| GET | `/api/search` | Son iş listesi |
| GET | `/api/businesses` | Filtre + sıralama + sayfalama (`?city=&status=&band=&q=&sort=&page=`) |
| GET | `/api/businesses/[id]` | Detay (notlar + geçmiş dahil) |
| PATCH | `/api/businesses/[id]` | `{ email?, status?, phone? }` — status değişirse `StatusChange` yaz |
| POST | `/api/businesses/[id]/notes` | `{ body }` |
| POST | `/api/businesses/bulk-status` | `{ ids: string[], status }` |
| GET | `/api/export` | Aynı filtreler → xlsx stream |
| GET/PUT | `/api/settings/[key]` | |
| GET/POST/PUT/DELETE | `/api/templates`, `/api/templates/[id]` | |
| GET | `/api/dashboard` | Kart ve funnel verisi |

Response şekli: `{ data, meta? }`; hata: `{ error: { statusCode, code, message } }`.
Tüm body'ler **zod** ile doğrulanır. Tüm `/api/*` (login hariç) middleware'de cookie kontrolü.

---

## Places API entegrasyonu — dikkat noktaları

- `lib/places.ts` tek dosya; `searchText(query, pageToken?)` ve `getDetails(placeId)`
  fonksiyonları. `X-Goog-FieldMask` header'ını **kesin** kullan — maskesiz çağrı en pahalı
  SKU'dan faturalanır.
- Text Search field mask: `places.id,places.displayName,places.websiteUri,places.businessStatus,nextPageToken`
  → sitesi olanları **detay çağırmadan** eleyebilmek için. Details sadece sitesizlere.
- Rate limit / 429 → exponential backoff (3 deneme), sonra job `FAILED` + hata mesajı.
- API anahtarı yoksa `/api/search` `503` ve panelde net uyarı; uygulama çökmez.
- Fotoğraf URL'si: `https://places.googleapis.com/v1/{photo.name}/media?maxWidthPx=800&key=…`
  — **anahtarı client'a sızdırma**: `/api/photo?name=…` proxy route'u yaz, redirect ile
  servis et.
- Test için `PLACES_MOCK=1` env'i: `lib/places.mock.ts` sabit 15 işletmelik fixture döner.
  Playwright ve seed bununla çalışır.

---

## Yasal ve etik sınırlar (koda gömülü)

- Toplu otomatik gönderim yok — kullanıcı her mesajı kendi eliyle gönderir.
- Her mesaj şablonunun sonunda opt-out cümlesi zorunlu; şablon kaydında bu cümle yoksa
  form uyarı verir (engellemez).
- `SKIPPED` veya `LOST` durumundaki işletme yeniden `CONTACTED` yapılmak istenirse
  onay diyaloğu: "Bu işletme daha önce reddetti / atlandı. Yine de temas mı?"
- Google verisi 30 günden eskiyse tabloda "veri eski" işareti; detayda "Yenile" butonu
  tek işletme için Details çağırır (ToS cache sınırı).
- README'de KKTC / Türkiye (İYS) / GDPR notu.

---

## Proje yapısı

```
lead-radar/
├─ app/
│  ├─ (auth)/login/page.tsx
│  ├─ (panel)/layout.tsx          # sidebar: Dashboard, İşletmeler, Aramalar, Ayarlar
│  ├─ (panel)/page.tsx            # dashboard
│  ├─ (panel)/businesses/page.tsx
│  ├─ (panel)/searches/page.tsx
│  ├─ (panel)/settings/page.tsx
│  └─ api/...                     # yukarıdaki route handler'lar
├─ components/
│  ├─ ui/                         # shadcn
│  ├─ business-table.tsx
│  ├─ business-sheet.tsx
│  ├─ search-form.tsx
│  ├─ score-badge.tsx
│  └─ status-select.tsx
├─ lib/
│  ├─ db.ts                       # prisma client singleton
│  ├─ places.ts / places.mock.ts
│  ├─ scoring.ts                  # saf, testli
│  ├─ export.ts                   # exceljs
│  ├─ status.ts                   # durum makinesi + geçiş kuralları
│  ├─ templates.ts                # {{}} doldurma
│  ├─ phone.ts                    # E.164 normalize (libphonenumber-js)
│  ├─ auth.ts
│  ├─ config.ts                   # şehirler, kategori bonusları, maliyet sabitleri (varsayılanlar)
│  └─ tr.ts                       # tüm arayüz metinleri
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts                     # 2 şablon + KKTC şehirleri + (mock modda) 15 işletme
├─ tests/
│  ├─ scoring.test.ts
│  ├─ status.test.ts
│  ├─ export.test.ts
│  └─ e2e/smoke.spec.ts
├─ .env.example
├─ README.md
└─ lead-*/                        # proje meta dizinleri (dokunma)
```

---

## Orkestrasyon ve model dağılımı

Sen **orchestrator**sın (ana oturum, Fable). Kendin yapacağın işler: paket kurulumu
(`pnpm add`, `npx shadcn add`), dizin yapısı, task sıralama, agent çıktılarının review'u,
çakışma çözümü, son typecheck/lint/test. Gerisini `.claude/agents/` altındaki agent'lara
devret — modelleri frontmatter'da sabit:

| Agent | Model | Devredilecek işler |
|---|---|---|
| `backend` | opus | TASK-103 (auth API), 104, 105, 106 (API tarafı), 108 |
| `frontend` | sonnet | TASK-103 (login sayfası), 106 (tablo), 107, 109, 110 (UI) |
| `database` | sonnet | TASK-102 |
| `devops` | haiku | TASK-101 config dosyaları, CI |
| `docs` | haiku | task-index/CHANGELOG güncellemeleri, TASK-111 README |

Kurallar (`lead-config/agent-instructions.md`):
- Her agent'a prompt'ta **scope dizinini** ve bu dosyadaki **ilgili bölüm numarasını (§)** ver.
- Bağımsız task'ları paralel çalıştır (`phase-1.md`'deki gruplar); paylaşılan `lib/tr.ts` için
  read-edit-retry.
- Tek dosyalık ufak işi devretme, kendin yap.
- Devrettiğinde kullanıcıya hangi agent'a / modele verdiğini söyle.

## Çalışma sırası

Şu sırayla ilerle; her adımın sonunda `pnpm typecheck && pnpm lint && pnpm test` yeşil olmalı
ve `lead-tasks/task-index.md`'deki ilgili task `COMPLETED`'a çekilmeli
(detaylı acceptance criteria: `lead-tasks/phases/phase-1.md`):

1. **TASK-101** Next.js + Tailwind + shadcn + Prisma + Vitest + Playwright iskeleti, `.env.example`, `pnpm dev` çalışıyor
2. **TASK-102** Prisma şema + migrate + seed (şablonlar, şehirler)
3. **TASK-103** Auth (login sayfası, middleware, cookie)
4. **TASK-104** `lib/scoring.ts` + `lib/status.ts` + `lib/phone.ts` — **önce testler**
5. **TASK-105** `lib/places.ts` + mock + `/api/search` + SSE + `SearchJob`
6. **TASK-106** `/api/businesses*` + tablo ekranı (filtre, sıralama, inline e-posta/durum)
7. **TASK-107** Detay sheet (galeri, yorumlar, skor kırılımı, notlar, şablon kopyala → WhatsApp)
8. **TASK-108** Excel export
9. **TASK-109** Dashboard
10. **TASK-110** Ayarlar (şehirler, bonus kategoriler, şablon CRUD)
11. **TASK-111** Playwright smoke + README'yi gerçek kurulum adımlarıyla güncelle

Her task için `feat(TASK-1XX): …` commit'i at. Commit mesajlarına **hiçbir attribution
satırı ekleme** (Co-Authored-By vb. yok).

---

## Bitti sayılma kriteri (Definition of Done)

- [ ] `PLACES_MOCK=1 pnpm dev` ile anahtar olmadan tüm panel gezilebiliyor, 15 mock işletme görünüyor
- [ ] Gerçek anahtarla "berber / Lefkoşa" araması ≤ 60 saniyede bitiyor, SSE ilerleme akıyor, sitesizler tabloya düşüyor
- [ ] Tabloda fotoğraf, telefon (kopyala + WhatsApp), e-posta (inline), skor rozeti, durum dropdown çalışıyor
- [ ] Detayda şablon "Kopyala ve WhatsApp'ı aç" → durum `CONTACTED`, `StatusChange` yazılmış
- [ ] Filtreli Excel export açılıyor, telefon sütunu metin
- [ ] Dashboard sayıları veritabanıyla tutarlı
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e` yeşil
- [ ] README: ne, neden, kurulum, `.env` alanları, Places API anahtarı alma adımları, maliyet notu, yasal not, yol haritası
- [ ] API anahtarı hiçbir client bundle'ında yok (`grep -r "AIza" .next/static` boş)

---

## Sonraki fazlar (bilgi amaçlı — şimdi yapma)

- **Phase 2 — Önizleme site üretimi:** Maps verisi + fotoğraf + yorumlardan tek şablonlu
  landing page (`<slug>.preview.pitonstudios.com`), Claude ile metin üretimi, tıklama takibi.
  Mesaj "size site yaptık, bakın" formatına döner.
- **Phase 3 — Kanal otomasyonu:** WhatsApp Business API (onaylı template), SMTP e-posta,
  İYS entegrasyonu (Türkiye). Onay kuyruğu: bot hazırlar, insan 1 tıkla gönderir.
- **Phase 4 — Ürünleştirme:** Multi-tenant, Postgres, Stripe, bölge bazlı abonelik;
  diğer ajanslara SaaS.
