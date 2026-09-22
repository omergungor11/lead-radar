# Phase 1: MVP — Panel + Places + Pipeline

> Tüm kararlar ve detaylar `lead-plans/PROMPT.md`'de. Bu dosya task'lara böler ve
> acceptance criteria'yı sabitler. Bölüm numaraları (§) PROMPT.md'ye referans.

## TASK-101: Proje iskeleti

**Agent**: orchestrator (paket kurulumu) + devops (config)
**Complexity**: M
**Status**: COMPLETED
**Dependencies**: TASK-007

### Açıklama
`create-next-app` ile Next.js 15 (App Router, TS, Tailwind, ESLint) kur; shadcn init; Prisma init
(SQLite); Vitest + Playwright; `package.json` script'leri; `.env.example`; GitHub Actions CI iskeleti.

### Acceptance Criteria
- [x] `pnpm dev` 3000'de açılıyor
- [x] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` yeşil (boş testle)
- [x] `.env.example`: `DATABASE_URL`, `ADMIN_PASSWORD`, `GOOGLE_PLACES_API_KEY`, `PLACES_MOCK`, `SESSION_SECRET`
- [x] Script'ler: `dev build start typecheck lint test test:e2e db:migrate db:seed db:studio`
- [x] `.github/workflows/ci.yml`: typecheck + lint + test
- [x] `lead-config/tech-stack.md`'ye gerçek versiyonlar yazıldı
- [x] TASK-001 ve TASK-006 COMPLETED'a çekildi

---

## TASK-102: Prisma şema + seed

**Agent**: database
**Complexity**: M
**Status**: COMPLETED
**Dependencies**: TASK-101

### Açıklama
PROMPT.md "Veri modeli" bölümündeki şemayı birebir uygula. Seed: 2 mesaj şablonu, KKTC şehirleri
(`Setting.cities`), bonus kategori listesi (`Setting.bonusCategories`); `PLACES_MOCK=1` iken 15 mock işletme → **TASK-105'e ertelendi** (fixture + skorlama gerekiyor; seed.ts'de yer tutucu yorum var).

### Acceptance Criteria
- [x] `pnpm db:migrate` temiz DB'de çalışıyor
- [x] `pnpm db:seed` idempotent (2× çalıştır, kayıt sayısı değişmez)
- [x] `lib/db.ts` singleton
- [x] Şablon body'lerinde opt-out cümlesi var

---

## TASK-103: Auth

**Agent**: backend (`lib/auth.ts`, `middleware.ts`, `/api/auth/*`) + frontend (`/login`)
**Complexity**: S
**Status**: COMPLETED
**Dependencies**: TASK-101

### Acceptance Criteria
- [x] Yanlış şifre → 401, doğru → httpOnly + SameSite=Lax cookie (HMAC imzalı, `SESSION_SECRET`)
- [x] `/api/*` (login hariç) ve panel sayfaları cookie'siz → 401 / `/login` redirect
- [x] `ADMIN_PASSWORD` tanımsızsa uygulama açılışta net hata verir

---

## TASK-104: Skorlama + durum makinesi + telefon

**Agent**: backend
**Complexity**: M
**Status**: COMPLETED
**Dependencies**: TASK-102

### Açıklama
§2 skor tablosu → `lib/scoring.ts` (`computeScore(input): { score, breakdown }`).
§5 durum geçişleri → `lib/status.ts` (`canTransition(from, to)`, `STATUSES`, bant hesaplama).
`lib/phone.ts` → `toE164(national, countryHint)` (KKTC `+90 392`, TR `+90`).

### Acceptance Criteria
- [x] Testler implementasyondan önce yazıldı; her sinyal için sınır değer testi var
- [x] `computeScore` saf, DB'ye dokunmaz
- [x] Geçersiz geçiş (`WON → NEW`) `false`
- [x] `0392 228 12 34` → `+903922281234`

---

## TASK-105: Places entegrasyonu + arama işi

**Agent**: backend
**Complexity**: L
**Status**: PENDING
**Dependencies**: TASK-104

### Açıklama
§1 ve "Places API entegrasyonu" bölümü. `lib/places.ts`, `lib/places.mock.ts`, `POST /api/search`,
`GET /api/search/[jobId]/stream` (SSE), `GET /api/search`, `GET /api/photo` proxy.

### Acceptance Criteria
- [ ] Text Search field mask sadece 5 alan; Details sadece `websiteUri` boş olanlara
- [ ] Sitesi olan / OPERATIONAL olmayan kaydedilmez, sayaçlara yazılır
- [ ] Upsert: mevcut `status`, `email`, notlar korunur
- [ ] SSE her 5 işletmede bir ilerleme yayar; hata → `FAILED` + mesaj
- [ ] `estimatedCost` hesaplanıyor
- [ ] Anahtar yok + mock kapalı → 503, uygulama çökmez
- [ ] `/api/photo?name=…` → 302 Google URL (anahtar server'da)

---

## TASK-106: İşletme API + tablo ekranı

**Agent**: backend (`/api/businesses*`) ‖ frontend (`components/business-table.tsx`, `/businesses`)
**Complexity**: L
**Status**: PENDING
**Dependencies**: TASK-104 (frontend mock veriyle TASK-105 beklemeden başlayabilir)

### Acceptance Criteria
- [ ] §3'teki 10 sütun sırasıyla; fotoğraf yoksa baş harf avatarı
- [ ] Filtreler URL query'de; sayfa yenilenince korunur
- [ ] Telefon tıkla → kopyala + toast; WhatsApp ikonu → `wa.me/<E164>` yeni sekme
- [ ] E-posta hücresi inline düzenlenir, blur'da PATCH
- [ ] Durum dropdown sadece izinli geçişleri gösterir; SKIPPED/LOST → CONTACTED onay diyaloğu
- [ ] Toplu seçim → Excel'e aktar (TASK-108'e bağlanır) / durum değiştir
- [ ] 30 günden eski `lastSyncedAt` → "veri eski" işareti

---

## TASK-107: Detay sheet

**Agent**: frontend (`components/business-sheet.tsx`) + backend (`/api/businesses/[id]/notes`, template doldurma)
**Complexity**: L
**Status**: PENDING
**Dependencies**: TASK-106

### Acceptance Criteria
- [ ] §4'teki tüm bloklar: galeri, iletişim, puan/saatler, 5 yorum, skor kırılımı, durum geçmişi, notlar
- [ ] Şablon seç → `{{}}` dolduruldu → "Kopyala" ve "Kopyala + WhatsApp'ı aç"
- [ ] Kopyalama sonrası durum otomatik CONTACTED, `lastContactedAt` güncel, `StatusChange` yazıldı; "Geri al" toast'u
- [ ] "Yenile" butonu tek işletme için Details çağırır, `lastSyncedAt` güncellenir

---

## TASK-108: Excel export

**Agent**: backend
**Complexity**: S
**Status**: PENDING
**Dependencies**: TASK-106

### Acceptance Criteria
- [ ] `GET /api/export?<filtreler>` → `lead-radar-<tarih>.xlsx`
- [ ] §7'deki 14 sütun; başlık kalın; telefon sütunu metin
- [ ] Notlar `" | "` ile birleştirilmiş
- [ ] Vitest: 3 işletmelik fixture → workbook parse → hücre değerleri doğru

---

## TASK-109: Dashboard

**Agent**: frontend + backend (`/api/dashboard`)
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-105, TASK-106

### Acceptance Criteria
- [ ] §6'daki 6 kart + funnel + son 10 arama tablosu
- [ ] Cevap oranı = (REPLIED+MEETING+WON) / CONTACTED, CONTACTED=0 iken "—"
- [ ] Sayılar DB ile tutarlı (test: seed sonrası bilinen değerler)

---

## TASK-110: Ayarlar

**Agent**: frontend + backend (`/api/settings/[key]`, `/api/templates*`)
**Complexity**: M
**Status**: COMPLETED
**Dependencies**: TASK-102

### Acceptance Criteria
- [x] Şehir ekle/sil → arama formu dropdown'u anında güncellenir (paylaşılan `["settings"]` query key; arama formu TASK-105'te bu key'i kullanmalı)
- [x] Bonus kategori listesi düzenlenir; mevcut işletmelerin skoru "Yeniden hesapla" ile güncellenir
- [x] Şablon CRUD; opt-out cümlesi yoksa uyarı (engellemez)
- [x] API anahtarı gösterilmez; "tanımlı ✓ / ✗" durumu

---

## TASK-111: Smoke test + README + DoD

**Agent**: frontend (Playwright) + docs (README)
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-101..110

### Acceptance Criteria
- [ ] `PLACES_MOCK=1` ile Playwright: login → arama → tabloda 15 satır → detay aç → şablon kopyala → export indir
- [ ] README: kurulum, `.env`, Places anahtarı alma (Cloud Console adımları), maliyet tablosu, yasal not, yol haritası
- [ ] PROMPT.md "Definition of Done" listesindeki her madde işaretli
- [ ] `grep -r "AIza" .next/static` boş
