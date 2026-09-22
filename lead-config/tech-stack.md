# Tech Stack

> Versiyonlar `TASK-101`'de (2026-09-22) `package.json`'dan yazıldı.
> Büyük versiyon yükseltmeleri `lead-docs/DECISIONS.md`'ye kaydedilir.

## Runtime
- Node.js 22 LTS
- pnpm 10.25 (`packageManager` alanında sabit; build script izinleri `pnpm.onlyBuiltDependencies`)

## Uygulama (tek Next.js projesi — monorepo değil)
- Next.js 15.5.25 (App Router, Route Handlers, Server Components; dev Turbopack) + React 19.1
- TypeScript 5.9 strict
- zod 4.6 — tüm API body doğrulaması (**v4 API**: `z.email()`, `error` param)
- libphonenumber-js 1.13 — E.164 normalize (`wa.me` linkleri için)

## Frontend
- Tailwind CSS 4.3 (CSS-first config, `app/globals.css`)
- shadcn/ui 4.21, style `radix-nova`, base `radix-ui` 1.6 — kurulu: table, sheet, badge, select, dialog, alert-dialog, input, textarea, button, card, tabs, dropdown-menu, checkbox, label, sonner, tooltip, separator, skeleton
- TanStack Query 5.103 — liste/detay cache
- lucide-react 1.47 — ikonlar

## Veri
- Prisma 6.19 (`prisma-client-js`, `prisma.config.ts` YOK) + SQLite (`prisma/dev.db`) — MVP. Postgres'e geçiş: `provider` değişimi + enum/JSON tipleri
- exceljs 4.4 — `.xlsx` export

## Dış servisler
- Google Places API (New): Text Search, Place Details, Place Photos
  - Field mask zorunlu; maliyet sabitleri `lib/config.ts`
  - `PLACES_MOCK=1` → `lib/places.mock.ts` (15 fixture), anahtar gerekmez

## Test
- Vitest 5.0 (`tests/**/*.test.ts`, node env) — `lib/scoring`, `lib/status`, `lib/phone`, `lib/export`
- Playwright 1.63 (`tests/e2e`, chromium; `E2E_PORT` ile port) — 1 smoke (giriş → arama (mock) → tablo → detay → export)

## Altyapı
- Docker yok (MVP)
- Deploy hedefi: VPS'te `pnpm build && pnpm start` veya Vercel (SQLite için Turso/LibSQL'e geçiş gerekir — Phase 4)
- CI: GitHub Actions `.github/workflows/ci.yml` — typecheck + lint + test

## Kapsam dışı (bilinçli)
- Redis / BullMQ — arama işi senkron + SSE
- i18n framework — sadece Türkçe, `lib/tr.ts`
- Auth kütüphanesi — tek şifre + httpOnly cookie
