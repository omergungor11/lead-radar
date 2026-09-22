# Session Notes

## 2026-09-22 — Session 2 (MVP inşası)

### Yapılanlar
- [x] TASK-101..111 — Phase 1 MVP tamamlandı (18/18). 299 birim test + 2 e2e yeşil, build temiz, `.next/static`'te anahtar yok
- [x] Paralel agent dağıtımı: backend (opus) ×4, frontend (sonnet) ×4, database (sonnet), docs (haiku)
- [x] Orchestrator düzeltmeleri: Geist fontu, seed şablon metni (ünlü uyumu), toast/sheet etkileşimi, sheet genişliği, döngüsel import, tek API istemcisi, README yanlışları

### Yarım Kalanlar
- [ ] Gerçek Places anahtarıyla "berber / Lefkoşa" DoD maddesi (kullanıcı anahtar alınca)

### Bir Sonraki Session
- [ ] Anahtarı `.env`'e koy, `PLACES_MOCK=0`, gerçek arama → sonuç ve maliyeti kontrol et
- [ ] İnternete açılacaksa: login rate limit + oturum iptali
- [ ] Dev DB'de agent test aramaları duruyor (SearchJob ~$0.4 sahte maliyet) — istersen `pnpm exec prisma migrate reset` (onay ister)

### Dikkat Edilecekler
- Bir agent temizlikte geniş `pkill` kullandı → başka projenin (`re-state-start`) :3000 dev server'ı kapandı. Kural eklendi (agent-instructions §1): süreçler yalnız PID ile

## 2026-09-22 — Session 1 (kuruluş)

### Yapılanlar
- [x] İş fikri seçildi: Websitesiz İşletme Lead Motoru (alternatifler: otel channel manager, emlak sync ürünleştirme, galeri sync — `lead-plans/PROMPT.md` sonundaki fazlarda referans)
- [x] Proje `claude-start-template-v2`'den kuruldu, meta dizinler dolduruldu
- [x] PROMPT.md yazıldı — tüm MVP kararları verilmiş, agent'a soru bırakılmadı
- [x] GitHub public repo + ilk push

### Yarım Kalanlar
- [ ] TASK-101: Next.js iskeleti henüz yok — repo şimdilik sadece spesifikasyon + meta

### Bir Sonraki Session
- [ ] `/cold-start` → `lead-plans/PROMPT.md`'yi orchestrator'a ver → TASK-101'den başla
- [ ] Google Cloud Console'da Places API (New) etkinleştir, anahtar al, `.env`'e koy (kullanıcı yapar)

### Dikkat Edilecekler
- Kullanıcının verdiği kararlar: KKTC ilk pazar, manuel WhatsApp kanal (varsayılan olarak seçildi, kullanıcı itiraz etmedi)
- Excel export ve panel ikisi de istendi — ikisi de kapsamda
