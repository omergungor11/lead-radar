# Lead Radar

## Proje

Google Haritalar'da kayıtlı olup **web sitesi olmayan** işletmeleri bulan, Lead Skoru ile
puanlayan, telefon/fotoğraf/e-posta bilgilerini tek panelde toplayan ve web sitesi satış
sürecini (NEW → WON) yöneten lead-generation aracı. İlk pazar KKTC; ilk kullanıcı Piton Studios.

- **GitHub**: https://github.com/omergungor11/lead-radar
- **İnşa spesifikasyonu**: `lead-plans/PROMPT.md` — MVP'nin tamamı burada, kararlar verilmiş

## Slash Commandlar

| Command | Ne yapar |
|---------|----------|
| `/cold-start` | Session başlangıcı — projeyi oku, durumu raporla (sadece session başında) |
| `/status` | Hızlı durum — dashboard + son commit'ler (gün içinde bunu kullan) |
| `/git-full` | Stage, commit, push — task durumlarını güncelle |
| `/local-testing` | Servisleri doğrula (build + health check) |
| `/turn-off` | Session notu yaz, taskları işaretle, push, kapat |

---

## Mevcut Durum

**Progress**: 18/18 task (%100) — MVP tamam. Açık: gerçek Places anahtarıyla doğrulama, login rate limit (internete açmadan önce). Sonraki: Phase 2 (ön koşul: ≥5 gerçek temas).

> Session başında `/cold-start`, gün içinde `/status`.

---

## Workspace

```
app/(auth)/login        → Tek şifreli giriş
app/(panel)/            → Dashboard, İşletmeler, Aramalar, Ayarlar (sidebar layout)
app/api/                → Route handlers (auth, search+SSE, businesses, export, settings, templates, photo proxy)
components/             → business-table, business-sheet, search-form, score-badge, status-select, ui/ (shadcn)
lib/                    → db, places(+mock), scoring, status, export, templates, phone, auth, config, tr
prisma/                 → schema.prisma (SQLite), seed.ts
tests/                  → vitest birim testleri + e2e/smoke.spec.ts (Playwright)
lead-*/                 → proje meta dizinleri
```

Port: `3000` (Next.js dev). Veritabanı: `prisma/dev.db` (SQLite, gitignore'da).

## Temel Komutlar

```bash
pnpm dev                          # Next.js dev
PLACES_MOCK=1 pnpm dev            # API anahtarı olmadan, 15 mock işletmeyle
pnpm db:migrate && pnpm db:seed   # Prisma migrate + seed
pnpm typecheck && pnpm lint       # Pre-commit
pnpm test                         # Vitest
pnpm test:e2e                     # Playwright smoke (3000 doluysa E2E_PORT=3100)
pnpm build
```

---

## Code Conventions (Kısa)

- **TypeScript**: strict, `any` yasak
- **Dosya**: `kebab-case`
- **API**: RESTful, response `{ data, meta? }`, error `{ error: { statusCode, code, message } }`; body'ler zod ile doğrulanır
- **Arayüz metinleri**: sadece Türkçe, tamamı `lib/tr.ts`'de
- **Durumlar**: Prisma enum değil, string + TS `const` union (`lib/status.ts`)
- **Commit**: `feat(TASK-XXX): açıklama` — attribution satırı YOK

Detaylar → `lead-config/conventions.md`

## Agent Orchestration

**Model dağılımı** — ana oturum (orchestrator) Fable'da kalır; alt işler ucuz modele devredilir:

| Rol | Model | Ne yapar |
|---|---|---|
| Orchestrator (ana oturum) | **Fable** | Mimari karar, task sıralama, paket kurulumu, çakışma çözümü, review |
| `backend` agent | **opus** | Places entegrasyonu, SSE, API route'ları, skorlama/durum mantığı |
| `frontend` agent | **sonnet** | Sayfalar, component'ler, tablo/sheet, TanStack Query |
| `database` agent | **sonnet** | Prisma şema, migration, seed |
| `devops` agent | **haiku** | Tooling config, .env.example, CI iskeleti |
| `docs` agent | **haiku** | README, CHANGELOG, task-index güncellemeleri |

Subagent tanımları `.claude/agents/` altında; `model:` alanı frontmatter'da sabitlenmiş.
Paralel çalıştırma kuralları:

- Her agent sadece kendi scope dizininde dosya düzenler (izolasyon) — tablo `lead-config/agent-instructions.md`
- Paket kurulumu sadece orchestrator yapar
- Paylaşılan dosyada çakışma → read-edit-retry (max 3), sonra orchestrator'a bildir
- Bağımlı task'lar sıralı, bağımsızlar paralel

Detaylar → `lead-config/agent-instructions.md`

---

## Referans Dizinleri

| Dizin | İçerik |
|-------|--------|
| `lead-plans/PROMPT.md` | **MVP inşa spesifikasyonu** — kapsam, veri modeli, API, DoD |
| `lead-tasks/task-index.md` | Dashboard + master task listesi |
| `lead-tasks/phases/` | Phase bazlı detaylı task açıklamaları |
| `lead-tasks/active/session-notes.md` | Session notları |
| `lead-tasks/templates/` | Yeni task/phase şablonları |
| `lead-config/workflow.md` | Task workflow kuralları |
| `lead-config/conventions.md` | Kod standartları |
| `lead-config/tech-stack.md` | Teknolojiler + versiyonlar |
| `lead-config/agent-instructions.md` | Orkestrasyon + model dağılımı |
| `lead-docs/MEMORY.md` | Kalıcı hafıza |
| `lead-docs/DECISIONS.md` | Mimari kararlar (ADR-lite) |
| `lead-docs/CHANGELOG.md` | Değişiklik kaydı |

---

## Hooks

| Hook | Tetikleyici | Ne yapar |
|------|------------|----------|
| `protect-files.sh` | PreToolUse (Edit/Write) | .env, lock, .git/, key/pem, credentials düzenlemeyi bloklar |

---

## Proje Özel Kurallar

- **Places API anahtarı client'a sızmaz** — fotoğraflar `/api/photo` proxy'sinden geçer; `grep -r "AIza" .next/static` boş olmalı
- **Scraping yok** — sadece Places API; ToS'a uygun (fotoğraf indirilmez, veri 30 günden eskiyse "yenile")
- **Otomatik gönderim yok** (MVP) — her mesaj kullanıcı eliyle; şablonlarda opt-out cümlesi
- **Field mask zorunlu** — maskesiz Places çağrısı en pahalı SKU'dan faturalanır

## Hafıza Kuralları

- `lead-docs/MEMORY.md` session başında okunur; teknik karar/gotcha anında güncellenir
- Mimari kararlar `lead-docs/DECISIONS.md`'ye tarih + gerekçe ile yazılır
- Kısa tut — referans kartı, roman değil
