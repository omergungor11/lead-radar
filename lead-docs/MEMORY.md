# Project Memory

## Project Info
- Lead Radar: websitesiz işletmeleri Google Places'tan bulan, skorlayan ve satış sürecini yöneten panel. İlk pazar KKTC, ilk kullanıcı Piton Studios.

## Project Status
- **Phase 0**: 7/7 ✓
- **Phase 1**: 1/11 — TASK-101 iskelet bitti; sıradaki TASK-102 (şema) ∥ TASK-103 (auth)

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
- `app/page.tsx` geçici; TASK-109'da `(panel)/page.tsx` gelince silinmeli (aynı `/` rotası çakışır)

## Working Credentials (Dev)
- `ADMIN_PASSWORD` → `.env`'de; `PLACES_MOCK=1` ile anahtar gerekmez

> Kurallar: session başında oku; gotcha/pattern keşfedilince anında güncelle;
> yanlış/eski bilgiyi sil; kısa tut. Mimari kararlar buraya DEĞİL → DECISIONS.md.
