# Lead Radar

**Web sitesi olmayan işletmeleri bul, puanla, ulaş, sat.**

Lead Radar, Google Haritalar'da kayıtlı olup **web sitesi olmayan** işletmeleri bulan, onları bir
Lead Skoru ile sıralayan ve web sitesi satış sürecini tek panelden yönetmeyi sağlayan açık kaynak
bir lead-generation aracıdır. Dijital ajanslar ve freelance web geliştiriciler için yapıldı.

> Durum: **spesifikasyon tamam, inşa başlıyor.** Repo şu an tam MVP spesifikasyonunu
> (`lead-plans/PROMPT.md`) ve Claude Code çalışma iskeletini içeriyor; uygulama kodu Phase 1'de geliyor.

---

## Neden

Küçük işletmelerin büyük kısmı Google Haritalar'da var, yorumları var, müşterisi var — ama web
sitesi yok. Bunlar bir ajans için en sıcak müşteri adayı: ihtiyaç kanıtlanmış, ulaşılabilir, bütçesi
var. Sorun bunları tek tek haritada aramanın saatler sürmesi. Lead Radar bu aramayı dakikaya indirir
ve devamındaki süreci (kime ulaştım, kim cevap verdi, kim kazanıldı) düzenli tutar.

## Ne yapar

| Adım | Ne | Nasıl |
|---|---|---|
| **Keşif** | "berber / Lefkoşa" gibi kategori × şehir taraması | Google Places API (New) — `websiteUri` boş olanlar |
| **Skorlama** | 0–100 Lead Skoru: yorum sayısı, puan, fotoğraf, telefon, son yorum tarihi, kategori | Saf fonksiyon, test edilebilir, ayarlanabilir |
| **Panel** | Fotoğraf, telefon (kopyala / WhatsApp), e-posta, puan, skor, durum — filtreli tablo + detay | Next.js + shadcn/ui |
| **Temas** | Şablon seç → işletme verisiyle dolsun → kopyala → WhatsApp'ı aç | Manuel gönderim (bilinçli — aşağıya bak) |
| **Pipeline** | NEW → QUALIFIED → CONTACTED → REPLIED → MEETING → WON / LOST / SKIPPED | Durum geçmişi + notlar |
| **Excel** | Filtreli listeyi `.xlsx` olarak indir | exceljs |
| **Dashboard** | Sıcak lead, temas, cevap oranı, kazanılan, API maliyeti | |

## Stack

Next.js 15 (App Router) · TypeScript strict · Tailwind + shadcn/ui · Prisma + SQLite · TanStack Query ·
zod · exceljs · Vitest · Playwright. Docker yok, Redis yok — `pnpm dev` yeter.

## Kurulum

> Bu adımlar Phase 1 tamamlanınca geçerli olur. Şimdilik yol haritası olarak okuyun.

```bash
git clone https://github.com/omergungor11/lead-radar.git
cd lead-radar
pnpm install
cp .env.example .env          # ADMIN_PASSWORD, SESSION_SECRET, GOOGLE_PLACES_API_KEY doldur
pnpm db:migrate && pnpm db:seed
pnpm dev                      # http://localhost:3000
```

API anahtarı olmadan denemek için:

```bash
PLACES_MOCK=1 pnpm dev        # 15 sabit mock işletmeyle tüm panel gezilebilir
```

### Google Places API anahtarı

1. [Google Cloud Console](https://console.cloud.google.com/) → yeni proje
2. **APIs & Services → Library → Places API (New)** → Enable
3. **Credentials → Create credentials → API key**
4. Anahtarı **kısıtla**: API restrictions → sadece *Places API (New)*; Application restrictions → IP (sunucu IP'niz)
5. Billing hesabı bağla (aylık $200 ücretsiz kredi var)
6. `.env` → `GOOGLE_PLACES_API_KEY=…`

### Maliyet

Field mask kullanıldığı için yalnızca gereken alanlar faturalanır. Yaklaşık:

| Çağrı | Birim | Ne zaman |
|---|---|---|
| Text Search (ID + website alanı) | ~$0.032 / istek (20 sonuç) | Her sayfa |
| Place Details (iletişim + atmosfer) | ~$0.017–0.020 / işletme | Sadece sitesiz olanlara |
| Photo | ~$0.007 / yükleme | Panelde görüntülenince |

**Pratik**: 60 sonuçlu bir tarama, %30'u sitesiz → ~$0.10 + 18 × $0.02 ≈ **$0.45**. Günde 10 tarama ≈ $4.5/gün;
aylık ücretsiz kredi çoğu tek kullanıcıyı karşılar. Panel her taramanın tahmini maliyetini gösterir.

## Yasal ve etik çerçeve

Bu araç **bulur ve düzenler; toplu mesaj göndermez.** Bu bir eksik değil, tasarım kararı:

- **KVKK / GDPR**: İşletme telefonu ticari veridir, ama şahıs işletmelerinde kişisel veri olabilir.
  Veriyi sadece kendi satış sürecinizde kullanın; üçüncü tarafa aktarmayın, satmayın.
- **Türkiye — İYS**: Ticari elektronik ileti (SMS, e-posta, WhatsApp) için İleti Yönetim Sistemi
  kaydı zorunlu. Tacir/esnafa B2B iletide ön onay istisnası var ama İYS kaydı yine de gerekir.
- **KKTC**: Ayrı mevzuat, daha gevşek; ancak WhatsApp'ın kendi spam politikası her yerde geçerli —
  kişisel hesaptan toplu mesaj = kalıcı ban.
- **Google Places ToS**: Veri 30 günden uzun cache'lenmez (panel eski veriyi işaretler, "yenile" sunar);
  fotoğraflar indirilmez, proxy'den anlık servis edilir; veri yeniden satılmaz.
- **Opt-out**: Her mesaj şablonunda "ilgilenmiyorsanız yazın, bir daha yazmayalım" cümlesi bulunur.

Kural basit: **düşük hacim, yüksek kişiselleştirme.** Günde 20 iyi mesaj, 500 spam'den daha çok müşteri getirir.

## Yol haritası

| Phase | Ne | Durum |
|---|---|---|
| 0 | Proje kurulumu, spesifikasyon | ✅ |
| 1 | MVP — keşif, skor, panel, pipeline, Excel, dashboard | 🔨 |
| 2 | Önizleme site üretimi — Maps verisinden otomatik landing page, "size site yaptık, bakın" mesajı | planlandı |
| 3 | Kanal otomasyonu — WhatsApp Business API, SMTP, İYS entegrasyonu, onay kuyruğu | planlandı |
| 4 | Ürünleştirme — multi-tenant, Postgres, abonelik | fikir |

## Geliştirme

Proje [Claude Code](https://claude.com/claude-code) ile orkestre edilerek geliştiriliyor:

- `lead-plans/PROMPT.md` — MVP'nin tam spesifikasyonu; tüm kararlar verilmiş, agent'a soru bırakılmamış
- `lead-tasks/` — phase/task takibi, acceptance criteria
- `lead-docs/DECISIONS.md` — neden SQLite, neden SSE, neden otomatik gönderim yok
- `.claude/agents/` — backend (opus), frontend/database (sonnet), devops/docs (haiku); orchestrator ana oturum

Katkı: issue açın veya PR gönderin. Commit'lerde `feat(TASK-XXX): …` formatı.

## Lisans

MIT
