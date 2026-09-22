# Lead Radar - Task Index

## Dashboard

| Phase | Name | Total | Done | In Progress | Review | Pending | Blocked |
|-------|------|-------|------|-------------|--------|---------|---------|
| 0 | Project Setup | 7 | 7 | 0 | 0 | 0 | 0 |
| 1 | MVP — Panel + Places + Pipeline | 11 | 1 | 0 | 0 | 10 | 0 |
| **Total** | | **18** | **8** | **0** | **0** | **10** | **0** |

**Progress**: 8/18 (44%)

---

## Phase 0: Project Setup

| ID | Task | Agent | Complexity | Status | Dependencies |
|----|------|-------|-----------|--------|-------------|
| TASK-001 | Repo + tooling init (Next.js iskeleti) | devops | S | COMPLETED | - |
| TASK-002 | Meta directories dolduruldu (tech-stack, conventions, agent-instructions) | docs | S | COMPLETED | - |
| TASK-003 | .claude/ hooks, commands, agents (model atamalı), settings | devops | M | COMPLETED | - |
| TASK-004 | CLAUDE.md dolduruldu | docs | M | COMPLETED | TASK-002 |
| TASK-005 | ~~Docker dev environment~~ → **iptal** (SQLite, Docker gerekmez) | devops | - | COMPLETED | - |
| TASK-006 | Lint, format, TypeScript config | devops | S | COMPLETED | TASK-001 |
| TASK-007 | Git repo init + GitHub public + first push | devops | S | COMPLETED | TASK-002..004 |

> TASK-001 ve TASK-006, Phase 1'deki TASK-101 ile birleşti; TASK-101 bitince ikisi de COMPLETED olur.

---

## Phase 1: MVP — Panel + Places + Pipeline

Spesifikasyon: `lead-plans/PROMPT.md`. Detaylar: `lead-tasks/phases/phase-1.md`.

| ID | Task | Agent | Complexity | Status | Dependencies |
|----|------|-------|-----------|--------|-------------|
| TASK-101 | Next.js 15 + Tailwind + shadcn + Prisma + Vitest + Playwright iskeleti, `.env.example`, CI | orchestrator + devops | M | COMPLETED | TASK-007 |
| TASK-102 | Prisma şema + migrate + seed (şablonlar, şehirler, mock işletmeler) | database | M | PENDING | TASK-101 |
| TASK-103 | Auth — login sayfası, middleware, httpOnly cookie | backend + frontend | S | PENDING | TASK-101 |
| TASK-104 | `lib/scoring` + `lib/status` + `lib/phone` — test-first | backend | M | PENDING | TASK-102 |
| TASK-105 | `lib/places` + mock + `/api/search` + SSE + SearchJob | backend | L | PENDING | TASK-104 |
| TASK-106 | `/api/businesses*` + tablo ekranı (filtre, sıralama, inline e-posta/durum, toplu işlem) | backend + frontend | L | PENDING | TASK-104 |
| TASK-107 | Detay sheet — galeri, yorumlar, skor kırılımı, notlar, şablon kopyala → WhatsApp | frontend + backend | L | PENDING | TASK-106 |
| TASK-108 | Excel export (`/api/export`, exceljs) | backend | S | PENDING | TASK-106 |
| TASK-109 | Dashboard — kartlar, funnel, son aramalar | frontend + backend | M | PENDING | TASK-105, TASK-106 |
| TASK-110 | Ayarlar — şehirler, bonus kategoriler, şablon CRUD | frontend + backend | M | PENDING | TASK-102 |
| TASK-111 | Playwright smoke + README gerçek kurulum adımları + DoD kontrolü | frontend + docs | M | PENDING | TASK-101..110 |

---

## Sonraki Phase'ler (planlandı, açılmadı)

| Phase | Ne | Ön koşul |
|---|---|---|
| 2 | Önizleme site üretimi (Maps verisi → landing page, tıklama takibi) | Phase 1 ile ≥ 5 gerçek temas yapılmış olması |
| 3 | Kanal otomasyonu — WhatsApp Business API, SMTP, İYS | Phase 2'de dönüşüm görülmesi |
| 4 | Ürünleştirme — multi-tenant, Postgres, Stripe | Kendi ajans için 3 ay kullanım |
