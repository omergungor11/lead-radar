# Architecture Decisions (ADR-lite)

> Her mimari/teknolojik karar buraya. En yeni en üstte.

## D-007: Türkiye'nin 81 ili varsayılan şehir listesinde — 2026-09-22

**Karar**: `DEFAULT_CITIES` = 6 KKTC şehri + 81 il (`lib/config.ts`: `KKTC_CITIES`, `TURKEY_PROVINCES`). Şehir seçici aranabilir ve KKTC / Türkiye / Diğer gruplu (`components/city-combobox.tsx`).
**Gerekçe**: Kullanıcı: KKTC'de işletme sayısı az; Türkiye pazarı hemen gerekli.
**Alternatifler**: İl + ilçe hiyerarşisi (~970 ilçe) — şimdilik yok; büyük illerde 60 sonuç sınırı için kullanıcı kategoriye ilçe yazar ("berber Kadıköy").
**Güncelleme (aynı gün)**: İlçe desteği — `lib/districts.ts` (973 ilçe; turkey-neighbourhoods@4.0.3, MIT, bir kerelik üretildi, runtime bağımlılığı yok), `SearchJob.district` / `Business.district` (nullable). Sorgu `<kategori> <ilçe> <il>`; Merkez ilçesi `<kategori> <il> merkez`. İşletmenin ilçesi ilk bulunduğu ilçe araması; sonraki aramalar yalnız boşsa doldurur.
**Etki**: `SETTING_MAX_ITEMS` 100 → 300. Mevcut DB'lerde seed ayarı ezmez → liste bir kerelik birleştirildi. Mock fixture yalnız KKTC; Türkiye aramaları gerçek anahtar ister.

## D-006: Orchestrator Fable, alt agent'lar opus/sonnet/haiku — 2026-09-22

**Karar**: Ana oturum Fable; backend=opus, frontend/database=sonnet, devops/docs=haiku (`.claude/agents/*.md` frontmatter).
**Gerekçe**: Mimari karar ve review en pahalı modelde kalsın; mekanik iş ucuz modele. Haiku $1/$5 vs Fable $5/$25.
**Alternatifler**: Hepsi tek model — maliyet 5×; hepsi haiku — Places/SSE gibi hata riski yüksek işte kalite düşer.
**Etki**: `lead-config/agent-instructions.md` §0. Agent modeli değişirse sadece frontmatter.

## D-005: Otomatik mesaj gönderimi yok (MVP) — 2026-09-22

**Karar**: Panel `wa.me` linki + panoya kopyalanan şablon üretir; gönderimi kullanıcı yapar.
**Gerekçe**: WhatsApp Business API onayı + İYS kaydı MVP'yi haftalarca geciktirir; kişisel hesaptan toplu gönderim ban riski. Günde 10–20 kişiselleştirilmiş mesaj zaten elle yapılabilir hacim.
**Alternatifler**: WhatsApp Business API (Phase 3), SMTP toplu e-posta (e-posta adresi Google'dan gelmiyor, veri yok).
**Etki**: Phase 3'te `MessageTemplate.channel` ve `StatusChange` modeli değişmeden gönderim katmanı eklenir.

## D-004: Arka plan iş kuyruğu yok, SSE ile senkron arama — 2026-09-22

**Karar**: `/api/search` Route Handler içinde çalışır, ilerleme SSE ile akar.
**Gerekçe**: Tek kullanıcı, sorgu başına ≤ 60 sonuç, ≤ 60 sn. Redis + BullMQ + worker process = 3 ekstra bileşen, sıfır ek değer.
**Alternatifler**: BullMQ (rep-cyprus'ta var, kopyalanabilirdi) — Phase 4 multi-tenant'ta gerekirse.
**Etki**: Serverless deploy'da (Vercel) 60 sn fonksiyon limiti sorun olabilir → VPS tercih.

## D-003: SQLite + Prisma — 2026-09-22

**Karar**: `prisma/dev.db`, enum yerine string union, JSON yerine `String`.
**Gerekçe**: Tek kullanıcı, lokal çalışma, Docker gerekmez, `pnpm dev` yeter.
**Alternatifler**: Postgres (Docker şart, MVP için fazla); Turso/LibSQL (Vercel deploy için sonra).
**Etki**: Postgres geçişi `provider` değişimi + migration reset; SQLite'a özel hiçbir şey yazılmaz.

## D-002: Google Places API (New), scraping yok — 2026-09-22

**Karar**: Tek veri kaynağı Places API; `websiteUri` boş olanlar hedef. Fotoğraf indirilmez, proxy'den servis edilir.
**Gerekçe**: Scraping ToS ihlali + kırılgan; Places `websiteUri` alanı tam olarak ihtiyacı karşılıyor. Field mask ile maliyet kontrol edilebilir (~$0.05/işletme).
**Alternatifler**: Maps scraping (Playwright) — hukuki risk, IP ban; Yandex/Instagram — Phase 2+ ek kaynak.
**Etki**: Veri 30 gün cache sınırı → "veri eski" işareti ve "yenile" butonu.

## D-001: Tek Next.js uygulaması, monorepo değil — 2026-09-22

**Karar**: `app/` + `lib/` + `prisma/`, tek `package.json`.
**Gerekçe**: Panel + API aynı deploy birimi, tek kullanıcı, paylaşılan tip gereksinimi yok.
**Alternatifler**: pnpm monorepo (rep-cyprus deseni) — Phase 4'te ürünleşirse.
**Etki**: Agent scope'ları dizin bazlı (`app/api` vs `app/(panel)`), paket bazlı değil.
