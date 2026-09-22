# Project Memory

## Project Info
- Lead Radar: websitesiz işletmeleri Google Places'tan bulan, skorlayan ve satış sürecini yöneten panel. İlk pazar KKTC, ilk kullanıcı Piton Studios.

## Project Status
- **Phase 0**: 4/7 — meta dizinler, agent'lar, CLAUDE.md hazır; Next.js iskeleti (TASK-101) ve ilk push (TASK-007) bekliyor
- **Phase 1**: 0/11 — spesifikasyon `lead-plans/PROMPT.md`'de hazır, inşa başlamadı

## Important Patterns
- Places Text Search'te field mask sadece `id, displayName, websiteUri, businessStatus, nextPageToken`; Details yalnız sitesizlere → maliyet ~%60 düşer
- API anahtarı client'a asla; fotoğraf `/api/photo?name=` proxy (302)
- Durumlar string union (`lib/status.ts`), Prisma enum değil (SQLite)
- Arayüz metinleri tek dosya `lib/tr.ts`; frontend ve backend ikisi de ekler → read-edit-retry
- KKTC telefon: `+90 392 …` — `lib/phone.ts` `toE164` KKTC'yi TR ülke koduyla normalize eder

## Known Issues / Gotchas
- Places Text Search sorgu başına max 60 sonuç (3 sayfa × 20). Daha fazlası için sorguyu bölge/kategori alt kırılımına böl
- Google e-posta vermez → `email` alanı elle girilir

## Working Credentials (Dev)
- `ADMIN_PASSWORD` → `.env`'de; `PLACES_MOCK=1` ile anahtar gerekmez

> Kurallar: session başında oku; gotcha/pattern keşfedilince anında güncelle;
> yanlış/eski bilgiyi sil; kısa tut. Mimari kararlar buraya DEĞİL → DECISIONS.md.
