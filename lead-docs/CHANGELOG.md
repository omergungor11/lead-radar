# Changelog

## 2026-09-25

### Fixed
- Harita ile alan araması 400 dönüyordu: Places Text Search `locationRestriction.circle` kabul etmiyor → dairenin çevreleyen `rectangle`'ı gönderilir, `places.location` ile daire dışı elenir (D-011)
- Seed/mock işletmelerin fotoğrafları gerçek modda kırıktı: `mock/photo-N` adları her modda SVG döner

### Changed
- Harita MapLibre/Carto'dan Google Maps JS'e geçti (`GOOGLE_MAPS_BROWSER_KEY`, ayrı + referrer kısıtlı anahtar); daire sürüklenir, kenar tutamacıyla yarıçap değişir
- Mesaj şablonları daha kısa ve doğal; puan/yorum sayısı şablondan çıktı

### Added
- İşletmeler tablosunda kolon başlığına tıklayarak sıralama (ad, kategori, şehir, telefon, e-posta, puan, skor, durum, son temas; `dir=asc|desc`, boşlar sonda)
- Serbest metin araması kategoriye de bakar (Türkçe etiket veya Places kodu; birincil + ikincil tipler)
- Kategori filtresi aranabilir dropdown (`GET /api/businesses/categories`, adetli); 11 yeni Türkçe kategori etiketi

## 2026-09-22

### Fixed
- Harita ile alan aramasında şehir/ilçe zorunluluğu kalktı: kayıt şehri daire merkezine en yakın şehirden otomatik belirlenir, ilçe seçici gizlenir, uyarılar alan bazlı

### Added
- İşletme silme: satır menüsü, toplu silme ve detay panelinden silme (onay diyaloglu; notlar + durum geçmişi cascade)
- Harita ile alan araması: MapLibre + Carto altlık, merkez/yarıçap seçimi, Places locationRestriction; 87 şehir merkezi (`lib/geo.ts`)
- Sosyal medya / platform profili (Instagram, Facebook, linktr.ee, Booking, Yemeksepeti, Sahibinden…) veren işletmeler lead olarak kaydedilir; tabloda rozet, Site durumu filtresi, Excel'e Mevcut link / Link türü, arama kartında döküm, `{{platform}}` + sosyal medya şablonu
- 86 arama kategorisi önerisi (10 sektör grubu, aranabilir liste + 10 hızlı çip); konaklama tipleri (lodging, motel, guest_house, bed_and_breakfast, hostel, resort_hotel) bonus kategorilere eklendi
- İlçe bazlı arama: 81 ilin 973 ilçesi, aranabilir ilçe seçici, işletmeye ilçe kaydı, tablo/Excel ilçe filtresi ve İlçe sütunu
- Türkiye'nin 81 ili şehir listesinde; aranabilir, gruplu şehir seçici (Türkçe karakter duyarsız arama); arama formunda ilçe ipucu
- TASK-105: Places (New) istemcisi (field mask, backoff, zod), mock fixture, SSE'li arama işi, anahtarsız foto proxy, mock seed, tek işletme "Yenile"
- TASK-106/107: `/api/businesses*` (filtre, PATCH geçiş/onay/undo, notlar, toplu durum), tablo ekranı, detay sheet (şablon → WhatsApp → CONTACTED + Geri al)
- TASK-108: Filtreli Excel export (14 sütun, telefon metin)
- TASK-109: Dashboard (6 kart, huni, son aramalar)
- TASK-111: Playwright smoke (izole `prisma/e2e.db`), CI e2e job'u, README baştan yazıldı
- TASK-104: `lib/scoring` (log-interpolasyonlu yorum puanı, bantlar), `lib/status` (geçiş tablosu + `requiresConfirmation`), `lib/phone` (KKTC/TR E.164, `waLink`), `lib/templates#renderTemplate`, `lib/categories` (~100 Türkçe etiket) — test-first, 199 test
- TASK-110: Panel layout (sidebar, mobil Sheet), Ayarlar sayfası (Places durumu, şehir/bonus kategori editörü, skor yeniden hesapla, şablon CRUD + opt-out uyarısı); `/api/settings*`, `/api/templates*`, `/api/businesses/rescore`

### Fixed
- shadcn preset'inin kendine referans veren `--font-sans` değişkeni → Geist uygulanmıyordu (serif fallback)
- TASK-102: Prisma şema (6 model) + `init` migration + idempotent seed (2 ayar, 2 şablon, opt-out'lu); `lib/db.ts` singleton
- TASK-103: Tek şifreli auth — HMAC (Web Crypto) imzalı `lr_session` cookie, `middleware.ts` (API 401 / sayfa → `/login?next=`), `/api/auth/login|logout`, `lib/env.ts` + `instrumentation.ts` açılış kontrolü, `lib/api.ts` response yardımcıları, `/login` sayfası, TanStack Query + Toaster provider; 18 yeni test
- TASK-101: Next.js 15.5 + Tailwind 4 + shadcn (radix-nova, 18 bileşen) + Prisma 6 (SQLite) + Vitest + Playwright iskeleti; `package.json` script'leri, GitHub Actions CI. TASK-001/006/007 kapandı
- TASK-002/003/004: Proje `claude-start-template-v2`'den kuruldu (prefix `lead`); agent'lara model ataması (Fable orchestrator, opus/sonnet/haiku alt agent'lar); CLAUDE.md, tech-stack, agent-instructions dolduruldu
- `lead-plans/PROMPT.md`: MVP inşa spesifikasyonu (kapsam, kesin kararlar, veri modeli, API, Places entegrasyonu, yasal sınırlar, DoD)
- `lead-tasks/phases/phase-1.md`: 11 task, acceptance criteria ile
- `lead-docs/DECISIONS.md`: D-001..D-006
- README.md
