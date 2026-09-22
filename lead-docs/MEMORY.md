# Project Memory

## Project Info
- Lead Radar: websitesiz işletmeleri Google Places'tan bulan, skorlayan ve satış sürecini yöneten panel. İlk pazar KKTC, ilk kullanıcı Piton Studios.

## Project Status
- **Phase 0**: 7/7 ✓
- **Phase 1**: 11/11 ✓ — MVP tamam. Açık: gerçek Places anahtarıyla "berber / Lefkoşa" doğrulaması (kullanıcı)

## Important Patterns
- Places Text Search'te field mask sadece `id, displayName, websiteUri, businessStatus, nextPageToken`; Details yalnız sitesizlere → maliyet ~%60 düşer
- API anahtarı client'a asla; fotoğraf `/api/photo?name=` proxy (302)
- Durumlar string union (`lib/status.ts`), Prisma enum değil (SQLite)
- Arayüz metinleri tek dosya `lib/tr.ts`; frontend ve backend ikisi de ekler → read-edit-retry
- KKTC telefon: `+90 392 …` — `lib/phone.ts` `toE164` KKTC'yi TR ülke koduyla normalize eder

## Known Issues / Gotchas
- Places Text Search sorgu başına max 60 sonuç (3 sayfa × 20). Daha fazlası için sorguyu bölge/kategori alt kırılımına böl
- Google e-posta vermez → `email` alanı elle girilir
- pnpm 10 build script'lerini bloklar → yeni native paket eklenirse `package.json` `pnpm.onlyBuiltDependencies`'e ekle
- `prisma init` `prisma.config.ts` üretir → silindi; varken `package.json#prisma.seed` ve `.env` otomatik yükleme çalışmaz
- Port 3000 başka projelerin dev server'ıyla dolu olabilir → e2e: `E2E_PORT=3100 pnpm test:e2e` (yoksa Playwright yabancı sunucuyu yeniden kullanır)
- zod **v4** kurulu (v3 değil): `z.email()`, `z.string().min(1, { error })`
- `prisma init` kendi `.env`'sini yazar (sadece DATABASE_URL) → ADMIN_PASSWORD/SESSION_SECRET eksik kalır, instrumentation açılışta durdurur. Çözüm: `.env`'yi `.env.example`'dan üret
- Seed şablon/ayarları `update: {}` ile upsert eder — kullanıcı düzenlemelerini ezmez; şablon metni değişirse DB'de elle güncelle
- Şablon metinlerinde şehir eki kullanma (`{{sehir}}'de` → "Lefkoşa'de"); "{{sehir}} bölgesinde" nötr. WhatsApp şablonunda paragraf içi satır kırma yok
- API route'ları `lib/api.ts` (`ok`, `apiError`, `validationError`, `readJson`) kullanır; env `lib/env.ts#getServerEnv()`
- Middleware edge'de → `lib/auth.ts` sadece Web Crypto; Node `crypto` import etme
- Açık risk: login'de rate limit yok, oturum iptali yok (SESSION_SECRET değiştir = herkes düşer). İnternete açmadan önce ele al
- Durum geçişleri: NEW→CONTACTED izinli (şablon kopyala akışı); LOST/SKIPPED→CONTACTED izinli ama `requiresConfirmation` true. "Geri al" (CONTACTED→NEW) `canTransition`'da YOK → TASK-107'de PATCH'e ayrı undo yolu (son StatusChange'i geri al) gerekir
- Client component'ler `lib/settings.ts` / `lib/message-templates.ts`'i (Prisma) import etmez; tipler `import type` ile veya client-safe `lib/templates.ts`'ten
- Font değişkenleri `<html>`'de olmalı (globals.css `html { font-sans }`); body'ye koyarsan serif fallback
- Mock Places şehre göre filtreler: sorgu fixture şehri içeriyorsa o şehrin 3 işletmesi + 5 elenen (8 tarandı / 3 sitesiz / 3 kaydedildi); yoksa 20 kaydın hepsi. Mock çağrılarında 80 ms yapay gecikme (UI ilerlemesi görünsün)
- Arama işi sunucu sürecinde koşar → **tek instance** şart. Sunucu yeniden başlarsa RUNNING iş, stream açılınca `FAILED (searchInterrupted)` olur
- İlerleme her 5 *taranan*da + sonda DB'ye yazılır, sonra SSE'ye yayınlanır (done sonrası refetch DONE görür)
- `prisma migrate reset` AI agent'tan çalıştırılınca Prisma açık kullanıcı onayı ister (`PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION`) — sessizce başarısız olur; bypass etme, kullanıcıya sor. `migrate deploy` serbest
- E2E izole: `playwright.config.ts` webServer'a `DATABASE_URL=file:./e2e.db`, sabit şifre, mock verir; `reuseExistingServer: false`
- Places Photos ücretli ve arama maliyetine dahil değil: gerçek modda tablo sayfası başına ≤50 thumbnail çağrısı (tarayıcı 302'yi 1 saat önbellekler). Maliyet artarsa thumbnail'ı kapat / lazy
- Toast aksiyonları modal Sheet üstünde: `Toaster className="pointer-events-auto"` + Sheet `onInteractOutside` toaster'ı yok sayar
- API istemcisi tek: `components/api-client.ts` (`apiFetch`, `apiFetchWithMeta`, `ApiRequestError` code taşır)
- Ortak DTO sözleşmesi `lib/types.ts` (client-safe) — agent'lar değiştirmez, orchestrator değiştirir
- Tarayıcı doğrulaması: `pnpm dev --port 3200` + Playwright script (şifre `.env`'den), sonra süreci kapat

## Working Credentials (Dev)
- `ADMIN_PASSWORD` → `.env`'de; `PLACES_MOCK=1` ile anahtar gerekmez

> Kurallar: session başında oku; gotcha/pattern keşfedilince anında güncelle;
> yanlış/eski bilgiyi sil; kısa tut. Mimari kararlar buraya DEĞİL → DECISIONS.md.
